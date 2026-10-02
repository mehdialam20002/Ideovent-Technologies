/**
 * The hero scene in three.js, inside the worker: the ONLY file that imports three at
 * runtime (its own chunk, loaded by hero3d.worker.ts after a WebGL2 context exists).
 *
 * 19 tapered Lambert blocks and the pin share ONE program (grain injected, cache key
 * "grain1"); the soft shadows are one decal mesh written on the CPU (a second program).
 * No shadow maps, textures, environment, tone mapping or post-processing. The timeline
 * runs only from `go` to rest (1,650 ms) and the lamp only while it eases; otherwise no
 * frame is requested. Spec: _build/specs/hero-3d-spec.md 3, 4, 5.1, 7.7, 8.4.
 */
import {
  BufferAttribute, BufferGeometry, DirectionalLight, DynamicDrawUsage, FrontSide, HemisphereLight, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, NoToneMapping, PerspectiveCamera, Scene, WebGLRenderer, setConsoleFunction,
} from "three";
import { DECAL, LAMP, LIGHT, PIECES, PIN, POSES, PX, QUALITY, T, THEMES, type PoseKey, type Theme } from "./model";
import {
  BLOCK_VERTS, DecalWriter, MAP_INDEX, currentBase, faceTriangles, lightDir, makePose, meetFov, pinFaces, pose,
  writeBlock, writeBlockNormals, wx, wz, type Pose, type V3,
} from "./geom";

type In = { type: string; [k: string]: unknown };
type Post = (m: object) => void;
/** What the main thread sends with `init` (the canvas itself was taken by the entry). */
export interface Init {
  cssW: number;
  cssH: number;
  dpr: number;
  coarse: boolean;
  pose: PoseKey;
  dark: boolean;
  /** Freeze the canvas at this time (?hero3d=t:<ms>): no go, no lamp. */
  freezeAt?: number;
  /** Dev only (?hero3d=lose): lose the context after `built`, to test that path. */
  lose?: boolean;
}

/* Object-space-anchored grain, +-3 %, 160 cells per world unit (spec 3.5). If a three
   update ever drops one of these chunks, the scene ships without grain, silently. */
const GRAIN_V: [string, string][] = [
  ["#include <common>", "#include <common>\nvarying vec3 vObj;"],
  ["#include <begin_vertex>", "#include <begin_vertex>\nvObj = (modelMatrix * vec4(position, 1.0)).xyz;"],
];
const GRAIN_F: [string, string][] = [
  ["#include <common>", "#include <common>\nvarying vec3 vObj;\nfloat h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }"],
  ["#include <opaque_fragment>", "outgoingLight *= 1.0 + (h3(floor(vObj * 160.0)) - 0.5) * 0.06;\n#include <opaque_fragment>"],
];
function addGrain(sh: { vertexShader: string; fragmentShader: string }) {
  if (!GRAIN_V.every(([a]) => sh.vertexShader.includes(a)) || !GRAIN_F.every(([a]) => sh.fragmentShader.includes(a))) return;
  for (const [a, b] of GRAIN_V) sh.vertexShader = sh.vertexShader.replace(a, b);
  for (const [a, b] of GRAIN_F) sh.fragmentShader = sh.fragmentShader.replace(a, b);
}
/** Every part and the pin: same settings, so one program. `transparent` is never toggled. */
function lambert(): MeshLambertMaterial {
  const m = new MeshLambertMaterial({ dithering: true, transparent: true, opacity: 1, side: FrontSide });
  m.onBeforeCompile = addGrain;
  m.customProgramCacheKey = () => "grain1";
  return m;
}

/** A small ring of samples for the budgets (no allocation per frame). */
class Samples {
  private readonly v = new Float32Array(256);
  private n = 0;
  add(x: number) {
    this.v[this.n++ & 255] = x;
  }
  summary() {
    const s = Array.from(this.v.subarray(0, Math.min(this.n, 256))).sort((a, b) => a - b);
    const q = (f: number) => (s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : 0);
    return { n: this.n, p50: q(0.5), p95: q(0.95), max: s.length ? +s[s.length - 1].toFixed(2) : 0 };
  }
}

/**
 * Builds the scene on the given context, sizes it, compiles both programs, runs the
 * quality probe and draws frame 0 (transparent: the drawn plan under the canvas IS
 * frame 0), then posts `ready` on the next frame. Resolves with the message handler,
 * or null after posting `fail` (slow).
 */
export async function start(gl: WebGL2RenderingContext, canvas: OffscreenCanvas, msg: In, post: Post): Promise<((m: In) => void) | null> {
  const init = msg as unknown as Init;
  const dev = import.meta.env.DEV;
  if (!dev) setConsoleFunction(() => {}); // no THREE.* lines in the console in production
  const renderer = new WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext });
  renderer.debug.checkShaderErrors = dev;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);

  const def = POSES[init.pose] || POSES.desk;
  const scene = new Scene();
  const camera = new PerspectiveCamera(def.fov, def.ref, 0.1, 200);
  camera.position.set(def.position[0], def.position[1], def.position[2]);
  camera.lookAt(def.target[0], def.target[1], def.target[2]);
  const key = new DirectionalLight(0xffffff, 1);
  const hemi = new HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(key, key.target, hemi);

  // ── the 19 parts: positions rewritten in place as they rise, normals fixed
  const parts = PIECES.map((p, i) => {
    const g = new BufferGeometry();
    const pos = new BufferAttribute(new Float32Array(BLOCK_VERTS * 3), 3).setUsage(DynamicDrawUsage);
    const nrm = new BufferAttribute(new Float32Array(BLOCK_VERTS * 3), 3);
    writeBlockNormals(nrm.array as Float32Array, p.w, p.d, p.h);
    g.setAttribute("position", pos);
    g.setAttribute("normal", nrm);
    const mat = lambert();
    const mesh = new Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.position.set(wx(p.x + p.w / 2), 0, wz(p.y + p.d / 2));
    scene.add(mesh);
    return { p, i, mesh, mat, pos, k: -1, base: 0 };
  });

  // ── the pin: built once for this pose, turned toward the key light
  const faces = pinFaces(def.az + PIN.turn);
  const tri = faceTriangles(faces);
  const pg = new BufferGeometry();
  pg.setAttribute("position", new BufferAttribute(new Float32Array(tri.pos), 3));
  pg.setAttribute("normal", new BufferAttribute(new Float32Array(tri.nrm), 3));
  const pinMat = lambert();
  const pin = new Mesh(pg, pinMat);
  pin.frustumCulled = false;
  pin.renderOrder = 1; // after every part, so its fade-in blends over the map
  const pinX = wx(PIN.x), pinZ = wz(PIN.y);
  pin.position.set(pinX, 0, pinZ);
  scene.add(pin);
  const corners = new Float32Array(faces[0].pts.length * 6);
  faces[0].pts.concat(faces[1].pts).forEach((q, i) => corners.set(q, i * 3));

  // ── the shadow decal: preallocated, written in place, front faces only
  const dPos = new BufferAttribute(new Float32Array(DECAL.maxVerts * 3), 3).setUsage(DynamicDrawUsage);
  const dCol = new BufferAttribute(new Float32Array(DECAL.maxVerts * 4), 4).setUsage(DynamicDrawUsage);
  const dg = new BufferGeometry();
  dg.setAttribute("position", dPos);
  dg.setAttribute("color", dCol);
  dg.setDrawRange(0, 0);
  const decal = new Mesh(dg, new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  decal.renderOrder = 2;
  decal.frustumCulled = false;
  scene.add(decal);
  const writer = new DecalWriter(dPos.array as Float32Array, dCol.array as Float32Array);

  // ── state
  let theme: Theme = THEMES[init.dark ? "dark" : "light"];
  const cur: Pose = makePose();
  const L: V3 = [0, 0, 0];
  const light = { az: LIGHT.az, el: LIGHT.el };
  let pinBase = 0;
  let lost = false;
  let renders = 0;
  let ticks = 0;
  const jsMs = new Samples();
  const gaps = new Samples();

  function applyTheme(dark: boolean) {
    theme = THEMES[dark ? "dark" : "light"];
    for (const pt of parts) pt.mat.color.set(theme[pt.p.role]);
    pinMat.color.set(theme.pin);
    key.color.set(theme.key.color);
    key.intensity = theme.key.i;
    hemi.color.set(theme.hemi.sky);
    hemi.groundColor.set(theme.hemi.ground);
    hemi.intensity = theme.hemi.i;
  }
  function setLight(az: number, el: number) {
    light.az = az;
    light.el = el;
    lightDir(az, el, L);
    key.position.set(L[0] * 10, L[1] * 10, L[2] * 10);
  }
  /** Moves every part, the pin and the light to `ps`; the decal is rewritten after. */
  function applyPose(ps: Pose, withLight = true) {
    for (const pt of parts) {
      const k = ps.ks[pt.i];
      if (k !== pt.k) {
        writeBlock(pt.pos.array as Float32Array, pt.p.w, pt.p.d, pt.p.h, Math.max(k, 1e-4));
        pt.pos.needsUpdate = true;
        pt.k = k;
      }
      pt.base = currentBase(pt.i, ps.ks) * PX; // a stacked part rides its support's CURRENT top
      pt.mesh.position.y = pt.base;
      pt.mesh.visible = k > 0.001;
    }
    pinBase = (currentBase(MAP_INDEX, ps.ks) + PIECES[MAP_INDEX].h * ps.ks[MAP_INDEX]) * PX;
    pin.visible = ps.pinShow && ps.pinOpacity > 0;
    pinMat.opacity = ps.pinOpacity;
    pin.position.y = pinBase + ps.pinDrop * PX;
    if (withLight) setLight(ps.lightAz, ps.lightEl);
    writeShadows(ps);
  }
  /** Rewrites the decal for the current parts, pin and light (only on frames where one changed). */
  function writeShadows(ps: Pose) {
    writer.begin();
    const rgb = theme.shadow;
    for (const pt of parts) {
      const k = ps.ks[pt.i];
      if (k <= 0.001) continue;
      writer.block(pt.mesh.position.x, pt.base, pt.mesh.position.z, pt.p.w, pt.p.d, pt.p.h, k, L, (2.5 + 0.9 * pt.p.h * k) * PX, theme.shadowA * Math.min(1, 1.2 * k), rgb);
    }
    if (pin.visible) {
      const fall = ps.pinDrop / T.pinDrop; // 1 at the top of the fall, 0 on contact
      writer.pin(pinX, pinBase, pinZ, corners, ps.pinDrop * PX, L, (8 + 26 * fall) * PX, theme.shadowA * 0.9 * (1 - 0.75 * fall) * ps.pinOpacity, rgb);
    }
    dg.setDrawRange(0, writer.count);
    dPos.clearUpdateRanges();
    dPos.addUpdateRange(0, writer.count * 3);
    dPos.needsUpdate = true;
    dCol.clearUpdateRanges();
    dCol.addUpdateRange(0, writer.count * 4);
    dCol.needsUpdate = true;
  }
  function render() {
    if (lost || gl.isContextLost()) return;
    renderer.render(scene, camera);
    renders++;
  }
  // ── sizing: p = min(dpr, 2, sqrt(maxPixels / css area)); 1.0 after a quality step-down
  let cssW = Math.max(1, init.cssW), cssH = Math.max(1, init.cssH);
  let ratio = 1, bufW = 0, bufH = 0, stepped = false;
  const maxPixels = init.coarse ? QUALITY.maxPixelsCoarse : QUALITY.maxPixelsFine;
  function size() {
    ratio = stepped ? 1 : Math.min(init.dpr || 1, QUALITY.dprCap, Math.sqrt(maxPixels / (cssW * cssH)));
    const w = Math.max(1, Math.round(cssW * ratio)), h = Math.max(1, Math.round(cssH * ratio));
    if (w !== bufW || h !== bufH) {
      renderer.setSize(w, h, false); // false: a worker has no styles to write
      bufW = w;
      bufH = h;
    }
    camera.aspect = cssW / cssH;
    camera.fov = meetFov(def.fov, def.ref, camera.aspect); // registered with the poster's xMidYMid meet
    camera.updateProjectionMatrix();
  }

  // ── loops: the build runs from go to rest, the lamp only while it eases
  let mode: "idle" | "building" | "rest" | "frozen" = "idle";
  let raf = 0;
  const vis = { onscreen: true, hidden: false };
  const minGap = 1000 / QUALITY.maxFps - QUALITY.slackMs;
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  canvas.addEventListener("webglcontextlost", () => {
    lost = true;
    stop();
    post({ type: "lost" });
  });
  /** Any throw in a frame goes to the main thread as a failure, which shows the drawn still. */
  const guard = (fn: (t: number) => void) => (t: number) => {
    try {
      fn(t);
    } catch {
      stop();
      post({ type: "fail", reason: "error" });
    }
  };

  let t0 = -1, last = -1, built = 0, jankRun = 0;
  const buildFrame = guard((now: number) => {
    raf = 0;
    ticks++;
    if (mode !== "building") return;
    if (last >= 0 && now - last < minGap) {
      raf = requestAnimationFrame(buildFrame); // capped at 60 fps: a 120 Hz screen skips frames, never time
      return;
    }
    if (t0 < 0) t0 = now;
    if (last >= 0) {
      const gap = now - last;
      gaps.add(gap);
      // Jank escape: after the first 10 build frames, three intervals over 50 ms in a row jump to rest.
      if (built >= QUALITY.jankAfter) {
        jankRun = gap > QUALITY.jankMs ? jankRun + 1 : 0;
        if (jankRun >= QUALITY.jankRun) return finish(true);
      }
    }
    last = now;
    built++;
    const t = now - t0;
    if (t >= T.restMs) return finish(false);
    const a = performance.now();
    applyPose(pose(t, cur));
    render();
    jsMs.add(performance.now() - a);
    if (dev) performance.measure("hero3d frame", { start: a });
    raf = requestAnimationFrame(buildFrame);
  });
  /** Rest: pose(1650) exactly, one frame, the loop stops, `built` goes out. */
  function finish(janky: boolean) {
    stop();
    applyPose(pose(T.restMs, cur));
    render();
    mode = "rest";
    post(janky ? { type: "built", janky: true } : { type: "built" });
    if (dev && init.lose) renderer.forceContextLoss();
  }

  const target = { az: LIGHT.az, el: LIGHT.el };
  let lampLast = -1;
  const lampFrame = guard((now: number) => {
    raf = 0;
    ticks++;
    if (mode !== "rest") return;
    if (lampLast >= 0 && now - lampLast < minGap) {
      raf = requestAnimationFrame(lampFrame);
      return;
    }
    const dt = lampLast >= 0 ? now - lampLast : 1000 / QUALITY.maxFps;
    lampLast = now;
    const a = 1 - Math.exp(-dt / LAMP.tauMs);
    let az = light.az + (target.az - light.az) * a, el = light.el + (target.el - light.el) * a;
    const done = Math.abs(target.az - az) <= LAMP.epsDeg && Math.abs(target.el - el) <= LAMP.epsDeg;
    if (done) {
      az = target.az;
      el = target.el;
    }
    setLight(az, el); // only facet brightness and the shadows change; the shape never moves
    writeShadows(cur);
    render();
    if (done) lampLast = -1;
    else raf = requestAnimationFrame(lampFrame);
  });

  // ── first frame: compile both programs with everything visible and the pin at opacity 0
  applyTheme(init.dark);
  size();
  applyPose(pose(T.restMs, cur));
  pinMat.opacity = 0;
  await renderer.compileAsync(scene, camera);
  if (lost) return null;

  // ── quality probe, before ready (the canvas is still at opacity 0 on the page)
  const probe = () => {
    applyPose(pose(1000, cur));
    const ms: number[] = [];
    for (let i = 0; i < QUALITY.probeFrames; i++) {
      const a = performance.now();
      renderer.render(scene, camera);
      gl.finish();
      ms.push(performance.now() - a);
    }
    const kept = ms.slice(QUALITY.probeDiscard).sort((x, y) => x - y);
    return (kept[(kept.length - 1) >> 1] + kept[kept.length >> 1]) / 2;
  };
  let probeMs = probe();
  if (probeMs > QUALITY.probeMedianMs) {
    stepped = true;
    size();
    probeMs = probe();
    if (probeMs > QUALITY.probeMedianMs) {
      post({ type: "fail", reason: "slow", probeMs: +probeMs.toFixed(2) });
      return null;
    }
  }

  const freeze = typeof init.freezeAt === "number" && isFinite(init.freezeAt) ? init.freezeAt : null;
  applyPose(pose(freeze ?? 0, cur));
  render();
  if (freeze !== null) mode = "frozen";
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  if (lost) return null;
  post({ type: "ready", dpr: +ratio.toFixed(3), probeMs: +probeMs.toFixed(2) });

  /** Redraws the current state once (theme or size changes outside the build). */
  const redraw = () => {
    if (mode === "building") return; // the next build frame picks it up
    writeShadows(cur);
    render();
  };
  return (m: In) => {
    switch (m.type) {
      case "go":
        if (mode !== "idle" || lost) return;
        mode = "building";
        raf = requestAnimationFrame(buildFrame);
        return;
      case "vis":
        vis.onscreen = m.onscreen !== false;
        vis.hidden = m.hidden === true;
        // Off screen or hidden mid-build: jump to rest, draw one frame, stop.
        if (mode === "building" && (!vis.onscreen || vis.hidden)) finish(false);
        return;
      case "size":
        cssW = Math.max(1, Number(m.cssW) || cssW);
        cssH = Math.max(1, Number(m.cssH) || cssH);
        size();
        redraw();
        return;
      case "theme":
        applyTheme(m.dark === true);
        redraw();
        return;
      case "lamp":
        if (mode !== "rest" || lost) return;
        target.az = Number(m.az);
        target.el = Number(m.el);
        if (!raf) {
          lampLast = -1;
          raf = requestAnimationFrame(lampFrame);
        }
        return;
      case "stats": {
        const info = renderer.info;
        post({
          type: "stats",
          frames: renders + ticks,
          renders,
          ticks,
          mode,
          dpr: ratio,
          buffer: [bufW, bufH],
          programs: info.programs ? info.programs.length : 0,
          calls: info.render.calls,
          triangles: info.render.triangles,
          textures: info.memory.textures,
          decalVerts: writer.count,
          jsMs: jsMs.summary(),
          gapMs: gaps.summary(),
          light: [+light.az.toFixed(2), +light.el.toFixed(2)],
        });
        return;
      }
    }
  };
}

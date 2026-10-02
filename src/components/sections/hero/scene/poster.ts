/**
 * BUILD-TIME ONLY: never imported by app code. scripts/build-hero-poster.mjs bundles
 * this file for Node and writes posters.generated.ts from it (`--check` in the build).
 *
 * Projects the scene model into one inline SVG per pose, at the pose's reference box,
 * with the camera's frozen frame, so the drawing registers with the canvas:
 *   <g class="plan">  hairlines, crop marks and the pin's "+" (frame 0 of the build)
 *   <g class="built"> soft shadows, then the parts far to near, then the pin (rest)
 * One copy of the geometry serves both themes: fills are classes, coloured per theme
 * in a scoped <style> with the scene's own Lambert model at the rest light.
 * Spec: _build/specs/hero-3d-spec.md 3.2, 7.4.
 */
import { PerspectiveCamera, Vector3 } from "three";
import { LIGHT, PAGE, PIECES, PIN, POSES, PX, THEMES, type PoseKey } from "./model";
import { blockFaces, blockShadowHull, currentBase, hull2, lightDir, linHex, pinFaces, pinShadowHull, shade, wx, wz, type Face, type V2, type V3 } from "./geom";

/** viewBox units per CSS px at the reference box: integer coordinates stay sub-pixel exact. */
const S = 10;
const REST_KS = new Float64Array(PIECES.length).fill(1);

/**
 * One `d` attribute: integer points in ABSOLUTE coordinates ("M x yL x yZ"). Measured
 * on 2 Oct 2026: relative coordinates cut the raw text by 13% but ADDED 220 B of gzip
 * across both posters, because an absolute vertex repeats verbatim (a part's base
 * corners are its plan footprint's corners, faces share edges with their silhouette)
 * and gzip finds the repeats; relative deltas never repeat.
 */
export function pathData() {
  let s = "";
  const api = {
    add(pts: readonly V2[], close: boolean) {
      s += "M" + pts.map((q) => q.join(" ")).join("L") + (close ? "Z" : "");
      return api;
    },
    toString: () => s,
  };
  return api;
}

/** The camera exactly as render.ts sets it up, at the reference aspect. */
export function poseCamera(key: PoseKey): PerspectiveCamera {
  const def = POSES[key];
  const cam = new PerspectiveCamera(def.fov, def.ref, 0.1, 200);
  cam.position.set(def.position[0], def.position[1], def.position[2]);
  cam.lookAt(def.target[0], def.target[1], def.target[2]);
  cam.updateMatrixWorld();
  return cam;
}

export function buildPoster(key: PoseKey): { svg: string; classes: number } {
  const def = POSES[key];
  const id = key === "desk" ? "h3dd" : "h3dp";
  const cam = poseCamera(key);
  const W = def.vw * S, H = def.vh * S;
  const eye = cam.position.toArray();
  const v = new Vector3();
  const P = (q: readonly number[]): V2 => {
    v.set(q[0], q[1], q[2]).project(cam);
    return [Math.round(((v.x + 1) / 2) * W), Math.round(((1 - v.y) / 2) * H)];
  };
  const proj = (pts: readonly (readonly number[])[]) => pts.map(P);
  const poly = (pts: readonly (readonly number[])[]) => String(pathData().add(proj(pts), true));
  const add = (a: readonly number[], o: readonly number[]): V3 => [a[0] + o[0], a[1] + o[1], a[2] + o[2]];
  const centre = (f: Face, o: readonly number[]) => add(f.pts.reduce<V3>((m, q) => [m[0] + q[0] / f.pts.length, m[1] + q[1] / f.pts.length, m[2] + q[2] / f.pts.length], [0, 0, 0]), o);
  const facing = (f: Face, o: readonly number[]) => {
    const c = centre(f, o);
    return f.n[0] * (eye[0] - c[0]) + f.n[1] * (eye[1] - c[1]) + f.n[2] * (eye[2] - c[2]) > 0;
  };
  const dist = (q: readonly number[]) => Math.hypot(eye[0] - q[0], eye[1] - q[1], eye[2] - q[2]);
  const L = lightDir(LIGHT.az, LIGHT.el);

  // One class per distinct pair of fills (light, dark), computed with the scene's own
  // Lambert model at the rest light: faces that shade alike share a class, which keeps
  // a many-sided pin (the teardrop) inside the poster budget.
  const themes = Object.entries(THEMES);
  const cls = new Map<string, { name: string; fills: string[] }>();
  const C = (role: string, _kind: string, n: readonly number[]) => {
    const fills = themes.map(([, th]) => linHex(shade(th[role as keyof typeof th] as string, n, L, th)));
    const k = fills.join("|");
    if (!cls.has(k)) cls.set(k, { name: "f" + cls.size, fills });
    return cls.get(k).name;
  };

  // ── the plan: every footprint at y = 0, the page edge, crop marks and the pin's "+"
  const hw = (PAGE.w / 2) * PX, hd = (PAGE.d / 2) * PX;
  const lines = pathData();
  for (const p of PIECES) {
    const x0 = wx(p.x), x1 = wx(p.x + p.w), z0 = wz(p.y), z1 = wz(p.y + p.d);
    lines.add(proj([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]), true);
  }
  lines.add(proj([[-hw, 0, -hd], [-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd]]), true);
  const px = wx(PIN.x), pz = wz(PIN.y), m = 7 * PX;
  lines.add(proj([[px - m, 0, pz], [px + m, 0, pz]]), false).add(proj([[px, 0, pz - m], [px, 0, pz + m]]), false);
  const gap = 6 * PX, len = 14 * PX, marks = pathData();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * hw, z = sz * hd;
    marks.add(proj([[x + sx * gap, 0, z], [x + sx * (gap + len), 0, z]]), false).add(proj([[x, 0, z + sz * gap], [x, 0, z + sz * (gap + len)]]), false);
  }
  const plan = `<path class="lm" d="${marks}"/><path class="ln" d="${lines}"/>`;

  // ── built: shadows first, then the parts far to near; stacked parts after their base
  const lay = PIECES.map((p, i) => ({ p, i, cx: wx(p.x + p.w / 2), cz: wz(p.y + p.d / 2), base: currentBase(i, REST_KS) * PX }));
  const shadows = (qs: typeof lay) => {
    const d = pathData();
    for (const q of qs) d.add(proj(blockShadowHull(q.cx, q.cz, q.p.w, q.p.d, q.p.h, 1, L).map(([x, z]) => [x, q.base, z])), true);
    return `<g class="sh" filter="url(#${id}-b1)"><path d="${d}"/></g>`;
  };
  const part = (q: (typeof lay)[number]) => {
    const off: V3 = [q.cx, q.base, q.cz];
    const faces = blockFaces(q.p.w, q.p.d, q.p.h, 1).filter((f) => facing(f, off));
    const top = faces.find((f) => f.kind === "top") || faces[0];
    // Seam fix: the silhouette first, in the TOP face's colour, so no hairline of the
    // ground shows between two faces of a dark bar. That underlay IS the top face (a
    // convex block's visible faces never overlap), so the top is not drawn again: 386 B
    // less gzip for the pair, and each top edge is one anti-aliased edge over the
    // underlay, as the canvas's MSAA draws it, not a second edge drawn on top.
    const sil = hull2(faces.flatMap((f) => f.pts.map((q3) => P(add(q3, off)))));
    let out = `<path class="${C(q.p.role, top.kind, top.n)}" d="${pathData().add(sil, true)}"/>`;
    for (const f of faces) if (f !== top) out += `<path class="${C(q.p.role, f.kind, f.n)}" d="${poly(f.pts.map((q3) => add(q3, off)))}"/>`;
    return out;
  };
  const ground = lay.filter((q) => !q.p.on).sort((a, b) => dist([b.cx, b.base, b.cz]) - dist([a.cx, a.base, a.cz]));
  let built = shadows(ground);
  const faceAz = def.az + PIN.turn;
  const pin = pinFaces(faceAz);
  const pinTip: V3 = [px, (currentBase(lay.findIndex((q) => q.p.id === PIN.on), REST_KS) + PIECES.find((p) => p.id === PIN.on).h) * PX, pz];
  for (const q of ground) {
    built += part(q);
    // Lower first, then far to near: where two parts on the same support cross (the roads),
    // the taller one (roadB, 3.6 px over roadA's 3) is on top, as the canvas's depth test has it.
    const kids = lay.filter((k) => k.p.on === q.p.id).sort((a, b) => a.p.h - b.p.h || dist([b.cx, b.base, b.cz]) - dist([a.cx, a.base, a.cz]));
    if (kids.length) built += shadows(kids);
    if (q.p.id === PIN.on) {
      const corners = pin[0].pts.concat(pin[1].pts);
      const hull = pinShadowHull(px, pz, corners, 0, L).map(([x, z]) => [x, pinTip[1], z]);
      built += `<g class="sp" filter="url(#${id}-b1)"><path d="${poly(hull)}"/></g>`;
    }
    for (const k of kids) built += part(k);
    if (q.p.id === PIN.on) {
      const vis = pin.filter((f) => facing(f, pinTip)).sort((a, b) => dist(centre(b, pinTip)) - dist(centre(a, pinTip)));
      for (const f of vis) built += `<path class="${C("pin", f.kind, f.n)}" d="${poly(f.pts.map((q3) => add(q3, pinTip)))}"/>`;
    }
  }

  // ── per-theme fills, computed with the scene's own Lambert model at the rest light
  const css: string[] = [];
  for (const [ti, [name, th]] of themes.entries()) {
    const s = `.${name} .${id} `;
    const rules: string[] = [];
    for (const c of cls.values()) rules.push(`${s}.${c.name}{fill:${c.fills[ti]}}`);
    const sh = linHex(th.shadow);
    rules.push(`${s}.sh{fill:${sh};opacity:${th.shadowA}}`, `${s}.sp{fill:${sh};opacity:${+(th.shadowA * 0.9).toFixed(3)}}`);
    rules.push(`${s}.ln{fill:none;stroke:${th.line};stroke-opacity:${th.lineA};stroke-width:1;vector-effect:non-scaling-stroke}`);
    rules.push(`${s}.lm{fill:none;stroke:${th.line};stroke-opacity:${+Math.min(1, th.lineA * 1.6).toFixed(2)};stroke-width:1;vector-effect:non-scaling-stroke}`);
    css.push(rules.join(""));
  }
  const defs = `<defs><filter id="${id}-b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${2.2 * S}"/></filter></defs>`;
  const svg =
    `<svg class="${id}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">` +
    `<style>${css.join("")}</style>${defs}<g class="plan">${plan}</g><g class="built">${built}</g></svg>`;
  return { svg: svg.replace(/"/g, "'"), classes: cls.size };
}

/**
 * The prototype's framing fit (hero3d-d2 scene.js framePose): fits the page corners
 * and the landed pin's top into the reference box with the pose's margin, from its
 * az / el. Run it after changing POSES.*.az or .el, then freeze the result in model.ts.
 */
export function fitPose(key: PoseKey): { position: number[]; target: number[] } {
  const def = POSES[key];
  const cam = new PerspectiveCamera(def.fov, def.ref, 0.1, 200);
  const hw = (PAGE.w / 2) * PX, hd = (PAGE.d / 2) * PX;
  const pts: Vector3[] = [];
  for (const x of [-hw, hw]) for (const z of [-hd, hd]) pts.push(new Vector3(x, PAGE.t * PX, z));
  const map = PIECES.find((p) => p.id === PIN.on);
  pts.push(new Vector3(wx(PIN.x), (map.h + PIN.h) * PX, wz(PIN.y)));
  const a = (def.az * Math.PI) / 180, e = (def.el * Math.PI) / 180;
  const dir = new Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
  const target = new Vector3(0, 0.05, 0);
  let dist = 14;
  for (let i = 0; i < 60; i++) {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) {
      const q = p.clone().project(cam);
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    const lim = 1 - 2 * def.margin;
    const s = Math.max((x1 - x0) / 2 / lim, (y1 - y0) / 2 / lim);
    const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * dist, halfW = halfH * cam.aspect;
    target.addScaledVector(right, ((x0 + x1) / 2) * halfW).addScaledVector(up, ((y0 + y1) / 2) * halfH);
    dist *= 0.5 + 0.5 * s;
  }
  cam.position.copy(target).addScaledVector(dir, dist);
  return { position: cam.position.toArray().map((x) => +x.toFixed(4)), target: target.toArray().map((x) => +x.toFixed(4)) };
}

/** The whole text of posters.generated.ts. */
export function generatedSource(): { text: string; sizes: Record<string, number> } {
  const desk = buildPoster("desk"), phone = buildPoster("phone");
  const text =
    "// GENERATED by scripts/build-hero-poster.mjs, do not edit.\n" +
    "// From src/components/sections/hero/scene/model.ts, geom.ts and poster.ts. Regenerate: npm run hero:posters\n" +
    "// The drawn plan and built still of the home hero, one inline SVG per pose (spec 7.4).\n" +
    `export const DESK_SVG = ${JSON.stringify(desk.svg)};\n` +
    `export const PHONE_SVG = ${JSON.stringify(phone.svg)};\n`;
  return { text, sizes: { desk: desk.svg.length, phone: phone.svg.length, deskClasses: desk.classes, phoneClasses: phone.classes } };
}

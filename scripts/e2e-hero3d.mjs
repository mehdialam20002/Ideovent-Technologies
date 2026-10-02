/**
 * The home hero's 3D layer ("Plan to Page"), end to end: spec _build/specs/hero-3d-spec.md 11.
 *
 *   npm run build
 *   node scripts/e2e-hero3d.mjs [--dist dist] [--port 5197] [--gl swiftshader|gpu] [--shots <dir>]
 *                               [--only screens,3d,reduced,nowebgl,forced,gated,spa,theme,resize,lamp,a11y,hidden,chunkfail,lose]
 *                               [--screens 390x844,1280x800] [--no-dev]
 *
 * Serves --dist with `vite preview` on --port (strict) and drives the system Chrome
 * through playwright-core, one browser at a time; never the Playwright MCP browser.
 * The context-loss case needs the dev-only ?hero3d=lose, so it runs last, against the
 * dev server on the same port (skip with --no-dev). Both servers are stopped at the end.
 *
 * GL: --gl swiftshader (default) is CPU raster, so it proves correctness and isolation,
 * not GPU cost; --gl gpu uses whatever GPU headless Chrome gets. Two findings of 1 Oct
 * 2026 (Chrome 154) shape the launches:
 *   - --disable-3d-apis --disable-webgl remove WebGL from the page but NOT from a
 *     worker's OffscreenCanvas; the no-WebGL case adds --disable-gpu, which does.
 *   - navigator.connection.effectiveType is an estimate that headless Chrome lowers to
 *     "3g" after a slow load, which gates the build; the 3D cases pin it to "4g" (the
 *     gates themselves are tested with their own stubs).
 */
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import fs from "node:fs";
import os from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "package.json"));
const { chromium } = require("playwright-core");
const esbuild = require("esbuild");

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : dflt;
};
const DIST = resolve(root, arg("dist", "dist"));
const PORT = Number(arg("port", "5197"));
const GL = arg("gl", "swiftshader");
const SHOTS = arg("shots", null) ? resolve(root, arg("shots")) : null;
const ONLY = arg("only", "") ? arg("only").split(",") : null;
const ONLY_SCREENS = arg("screens", "") ? arg("screens").split(",") : null;
const NO_DEV = argv.includes("--no-dev");
const BASE = `http://127.0.0.1:${PORT}`;
const want = (k) => !ONLY || ONLY.includes(k);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const GL_ARGS = {
  swiftshader: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
  gpu: ["--ignore-gpu-blocklist"],
  nowebgl: ["--disable-3d-apis", "--disable-webgl", "--disable-gpu"],
};

/* ── results ──────────────────────────────────────────────────────────────── */
const results = [];
const measures = {};
function check(ok, name, detail = "") {
  results.push({ ok: !!ok, name, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}
const note = (k, v) => {
  measures[k] = v;
  console.log(`      ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
};

/* ── the scene's own numbers, for projecting sample points (bundled from the TS) ── */
async function loadScene() {
  const entry = join(os.tmpdir(), `hero3d-e2e-entry-${process.pid}.ts`);
  const scene = resolve(root, "src/components/sections/hero/scene").replace(/\\/g, "/");
  fs.writeFileSync(entry, `export * from "${scene}/model";\nexport { wx, wz, meetFov, lightDir, currentBase, shade, linHex } from "${scene}/geom";\nexport { poseCamera } from "${scene}/poster";\nexport { Vector3 } from "three";\n`);
  const out = await esbuild.build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", write: false, logLevel: "warning", nodePaths: [join(root, "node_modules")] });
  const tmp = join(os.tmpdir(), `hero3d-e2e-scene-${process.pid}.mjs`);
  fs.writeFileSync(tmp, out.outputFiles[0].text);
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    fs.rmSync(tmp, { force: true });
    fs.rmSync(entry, { force: true });
  }
}
const S = await loadScene();

/* ── servers ──────────────────────────────────────────────────────────────── */
const vite = await import(pathToFileURL(join(root, "node_modules/vite/dist/node/index.js")).href);
async function startPreview() {
  if (!fs.existsSync(join(DIST, "index.html"))) throw new Error(`no build at ${DIST}: run npm run build first`);
  const s = await vite.preview({ root, configFile: join(root, "vite.config.ts"), logLevel: "warn", build: { outDir: DIST }, preview: { port: PORT, strictPort: true, host: "127.0.0.1" } });
  return () => new Promise((r) => s.httpServer.close(r));
}
async function startDev() {
  // vite.preview() above set NODE_ENV=production in this process; the dev server would keep
  // it and pre-bundle React's production build ("_jsxDEV is not a function").
  process.env.NODE_ENV = "development";
  const s = await vite.createServer({
    root, configFile: join(root, "vite.config.ts"), logLevel: "warn",
    cacheDir: join(os.tmpdir(), "ideovent-hero3d-e2e-vite-cache"), // never the shared node_modules/.vite
    server: { port: PORT, strictPort: true, host: "127.0.0.1" },
  });
  await s.listen();
  return () => s.close();
}

/* ── browsers and pages ───────────────────────────────────────────────────── */
async function launch(args) {
  const cands = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe"].filter(Boolean);
  for (const p of cands) {
    try {
      return await chromium.launch({ executablePath: p, headless: true, args });
    } catch {
      /* next */
    }
  }
  return chromium.launch({ channel: "chrome", headless: true, args });
}
const SCREENS = {
  "390x844": { width: 390, height: 844, dpr: 3, touch: true },
  "768x1024": { width: 768, height: 1024, dpr: 2, touch: true },
  "1280x800": { width: 1280, height: 800, dpr: 1, touch: false },
  "1920x1080": { width: 1920, height: 1080, dpr: 1, touch: false },
  "360x740": { width: 360, height: 740, dpr: 3, touch: true },
  "1024x768": { width: 1024, height: 768, dpr: 1, touch: false },
  "1366x660": { width: 1366, height: 660, dpr: 1, touch: false },
  "1440x900": { width: 1440, height: 900, dpr: 1, touch: false },
};
/** A page with its own context: theme, media emulation, stubs, request and console logs. */
async function openPage(browser, screen, o = {}) {
  const sc = typeof screen === "string" ? SCREENS[screen] : screen;
  const ctx = await browser.newContext({
    viewport: { width: sc.width, height: sc.height },
    deviceScaleFactor: sc.dpr,
    isMobile: sc.touch,
    hasTouch: sc.touch,
    reducedMotion: o.reduced ? "reduce" : "no-preference",
    forcedColors: o.forced ? "active" : "none",
  });
  const theme = o.theme || "light";
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem("ideovent-theme-v2", t);
    } catch {
      /* ignore */
    }
    window.__perf = { lcp: null, cls: 0, shifts: [], longtasks: [] };
    const po = (type, fn) => {
      try {
        new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true });
      } catch {
        /* unsupported */
      }
    };
    po("largest-contentful-paint", (e) => (window.__perf.lcp = { ms: Math.round(e.startTime), tag: e.element ? e.element.tagName.toLowerCase() : "?" }));
    po("layout-shift", (e) => {
      if (e.hadRecentInput) return;
      window.__perf.cls += e.value;
      window.__perf.shifts.push({ v: e.value, inHero: (e.sources || []).some((s) => s.node && s.node.closest && s.node.closest(".h3d-box")) });
    });
    po("longtask", (e) => window.__perf.longtasks.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }));
  }, theme);
  if (o.net4g !== false) {
    await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, "connection", { configurable: true, get: () => ({ effectiveType: "4g", saveData: false, addEventListener() {}, removeEventListener() {} }) }));
  }
  for (const s of o.init || []) await ctx.addInitScript(s);
  const page = await ctx.newPage();
  const log = { requests: [], errors: [], warnings: [] };
  page.on("request", (r) => log.requests.push(r.url().replace(BASE, "")));
  page.on("console", (m) => {
    if (m.type() === "error") log.errors.push(m.text().slice(0, 240));
    if (m.type() === "warning") log.warnings.push(m.text().slice(0, 240));
  });
  page.on("pageerror", (e) => log.errors.push("pageerror: " + String(e).slice(0, 240)));
  page.log = log;
  page.ctx = ctx;
  await page.bringToFront(); // a background tab is document.hidden: no go, no frames
  return page;
}
const close = (page) => page.ctx.close();
const hero = (page) => page.evaluate(() => ({ ...window.__hero3d }));

/** waitForFunction that says what the hero was doing when it gave up. */
async function waitHero(page, fn, timeout = 30000) {
  try {
    await page.waitForFunction(fn, null, { timeout });
  } catch (e) {
    const s = await page.evaluate(() => JSON.stringify({ hero: window.__hero3d, hidden: document.hidden, url: location.href })).catch(() => "?");
    throw new Error(`${String(e.message).split("\n")[0]}; state ${s}; console ${page.log.errors.concat(page.log.warnings).slice(0, 5).join(" | ")}`);
  }
}
/** Waits (3 s at most) for the shown pose's built group to finish its cross-fade. */
const fadedIn = (page) =>
  page
    .waitForFunction(() => {
      const box = document.querySelector(".h3d-box");
      const desk = getComputedStyle(box.querySelector(".h3d-desk")).display !== "none";
      const g = box.querySelector(desk ? ".h3d-desk .built" : ".h3d-phone .built");
      return g && getComputedStyle(g).opacity === "1";
    }, null, { timeout: 3000 })
    .catch(() => {});
/** Waits for the hero to settle: built, a still, or (frozen) ready. */
async function settle(page, timeout = 30000) {
  await waitHero(page, () => {
    const h = window.__hero3d;
    if (!h) return false;
    if (h.path !== "3d") return true;
    return /hero3d=t:/.test(location.search) ? h.readyMs != null : h.builtMs != null;
  }, timeout);
  await page.evaluate(() => document.fonts.ready);
}

/** Rects (document coordinates), the h1's lines by word tops (as h1wrap/run5.mjs), state. */
const geometry = (page) =>
  page.evaluate(() => {
    const box = document.querySelector(".h3d-box");
    const section = box.closest("section");
    const h1 = section.querySelector("h1");
    const sub = h1.nextElementSibling && h1.nextElementSibling.tagName === "P" ? h1.nextElementSibling : null;
    const btns = (sub || h1).nextElementSibling;
    const trust = section.querySelector("ul");
    const r = (e) => {
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), b: Math.round(b.bottom + scrollY), r: Math.round(b.right) };
    };
    const lines = [];
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.textContent))) {
        const rg = document.createRange();
        rg.setStart(n, m.index);
        rg.setEnd(n, m.index + m[0].length);
        const top = Math.round(rg.getClientRects()[0].top);
        let line = lines.find((l) => Math.abs(l.top - top) < 4);
        if (!line) lines.push((line = { top, words: [] }));
        line.words.push(m[0]);
      }
    }
    lines.sort((a, b) => a.top - b.top);
    const built = box.querySelector(getComputedStyle(box.querySelector(".h3d-desk")).display !== "none" ? ".h3d-desk .built" : ".h3d-phone .built");
    return {
      box: r(box), h1: r(h1), sub: r(sub), btns: r(btns), trust: r(trust),
      lines: lines.map((l) => l.words.join(" ")),
      h1px: parseFloat(getComputedStyle(h1).fontSize),
      sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight,
      state: box.dataset.state, canvases: section.querySelectorAll("canvas").length,
      boxDisplay: getComputedStyle(box).display, builtOpacity: built ? getComputedStyle(built).opacity : null,
      deskShown: getComputedStyle(box.querySelector(".h3d-desk")).display !== "none",
    };
  });

/* spec 6.3 and 6.4 */
const LINES = {
  small: ["Your customers look", "you up before they", "call. We build the", "website they find."],
  mid: ["Your customers look you up", "before they call.", "We build the website they find."],
  large: ["Your customers look you up", "before they call.", "We build the website", "they find."],
};
/*
  390x844 differs from the spec 6.4 table (buttons 409-517, band 545-815, trust 839), and
  on purpose. That row was measured on the prototype, which never loaded Inter: there the
  sub paragraph ran 3 lines, and with Inter (and with its fallback) it runs 4 at 360 to
  412 px (17 px, 358 px wide; the same with text-wrap pretty or plain wrap, measured
  2 Oct 2026). So everything under the h1 sits one sub line (28 px) lower. The spec fixes
  the sub's classes, the button stack and the band's mt-7, so the table, not the page, is
  what changes; 11.1.5's "band starts by y 560" is checked as what it was for: the whole
  band on the first screen, so the build starts at once (go at 60% visible).
*/
const EXPECT = {
  "390x844": { h1: [136, 274], btns: [437, 545], box: { w: 390, h: 270, x: 0, y: 573, b: 843 }, trust: 867 },
  "768x1024": { h1: [144, 274], btns: [385, 433], box: { w: 600, h: 415, x: 32, y: 465, b: 880 }, trust: 904 },
  "1024x768": { h1: [160, 315], box: { w: 373, h: 448, x: 611, y: 160, b: 608 } },
  "1280x800": { h1: [160, 354], btns: [465, 513], box: { w: 472, h: 566, x: 760, y: 160, b: 726 }, trust: 537 },
  "1366x660": { box: { w: 403, h: 484, y: 160, b: 644 }, h1px: 46 },
  "1440x900": { h1: [160, 359], btns: [470, 518], box: { w: 472, h: 566, x: 840, y: 160, b: 726 }, trust: 542 },
  "1920x1080": { h1: [160, 359], btns: [470, 518], box: { w: 472, h: 566, x: 1080, y: 160, b: 726 }, trust: 542 },
  "360x740": {},
};
const near = (a, b, tol = 8) => Math.abs(a - b) <= tol;
const meets = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;

/** The checks of spec 11.1 on one screen. */
function checkLayout(name, g, still) {
  const e = EXPECT[name] || {};
  const w = SCREENS[name].width;
  check(g.sw <= g.iw, `${name}: no horizontal scroll`, `scrollWidth ${g.sw}, innerWidth ${g.iw}`);
  const hits = ["h1", "sub", "btns", "trust"].filter((k) => meets(g.box, g[k]));
  check(!hits.length, `${name}: the art box overlaps no text`, hits.join(","));
  const want = w < 640 ? LINES.small : w < 1024 ? LINES.mid : LINES.large;
  check(JSON.stringify(g.lines) === JSON.stringify(want), `${name}: h1 breaks as spec 6.3`, g.lines.join(" / "));
  const pos = [];
  if (e.h1) pos.push(["h1 top", g.h1.y, e.h1[0]], ["h1 bottom", g.h1.b, e.h1[1]]);
  if (e.btns) pos.push(["buttons top", g.btns.y, e.btns[0]], ["buttons bottom", g.btns.b, e.btns[1]]);
  if (e.box) for (const k of Object.keys(e.box)) pos.push(["box " + k, g.box[k], e.box[k]]);
  if (e.trust) pos.push(["trust top", g.trust.y, e.trust]);
  if (e.h1px) pos.push(["h1 px", g.h1px, e.h1px]);
  const off = pos.filter(([, got, exp]) => !near(got, exp));
  if (pos.length) check(!off.length, `${name}: positions match 6.4 (8 px)`, off.length ? off.map(([k, got, exp]) => `${k} ${got} vs ${exp}`).join("; ") : `${pos.length} values`);
  if (name === "1024x768") check(g.btns.h < 60 && g.btns.w <= 523, `${name}: buttons on one row inside the 523 px column`, `${g.btns.w} x ${g.btns.h}`);
  if (name === "390x844") check(g.h1.b <= g.ih && g.btns.b <= g.ih && g.box.b <= g.ih, `${name}: h1, both buttons and the whole band in the first screen`, `buttons end ${g.btns.b}, band ${g.box.y}-${g.box.b} of ${g.ih}`);
  if (w >= 1024 && ["1366x660", "1280x800", "1440x900"].includes(name)) check(g.box.b <= g.ih, `${name}: art box bottom inside the first screen`, `${g.box.b} <= ${g.ih}`);
  check(still ? g.canvases === 0 : g.canvases <= 1, `${name}: ${still ? "no canvas on the still path" : "at most one canvas"}`, `${g.canvases}`);
}

/* ── pixels: screenshots decoded inside a page with createImageBitmap ──────── */
function pixels(tool, op, a, b, extra) {
  return tool.evaluate(
    async ({ op, a, b, extra }) => {
      const dec = async (b64) => {
        const bmp = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const x = c.getContext("2d");
        x.drawImage(bmp, 0, 0);
        return x.getImageData(0, 0, bmp.width, bmp.height);
      };
      const A = await dec(a);
      if (op === "diff") {
        const B = await dec(b);
        const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
        let n = 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = (y * A.width + x) * 4, j = (y * B.width + x) * 4;
            if (Math.abs(A.data[i] - B.data[j]) > 16 || Math.abs(A.data[i + 1] - B.data[j + 1]) > 16 || Math.abs(A.data[i + 2] - B.data[j + 2]) > 16) n++;
          }
        return { n, total: w * h, frac: n / (w * h) };
      }
      // "sample": the mean of a (2r+1)^2 patch around each point
      return extra.points.map(([px, py]) => {
        const s = [0, 0, 0];
        let k = 0;
        for (let y = Math.round(py) - extra.r; y <= Math.round(py) + extra.r; y++)
          for (let x = Math.round(px) - extra.r; x <= Math.round(px) + extra.r; x++) {
            const i = (y * A.width + x) * 4;
            s[0] += A.data[i]; s[1] += A.data[i + 1]; s[2] += A.data[i + 2];
            k++;
          }
        return s.map((v) => Math.round(v / k));
      });
    },
    { op, a: a.toString("base64"), b: b ? b.toString("base64") : null, extra },
  );
}
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/**
 * What the title1 top face should render (spec 11.2 token check): the theme's token,
 * except in a channel where the ink albedo is already 255 and the scene's own Lambert
 * model (geom.ts shade(), which the posters use) still falls short of the token. There
 * the most the lights can give is the target. One case today: dark ink, blue, where the
 * warm dark key light (#FFF4E2 x 2.6) caps a top face at 249 against the token's 251.
 */
function topTarget(theme) {
  const T = S.THEMES[theme];
  const best = hexRgb(S.linHex(S.shade(T.ink, [0, 1, 0], S.lightDir(S.LIGHT.az, S.LIGHT.el), T)));
  const albedo = hexRgb(T.ink), token = hexRgb(T.tokenTop);
  return token.map((v, i) => (albedo[i] === 255 && best[i] < v ? best[i] : v));
}

/** Where the title1 top-face centre and the pin's lit (front) face land in the box, device px. */
function samplePoints(pose, boxW, boxH, dpr) {
  const def = S.POSES[pose];
  const cam = S.poseCamera(pose);
  cam.aspect = boxW / boxH;
  cam.fov = S.meetFov(def.fov, def.ref, cam.aspect);
  cam.updateProjectionMatrix();
  const t1 = S.PIECES.find((p) => p.id === "title1");
  const map = S.PIECES.find((p) => p.id === "map");
  const a = ((def.az + S.PIN.turn) * Math.PI) / 180;
  const pinFront = [S.wx(S.PIN.x) + (S.PIN.t / 2) * S.PX * Math.sin(a), (map.h + 30) * S.PX, S.wz(S.PIN.y) + (S.PIN.t / 2) * S.PX * Math.cos(a)];
  return [[S.wx(t1.x + t1.w / 2), t1.h * S.PX, S.wz(t1.y + t1.d / 2)], pinFront].map((q) => {
    const v = new S.Vector3(q[0], q[1], q[2]).project(cam);
    return [((v.x + 1) / 2) * boxW * dpr, ((1 - v.y) / 2) * boxH * dpr];
  });
}
const clipOf = (g) => ({ x: g.box.x, y: g.box.y, width: g.box.w, height: g.box.h });
/** The 3D path's lazy chunks: the main-thread runtime, the worker entry and the render chunk (three.js). */
const LAZY = /\/runtime-[\w-]+\.js|hero3d\.worker|\/render-/;
const noSamples = (page) => !page.log.requests.some((u) => u.includes("/home/sample-"));
const REQUIRED = ["390x844", "768x1024", "1280x800", "1920x1080"];
const MATCH = { "390x844": "phone", "1280x800": "desk" };

/** Spec 11.1: every screen, both themes; rest, still and (required screens) frozen states. */
async function screens(browser) {
  const tool = await browser.newPage();
  await tool.goto("about:blank");
  for (const name of Object.keys(SCREENS).filter((n) => !ONLY_SCREENS || ONLY_SCREENS.includes(n))) {
    const sc = SCREENS[name];
    for (const theme of ["light", "dark"]) {
      const tag = `${name} ${theme}`;
      // ── rest: the natural end of a real run
      const p = await openPage(browser, name, { theme });
      await p.goto(BASE + "/", { waitUntil: "load" });
      await settle(p);
      await p.waitForTimeout(150);
      const h = await hero(p);
      const g = await geometry(p);
      check(h.path === "3d" && g.canvases === 1 && g.state === "plan", `${tag}: 3D path ran to rest`, `${h.path} ${h.reason} canvas ${g.canvases}, ready ${h.readyMs} ms, built ${h.builtMs - h.goMs} ms after go`);
      if (theme === "light") checkLayout(name, g, false);
      // `last` is missing when the 3D path ended in a still (the check above says so).
      const stats = (await p.evaluate(() => window.__hero3d.stats().then(() => window.__hero3d.last))) || {};
      note(`${tag} 3D`, { readyMs: h.readyMs, probeMs: h.probeMs, dpr: h.dpr, buildMs: h.builtMs - h.goMs, buffer: stats.buffer, programs: stats.programs, calls: stats.calls, triangles: stats.triangles, textures: stats.textures, jsMs: stats.jsMs, gapMs: stats.gapMs });
      const perf = await p.evaluate(() => window.__perf);
      check(perf.lcp && perf.lcp.tag === "h1", `${tag}: LCP element is the h1`, perf.lcp ? `${perf.lcp.tag} at ${perf.lcp.ms} ms` : "none");
      check(perf.cls <= 0.05 && !perf.shifts.some((s) => s.inHero), `${tag}: CLS <= 0.05, none from the art`, `CLS ${perf.cls.toFixed(4)}`);
      const restPng = await p.screenshot({ clip: clipOf(g) });
      if (SHOTS && REQUIRED.includes(name)) await p.screenshot({ path: join(SHOTS, `${sc.width}-${theme}-rest.png`) });
      check(!p.log.errors.length && noSamples(p), `${tag}: no console errors, no /home/sample- request (3D)`, p.log.errors.join(" | "));
      await close(p);

      // ── the built still (?hero3d=off)
      const q = await openPage(browser, name, { theme });
      await q.goto(BASE + "/?hero3d=off", { waitUntil: "load" });
      await settle(q);
      const gs = await geometry(q);
      const hs = await hero(q);
      check(hs.path === "still-off" && gs.state === "built" && gs.builtOpacity === "1", `${tag}: ?hero3d=off shows the built still`, `${hs.path}, opacity ${gs.builtOpacity}`);
      if (theme === "light") checkLayout(name, gs, true);
      check(!q.log.requests.some((u) => LAZY.test(u)), `${tag}: the still downloads no runtime, worker or three.js`);
      const stillPng = await q.screenshot({ clip: clipOf(gs) });
      if (SHOTS && REQUIRED.includes(name)) await q.screenshot({ path: join(SHOTS, `${sc.width}-${theme}-still.png`) });
      check(!q.log.errors.length && noSamples(q), `${tag}: no console errors, no /home/sample- request (still)`, q.log.errors.join(" | "));
      await close(q);

      // ── canvas at rest against the drawn still (spec 11.2 visual match), and the tokens
      const d = await pixels(tool, "diff", restPng, stillPng);
      const pose = g.deskShown ? "desk" : "phone";
      const label = `${tag}: canvas rest vs drawn still, ${(d.frac * 100).toFixed(2)}% of pixels differ by > 16`;
      if (MATCH[name]) check(d.frac <= 0.02, label, `${d.n} of ${d.total}`);
      else note(label, `${d.n} of ${d.total} (informational)`);
      if (MATCH[name]) {
        const pts = samplePoints(pose, g.box.w, g.box.h, sc.dpr);
        const [top, pin] = await pixels(tool, "sample", restPng, null, { points: pts, r: 2 });
        const T = S.THEMES[theme];
        const want = topTarget(theme);
        const dt = top.map((v, i) => v - want[i]), dp = pin.map((v, i) => v - hexRgb(T.tokenPin)[i]);
        const capped = want.some((v, i) => v !== hexRgb(T.tokenTop)[i]) ? `; at its ceiling rgb(${want})` : "";
        check(dt.every((v) => Math.abs(v) <= 3), `${tag}: title1 top face renders ${T.tokenTop} (+-3${capped})`, `rgb(${top}) diff ${dt}`);
        check(dp.every((v) => Math.abs(v) <= 3), `${tag}: the pin's lit face renders ${T.tokenPin} (+-3)`, `rgb(${pin}) diff ${dp}`);
      }

      // ── frozen states: plan (t:0) and mid-build (t:650, t:1000, t:1400)
      if (REQUIRED.includes(name)) {
        for (const t of [0, 650, 1000, 1400]) {
          const f = await openPage(browser, name, { theme });
          await f.goto(`${BASE}/?hero3d=t:${t}`, { waitUntil: "load" });
          await settle(f);
          await f.waitForTimeout(100);
          const gf = await geometry(f);
          const hf = await hero(f);
          check(hf.path === "3d" && hf.goMs == null && gf.canvases === 1, `${tag}: frozen at t:${t}`, `${hf.path} ${hf.reason}`);
          if (SHOTS) await f.screenshot({ path: join(SHOTS, `${sc.width}-${theme}-t${t}.png`), clip: clipOf(gf) });
          check(!f.log.errors.length, `${tag}: no console errors at t:${t}`, f.log.errors.join(" | "));
          await close(f);
        }
      }
    }
  }
  await tool.close();
}

/** 3D: the loop stops at rest (stats unchanged across 2 s), and off screen too. */
async function variant3d(browser) {
  for (const name of ["1280x800", "390x844"]) {
    const p = await openPage(browser, name);
    await p.goto(BASE + "/", { waitUntil: "load" });
    await settle(p);
    const h = await hero(p);
    check(h.path === "3d" && h.builtMs != null, `3D ${name}: built`, `${h.path}, go to built ${h.builtMs - h.goMs} ms`);
    const a = await p.evaluate(() => window.__hero3d.stats());
    await p.waitForTimeout(2000);
    const b = await p.evaluate(() => window.__hero3d.stats());
    check(a === b, `3D ${name}: no frame after rest (stats unchanged across 2 s)`, `${a} -> ${b}`);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1000);
    const c = await p.evaluate(() => window.__hero3d.stats());
    check(c === b, `3D ${name}: no frame off screen`, `${b} -> ${c}`);
    const lt = await p.evaluate(() => window.__perf.longtasks);
    note(`3D ${name} main-thread long tasks during the page's life`, lt);
    check(!p.log.errors.length, `3D ${name}: no console errors`, p.log.errors.join(" | "));
    await close(p);
  }
}

/** Reduced motion: the still from the first frame, nothing downloaded; switched on mid-build: still at once. */
async function variantReduced(browser) {
  const p = await openPage(browser, "390x844", { reduced: true });
  await p.goto(BASE + "/", { waitUntil: "load" });
  await settle(p);
  const g = await geometry(p), h = await hero(p);
  check(h.path === "still-reduced" && g.state === "built" && g.canvases === 0, "reduced motion: built still at first render, no canvas", `${h.path} ${g.state}`);
  await p.waitForTimeout(3000); // past the start rule's 2.5 s cap
  check(!p.log.requests.some((u) => LAZY.test(u)), "reduced motion: no request to the runtime, the worker or the render chunk");
  check(!p.log.errors.length, "reduced motion: no console errors", p.log.errors.join(" | "));
  await close(p);

  const m = await openPage(browser, "1280x800");
  await m.goto(BASE + "/", { waitUntil: "load" });
  await waitHero(m, () => window.__hero3d && window.__hero3d.goMs != null);
  await m.waitForTimeout(400); // mid-build
  // Measured from the media change itself: the page's own listener (added after the
  // hero's) samples on the next frame.
  await m.evaluate(() => {
    window.__rm = new Promise((res) =>
      matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () =>
        requestAnimationFrame(() => {
          const box = document.querySelector(".h3d-box");
          res({ canvases: box.querySelectorAll("canvas").length, state: box.dataset.state, path: window.__hero3d.path, xfade: box.classList.contains("h3d-xfade") });
        }), { once: true }),
    );
  });
  await m.emulateMedia({ reducedMotion: "reduce" });
  const r = await m.evaluate(() => window.__rm);
  check(r.canvases === 0 && r.state === "built" && r.path === "still-reduced" && !r.xfade, "reduced motion switched on mid-build: canvas gone and still shown within one frame, no fade", JSON.stringify(r));
  check(!m.log.errors.length, "reduced motion mid-build: no console errors", m.log.errors.join(" | "));
  await close(m);
}

/** No WebGL2: the worker entry only, never three.js; the still cross-fades in; the session flag is set. */
async function variantNoWebgl() {
  const browser = await launch(GL_ARGS.nowebgl);
  try {
    const p = await openPage(browser, "1280x800");
    await p.goto(BASE + "/", { waitUntil: "load" });
    await settle(p);
    await fadedIn(p); // the 250 ms cross-fade
    const h = await hero(p), g = await geometry(p);
    const flag = await p.evaluate(() => sessionStorage.getItem("ideovent-hero3d"));
    check(h.path === "still-fail" && h.reason === "nowebgl", "no WebGL2: path still-fail (nowebgl)", `${h.path} ${h.reason}`);
    check(p.log.requests.some((u) => /hero3d\.worker/.test(u)) && !p.log.requests.some((u) => /\/render-/.test(u)), "no WebGL2: worker entry requested, render chunk never", p.log.requests.filter((u) => /hero3d|render-/.test(u)).join(", "));
    check(g.state === "built" && g.builtOpacity === "1" && g.canvases === 0, "no WebGL2: the built still reaches opacity 1", `${g.state} ${g.builtOpacity}`);
    check(flag === "off", "no WebGL2: sessionStorage ideovent-hero3d = off", String(flag));
    check(!p.log.errors.length, "no WebGL2: no console errors", p.log.errors.join(" | "));
    await close(p);
  } finally {
    await browser.close();
  }
}

/** Forced colours: the art is hidden; the text hero stands alone. */
async function variantForced(browser) {
  const p = await openPage(browser, "1280x800", { forced: true });
  await p.goto(BASE + "/", { waitUntil: "load" });
  await settle(p);
  const g = await geometry(p);
  check(g.boxDisplay === "none" && g.h1.h > 100 && g.btns.h > 0 && g.lines.length === 4, "forced colours: art box display none, text hero intact", `${g.boxDisplay}, h1 ${g.h1.h} px`);
  check(!p.log.requests.some((u) => LAZY.test(u)), "forced colours: no runtime, no worker");
  await close(p);
}

/** Save-Data and low memory: the still, zero bytes of the worker and three.js. */
async function variantGated(browser) {
  const stubs = {
    "save-data": () => Object.defineProperty(Navigator.prototype, "connection", { configurable: true, get: () => ({ saveData: true, effectiveType: "4g" }) }),
    memory: () => Object.defineProperty(Navigator.prototype, "deviceMemory", { configurable: true, get: () => 2 }),
  };
  for (const [reason, stub] of Object.entries(stubs)) {
    const p = await openPage(browser, "390x844", { net4g: reason !== "save-data", init: [stub] });
    await p.goto(BASE + "/", { waitUntil: "load" });
    await settle(p);
    await p.waitForTimeout(3000);
    const h = await hero(p), g = await geometry(p);
    check(h.path === "still-gated" && h.reason === reason && g.state === "built", `gated (${reason}): built still`, `${h.path} ${h.reason}`);
    check(!p.log.requests.some((u) => LAZY.test(u)), `gated (${reason}): no runtime, worker or three.js bytes`);
    await close(p);
  }
}

/** Client-side link to `href` (a hidden menu link is fine: Link handles the click). */
const go = (p, href) =>
  p.evaluate((h) => {
    const a = [...document.querySelectorAll("a[href]")].find((x) => x.getAttribute("href") === h);
    if (a) a.click();
    else {
      history.pushState({}, "", h);
      dispatchEvent(new PopStateEvent("popstate"));
    }
  }, href);

/** SPA: home, /about, home ten times: the still after the first visit, one context at most; a reload replays. */
async function variantSpa(browser) {
  const p = await openPage(browser, "1280x800");
  await p.goto(BASE + "/", { waitUntil: "load" });
  await settle(p);
  check((await hero(p)).path === "3d", "SPA: first visit builds in 3D");
  const paths = [];
  let maxCanvas = 0;
  for (let i = 0; i < 10; i++) {
    await go(p, "/about");
    // /about is a lazy chunk: the home page (and the hero) stays mounted until it renders
    await p.waitForFunction(() => location.pathname === "/about" && !document.querySelector(".h3d-box"), null, { timeout: 15000 });
    await p.waitForTimeout(150);
    await go(p, "/");
    await p.waitForFunction(() => location.pathname === "/" && window.__hero3d && document.querySelector(".h3d-box"), null, { timeout: 15000 });
    await p.waitForTimeout(150);
    paths.push((await hero(p)).path);
    maxCanvas = Math.max(maxCanvas, await p.evaluate(() => document.querySelectorAll("canvas").length));
  }
  check(paths.every((x) => x === "still-revisit"), "SPA: every return to / shows the still (still-revisit)", paths.join(","));
  check(maxCanvas <= 1 && !p.log.warnings.concat(p.log.errors).some((t) => /Too many active WebGL contexts/i.test(t)), "SPA: at most one canvas, no 'Too many active WebGL contexts'", `max canvases ${maxCanvas}`);
  await p.reload({ waitUntil: "load" });
  await settle(p);
  check((await hero(p)).path === "3d", "SPA: a full reload replays the build");
  check(!p.log.errors.length, "SPA: no console errors", p.log.errors.join(" | "));
  await close(p);
}

/** Theme toggle mid-build and at rest: the title1 top face follows to the other theme. */
async function variantTheme(browser) {
  const tool = await browser.newPage();
  await tool.goto("about:blank");
  const p = await openPage(browser, "1280x800", { theme: "light" });
  await p.goto(BASE + "/", { waitUntil: "load" });
  await waitHero(p, () => window.__hero3d && window.__hero3d.goMs != null);
  await p.waitForTimeout(500);
  const toggle = async () => {
    const ok = await p.evaluate(() => {
      const b = document.querySelector('button[aria-label^="Switch to"]');
      if (b) b.click();
      return !!b;
    });
    if (!ok) await p.evaluate(() => document.documentElement.classList.toggle("dark"));
  };
  const top = async () => {
    const g = await geometry(p);
    const png = await p.screenshot({ clip: clipOf(g) });
    const [pt] = samplePoints("desk", g.box.w, g.box.h, 1);
    return (await pixels(tool, "sample", png, null, { points: [pt], r: 2 }))[0];
  };
  const dist = (a, hex) => Math.max(...a.map((v, i) => Math.abs(v - hexRgb(hex)[i])));
  await toggle(); // to dark, mid-build
  await settle(p);
  await p.waitForTimeout(200);
  const d = await top();
  check(dist(d, S.THEMES.dark.tokenTop) <= 8 && dist(d, S.THEMES.light.tokenTop) > 60, "theme toggled mid-build: title1 top follows to dark", `rgb(${d}) vs ${S.THEMES.dark.tokenTop}`);
  await toggle(); // back to light, at rest
  await p.waitForTimeout(300);
  const l = await top();
  check(dist(l, S.THEMES.light.tokenTop) <= 3, "theme toggled at rest: title1 top back to light", `rgb(${l}) vs ${S.THEMES.light.tokenTop}`);
  check(!p.log.errors.length, "theme toggle: no console errors", p.log.errors.join(" | "));
  await close(p);
  await tool.close();
}

/** The desktop lamp (spec 5.1): the light follows the cursor near the scene, eases, stops; far away it rests. */
async function variantLamp(browser) {
  const p = await openPage(browser, "1280x800");
  await p.goto(BASE + "/", { waitUntil: "load" });
  await settle(p);
  const g = await geometry(p);
  const cx = g.box.x + g.box.w / 2, cy = g.box.y + g.box.h / 2;
  const last = () => p.evaluate(() => window.__hero3d.stats().then(() => window.__hero3d.last));
  await p.mouse.move(cx, cy);
  await p.mouse.move(cx + 0.8 * (g.box.w / 2), cy - 0.8 * (g.box.h / 2), { steps: 6 });
  await p.waitForTimeout(1500);
  const s1 = await last();
  const want = { az: S.LIGHT.az + S.LAMP.az * 0.8, el: S.LIGHT.el + S.LAMP.el * 0.8 };
  check(near(s1.light[0], want.az, 0.1) && near(s1.light[1], want.el, 0.1), "lamp: the light follows the cursor over the scene", `light ${s1.light} vs ${want.az}, ${want.el}`);
  const a = s1.frames;
  await p.waitForTimeout(1000);
  const b = (await last()).frames;
  check(a === b, "lamp: 0 fps once eased", `${a} -> ${b}`);
  await p.mouse.move(20, cy, { steps: 6 }); // far left: beyond 1.6 half-sizes, weight 0
  await p.waitForTimeout(1500);
  const s2 = await last();
  check(near(s2.light[0], S.LIGHT.az, 0.1) && near(s2.light[1], S.LIGHT.el, 0.1), "lamp: no effect far from the scene (rest angles)", `light ${s2.light}`);
  check(s2.calls === 21 && s2.programs === 2 && s2.textures === 0 && s2.triangles <= 1500, "scene budget: 2 programs, 21 draw calls, <= 1,500 triangles, 0 textures", `${s2.programs} programs, ${s2.calls} calls, ${s2.triangles} triangles, ${s2.textures} textures`);
  check(!p.log.errors.length, "lamp: no console errors", p.log.errors.join(" | "));
  await close(p);
}

/** Keyboard and screen readers (spec 5.2): the art is hidden from both; Tab goes CTA, WhatsApp, then out of the hero. */
async function variantA11y(browser) {
  const p = await openPage(browser, "1280x800");
  await p.goto(BASE + "/", { waitUntil: "load" });
  await settle(p);
  const a = await p.evaluate(() => {
    const box = document.querySelector(".h3d-box");
    const svgs = [...box.querySelectorAll("svg")];
    return {
      hidden: box.getAttribute("aria-hidden"),
      svgs: svgs.length,
      unfocusable: svgs.every((s) => s.getAttribute("focusable") === "false" && s.getAttribute("aria-hidden") === "true"),
      words: box.querySelectorAll("title,desc,text,image,a,button,input,[tabindex]").length,
      pointer: getComputedStyle(box).pointerEvents,
    };
  });
  check(a.hidden === "true" && a.svgs === 2 && a.unfocusable && a.words === 0 && a.pointer === "none", "a11y: art aria-hidden, SVGs focusable=false, no title/desc/text/image or focusable inside, no pointer events", JSON.stringify(a));
  const seq = [];
  await p.evaluate(() => document.querySelector("section h1").setAttribute("tabindex", "-1"));
  await p.evaluate(() => document.querySelector("section h1").focus());
  for (let i = 0; i < 3; i++) {
    await p.keyboard.press("Tab");
    seq.push(await p.evaluate(() => {
      const el = document.activeElement;
      return { inArt: !!el.closest(".h3d-box"), inHero: !!el.closest("section") && el.closest("section") === document.querySelector(".h3d-box").closest("section"), text: (el.textContent || "").trim().slice(0, 30) };
    }));
  }
  await p.evaluate(() => document.querySelector("section h1").removeAttribute("tabindex"));
  check(!seq.some((s) => s.inArt) && /free website check/i.test(seq[0].text) && /WhatsApp/.test(seq[1].text) && !seq[2].inHero, "a11y: Tab order CTA, WhatsApp, then the next section; nothing in the art", seq.map((s) => s.text).join(" > "));
  await close(p);
  // What a screen reader hears for the h1, at each layout. Chrome's accessibility tree
  // drops a space-only text node next to a display:none <br>, which once made the
  // phone name "call.We build the websitethey find." (Hero.tsx keeps every space
  // inside a text node that has words). The two-word tails are glued with a no-break
  // space, which a screen reader reads as a space, so both sides are compared with
  // every run of white space (no-break included) as one space.
  for (const name of ["390x844", "768x1024", "1280x800"]) {
    const q = await openPage(browser, name);
    await q.goto(BASE + "/", { waitUntil: "load" });
    await settle(q);
    const cdp = await q.ctx.newCDPSession(q);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const h1 = nodes.find((n) => n.role && n.role.value === "heading" && (n.properties || []).some((x) => x.name === "level" && x.value.value === 1));
    const text = await q.evaluate(() => document.querySelector("section h1").textContent.replace(/\s+/g, " ").trim());
    const heard = h1 ? h1.name.value.replace(/\s+/g, " ").trim() : "";
    check(h1 && heard === text && / call\. We /.test(text) && / website they /.test(text), `a11y ${name}: the h1's accessible name keeps every space`, h1 ? JSON.stringify(h1.name.value) : "no h1");
    await cdp.detach();
    await close(q);
  }
}

/** Tab hidden mid-build (spec 4.2): jump to rest, one frame, stop, post built; no frames while hidden. */
async function variantHidden(browser) {
  // Headless Chrome never hides a background tab, so the page's view of visibility is
  // stubbed and a real visibilitychange event is sent: the same path a hidden tab takes.
  const stub = () => {
    let hidden = false;
    Object.defineProperty(Document.prototype, "hidden", { configurable: true, get: () => hidden });
    Object.defineProperty(Document.prototype, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
    window.__setHidden = (v) => {
      hidden = v;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  };
  const p = await openPage(browser, "1280x800", { init: [stub] });
  await p.goto(BASE + "/", { waitUntil: "load" });
  await waitHero(p, () => window.__hero3d && window.__hero3d.goMs != null);
  await p.waitForTimeout(300); // mid-build
  await p.evaluate(() => window.__setHidden(true));
  await p.waitForTimeout(400);
  const h = await hero(p);
  check(h.builtMs != null && h.builtMs - h.goMs < 1500, "hidden mid-build: jumps to rest and posts built", `built ${h.builtMs - h.goMs} ms after go`);
  const a = await p.evaluate(() => window.__hero3d.stats());
  await p.waitForTimeout(1500);
  const b = await p.evaluate(() => window.__hero3d.stats());
  check(a === b, "hidden: no frames while the tab is hidden", `${a} -> ${b}`);
  await p.evaluate(() => window.__setHidden(false));
  await p.waitForTimeout(300);
  const g = await geometry(p), h2 = await hero(p);
  check(h2.path === "3d" && g.canvases === 1 && g.state === "plan" && !p.log.errors.length, "hidden: back in front, the rest frame stays, no error", `${h2.path} canvas ${g.canvases}`);
  await close(p);
}

/**
 * The main-thread runtime chunk fails to load (a deploy removed it, the network dropped):
 * HeroScene's guarded import() shows the still with the cross-fade, sets the session flag,
 * and nothing reaches RouteErrorBoundary (no reload, no error panel, the page stays).
 */
async function variantChunkFail(browser) {
  const p = await openPage(browser, "1280x800");
  await p.route(/\/runtime-[\w-]+\.js/, (r) => r.abort());
  await p.goto(BASE + "/", { waitUntil: "load" });
  await settle(p);
  await fadedIn(p);
  const h = await hero(p), g = await geometry(p);
  const flag = await p.evaluate(() => sessionStorage.getItem("ideovent-hero3d"));
  // A reload would clear this marker; RouteErrorBoundary's panel would replace the h1.
  await p.evaluate(() => (window.__sameDocument = true));
  await p.waitForTimeout(1500);
  const page = await p.evaluate(() => ({ same: window.__sameDocument === true, h1: !!document.querySelector("section h1") }));
  check(h.path === "still-fail" && h.reason === "chunk-error" && g.state === "built" && g.builtOpacity === "1" && g.canvases === 0, "runtime chunk fails: the built still, path still-fail (chunk-error)", `${h.path} ${h.reason} ${g.state} ${g.builtOpacity}`);
  check(flag === "off" && page.same && page.h1 && !p.log.requests.some((u) => /hero3d\.worker|\/render-/.test(u)), "runtime chunk fails: session flag set, no reload, page intact, no worker or three.js", `flag ${flag}, ${JSON.stringify(page)}`);
  check(!p.log.errors.some((e) => /^pageerror/.test(e)), "runtime chunk fails: no uncaught error", p.log.errors.join(" | "));
  await close(p);
}

/** Crossing 1024 px swaps to the other pose's built still: no replay, no error. */
async function variantResize(browser) {
  for (const [from, to, pose] of [[{ width: 1280, height: 800 }, { width: 900, height: 800 }, "phone"], [{ width: 900, height: 800 }, { width: 1280, height: 800 }, "desk"]]) {
    const p = await openPage(browser, { ...from, dpr: 1, touch: false });
    await p.goto(BASE + "/", { waitUntil: "load" });
    await settle(p);
    const workers = p.log.requests.filter((u) => /hero3d\.worker/.test(u)).length;
    await p.setViewportSize(to);
    await p.waitForTimeout(400);
    const g = await geometry(p), h = await hero(p);
    const label = `${from.width} -> ${to.width}`;
    check(g.canvases === 0 && g.state === "built" && g.deskShown === (pose === "desk") && h.reason === "pose-swap" && h.pose === pose, `resize ${label}: the ${pose} built still, canvas gone`, `${g.state}, reason ${h.reason}`);
    check(p.log.requests.filter((u) => /hero3d\.worker/.test(u)).length === workers && !p.log.errors.length, `resize ${label}: no replay, no error`, p.log.errors.join(" | "));
    await close(p);
  }
}

/** Context loss (dev server only: ?hero3d=lose): the still, path lost, no session flag. */
async function variantLose(browser) {
  // Warm-up: on a cold cache the dev server only discovers three.js when the worker
  // imports it, and that re-optimisation can outlast the 4 s watchdog. Dev only.
  const w = await openPage(browser, "1280x800");
  await w.goto(BASE + "/?hero3d=force", { waitUntil: "load", timeout: 300000 });
  await waitHero(w, () => window.__hero3d && (window.__hero3d.builtMs != null || window.__hero3d.path !== "3d"), 180000).catch(() => {});
  await close(w);
  const p = await openPage(browser, "1280x800");
  await p.goto(BASE + "/?hero3d=lose", { waitUntil: "load", timeout: 300000 });
  await waitHero(p, () => window.__hero3d && window.__hero3d.path !== "3d", 120000);
  await fadedIn(p);
  const h = await hero(p), g = await geometry(p);
  const flag = await p.evaluate(() => sessionStorage.getItem("ideovent-hero3d"));
  check(h.path === "lost" && g.state === "built" && g.canvases === 0 && g.builtOpacity === "1", "context lost after built: the built still, path lost", `${h.path} (${h.reason}) ${g.state} ${g.builtOpacity}, built at ${h.builtMs}`);
  check(flag === null, "context lost: no session flag (the next load retries)", String(flag));
  check(!p.log.errors.length, "context lost: no console errors", p.log.errors.join(" | "));
  await close(p);
}

/* ── run ──────────────────────────────────────────────────────────────────── */
let stop = await startPreview();
console.log(`hero 3D e2e: ${DIST} on ${BASE}, GL ${GL}`);
try {
  const browser = await launch(GL_ARGS[GL] || GL_ARGS.swiftshader);
  try {
    if (want("3d")) await variant3d(browser);
    if (want("reduced")) await variantReduced(browser);
    if (want("forced")) await variantForced(browser);
    if (want("gated")) await variantGated(browser);
    if (want("spa")) await variantSpa(browser);
    if (want("theme")) await variantTheme(browser);
    if (want("resize")) await variantResize(browser);
    if (want("lamp")) await variantLamp(browser);
    if (want("a11y")) await variantA11y(browser);
    if (want("hidden")) await variantHidden(browser);
    if (want("chunkfail")) await variantChunkFail(browser);
    if (want("screens") || want("match")) await screens(browser);
  } finally {
    await browser.close();
  }
  if (want("nowebgl")) await variantNoWebgl();
  if (want("lose") && !NO_DEV) {
    await stop();
    stop = await startDev();
    const browser2 = await launch(GL_ARGS[GL] || GL_ARGS.swiftshader);
    try {
      await variantLose(browser2);
    } finally {
      await browser2.close();
    }
  }
} catch (e) {
  check(false, "the run itself", String((e && e.stack) || e).slice(0, 600));
} finally {
  await stop();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed${failed.length ? "; FAILED:\n  " + failed.map((f) => `${f.name}  (${f.detail})`).join("\n  ") : ""}`);
if (SHOTS) fs.writeFileSync(join(SHOTS, "e2e-hero3d.json"), JSON.stringify({ gl: GL, results, measures }, null, 1));
process.exit(failed.length ? 1 : 0);

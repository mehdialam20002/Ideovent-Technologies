/**
 * Post-build guard for the home hero's 3D layer. Runs in `npm run build`, after
 * `vite build` and before prerender-heads.
 *
 *   node scripts/check-hero-3d.mjs [--dist <dir>]     (default: $PRERENDER_DIST, else dist)
 *
 * PRERENDER_DIST is the folder `npm run gate` builds into when GATE_OUT_DIR is set
 * (scripts/gate.mjs sets it for the whole build chain), so this check reads the
 * build that was just made there, never a stale dist/.
 *
 * Fails the build when:
 *   - three.js reached the critical path: any chunk index.html loads, or that one
 *     of those statically imports, contains "KHR_parallel_shader_compile";
 *   - the render chunk (three.js and the scene, the one that contains that string)
 *     is over 150,000 B gzip or 600,000 B raw, or imports any other chunk;
 *   - the worker entry (hero3d.worker-*.js) is over 3,000 B gzip, or carries Vite's
 *     preload helper (it would reach for `document`, which a worker has not got);
 *   - the main-thread runtime (scene/runtime.ts, the chunk that starts the worker) is
 *     on the critical path or holds three.js: HeroScene fetches it with import() when
 *     the start rule fires, so the home page's first render does not pay for it.
 * And prints the entry chunk's gzip size, for the PR to state the delta against the
 * build before the change (budget: +12 KB gzip). Spec 7.10 and 10.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const di = args.indexOf("--dist");
const dist = path.resolve(root, di >= 0 ? args[di + 1] : process.env.PRERENDER_DIST || "dist");
const assets = path.join(dist, "assets");
const MARK = "KHR_parallel_shader_compile";
const BUDGET = { renderGz: 150000, renderRaw: 600000, workerGz: 3000 };

const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const failures = [];

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
// Every script and modulepreload the page loads, by its file name under assets/.
const loaded = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+?\.js)"/g)].map((m) => path.basename(m[1]));
const entry = [...html.matchAll(/<script\b[^>]*?type="module"[^>]*?\bsrc="([^"]+?\.js)"/g)].map((m) => path.basename(m[1]))[0];
if (!entry) failures.push("no entry <script type=module> in index.html");

// The critical path: those chunks plus everything they import statically (never import()).
const critical = new Set();
const queue = [...loaded];
while (queue.length) {
  const f = queue.pop();
  if (critical.has(f) || !fs.existsSync(path.join(assets, f))) continue;
  critical.add(f);
  const src = fs.readFileSync(path.join(assets, f), "utf8");
  for (const m of src.matchAll(/\bimport\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']\.\/([^"']+?\.js)["']/g)) queue.push(m[1]);
}
for (const f of critical) {
  if (fs.readFileSync(path.join(assets, f), "utf8").includes(MARK)) failures.push(`three.js is on the critical path: ${f} contains ${MARK}`);
}

const js = fs.readdirSync(assets).filter((f) => f.endsWith(".js"));
const render = js.filter((f) => fs.readFileSync(path.join(assets, f), "utf8").includes(MARK) && !critical.has(f));
const workers = js.filter((f) => /^hero3d\.worker-.+\.js$/.test(f));
if (render.length !== 1) failures.push(`expected one render chunk containing ${MARK}, found ${render.length}: ${render.join(", ")}`);
if (workers.length !== 1) failures.push(`expected one hero3d.worker-*.js, found ${workers.length}`);
// The main-thread runtime (scene/runtime.ts: the worker, the observers, the lamp) is the
// chunk that names the worker entry. It is fetched when the start rule fires, so it must
// stay off the critical path; inside the entry it would cost every visitor its bytes.
const runtime = js.filter((f) => !workers.includes(f) && workers.some((w) => fs.readFileSync(path.join(assets, f), "utf8").includes(w)));
if (runtime.length !== 1) failures.push(`expected one chunk that starts the worker (scene/runtime.ts), found ${runtime.length}: ${runtime.join(", ")}`);
for (const f of runtime) {
  if (critical.has(f)) failures.push(`the hero runtime ${f} is on the critical path (it must be fetched by import() when the start rule fires)`);
  if (fs.readFileSync(path.join(assets, f), "utf8").includes(MARK)) failures.push(`the hero runtime ${f} contains three.js`);
}

const lines = [];
for (const f of render) {
  const b = fs.readFileSync(path.join(assets, f));
  const g = gz(b);
  lines.push(`render chunk  ${f}: ${b.length} B raw, ${g} B gzip (budget ${BUDGET.renderRaw} raw, ${BUDGET.renderGz} gzip)`);
  if (g > BUDGET.renderGz) failures.push(`render chunk ${f} is ${g} B gzip, over ${BUDGET.renderGz}`);
  if (b.length > BUDGET.renderRaw) failures.push(`render chunk ${f} is ${b.length} B raw, over ${BUDGET.renderRaw}`);
  // The worker's only requests are its own two chunks: the render chunk imports nothing.
  if (/\bimport\s*\(|\bfrom\s*["']\.|\bimport\s*["']\./.test(b.toString("utf8"))) failures.push(`render chunk ${f} imports another chunk (the worker must fetch only its two)`);
}
for (const f of workers) {
  const b = fs.readFileSync(path.join(assets, f));
  const s = b.toString("utf8");
  const g = gz(b);
  lines.push(`worker entry  ${f}: ${b.length} B raw, ${g} B gzip (budget ${BUDGET.workerGz} gzip)`);
  if (g > BUDGET.workerGz) failures.push(`worker entry ${f} is ${g} B gzip, over ${BUDGET.workerGz}`);
  if (/__vitePreload|modulepreload/.test(s)) failures.push(`worker entry ${f} carries Vite's preload helper (it needs document)`);
  if (!render.some((r) => s.includes(r))) failures.push(`worker entry ${f} does not import the render chunk by name`);
}
for (const f of runtime) {
  const b = fs.readFileSync(path.join(assets, f));
  lines.push(`hero runtime  ${f}: ${b.length} B raw, ${gz(b)} B gzip (lazy: fetched when the start rule fires)`);
}
if (entry && fs.existsSync(path.join(assets, entry))) {
  const b = fs.readFileSync(path.join(assets, entry));
  lines.push(`entry chunk   ${entry}: ${b.length} B raw, ${gz(b)} B gzip (${kb(gz(b))}); compare with the build before the change (budget +12 KB gzip)`);
}
let eager = 0;
for (const f of critical) eager += gz(fs.readFileSync(path.join(assets, f)));
const leaked = [...critical].some((f) => fs.readFileSync(path.join(assets, f), "utf8").includes(MARK));
lines.push(`critical path ${critical.size} JS chunks, ${eager} B gzip in all, ${leaked ? "WITH" : "none with"} three.js`);

console.log("hero 3D build check\n  " + lines.join("\n  "));
if (failures.length) {
  console.error("\nFAILED:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("ok");

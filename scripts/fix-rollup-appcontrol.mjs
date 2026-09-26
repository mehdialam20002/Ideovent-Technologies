/**
 * Make Vite work on a Windows machine where App Control blocks the native toolchain.
 *
 *   node scripts/fix-rollup-appcontrol.mjs
 *
 * WHAT HAPPENED, 25 September 2026, mid-afternoon
 * Every `vite` start and `vite build` on this laptop began failing. Three native
 * pieces of the toolchain, all unchanged since 24 September and all fine at 12:45:
 *
 *   node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node
 *       "An Application Control policy has blocked this file" (ERR_DLOPEN_FAILED)
 *   node_modules/@esbuild/win32-x64/esbuild.exe
 *       "spawn UNKNOWN" when Vite starts the esbuild service
 *   node_modules/@swc/core-win32-x64-msvc/*.node
 *       "Failed to load native binding" from @vitejs/plugin-react-swc
 *
 * Windows Smart App Control started refusing unsigned native code from npm. Five
 * workflow agents hit it before anyone noticed, because rollup's error text blames
 * an npm optional-dependency bug that is not what happened.
 *
 * WHAT THIS DOES
 * All three ship WebAssembly builds that are drop-in replacements and never load a
 * native binary: @rollup/wasm-node, esbuild-wasm and @swc/wasm. This installs the
 * matching versions IN ONE npm COMMAND and only then overlays each onto
 * node_modules/{rollup,esbuild,@swc/core}, keeping the package name.
 *
 * The order matters and is why the first version of this file failed: every
 * `npm i --no-save` reconciles the whole tree and reinstalls the native package
 * over a previous overlay. Three installs in sequence undid each other. One
 * install, then three overlays, holds.
 *
 * It is LOCAL ONLY: package.json is untouched, so Vercel (Linux, no App Control)
 * keeps the native builds and their speed. Any later `npm ci` or `npm i` undoes
 * this; run it again, it is idempotent.
 *
 * THE REAL FIX is a Windows setting only Mehdi can change: Settings > Privacy &
 * security > Windows Security > App & browser control > Smart App Control > Off.
 * Turning it off is permanent for this Windows install. Until then, this.
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const nm = (p) => resolve(root, "node_modules", p);

/** Run a one-line node probe in a child so a native load failure cannot kill us. */
function probe(code) {
  const r = spawnSync(process.execPath, ["-e", code], { cwd: root, encoding: "utf8", timeout: 90000 });
  return { ok: r.status === 0, err: (r.stderr || "").slice(0, 300) };
}

const version = (pkg) => JSON.parse(readFileSync(resolve(nm(pkg), "package.json"), "utf8")).version;

const TOOLS = [
  {
    target: "rollup",
    wasm: "@rollup/wasm-node",
    probe: "require('rollup')",
    blocked: /Application Control|ERR_DLOPEN_FAILED|rollup-win32/,
    verify: "const r=require('rollup');process.stdout.write(r.VERSION)",
  },
  {
    target: "esbuild",
    wasm: "esbuild-wasm",
    // transformSync is what Vite calls first; on the native build it spawns the exe.
    probe: "require('esbuild').transformSync('1+1')",
    blocked: /spawn UNKNOWN|Application Control|EACCES|EPERM/,
    verify: "const e=require('esbuild');e.transformSync('1+1');process.stdout.write(e.version)",
  },
  {
    target: "@swc/core",
    wasm: "@swc/wasm",
    probe: "require('@swc/core').transformSync('let a = 1',{jsc:{target:'es2020'}})",
    blocked: /Failed to load native binding|Application Control|ERR_DLOPEN_FAILED/,
    verify: "const s=require('@swc/core');s.transformSync('let a = 1',{jsc:{target:'es2020'}});process.stdout.write('ok')",
  },
];

/* ── 1. Find out which tools are blocked ────────────────────────────────────── */
const todo = [];
let failed = 0;
for (const t of TOOLS) {
  const p = probe(t.probe);
  if (p.ok) {
    console.log(`ok    ${t.target} runs`);
  } else if (t.blocked.test(p.err)) {
    todo.push(t);
  } else {
    console.log(`FAIL  ${t.target} fails for a different reason:\n${p.err}`);
    failed++;
  }
}

if (todo.length) {
  /* ── 2. One npm install for every wasm package that is missing ────────────── */
  const specs = [];
  for (const t of todo) {
    if (existsSync(nm(t.wasm))) continue;
    const v = version(t.target);
    // The wasm builds are published in lockstep. If an exact match was never
    // published, take the latest of the same major.
    const exact = spawnSync("npm", ["view", `${t.wasm}@${v}`, "version"], { cwd: root, encoding: "utf8", shell: true, timeout: 60000 });
    specs.push(exact.status === 0 && exact.stdout.trim() ? `${t.wasm}@${v}` : `${t.wasm}@${v.split(".")[0]}`);
  }
  if (specs.length) {
    console.log(`      installing ${specs.join(" ")}`);
    const r = spawnSync("npm", ["i", "--no-save", "--no-audit", "--no-fund", "--ignore-scripts", ...specs], { cwd: root, encoding: "utf8", shell: true, timeout: 300000 });
    if (r.status !== 0) {
      console.error(`FAIL  npm install\n${(r.stderr || r.stdout || "").slice(0, 500)}`);
      process.exit(1);
    }
  }

  /* ── 3. Overlay each, keeping the original package name ───────────────────── */
  for (const t of todo) {
    const target = nm(t.target);
    if (!existsSync(nm(t.wasm))) {
      console.log(`FAIL  ${t.wasm} did not install`);
      failed++;
      continue;
    }
    const original = version(t.target);
    rmSync(target, { recursive: true, force: true });
    cpSync(nm(t.wasm), target, { recursive: true });
    const pj = resolve(target, "package.json");
    const pk = JSON.parse(readFileSync(pj, "utf8"));
    pk.name = t.target;
    writeFileSync(pj, JSON.stringify(pk, null, 2));
    const again = probe(t.verify);
    console.log(again.ok ? `ok    node_modules/${t.target} now points at ${t.wasm} (native was ${original})` : `FAIL  ${t.target} still does not run:\n${again.err}`);
    if (!again.ok) failed++;
  }

  /* ── 4. Re-probe everything: an overlay must not have broken a neighbour ──── */
  for (const t of TOOLS) {
    const p = probe(t.probe);
    if (!p.ok) {
      console.log(`FAIL  ${t.target} stopped working after the overlays:\n${p.err}`);
      failed++;
    }
  }
}

if (failed) {
  console.log("\nSome tools still do not run. The Windows setting in the header is the remaining fix.");
  process.exit(1);
}
console.log("\nvite dev and vite build should work on this machine now. Slower than native; correct.");

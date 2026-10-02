/**
 * Every gate this site has to pass, in one command.
 *
 *   npm run gate            assumes a dev server on 5199, starts one if absent
 *   npm run gate -- --no-browser   skips the two checks that need a browser
 *
 * For a second checkout (a git worktree) that must not collide with the first:
 *   GATE_PORT=5578          the browser gates use a dev server on that port instead
 *   GATE_OUT_DIR=<folder>   the build gate runs package.json's own build chain with
 *                           `vite build --outDir <folder>` and PRERENDER_DIST=<folder>,
 *                           so the checkout's dist/ is left alone. The chain still
 *                           regenerates public/sitemap.xml and public/robots.txt from
 *                           VITE_PUBLIC_URL, exactly as `npm run build` does.
 *
 * WHY THIS EXISTS
 *
 * The checks were correct and scattered, which meant in practice that the fast
 * ones ran and the slow ones did not. The two that get skipped are the two that
 * catch the defects a person actually sees: the gutter measurement, which is the
 * only thing that catches a section collapsing on a phone, and the edit-lock
 * test, which is the only thing standing between a sent demo and being silently
 * overwritten.
 *
 * Order is deliberate: cheapest and most likely to fail first, so a typo does
 * not cost a four minute build before it is reported.
 *
 * NOTE ON typecheck. It is `tsc -b --force`, never `tsc --noEmit`. The root
 * tsconfig has `"files": []` and uses project references, so `tsc --noEmit`
 * checks ZERO files and exits 0 on a codebase full of type errors. Every
 * "typecheck passed" reported with that command was meaningless.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";

const args = process.argv.slice(2);
const noBrowser = args.includes("--no-browser");
const PORT = Number(process.env.GATE_PORT) || 5199;
const OUT_DIR = process.env.GATE_OUT_DIR || "";

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { stdio: "pipe", shell: true, ...opts });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve({ code, out }));
  });
}

function portOpen(port) {
  return new Promise((resolve) => {
    const s = createConnection({ port, host: "127.0.0.1" });
    s.on("connect", () => { s.end(); resolve(true); });
    s.on("error", () => resolve(false));
    setTimeout(() => { s.destroy(); resolve(false); }, 1500);
  });
}

const GATES = [
  { name: "noindex header", cmd: "node", args: ["scripts/sync-noindex-header.mjs", "--check"],
    why: "a stale rule means pitch pages sent on WhatsApp are indexable" },
  { name: "demo palettes", cmd: "node", args: ["scripts/check-demo-palettes.mjs"],
    why: "a preset below 4.5:1 goes to a director unread by anybody" },
  { name: "no hotlinks", cmd: "node", args: ["scripts/check-no-hotlinks.mjs"],
    why: "a hotlinked image breaks the day the other site moves it" },
  { name: "typecheck", cmd: "npm", args: ["run", "typecheck"],
    why: "tsc -b --force, the only form that checks anything here" },
  { name: "from template", cmd: "node", args: ["scripts/test-from-template.mjs"],
    why: "a duplicated template must carry no fact about the fictional institute onto a real one" },
  // The CRM team (0011). "crm rls" runs the real SQL in PGlite: it needs the dev dependency
  // @electric-sql/pglite, or PGLITE_FROM=<a folder that has it> in the environment.
  { name: "crm rls", cmd: "node", args: ["scripts/test-crm-rls.mjs"],
    why: "the database rules: an intern reads and changes only the leads Mehdi gave them, and never money" },
  { name: "crm access", cmd: "node", args: ["scripts/test-crm-access.mjs"],
    why: "the same rules in the local store and the screens, and their constants still equal the SQL" },
  // The lead page and compose (part 2): what a member sends is true from them, and Mehdi's own text never changes.
  { name: "crm wording", cmd: "node", args: ["scripts/test-crm-wording.mjs"],
    why: "a message an intern sends never claims Mehdi's own work, offers call times or quotes a price" },
  // Meta Lead Ads (0012). "meta rls" and "meta intake" run the real SQL in PGlite, like "crm rls":
  // they need @electric-sql/pglite, or PGLITE_FROM=<a folder that has it>.
  { name: "meta webhook", cmd: "node", args: ["scripts/test-meta-webhook.mjs"],
    why: "a forged or replayed notification reaches nothing, and no secret, token or lead's detail is logged" },
  { name: "meta import", cmd: "node", args: ["scripts/test-meta-import.mjs"],
    why: "Meta's own downloads import as leads, once, and every other sheet imports exactly as before" },
  { name: "meta rls", cmd: "node", args: ["scripts/test-meta-rls.mjs"],
    why: "the intake functions refuse without the token, and a member never reads a Meta lead that is not theirs" },
  { name: "meta intake", cmd: "node", args: ["scripts/test-meta-intake.mjs"],
    why: "a signed webhook against the real SQL: the lead arrives once, a forged one never" },
  { name: "build", cmd: "npm", args: ["run", "build"],
    why: "the deploy runs this, so it fails here or it fails on Vercel" },
  { name: "gutters", cmd: "node", args: ["scripts/measure-gutters.mjs", `http://localhost:${PORT}`],
    browser: true, why: "13 routes at 13 widths: the only check that catches a phone layout collapsing" },
  { name: "edit lock", cmd: "node", args: ["scripts/e2e-demo-lock.mjs", `http://localhost:${PORT}`],
    browser: true, why: "the one feature protecting a sent demo from being overwritten" },
  { name: "saved copy", cmd: "node", args: ["scripts/e2e-cms-snapshot.mjs", `http://localhost:${PORT}`],
    browser: true, why: "a browser that saved once must still see every later deploy" },
];

// GATE_OUT_DIR: the build gate becomes package.json's build chain itself (read at run
// time, so it cannot drift from `npm run build`), with the one `vite build` in it pointed
// at the folder and prerender-heads reading the same folder through PRERENDER_DIST.
if (OUT_DIR) {
  const chain = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts.build;
  const VITE_BUILD = /(^|&& )vite build(?= &&|$)/;
  if (!VITE_BUILD.test(chain)) throw new Error(`GATE_OUT_DIR: package.json's build script no longer has a plain "vite build" step: ${chain}`);
  const build = GATES.find((g) => g.name === "build");
  build.cmd = chain.replace(VITE_BUILD, `$1vite build --outDir "${OUT_DIR}" --emptyOutDir`);
  build.args = [];
  build.env = { PRERENDER_DIST: OUT_DIR };
  console.log(`build gate: into ${OUT_DIR}, not dist/`);
}

let server = null;
const needBrowser = !noBrowser && GATES.some((g) => g.browser);

if (needBrowser && !(await portOpen(PORT))) {
  console.log(`starting a dev server on ${PORT}\n`);
  server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { stdio: "ignore", shell: true, detached: false });
  for (let i = 0; i < 40; i++) {
    if (await portOpen(PORT)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!(await portOpen(PORT))) {
    console.log(`could not start a dev server on ${PORT}. Run the browser gates by hand.`);
  }
}

const failed = [];
for (const g of GATES) {
  if (g.browser && noBrowser) {
    console.log(`skip  ${g.name.padEnd(16)} (--no-browser)`);
    continue;
  }
  process.stdout.write(`      ${g.name.padEnd(16)} ...`);
  const t0 = Date.now();
  const { code, out } = await run(g.cmd, g.args, g.env ? { env: { ...process.env, ...g.env } } : {});
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (code === 0) {
    console.log(`\rok    ${g.name.padEnd(16)} ${secs}s`);
  } else {
    console.log(`\rFAIL  ${g.name.padEnd(16)} ${secs}s`);
    console.log(`        ${g.why}`);
    for (const line of out.trim().split("\n").slice(-14)) console.log("        " + line);
    failed.push(g.name);
  }
}

if (server) server.kill();

console.log("");
if (!failed.length) {
  console.log("every gate passes.");
  process.exit(0);
}
console.log(`${failed.length} gate(s) failed: ${failed.join(", ")}`);
process.exit(1);

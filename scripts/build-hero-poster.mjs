/**
 * The home hero's drawn stills: writes, or checks, posters.generated.ts.
 *
 *   node scripts/build-hero-poster.mjs           regenerate the file (npm run hero:posters)
 *   node scripts/build-hero-poster.mjs --check   exit 1 if the committed file is stale (npm run build)
 *   node scripts/build-hero-poster.mjs --fit     print the camera frames re-fitted from POSES az / el
 *
 * src/components/sections/hero/scene/poster.ts projects the same model the worker draws
 * (model.ts, geom.ts) into one inline SVG per pose: the plan (frame 0 of the build) and
 * the built still that reduced-motion, gated and no-WebGL visitors keep. It is bundled
 * here for Node, in memory, with the esbuild Vite already installs, then imported from a
 * temp file: Node's own type stripping is not relied on (Vercel's Node is not pinned).
 * Budget: both posters together at most 7 KB gzip (spec 7.4).
 */
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import fs from "node:fs";
import os from "node:os";
import zlib from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "src/components/sections/hero/scene/poster.ts");
const OUT = resolve(root, "src/components/sections/hero/scene/posters.generated.ts");
const BUDGET_GZ = 7 * 1024;
const args = process.argv.slice(2);

const require = createRequire(resolve(root, "package.json"));
const esbuild = require("esbuild");
const bundle = await esbuild.build({
  entryPoints: [SRC],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  write: false,
  logLevel: "warning",
});
const tmp = join(os.tmpdir(), `hero-poster-${process.pid}-${Date.now()}.mjs`);
fs.writeFileSync(tmp, bundle.outputFiles[0].text);
let poster;
try {
  poster = await import(pathToFileURL(tmp).href);
} finally {
  fs.rmSync(tmp, { force: true });
}

if (args.includes("--fit")) {
  for (const key of ["desk", "phone"]) console.log(key, JSON.stringify(poster.fitPose(key)));
  process.exit(0);
}

const { text, sizes } = poster.generatedSource();
const gz = (s) => zlib.gzipSync(Buffer.from(s), { level: 9 }).length;
const m = /DESK_SVG = (".*");\nexport const PHONE_SVG = (".*");/.exec(text);
const deskGz = gz(JSON.parse(m[1])), phoneGz = gz(JSON.parse(m[2]));
const summary = `desk ${sizes.desk} B (${deskGz} B gzip), phone ${sizes.phone} B (${phoneGz} B gzip), together ${deskGz + phoneGz} B gzip`;
if (deskGz + phoneGz > BUDGET_GZ) {
  console.error(`hero posters: over the 7 KB gzip budget: ${summary}`);
  process.exit(1);
}

if (args.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  if (current !== text) {
    console.error("hero posters: src/components/sections/hero/scene/posters.generated.ts is stale. Run: npm run hero:posters");
    process.exit(1);
  }
  console.log(`hero posters: up to date (${summary})`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`hero posters: wrote ${OUT.slice(root.length + 1).replace(/\\/g, "/")} (${summary})`);
}

/**
 * The Hindi-in-English-mode check (Mehdi, 26 September 2026: "English karne
 * pe v Hindi me text rehta hai kuch jagah").
 *
 *   node scripts/check-demo-lang.mjs
 *
 * THE RULE (src/lib/demo/site/bilingual.ts): a plain text field on a demo
 * record is English; its Hindi goes in the object's own `hi` block under the
 * same key. So Devanagari anywhere in a template OUTSIDE a `hi` block is the
 * leak: the English page would print it. This walks every template (school,
 * coaching and dental) and
 * fails on each such string, naming the path.
 *
 * It also fails when a `hi` block carries a key its object does not have in
 * English at all (a Hindi-only field), because then the English page falls
 * back to the Hindi. Write the English too.
 *
 * The rendered-DOM half of the check (no Devanagari outside [lang="hi"] on an
 * English page) belongs to the Verify phase's browser run.
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {
      /* next */
    }
  }
  return base;
}

const out = join(tmpdir(), `ideovent-check-demo-lang-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: `export { TEMPLATES, loadTemplate } from "@/lib/demo/templates";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
  plugins: [{
    name: "alias",
    setup(b) {
      b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveTs(join(SRC, a.path.slice(2).split("?")[0])) }));
    },
  }],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

const DEVANAGARI = /[ऀ-ॿ]/;
const failures = [];

function walk(value, path) {
  if (typeof value === "string") {
    if (DEVANAGARI.test(value)) failures.push(`${path}: Hindi in an English field: "${value.slice(0, 50)}"`);
    return;
  }
  if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value)) {
    if (k === "hi") {
      for (const hk of Object.keys(v || {})) {
        const en = value[hk];
        // A LIST field (facilities, stops, documents) keeps its Hindi as a
        // list in the same order (biList in bilingual.ts): fine when the
        // English list has text; a Hindi list with fewer lines than the
        // English would print the missing lines in English on a Hindi page.
        if (Array.isArray(en) && en.some((x) => typeof x === "string" && x.trim())) {
          const hiList = v[hk];
          if (!Array.isArray(hiList)) failures.push(`${path}.hi.${hk}: English is a list but the Hindi is not`);
          else if (en.some((x, i) => typeof x === "string" && x.trim() && !(typeof hiList[i] === "string" && hiList[i].trim())))
            failures.push(`${path}.hi.${hk}: Hindi list is missing lines the English has (${hiList.length} of ${en.length})`);
          continue;
        }
        if (!(typeof en === "string" && en.trim())) failures.push(`${path}.hi.${hk}: Hindi with no English "${hk}", so the English page would show the Hindi`);
      }
      continue;
    }
    walk(v, `${path}.${k}`);
  }
}

for (const meta of M.TEMPLATES) {
  const t = await M.loadTemplate(meta.id);
  walk(t.content, meta.id);
}

for (const f of failures) console.log("FAIL  " + f);
console.log(`\ncheck-demo-lang: ${failures.length} leak${failures.length === 1 ? "" : "s"} across ${M.TEMPLATES.length} templates.`);
process.exit(failures.length ? 1 : 0);

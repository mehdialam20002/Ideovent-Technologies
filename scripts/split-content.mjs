#!/usr/bin/env node
/**
 * Derive the "metadata only" halves of the two large seeded content files.
 *
 * WHY THIS EXISTS
 * ---------------
 * `src/lib/cms/seed.ts` is imported by `main.tsx`, so everything it statically
 * imports lands in the entry chunk — the one file every visitor must download and
 * parse before the homepage can paint. Two of its imports are large and are needed
 * by almost nobody:
 *
 *   src/lib/cms/data/blogs.seed.json   42,575 chars — 89% of it is `content`,
 *                                      the full HTML body of nine articles, read
 *                                      only by /blog/:slug
 *   src/lib/cms/data/legal.seed.json   54,806 chars — 54,064 of it is `body`,
 *                                      the four policy documents, read only by
 *                                      /privacy, /terms, /refund and /disclaimer
 *
 * That is ~92 KB of raw JSON on the critical path of a homepage that renders
 * neither. The fix is to keep the small half static and load the bodies through a
 * dynamic import, which Rollup gives its own chunk.
 *
 * The two *.seed.json files stay exactly as they are — they remain the source of
 * truth, `public/blogs.json` stays byte-identical to `blogs.seed.json`, and
 * `scripts/build-legal.mjs` keeps writing `legal.seed.json` from the Markdown in
 * 03-legal-docs/policies/ without knowing about any of this. This script only
 * *derives* the metadata files, and it runs as part of `npm run build`, so the
 * derived copies cannot drift from their sources.
 *
 * Usage:  node scripts/split-content.mjs [--check]
 *         --check exits non-zero if the committed files are stale, for CI.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "lib", "cms", "data");
const check = process.argv.includes("--check");

const read = (name) => JSON.parse(readFileSync(join(dataDir, name), "utf8"));

/** Blog metadata: everything the /blog grid and the SEO tags need, minus the body. */
function blogsMeta() {
  return read("blogs.seed.json").map(({ content, ...rest }) => rest);
}

/** Legal metadata: the title and effective date of each policy, minus the body. */
function legalMeta() {
  const src = read("legal.seed.json");
  const out = {};
  for (const [kind, doc] of Object.entries(src)) {
    const { body, ...rest } = doc;
    out[kind] = rest;
  }
  return out;
}

const outputs = [
  ["blogs.meta.json", blogsMeta()],
  ["legal.meta.json", legalMeta()],
];

let stale = 0;
for (const [name, value] of outputs) {
  const path = join(dataDir, name);
  const next = JSON.stringify(value, null, 2) + "\n";
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === next) {
    if (!check) console.log(`  = ${name} (unchanged)`);
    continue;
  }
  stale += 1;
  if (check) {
    console.error(`  ! ${name} is out of date — run: node scripts/split-content.mjs`);
    continue;
  }
  writeFileSync(path, next, "utf8");
  console.log(`  → ${name} (${next.length.toLocaleString()} chars)`);
}

if (check && stale) process.exit(1);
if (!check) {
  const bytes = (n) => readFileSync(join(dataDir, n), "utf8").length;
  console.log(
    `content split: ${(bytes("blogs.seed.json") + bytes("legal.seed.json")).toLocaleString()} chars of source → ` +
      `${(bytes("blogs.meta.json") + bytes("legal.meta.json")).toLocaleString()} chars static, the rest deferred`
  );
}

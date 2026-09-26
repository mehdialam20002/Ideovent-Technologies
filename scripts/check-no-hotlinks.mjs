#!/usr/bin/env node
/**
 * Fail the build if any asset is hotlinked from a free public image host.
 *
 * WHY THIS IS A BUILD STEP AND NOT A ONE-OFF SWEEP
 * -----------------------------------------------
 * Every blog cover, both certificate scans and two named interns' photographs
 * used to be served from `i.postimg.cc`. It was not a theoretical risk: the site
 * audit measured one asset timing out after 25.0s, a certificate scan taking
 * 8.24s, two blog covers rendering as empty boxes, and Ankit Kumar's photograph
 * failing to load entirely — on the verification page, whose only job is to look
 * trustworthy. They were moved into the repository.
 *
 * Moving them once fixes it once. The failure mode is that somebody later pastes
 * an image URL into /admin, exports the content JSON and commits it, and the
 * whole thing quietly comes back. So the rule is enforced rather than remembered.
 *
 * What is checked: source, content JSON and the files in public/. What is not:
 * node_modules, dist, and ordinary links to live project sites, which are not
 * assets and are supposed to point elsewhere.
 *
 * Usage:  node scripts/check-no-hotlinks.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Hosts that must never serve an Ideovent asset.
 *
 * The pattern requires a path segment starting with a word character, so prose
 * naming the host — "used to be on i.postimg.cc" — does not trip it. Only an
 * actual asset URL does.
 */
const BANNED = [
  { name: "postimg.cc", re: /\bi?\.?postimg\.cc\/[A-Za-z0-9]/g },
  { name: "unsplash", re: /\bimages\.unsplash\.com\/[A-Za-z0-9]/g },
  { name: "pexels", re: /\bimages\.pexels\.com\/[A-Za-z0-9]/g },
  { name: "imgbb / ibb.co", re: /\bi\.ibb\.co\/[A-Za-z0-9]/g },
  { name: "imgur", re: /\bi\.imgur\.com\/[A-Za-z0-9]/g },
];

const SEARCH_DIRS = ["src", "public", "scripts"];
const SEARCH_FILES = ["index.html"];
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".html", ".css", ".md", ".txt", ".xml", ".webmanifest"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".vite"]);

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (TEXT_EXT.has(extname(entry))) files.push(full);
  }
};
for (const d of SEARCH_DIRS) {
  try {
    walk(join(root, d));
  } catch {
    /* directory absent — fine */
  }
}
for (const f of SEARCH_FILES) {
  try {
    statSync(join(root, f));
    files.push(join(root, f));
  } catch {
    /* absent — fine */
  }
}

const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const { name, re } of BANNED) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split("\n").length;
      hits.push({ file: relative(root, file), line, host: name, snippet: text.slice(m.index, m.index + 60) });
    }
  }
}

if (hits.length) {
  console.error(`\n  ! ${hits.length} asset(s) hotlinked from a free image host:\n`);
  for (const h of hits) console.error(`    ${h.file}:${h.line}  [${h.host}]  ${h.snippet}`);
  console.error(
    `\n    Put the file in public/ (optimised) and reference it by path, or upload it to the\n` +
      `    Supabase media bucket from /admin. See 13-launchpad/CERTIFICATE-SYSTEM.md §4.\n`
  );
  process.exit(1);
}

console.log(`  = no hotlinked assets (${files.length} files checked, ${BANNED.length} hosts)`);

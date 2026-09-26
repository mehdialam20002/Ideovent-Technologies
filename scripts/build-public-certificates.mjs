#!/usr/bin/env node
/**
 * Generate public/certificates.json from the compiled seed — with an ALLOW-LIST.
 *
 * WHY THIS EXISTS
 * ---------------
 * `public/certificates.json` is a legacy copy of the certificate records that
 * predates the CMS. Nothing in src/ imports it any more, but it is still served
 * at https://<site>/certificates.json to anyone who asks, and it was still
 * hand-maintained — which is how it came to publish
 *
 *     "grade": "nn.n"   against the real name of each certified intern
 *
 * long after everyone agreed grades should not be public. A file that has to be
 * remembered is a file that will be forgotten, so it is now derived, not written:
 * one source of truth (src/lib/cms/data/certificates.seed.json) and an explicit
 * list of the fields allowed out.
 *
 * The allow-list is the important part, and it is deliberately an allow-list
 * rather than a deny-list. Adding a private field to the seed can no longer leak
 * it here by default; it has to be named below, on purpose, by someone editing
 * this file.
 *
 * Runs as part of `npm run build`, so the published file cannot drift from the
 * seed.
 *
 * Usage:  node scripts/build-public-certificates.mjs [--check]
 *         --check exits non-zero if the committed file is stale, for CI.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "lib", "cms", "data", "certificates.seed.json");
const out = join(root, "public", "certificates.json");
const check = process.argv.includes("--check");

/**
 * The only keys that may reach the public file.
 * `grade` is not here, and must never be added — see
 * src/lib/cms/types.ts → CertificateGrade for where it lives instead.
 */
const PUBLIC_KEYS = [
  "id",
  "name",
  "designation",
  "programme",
  "duration",
  "issuedAt",
  "issuedBy",
  "project",
  "certificateImage",
  "completion",
  "location",
];

/** Anything matching these is refused outright, loudly, rather than silently dropped. */
const FORBIDDEN_KEYS = ["grade", "score", "marks", "rubric", "profileImage", "email", "phone"];

const records = JSON.parse(readFileSync(src, "utf8"));

const leaks = [];
const publicRecords = records.map((rec) => {
  for (const k of Object.keys(rec)) {
    if (FORBIDDEN_KEYS.includes(k)) leaks.push(`${rec.id}.${k}`);
  }
  const slim = {};
  for (const k of PUBLIC_KEYS) {
    if (rec[k] === undefined) continue;
    // The seed stores asset paths relative to the deploy base ("certificates/x.png").
    // The legacy public file has always used root-relative paths; keep that shape so
    // anything still pointing at it does not break.
    slim[k] =
      k === "certificateImage" && typeof rec[k] === "string" && !/^(https?:|data:|\/)/.test(rec[k])
        ? `/${rec[k]}`
        : rec[k];
  }
  return slim;
});

if (leaks.length) {
  console.error(
    `\n  ! certificates.seed.json contains fields that must not be public: ${leaks.join(", ")}\n` +
      `    They were kept OUT of public/certificates.json, but they are still compiled into the\n` +
      `    JS bundle by src/lib/cms/seed.ts, which every visitor downloads. Remove them from the\n` +
      `    seed. Grades belong in the certificateGrades collection.\n`
  );
  process.exit(1);
}

const next = JSON.stringify(publicRecords, null, 2) + "\n";
const current = existsSync(out) ? readFileSync(out, "utf8") : null;

if (current === next) {
  if (!check) console.log("  = public/certificates.json (unchanged)");
  process.exit(0);
}

if (check) {
  console.error("  ! public/certificates.json is out of date — run: node scripts/build-public-certificates.mjs");
  process.exit(1);
}

writeFileSync(out, next, "utf8");
console.log(
  `  → public/certificates.json (${publicRecords.length} records, ${PUBLIC_KEYS.length} allowed fields, ${next.length} chars)`
);

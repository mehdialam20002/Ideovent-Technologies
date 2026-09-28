/**
 * Unit checks for src/admin/outreach/compose.ts, the pure choices behind the
 * lead screen (28 Sep 2026 repair pass):
 *   - looksLikeNote catches third-person research notes ("The footer reads
 *     'Copyright ... 2022'.") and still lets real sentences through;
 *   - rankTemplates puts Hinglish ahead of English for a Hindi lead (there is
 *     no Hindi e-mail), and keeps exact-language matches first.
 * Bundled with esbuild like test-outreach-engine.mjs; nothing mocked.
 *
 *   node scripts/test-outreach-compose.mjs
 */
import { build } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const resolveTs = (base) => {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {
      /* next */
    }
  }
  return base;
};
const out = join(tmpdir(), `ideovent-test-outreach-compose-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: `export * from "@/admin/outreach/compose";`, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  jsx: "automatic",
  logLevel: "silent",
  plugins: [{ name: "alias", setup: (b) => b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveTs(join(SRC, a.path.slice(2))) })) }],
});
writeFileSync(out, bundled.outputFiles[0].text);
const C = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

let pass = 0;
let fail = 0;
const check = (ok, msg) => {
  if (ok) pass++;
  else {
    fail++;
    console.log("FAIL " + msg);
  }
};

/* looksLikeNote */
const notes = [
  "The footer reads 'Copyright Verma Coaching Academy 2022'.",
  "Their homepage says 'Admissions open 2021-22'.",
  "Copyright 2019 on every page.",
  "curl 27 Sep 2026: HTTP 200, 46 KB",
];
const sentences = [
  "The admissions page of Amberfield Public School does not open on a phone.",
  "Your footer still says Copyright 2022.",
  "not_mobile",
  "Aapki site ka footer abhi bhi 2022 dikhata hai.",
  "",
];
for (const n of notes) check(C.looksLikeNote(n) === true, `note not caught: ${n}`);
for (const s of sentences) check(C.looksLikeNote(s) === false, `sentence taken for a note: ${s}`);
check(C.startingObservation({ observation: notes[0] }) === "", "Verma's footer note starts a message");

/* rankTemplates: a Hindi lead's first e-mail is Hinglish, not English */
const settings = { signature: "Mehdi", whatsappDailyCap: 10, quietStart: "00:00", quietEnd: "00:00", alertOnDemoOpen: false };
const lead = (language) => ({
  id: "t1", instituteName: "Test Vidya Mandir", kind: "school", status: "new", email: "a@b.example",
  website: "https://tvm.example", language, createdAt: "", updatedAt: "",
});
const first = (language, channel) =>
  C.rankTemplates({ lead: lead(language), channel, stage: "first", settings, waToday: 0, observation: "not_mobile" })[0];
const hiMail = first("hi", "email");
check(hiMail && hiMail.language === "hinglish", `hi lead's first e-mail is ${hiMail?.language}`);
const enMail = first("en", "email");
check(enMail && enMail.language === "en", `en lead's first e-mail is ${enMail?.language}`);
const hiWa = first("hi", "whatsapp");
check(!hiWa || hiWa.language !== "en", `hi lead's first WhatsApp is ${hiWa?.language}`);

console.log(`test-outreach-compose: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

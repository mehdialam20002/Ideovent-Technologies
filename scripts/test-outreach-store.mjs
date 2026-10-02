/**
 * Tests the Outreach data layer (src/lib/outreach/store.ts), LOCAL implementation.
 *
 *   node scripts/test-outreach-store.mjs
 *
 * WHAT IS UNDER TEST
 *   1. Phone and email normalisation (+91XXXXXXXXXX, lower-case email).
 *   2. Round trip: upsert, get, list, update keeps createdAt, events, settings,
 *      delete removes the lead AND its events, data sits under
 *      ideovent_outreach_v1 and nowhere near the CMS key ideovent_cms_v1.
 *      Settings (30 Sep 2026): no WhatsApp limit by default, quiet hours 20:00
 *      to 10:00, the approved two-line signature; a row saved with the old
 *      defaults (09:00, the four-line signature) reads as the new ones, and
 *      anything Mehdi chose himself is kept.
 *   3. Duplicate detection across formats ("098100 12345" vs "+91-98100-12345",
 *      "A@B.in" vs "a@b.in"), including the WhatsApp number, with excludeId.
 *   4. CSV import: LEAD-SHEET-TEMPLATE.csv (its placeholder row is skipped),
 *      PROSPECTS-DELHI-NCR.csv (real rows mapped column by column), any
 *      outreach-2026-09-27/LEADS-*.csv, a plain hand-made sheet, duplicates
 *      within a file and against the store, and merge mode.
 *   5. ONE WRITE PER IMPORT (27 Sep 2026): a 30-row import makes exactly one
 *      storage write (local) and exactly one upsert of every row (Supabase,
 *      through a fake client that counts calls); a failed write saves
 *      nothing; the downloadable template CSV imports exactly its one example.
 *   7. DENTAL (28 Sep 2026): every DENTAL_* segment (and CLINIC_DENTAL,
 *      INTL_DENTAL), a type column saying dental / dentist / dental clinic, a
 *      Maps-style dental category (Orthodontist, Oral surgeon), and a dental
 *      name (checked before the school and coaching name rules) map to kind
 *      dental; no school or coaching name, category or row ever does,
 *      including every real CSV in the sales kit; the import template names
 *      the DENTAL segments. What to offer (ICP 5.1, 30 / 70): a pitch cell,
 *      else website_state, becomes the lead's pitch (a Practo-only clinic is a
 *      new-website lead), and nothing is invented without them.
 *
 *   OUTREACH_DENTAL_NEGATIVE=1 node scripts/test-outreach-store.mjs
 *   removes the dental rules from kindFrom and makes pitchFrom ignore the
 *   sheet; the dental and pitch checks must then FAIL.
 *
 *   OUTREACH_SETTINGS_NEGATIVE=1 node scripts/test-outreach-store.mjs
 *   puts quiet hours back to 09:00 and drops the migration of old rows; the
 *   settings checks must then FAIL.
 *
 * Same harness as test-from-template.mjs: esbuild bundles the real TypeScript,
 * nothing is mocked except localStorage (an in-memory StorageLike).
 *
 * PROVING THE TEST CAN FAIL
 *
 *   OUTREACH_NEGATIVE=1 node scripts/test-outreach-store.mjs
 *
 * swaps normalizePhone for one that only trims. Phone matching across
 * formats must then FAIL. If that run passes, the duplicate checks are not
 * reaching the real matching code and a green run means nothing.
 */
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const KIT = resolve(ROOT, "..", "..", "04-sales-kit");
const NEGATIVE = Boolean(process.env.OUTREACH_NEGATIVE);
/* OUTREACH_DENTAL_NEGATIVE=1 removes the dental rules from kindFrom and the sheet's pitch: those checks must then FAIL. */
const DENTAL_NEGATIVE = Boolean(process.env.OUTREACH_DENTAL_NEGATIVE);
/* OUTREACH_SETTINGS_NEGATIVE=1 puts quiet hours back to 09:00 and drops the old-row migration: the settings checks must then FAIL. */
const SETTINGS_NEGATIVE = Boolean(process.env.OUTREACH_SETTINGS_NEGATIVE);

/* ── Bundle the real module ──────────────────────────────────────────────── */

const alias = {
  name: "alias",
  setup(b) {
    /* The Supabase client is swapped for a fake that counts writes (section 5). */
    b.onResolve({ filter: /^@\/lib\/cms\/client$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({
      contents: "export function supabase() { return globalThis.__fakeSupabase; }",
      loader: "js",
    }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEGATIVE || DENTAL_NEGATIVE || SETTINGS_NEGATIVE) {
      b.onLoad({ filter: /outreach[\\/]store\.ts$/ }, (args) => {
        let src = readFileSync(args.path, "utf8");
        if (SETTINGS_NEGATIVE) {
          const migrate = 'if (/^0?9:00$/.test((m.quietEnd || "").trim())) m.quietEnd = DEFAULT_OUTREACH_SETTINGS.quietEnd;';
          if (!src.includes(migrate) || !src.includes('quietEnd: "10:00",')) throw new Error("settings negative control: quiet-hours code not found");
          src = src.replace(migrate, "").replace('quietEnd: "10:00",', 'quietEnd: "09:00",');
        }
        if (NEGATIVE) {
          const sig = "export function normalizePhone(raw?: string | null): string | undefined {";
          if (!src.includes(sig)) throw new Error("negative control: normalizePhone signature not found");
          src = src.replace(sig, sig + "\n  return raw ? raw.trim() || undefined : undefined;");
        }
        if (DENTAL_NEGATIVE) {
          // The dental rules vanish from kindFrom: DENTAL rows and dental names fall back to the old mapping.
          const rules = ['if (isDentalSegment(segment) || [segment, ...types].some(isDentalType)) return "dental";', 'if (looksDental(name)) return "dental";'];
          for (const r of rules) {
            if (!src.includes(r)) throw new Error("dental negative control: rule not found: " + r);
            src = src.replace(r, "");
          }
          // ...and the lead sheet's pitch / website_state is ignored again (every dental row loses its 30 / 70 pitch).
          const pitchSig = "export function pitchFrom(pitch?: string, websiteState?: string): LeadPitch | undefined {";
          if (!src.includes(pitchSig)) throw new Error("dental negative control: pitchFrom signature not found");
          src = src.replace(pitchSig, pitchSig + "\n  return undefined;");
        }
        return { contents: src, loader: "ts" };
      });
    }
  },
};

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}

const out = join(tmpdir(), `ideovent-test-outreach-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: `export * from "@/lib/outreach/store"; export * from "@/lib/outreach/types"; export { CrmAccessError } from "@/lib/outreach/access";`, resolveDir: ROOT, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [alias],
  /* No Supabase URL: the module picks the LOCAL store and never loads the SDK. */
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Assertion plumbing ──────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
function check(ok, message) {
  if (ok) passes++;
  else {
    failures.push(message);
    console.log("FAIL  " + message);
  }
}
function memStorage() {
  const m = new Map();
  return { map: m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
}

/* ── 1. Normalisation ────────────────────────────────────────────────────── */

const phoneCases = [
  ["9810012345", "+919810012345"],
  ["098100 12345", "+919810012345"],
  ["+91-98100-12345", "+919810012345"],
  ["+91 98100 12345", "+919810012345"],
  ["919810012345", "+919810012345"],
  ["0091 98100 12345", "+919810012345"],
  ["+91-11-46571119", "+911146571119"],
  ["011-46508577", "+911146508577"],
  ["", undefined],
];
for (const [raw, want] of phoneCases) {
  check(M.normalizePhone(raw) === want, `normalizePhone(${JSON.stringify(raw)}) = ${M.normalizePhone(raw)}, want ${want}`);
}
check(M.isIndianMobile("098100 12345") && !M.isIndianMobile("011-46508577"), "isIndianMobile tells mobiles from landlines");
check(M.normalizeEmail("  Principal@School.IN ") === "principal@school.in", "normalizeEmail lower-cases and trims");
check(M.normalizeEmail("not an email") === undefined, "normalizeEmail rejects junk");

/* ── 2. Round trip ───────────────────────────────────────────────────────── */

const mem = memStorage();
const store = new M.LocalOutreachStore(mem);
check(store.mode === "local", "LocalOutreachStore.mode is local");

const a = await store.upsertLead({
  instituteName: "Sunrise Public School",
  kind: "school",
  phone: "098100 12345",
  email: "Office@SunrisePublic.in",
  city: "Saket",
});
check(/^ol_/.test(a.id) && a.status === "new" && a.createdAt && a.updatedAt, "new lead gets id, status new, timestamps");
check(a.phone === "+919810012345" && a.email === "office@sunrisepublic.in", "lead contact fields are normalised on save");
check((await store.getLead(a.id))?.instituteName === "Sunrise Public School", "getLead returns the saved lead");

await new Promise((r) => setTimeout(r, 5));
const a2 = await store.upsertLead({ id: a.id, instituteName: a.instituteName, status: "contacted", demoSlug: "sunrise" });
check(a2.createdAt === a.createdAt && a2.updatedAt > a.updatedAt, "update keeps createdAt and moves updatedAt");
check(a2.phone === "+919810012345" && a2.kind === "school", "update merges over the stored lead (phone, kind kept)");
check((await store.listLeads()).length === 1, "update does not add a second lead");

await new Promise((r) => setTimeout(r, 5));
const b = await store.upsertLead({ instituteName: "Apex Classes", kind: "coaching", whatsapp: "+91 99999 00000" });
check((await store.listLeads())[0].id === b.id, "listLeads is newest-updated first");

const e1 = await store.addEvent({ leadId: a.id, type: "sent", channel: "whatsapp", templateId: "wa_first_en" });
await store.addEvent({ leadId: b.id, type: "sent", channel: "whatsapp", at: new Date(Date.now() + 1000).toISOString() });
/* 0011: the server dates every history line (a browser cannot backdate a touch); only a "demo opened" line keeps the open's time. */
const noteAt = new Date(Date.now() - 86400000 * 2).toISOString();
const note = await store.addEvent({ leadId: a.id, type: "note", detail: "Call after 3 pm", at: noteAt });
check(/^oe_/.test(e1.id) && e1.at, "addEvent fills id and at");
check(note.at !== noteAt && Math.abs(Date.parse(note.at) - Date.now()) < 60000, "addEvent dates the line with the store's clock, not the one it was given (as the database does)");
check((await store.listEvents(a.id)).length === 2 && (await store.listEvents()).length === 3, "listEvents filters by lead");
const openedAt = new Date(Date.now() - 3600e3).toISOString();
const olderAt = new Date(Date.now() - 7200e3).toISOString();
await store.addEvent({ leadId: b.id, type: "demo_opened", detail: "older open", at: olderAt });
await store.addEvent({ leadId: a.id, type: "demo_opened", detail: "newer open", at: openedAt });
const opened = (await store.listEvents()).filter((e) => e.type === "demo_opened");
check(opened.length === 2 && opened[0].at === openedAt && opened[1].at === olderAt, "a demo-opened line keeps the open's time, and listEvents is newest first");
const allEv = await store.listEvents();
check(allEv[allEv.length - 1].type === "demo_opened" && allEv[allEv.length - 1].at === olderAt, "the oldest line comes last");
check(M.countSentToday(allEv, "whatsapp") === 2 && M.countSentToday(allEv, "email") === 0, "countSentToday counts today's sends per channel");

const s0 = await store.getSettings();
check(s0.whatsappDailyLimit === undefined && s0.autoAddDemos === true && s0.quietStart === "20:00" && s0.quietEnd === "10:00", "default settings: no WhatsApp limit, add demos to the CRM, quiet 20:00 to 10:00 (TRAI's window opens at 10:00)");
check(/Mehdi Alam/.test(s0.signature) && /\+91 77619 21786/.test(s0.signature), "default signature carries the real sender");
check(s0.signature === "Mehdi Alam, Ideovent Technologies, Saket, New Delhi\n+91 77619 21786", "default signature is the approved two lines");
/* 30 Sep 2026: a row saved before carries the old defaults (quiet hours to 09:00, the four-line
   signature), which nobody chose; they read as the new defaults. A time or signature Mehdi set is kept. */
{
  const old = memStorage();
  old.setItem(M.OUTREACH_LOCAL_KEY, JSON.stringify({ leads: [], events: [], settings: { signature: M.PREVIOUS_DEFAULT_SIGNATURE, quietStart: "20:00", quietEnd: "09:00", alertOnDemoOpen: true } }));
  const migrated = await new M.LocalOutreachStore(old).getSettings();
  check(migrated.quietEnd === "10:00" && migrated.signature === M.DEFAULT_SIGNATURE, `an old settings row moves to quiet hours ending 10:00 and the approved signature (${migrated.quietEnd})`);
  const chosen = memStorage();
  chosen.setItem(M.OUTREACH_LOCAL_KEY, JSON.stringify({ leads: [], events: [], settings: { signature: "Mehdi\nIdeovent", quietStart: "21:00", quietEnd: "10:30", alertOnDemoOpen: false } }));
  const kept = await new M.LocalOutreachStore(chosen).getSettings();
  check(kept.quietEnd === "10:30" && kept.quietStart === "21:00" && kept.signature === "Mehdi\nIdeovent", "times and a signature Mehdi chose are kept");
}
await store.saveSettings({ senderGmail: "mehdi@example.com", whatsappDailyLimit: 8 });
const s1 = await new M.LocalOutreachStore(mem).getSettings();
check(s1.senderGmail === "mehdi@example.com" && s1.whatsappDailyLimit === 8 && s1.signature === s0.signature, "settings persist and merge");
await store.saveSettings({ whatsappDailyLimit: 0 });
check((await store.getSettings()).whatsappDailyLimit === undefined, "a blank (0) WhatsApp limit is saved as no limit");

check(mem.map.has(M.OUTREACH_LOCAL_KEY) && M.OUTREACH_LOCAL_KEY === "ideovent_outreach_v1", "data is stored under ideovent_outreach_v1");
check(!mem.map.has("ideovent_cms_v1") && [...mem.map.keys()].length === 1, "nothing is written to the CMS snapshot key");

/* ── 3. Duplicates ───────────────────────────────────────────────────────── */

check((await store.findDuplicate({ phone: "+91-98100-12345" }))?.id === a.id, "duplicate by phone in another format");
check((await store.findDuplicate({ email: "OFFICE@sunrisepublic.in" }))?.id === a.id, "duplicate by email in another case");
check((await store.findDuplicate({ phone: "9999900000" }))?.id === b.id, "duplicate by WhatsApp number");
check((await store.findDuplicate({ phone: "9810012345", excludeId: a.id })) === null, "excludeId ignores the lead being edited");
check((await store.findDuplicate({ phone: "9811111111", email: "new@x.in" })) === null, "no false duplicate");

await store.deleteLead(b.id);
check((await store.getLead(b.id)) === null && (await store.listEvents(b.id)).length === 0, "deleteLead removes the lead and its events");
check((await store.listEvents(a.id)).length === 3, "deleteLead leaves other leads' events");

const broken = memStorage();
broken.setItem(M.OUTREACH_LOCAL_KEY, "{not json");
check((await new M.LocalOutreachStore(broken).listLeads()).length === 0, "corrupt storage reads as empty, no throw");

/* ── 4. CSV import ───────────────────────────────────────────────────────── */

const tplPath = join(KIT, "LEAD-SHEET-TEMPLATE.csv");
const tplRows = M.parseCsv(readFileSync(tplPath, "utf8"));
check(tplRows.length === 1 && "org_name" in tplRows[0] && "contact_phone" in tplRows[0], "parseCsv reads the lead sheet header and its one example row");
const tplStore = new M.LocalOutreachStore(memStorage());
const tplRes = await tplStore.importLeads(tplRows);
check(tplRes.added.length === 0 && tplRes.skipped.length === 1, "the template's placeholder row is skipped, not imported");

/* Same header as the template, with real-looking values. */
const header = readFileSync(tplPath, "utf8").split(/\r?\n/)[0];
const cols = header.split(",");
const q = (s) => '"' + String(s).split('"').join('""') + '"';
const rowOf = (o) => cols.map((c) => (o[c] == null ? "" : q(o[c]))).join(",");
const sheet = [
  header,
  rowOf({ lead_id: "IDV-L-9001", date_added: "2026-09-20", source: "GMAPS", segment: "COACHING_JEE_NEET", org_name: "Vidya Classes", city_locality: "Laxmi Nagar, Delhi", contact_name: "Mr. Rao", contact_phone: "098111 22233", whatsapp_ok: "YES", contact_email: "Info@VidyaClasses.in", website_url: "https://vidyaclasses.in/", buying_signal: "The contact form did not send.", stage: "ENGAGED", next_action_date: "2026-09-30", demo_site_url: "https://ideovent.vercel.app/site/vidya-classes", pitch_page_url: "https://ideovent.vercel.app/vidya-pitch", do_not_contact: "NO", notes: "Asked to call after 4, \"not before\"" }),
  rowOf({ org_name: "Green Valley School", segment: "OTHER", contact_phone: "011-46508577", do_not_contact: "YES" }),
  rowOf({ org_name: "Vidya Classes Branch 2", contact_phone: "+91 98111 22233" }),
  rowOf({ org_name: "No Contact Academy", segment: "COACHING_TUITION" }),
  rowOf({ org_name: "Already There Again", contact_email: "OLD@there.in", city_locality: "Noida" }),
].join("\r\n");
const sStore = new M.LocalOutreachStore(memStorage());
await sStore.upsertLead({ instituteName: "Already There", email: "old@there.in", kind: "other" });
const sRes = await sStore.importLeads(M.parseCsv(sheet));
check(sRes.added.length === 2, `sheet import adds 2 new leads (got ${sRes.added.length})`);
check(sRes.duplicates.length === 2, `sheet import reports 2 duplicates, one within the file, one already stored (got ${sRes.duplicates.length})`);
check(sRes.skipped.length === 1 && /no phone or email/.test(sRes.skipped[0].reason), "a row with no phone or email is skipped with a reason");
const v = sRes.added.find((l) => l.instituteName === "Vidya Classes");
check(Boolean(v), "Vidya Classes imported");
if (v) {
  check(v.kind === "coaching" && v.phone === "+919811122233" && v.whatsapp === "+919811122233", "segment to kind, phone normalised, whatsapp_ok YES copies phone");
  check(v.email === "info@vidyaclasses.in" && v.city === "Laxmi Nagar, Delhi" && v.contactName === "Mr. Rao", "email, city, contact mapped");
  check(v.status === "replied" && v.source === "GMAPS" && v.observation === "The contact form did not send.", "stage ENGAGED to replied, source, buying_signal to observation");
  check(v.demoSlug === "vidya-classes" && v.pitchSlug === "vidya-pitch", "demo and pitch slugs taken from their URLs");
  check(v.nextActionAt?.startsWith("2026-09-30") && v.createdAt.startsWith("2026-09-20"), "dates mapped (India morning)");
  check(v.notes === 'Asked to call after 4, "not before"' && v.tags?.includes("IDV-L-9001"), "quoted CSV cells and lead_id tag survive");
}
const g = sRes.added.find((l) => l.instituteName === "Green Valley School");
check(g?.kind === "school" && g?.status === "do_not_contact" && g?.whatsapp === undefined, "kind from name, do_not_contact YES, no WhatsApp for a landline");

const mStore = new M.LocalOutreachStore(memStorage());
const base = await mStore.upsertLead({ instituteName: "Merge Me", phone: "9822200000", kind: "school" });
const mRes = await mStore.importLeads([{ org_name: "Merge Me", contact_phone: "+91 98222 00000", city_locality: "Dwarka", contact_email: "m@merge.in" }], { onDuplicate: "merge" });
const merged = await mStore.getLead(base.id);
check(mRes.duplicates.length === 1 && merged?.city === "Dwarka" && merged?.email === "m@merge.in" && merged?.kind === "school", "merge mode fills empty fields and keeps the rest");
check((await mStore.listLeads()).length === 1, "merge mode does not add a lead");

const plain = M.parseCsv("Name,Phone,Email,City,Type\nSunrise Tutorials,9876543210,,Patna,coaching\n");
const pRes = await new M.LocalOutreachStore(memStorage()).importLeads(plain);
check(pRes.added.length === 1 && pRes.added[0].kind === "coaching" && pRes.added[0].city === "Patna", "a plain hand-made sheet imports");

/* Real files from the sales kit. */
const realFiles = [join(KIT, "PROSPECTS-DELHI-NCR.csv")];
const outDir = join(KIT, "outreach-2026-09-27");
if (existsSync(outDir)) for (const f of readdirSync(outDir)) if (/^LEADS-.*\.csv$/i.test(f)) realFiles.push(join(outDir, f));
for (const f of realFiles.filter(existsSync)) {
  const rows = M.parseCsv(readFileSync(f, "utf8"));
  const res = await new M.LocalOutreachStore(memStorage()).importLeads(rows);
  const total = res.added.length + res.duplicates.length + res.skipped.length;
  const name = f.slice(KIT.length + 1);
  console.log(`      ${name}: ${rows.length} rows, ${res.added.length} added, ${res.duplicates.length} duplicate, ${res.skipped.length} skipped`);
  for (const s of res.skipped) console.log(`        skipped row ${s.row}: ${s.reason}`);
  check(total === rows.length, `${name}: every row accounted for`);
  check(res.added.length > 0, `${name}: imports at least one lead`);
  check(res.added.every((l) => l.instituteName && (l.phone || l.email || l.whatsapp)), `${name}: every lead has a name and a contact`);
  check(res.added.every((l) => !l.phone || /^\+\d{10,13}$/.test(l.phone)), `${name}: every phone is normalised`);
}

/* ── 5. One write per import ─────────────────────────────────────────────── */

const thirty = ["Name,Phone,Email,City,Type"];
for (let i = 0; i < 30; i++) thirty.push(`Batch School ${i + 1},98${String(10000000 + i).padStart(8, "0")},,Delhi,school`);
const thirtyRows = M.parseCsv(thirty.join("\n") + "\n");

/* Local: count setItem calls. */
const counted = memStorage();
let setCalls = 0;
const countingStorage = { getItem: counted.getItem, setItem: (k, v) => (setCalls++, counted.setItem(k, v)) };
const cStore = new M.LocalOutreachStore(countingStorage);
const cRes = await cStore.importLeads(thirtyRows);
check(cRes.added.length === 30, `local: 30-row import adds 30 (got ${cRes.added.length})`);
check(setCalls === 1, `local: a 30-row import is ONE storage write (got ${setCalls})`);
check((await cStore.listLeads()).length === 30, "local: all 30 are stored");

/* Local: the single write fails, nothing is saved, the caller hears why. */
const quota = memStorage();
const failing = { getItem: quota.getItem, setItem: () => { throw new Error("QuotaExceededError"); } };
let localErr = null;
try { await new M.LocalOutreachStore(failing).importLeads(thirtyRows); } catch (e) { localErr = e; }
check(localErr && /Quota/.test(localErr.message), "local: a failed write rejects with the reason");
check((await new M.LocalOutreachStore(quota).listLeads()).length === 0, "local: a failed write leaves nothing behind");

/* Supabase: a fake client that records every call. */
function fakeSupabase({ failUpsert = false } = {}) {
  const calls = { upsert: [], insert: [], del: 0 };
  const stored = new Map();
  const reader = () => {
    const q = {
      select: () => q, order: () => q, eq: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
      range: async () => ({ data: [...stored.values()].map((r) => ({ id: r.id, data: r.data })), error: null }),
    };
    return q;
  };
  return {
    calls, stored,
    /* 0011 not applied: PostgREST cannot find the team functions, so the store keeps today's calls. */
    rpc: async (fn) => ({ data: null, error: { code: "PGRST202", message: `Could not find the function public.${fn} without parameters in the schema cache` }, status: 404 }),
    from: (table) => ({
      ...reader(),
      upsert: async (rows, opts) => {
        const list = Array.isArray(rows) ? rows : [rows];
        calls.upsert.push({ table, count: list.length, opts });
        if (failUpsert) return { error: { message: "network down" } };
        if (table === "outreach_leads") for (const r of list) stored.set(r.id, r);
        return { error: null };
      },
      insert: async (rows) => (calls.insert.push({ table, count: [].concat(rows).length }), { error: null }),
      delete: () => (calls.del++, reader()),
    }),
  };
}
const fake = fakeSupabase();
globalThis.__fakeSupabase = fake;
const sbRes = await new M.SupabaseOutreachStore().importLeads(thirtyRows);
check(sbRes.added.length === 30, `supabase: 30-row import adds 30 (got ${sbRes.added.length})`);
check(fake.calls.upsert.length === 1, `supabase: ONE upsert per import (got ${fake.calls.upsert.length})`);
check(fake.calls.upsert[0]?.table === "outreach_leads" && fake.calls.upsert[0]?.count === 30, "supabase: that upsert carries all 30 rows to outreach_leads");
check(fake.calls.insert.length <= 1, `supabase: at most one events insert (got ${fake.calls.insert.length})`);

const bad = fakeSupabase({ failUpsert: true });
globalThis.__fakeSupabase = bad;
let sbErr = null;
try { await new M.SupabaseOutreachStore().importLeads(thirtyRows); } catch (e) { sbErr = e; }
check(sbErr && /nothing was saved/.test(sbErr.message) && /network down/.test(sbErr.message), "supabase: a failed upsert rejects, saying nothing was saved and why");
check(bad.calls.upsert.length === 1 && bad.stored.size === 0, "supabase: no retry row by row, nothing stored");
delete globalThis.__fakeSupabase;

/* The downloadable template: its header is what the importer reads, its one example row imports. */
const tplCsv = M.leadImportTemplateCsv();
const tplParsed = M.parseCsv(tplCsv);
check(tplParsed.length === 1, `template CSV has exactly one row (got ${tplParsed.length})`);
const tRes = await new M.LocalOutreachStore(memStorage()).importLeads(tplParsed);
const ex = tRes.added[0];
check(tRes.added.length === 1 && tRes.skipped.length === 0, "template CSV imports exactly its one example lead");
check(ex?.instituteName === "Example Public School" && ex?.phone === "+919876543210" && ex?.email === "office@example.org", "example lead: name, phone, email mapped");
check(ex?.kind === "school" && ex?.city === "Saket, New Delhi" && ex?.contactName === "Principal (example)" && Boolean(ex?.observation) && Boolean(ex?.notes), "example lead: segment, city, contact, observation, notes read from the template's columns");
check(new Set(M.LEAD_TEMPLATE_COLUMNS).size === M.LEAD_TEMPLATE_COLUMNS.length && M.LEAD_TEMPLATE_COLUMNS.includes("org_name") && M.LEAD_TEMPLATE_COLUMNS.includes("contact_phone"), "template header: unique LEAD-SHEET-TEMPLATE column names");
console.log("      template columns: " + M.LEAD_TEMPLATE_COLUMNS.join(","));

/* ── 6. upsertLeads: several leads, ONE write (CRM "Clean saved observations") ── */
{
  const base = memStorage();
  let writes = 0;
  const st = new M.LocalOutreachStore({ getItem: base.getItem, setItem: (k, v) => (writes++, base.setItem(k, v)) });
  const a1 = await st.upsertLead({ instituteName: "Alpha Academy", observation: "curl 27 Sep: HTTP 200" });
  const b1 = await st.upsertLead({ instituteName: "Beta Classes", observation: "Your site does not open on a phone." });
  writes = 0;
  const out = await st.upsertLeads([{ ...a1, observation: undefined }, { ...b1, observation: undefined }]);
  const after = await st.listLeads();
  check(writes === 1 && out.length === 2, "upsertLeads saves two leads in one storage write");
  check(after.length === 2 && after.every((l) => !l.observation) && after.find((l) => l.id === a1.id)?.createdAt === a1.createdAt, "upsertLeads clears the fields and keeps createdAt");
}

/* ── 7. Dental clinics: the CSV contract (28 Sep 2026) ─────────────────────── */
{
  const SEGMENTS = ["DENTAL_SINGLE", "DENTAL_MULTI", "DENTAL_COSMETIC", "DENTAL_IMPLANT", "DENTAL_ORTHO", "DENTAL_KIDS", "DENTAL_CHAIN"];
  for (const s of SEGMENTS) check(M.kindFrom(s, "Example Care Centre") === "dental", `segment ${s} is dental`);
  check(M.kindFrom("dental_single", "x") === "dental" && M.kindFrom("CLINIC_DENTAL", "x") === "dental" && M.kindFrom("INTL_DENTAL", "x") === "dental", "lower-case DENTAL_ and the sales kit's CLINIC_DENTAL / INTL_DENTAL are dental");
  check(M.kindFrom("CLINIC_EYE", "Example Eye Care") === "other", "CLINIC_EYE is not dental");
  for (const v of ["dental", "Dentist", "Dental clinic", "DENTAL CLINIC", "dental_clinic", "dentists"]) {
    check(M.kindFrom(v, "Example Care Centre") === "dental", `type value "${v}" is dental`);
  }
  check(M.kindFrom("OTHER", "Example Care Centre", ["dental clinic"]) === "dental", "a type column saying dental wins over a segment of OTHER");
  // No segment or type: the name decides, dental BEFORE the school and coaching name rules.
  for (const n of ["Example Dental Clinic", "Example Smile Dental Care", "Example Dental Academy", "Example Orthodontic Centre", "Dr. Example's Dentistry", "Example Tooth Care Institute"]) {
    check(M.kindFrom(undefined, n) === "dental" && M.kindFrom("OTHER", n) === "dental", `"${n}" is dental by name`);
  }
  for (const [n, k] of [["Sunrise Public School", "school"], ["Green Valley School", "school"], ["Test Vidya Mandir", "school"], ["Vidya Coaching Centre", "coaching"], ["Apex Classes", "coaching"], ["Example Tutorials", "coaching"], ["Example IAS Academy", "coaching"]]) {
    check(M.kindFrom(undefined, n) === k, `"${n}" stays ${k}, never dental`);
  }
  check(M.kindFrom(undefined, "Example Tuition Centre") !== "dental", `"Example Tuition Centre" is never dental`);
  check(M.kindFrom("SCHOOL_CBSE", "Example Dental Public School") === "school", "a SCHOOL segment is kept even when the name mentions dental");
  check(M.LEAD_KIND_LABELS.dental === "Dental clinic" && M.LEAD_KIND_VALUES.includes("dental"), "kind label: Dental clinic");
  // A Maps-style category column: a dental category is dental whatever the name; school and coaching categories never are.
  for (const c of ["Orthodontist", "Cosmetic dentist", "Pediatric dentist", "Oral surgeon", "Endodontist", "Dental implants periodontist"]) {
    check(M.kindFrom(c, "Example Care Centre") === "dental" && M.mapCsvRow({ name: "Example Care Centre", phone: "98765 43210", category: c }).lead?.kind === "dental", `category "${c}" is dental`);
  }
  for (const [c, k] of [["school", "school"], ["School", "school"], ["coaching", "coaching"], ["Coaching center", "coaching"], ["Tutoring service", "other"], ["Eye care center", "other"]]) {
    check(M.kindFrom(c, "Example Care Centre") === k, `category "${c}" maps to ${k}, never dental`);
  }

  // A lead sheet with DENTAL rows imports them as dental leads, the segment kept as a tag.
  const dRows = SEGMENTS.map((s, i) => ({ lead_id: `IDV-D-${i + 1}`, segment: s, org_name: `Example Dental Clinic ${i + 1}`, contact_phone: `+91 98765 4321${i}`, city_locality: "Saket, New Delhi" }));
  dRows.push({ segment: "OTHER", org_name: "Example Smile Dental", contact_phone: "+91 98765 43299" });
  dRows.push({ type: "Dentist", name: "Example Family Care", phone: "98765 43298" });
  dRows.push({ segment: "COACHING_TUITION", org_name: "Example Tutorials", contact_phone: "98765 43297" });
  const dRes = await new M.LocalOutreachStore(memStorage()).importLeads(dRows);
  const dental = dRes.added.filter((l) => l.kind === "dental");
  check(dental.length === 9, `9 of 10 rows import as dental leads (got ${dental.length})`);
  check(dRes.added.find((l) => l.instituteName === "Example Tutorials")?.kind === "coaching", "a coaching row in the same sheet stays coaching");
  check(SEGMENTS.every((s) => dental.some((l) => l.tags?.includes(s))), "every DENTAL segment is kept as a tag (the template choice reads it)");
  const plainDental = M.parseCsv("name,phone,type\nExample Dental Clinic,9876543210,dental clinic\n");
  check(M.mapCsvRow(plainDental[0]).lead?.kind === "dental", "a plain sheet with type 'dental clinic' maps to dental");

  // Real sales-kit files: no school or coaching row ever becomes dental; any dental lead sheet imports as dental.
  const kitCsvs = [join(KIT, "PROSPECTS-DELHI-NCR.csv")];
  for (const d of readdirSync(KIT)) {
    const p = join(KIT, d);
    if (/^outreach-/.test(d) && existsSync(p)) for (const f of readdirSync(p)) if (/\.csv$/i.test(f)) kitCsvs.push(join(p, f));
    if (/dental.*\.csv$/i.test(d)) kitCsvs.push(p);
  }
  for (const f of kitCsvs.filter(existsSync)) {
    const rows = M.parseCsv(readFileSync(f, "utf8"));
    const name = f.slice(KIT.length + 1);
    const mapped = rows.map((r) => ({ r, m: M.mapCsvRow(r) })).filter((x) => "lead" in x.m);
    const eduRows = mapped.filter((x) => /^(SCHOOL|COACHING)/i.test(x.r.segment || ""));
    const dentalRows = mapped.filter((x) => M.isDentalSegment(x.r.segment));
    check(eduRows.every((x) => x.m.lead.kind !== "dental"), `${name}: no school or coaching row becomes dental (${eduRows.length} rows)`);
    check(dentalRows.every((x) => x.m.lead.kind === "dental"), `${name}: every DENTAL row is a dental lead (${dentalRows.length} rows)`);
    console.log(`      ${name}: ${mapped.length} leads, ${mapped.filter((x) => x.m.lead.kind === "dental").length} dental`);
  }

  // The downloadable template documents the dental segments, and still imports exactly one example.
  const tplDoc = M.leadImportTemplateCsv();
  check(/DENTAL_SINGLE/.test(tplDoc) && /DENTAL_CHAIN/.test(tplDoc) && /\bdental\b/.test(tplDoc), "the import template names the DENTAL segments and the dental type");
  check(M.parseCsv(tplDoc).length === 1, "the import template still has one example row");
  check(M.LEAD_TEMPLATE_COLUMNS.includes("website_state") && /DIRECTORY_ONLY/.test(tplDoc) && /NOT_MOBILE/.test(tplDoc), "the import template carries website_state and says which values mean new or fix");

  // What to offer (ICP 5.1, the dental 30 / 70 split): a pitch cell wins, else website_state.
  for (const [ws, want] of [["NONE", "new_website"], ["SOCIAL_ONLY", "new_website"], ["DIRECTORY_ONLY", "new_website"], ["BROKEN", "fix_website"], ["NOT_MOBILE", "fix_website"], ["NO_ENQUIRY_FORM", "fix_website"], ["DATED", "fix_website"], ["GOOD", undefined], ["", undefined]]) {
    check(M.pitchFrom(undefined, ws) === want, `website_state ${ws || "(blank)"}: pitch ${want}`);
  }
  check(M.pitchFrom("fix_website", "NONE") === "fix_website" && M.pitchFrom("new", "NOT_MOBILE") === "new_website" && M.pitchFrom("New Website") === "new_website", "a pitch cell wins over website_state, in any spelling");
  const practo = M.mapCsvRow({ segment: "DENTAL_SINGLE", org_name: "Example Dental Clinic", contact_phone: "+91 98765 43210", website_url: "https://www.practo.com/example", website_state: "DIRECTORY_ONLY" });
  check(practo.lead?.kind === "dental" && practo.lead?.pitch === "new_website", "a dental row whose only 'website' is a directory page is a new-website lead");
  const fixRow = M.mapCsvRow({ segment: "DENTAL_MULTI", org_name: "Example Dental Centre", contact_phone: "+91 98765 43211", website_url: "https://example.org", website_state: "NOT_MOBILE" });
  check(fixRow.lead?.pitch === "fix_website", "a dental row whose site fails on a phone is a fix-website lead");
  check(!("pitch" in (M.mapCsvRow({ org_name: "Example Dental Clinic", phone: "98765 43212" }).lead || {})), "no pitch or website_state: no pitch is invented");
  check(M.mapCsvRow({ org_name: "Example", phone: "98765 43213", website_state: "NONE|SOCIAL_ONLY|DIRECTORY_ONLY" }).lead?.pitch === undefined, "the template's placeholder website_state is ignored");
  const tplLead = M.mapCsvRow(M.parseCsv(tplDoc)[0]).lead;
  check(tplLead?.pitch === "fix_website", "the template's example row (NO_ENQUIRY_FORM) imports as a fix-website lead");
}

/* ── 8. The team data layer (0011): patch, append, create, delete, legacy ── */
/*
  A fake PostgREST client that records every call. `fns` answers the team
  functions; `actor` is who the server stamps on a history line; `canDelete`
  is whether row security lets the caller delete. Rows are kept WITH their
  columns and projected to the columns a select names.
*/
function fakeTeamClient({ fns = {}, actor = null, canDelete = true, leads = [], events = [] } = {}) {
  const calls = { select: [], rpc: [], insert: [], upsert: [], del: [], update: [] };
  const tables = { outreach_leads: leads.map((r) => ({ ...r })), outreach_events: events.map((r) => ({ ...r })) };
  const pick = (row, cols) => {
    if (!cols || cols === "*") return { ...row };
    const out = {};
    for (const c of cols.split(",").map((s) => s.trim())) if (c in row) out[c] = row[c];
    return out;
  };
  const respond = (q) => {
    const rows = tables[q.table] || [];
    const match = (r) => q.filters.every(([c, v]) => r[c] === v);
    if (q.op === "select") {
      calls.select.push({ table: q.table, cols: q.cols });
      const hit = rows.filter(match).map((r) => pick(r, q.cols));
      if (q.single) return { data: hit[0] || null, error: null };
      return { data: q.range ? hit.slice(q.range[0], q.range[1] + 1) : hit, error: null };
    }
    if (q.op === "insert") {
      const list = [].concat(q.payload);
      calls.insert.push({ table: q.table, rows: list, cols: q.cols });
      const saved = list.map((r) => {
        const row = { ...r };
        if (q.table === "outreach_events") {
          row.actor_id = actor;
          row.created_at = "2026-10-01T10:00:00.123456+00:00";
          row.data = { ...r.data, id: r.id, leadId: r.lead_id, at: "2026-10-01T10:00:00.123Z" };
        }
        if (q.table === "outreach_leads" && !q.legacy) Object.assign(row, { assigned_to: actor, created_by: actor, assigned_at: "2026-10-01T10:00:00+00:00" });
        rows.push(row);
        return row;
      });
      return { data: q.cols ? pick(saved[0], q.cols) : null, error: null };
    }
    if (q.op === "delete") {
      calls.del.push({ table: q.table, filters: q.filters.slice(), cols: q.cols });
      if (!canDelete) return { data: [], error: null };
      const gone = rows.filter(match);
      tables[q.table] = rows.filter((r) => !match(r));
      return { data: gone.map((r) => pick(r, q.cols || "id")), error: null };
    }
    if (q.op === "update") {
      calls.update.push({ table: q.table, payload: q.payload, filters: q.filters.slice() });
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };
  const builder = (table, op, payload) => {
    const q = { table, op, payload, cols: op === "select" ? payload : null, filters: [], single: false, range: null };
    const api = {
      select(cols) { q.cols = cols; return api; },
      order() { return api; },
      limit() { return api; },
      eq(c, v) { q.filters.push([c, v]); return api; },
      is(c, v) { q.filters.push([c, v]); return api; },
      in() { return api; },
      gte() { return api; },
      lt() { return api; },
      range(a, b) { q.range = [a, b]; return api; },
      maybeSingle() { q.single = true; return api; },
      single() { q.single = true; return api; },
      then(ok, bad) { return Promise.resolve().then(() => respond(q)).then(ok, bad); },
    };
    return api;
  };
  return {
    calls,
    tables,
    rpc: async (fn, args) => {
      calls.rpc.push({ fn, args });
      const f = fns[fn];
      if (!f) return { data: null, error: { code: "PGRST202", message: `Could not find the function public.${fn}` }, status: 404 };
      const out = typeof f === "function" ? f(args) : f;
      return { status: out.error ? 400 : 200, data: null, error: null, ...out };
    },
    from: (table) => ({
      select: (cols) => builder(table, "select", cols),
      insert: (rows) => builder(table, "insert", rows),
      upsert: async (rows, opts) => {
        calls.upsert.push({ table, rows: [].concat(rows), opts });
        return { error: null };
      },
      delete: () => builder(table, "delete"),
      update: (payload) => builder(table, "update", payload),
    }),
  };
}
const leadRow = (id, data, cols = {}) => ({ id, data: { id, instituteName: `School ${id}`, kind: "school", status: "new", createdAt: "2026-09-20T05:00:00.000Z", updatedAt: "2026-09-20T05:00:00.000Z", ...data }, ...cols });
const refusal = async (p) => { try { await p; return null; } catch (e) { return e; } };

/* 8a. Legacy: 0011 not applied. Everything is today's call. */
{
  const fake = fakeTeamClient({ leads: [leadRow("L1", { phone: "+919810012345", observation: "old obs" })] });
  globalThis.__fakeSupabase = fake;
  const sb = new M.SupabaseOutreachStore();
  const me = await sb.me();
  check(me.legacy === true && me.role === "owner", "legacy: crm_me missing (PGRST202) means 0011 is not applied: Mehdi, owner, legacy");
  await sb.listLeads();
  check(fake.calls.select.every((s) => s.cols === "id, data"), "legacy: reads select id, data as today (no 0011 columns)", JSON.stringify(fake.calls.select));
  const patched = await sb.patchLead("L1", { status: "contacted", observation: undefined });
  check(!fake.calls.rpc.some((c) => c.fn === "crm_patch_lead") && fake.calls.upsert.length === 1, "legacy: patchLead falls back to today's whole-lead upsert");
  const up = fake.calls.upsert[0]?.rows[0];
  check(up?.data.status === "contacted" && !("observation" in JSON.parse(JSON.stringify(up.data))) && up?.data.phone === "+919810012345" && up?.updated_at,
    "legacy: ...of the merged lead: the patch applied, the removed key gone, the rest kept", JSON.stringify(up?.data));
  check(patched.status === "contacted", "legacy: patchLead returns the saved lead");
  await sb.createLead({ instituteName: "Legacy New" });
  check(fake.calls.insert.length === 1 && fake.calls.upsert.length === 1 && fake.calls.insert[0].rows[0].updated_at, "legacy: createLead inserts (never upserts), with updated_at as today");
  await sb.addEvent({ leadId: "L1", type: "note", detail: "x" });
  check(fake.calls.insert[1]?.table === "outreach_events" && fake.calls.insert[1].rows[0].created_at, "legacy: addEvent sends its own created_at as today");
  await sb.deleteLead("L1");
  check(fake.calls.del.length === 2 && fake.calls.del[0].table === "outreach_events" && fake.calls.del[1].table === "outreach_leads", "legacy: deleteLead deletes the history first, then the lead (no foreign key yet)");
  check((await sb.listRequests()).length === 0 && (await sb.notifications()).length === 0 && (await sb.teamNames()).length === 0 && (await sb.dbUsage()) === null,
    "legacy: the team's reads answer empty, so a screen that asks shows nothing");
  const e = await refusal(sb.assignLeads(["x"], "m1"));
  check(e && /0011/.test(e.message), "legacy: a team write says it needs the database update", e?.message);
  delete globalThis.__fakeSupabase;
}

/* 8b. 0011 applied, signed in as a member: only what changed travels; the server's rows come back. */
{
  const ASHA = "11111111-1111-1111-1111-111111111111";
  const MEHDI = "22222222-2222-2222-2222-222222222222";
  const memberMe = { memberId: ASHA, role: "member", email: "asha@example.org", displayName: "Asha", viewAll: false, canAddLeads: true, mayColdCall: false,
    waDailyLimit: 25, newLeadCap: 40, targets: { callsPerDay: 15 }, senderName: null, senderPhone: "+919811100001", senderChecked: false, signature: null,
    hostWhatsapp: "+917761921786", mustChangePassword: true };
  const serverLead = leadRow("L2", { notes: "Old note", phone: "+919810012345", status: "replied", assigneeId: "junk-in-data" },
    { assigned_to: ASHA, assigned_at: "2026-09-30T05:00:00+00:00", assigned_by: MEHDI, created_by: MEHDI, qualified_by: null, closed_at: null });
  const fake = fakeTeamClient({
    actor: ASHA,
    canDelete: false,
    leads: [serverLead],
    fns: {
      crm_me: { data: memberMe },
      crm_patch_lead: (args) => (args.p_id === "GONE"
        ? { error: { code: "P0002", message: "crm: this lead is not yours, or it was deleted" } }
        : args.p_id === "BUSY"
          ? { error: { code: "54000", message: "crm: that is more than one person may do in a day (400 a day). It starts again at midnight India time; if this is real work, ask Mehdi." } }
          : { data: [{ ...serverLead, data: { ...serverLead.data, ...args.p_set, updatedAt: "2026-10-01T10:00:00.000Z" } }] }),
      crm_append_notes: (args) => ({ data: [{ ...serverLead, data: { ...serverLead.data, notes: `Old note\n${args.p_text}` } }] }),
      crm_find_duplicate: { data: [{ lead_id: "LB", institute_name: "Bilal Classes Two", assignee_name: "Bilal", visible: false }] },
      crm_distribute: { data: [{ member_id: ASHA, assigned: 2 }, { member_id: null, assigned: 1 }] },
      crm_activity_stats: { data: [{ member_id: ASHA, display_name: "Asha", role: "member", active: true, first_whatsapp: 3, calls_connected: 1, handoffs_confirmed: 2, last_seen_at: "2026-10-01T09:00:00+00:00" }] },
    },
  });
  globalThis.__fakeSupabase = fake;
  const sb = new M.SupabaseOutreachStore();
  const me = await sb.me();
  check(me.legacy === false && me.role === "member" && me.memberId === ASHA && me.newLeadCap === 40 && me.senderChecked === false
    && me.hostWhatsapp === "+917761921786" && me.mustChangePassword === true && me.senderName === undefined,
    "crm_me maps to CrmMe (member, her cap, number not checked, Mehdi's number, must set her password)", JSON.stringify(me));
  const listed = await sb.listLeads();
  check(fake.calls.select.some((s) => s.table === "outreach_leads" && /assigned_to/.test(s.cols) && /closed_at/.test(s.cols)), "listLeads reads the 0011 columns with the data");
  const l2 = listed.find((l) => l.id === "L2");
  check(l2?.assigneeId === ASHA && l2?.createdById === MEHDI && l2?.assignedById === MEHDI && l2?.assignedAt === "2026-09-30T05:00:00.000Z"
    && l2?.qualifiedById === undefined && l2?.closedAt === undefined, "the columns become the mirrors (assigneeId, createdById, assignedById, assignedAt)", JSON.stringify(l2));
  check(l2 && !("junk" in l2) && l2.assigneeId !== "junk-in-data", "a mirror key found in the data never wins over the column");

  fake.calls.rpc.length = 0;
  const p = await sb.patchLead("L2", { phone: "098100 12345", notes: undefined, status: "replied", assigneeId: "someone-else", closedAt: "2020-01-01" });
  const pc = fake.calls.rpc.find((c) => c.fn === "crm_patch_lead");
  check(pc && pc.args.p_id === "L2" && JSON.stringify(pc.args.p_set) === JSON.stringify({ phone: "+919810012345", status: "replied" }) && JSON.stringify(pc.args.p_unset) === JSON.stringify(["notes"]),
    "patchLead sends ONLY the changed keys to crm_patch_lead (normalised), a removed key in p_unset, never a mirror", JSON.stringify(pc?.args));
  check(fake.calls.upsert.length === 0 && p.assigneeId === ASHA && p.updatedAt === "2026-10-01T10:00:00.000Z", "...no whole-lead upsert; the server's row comes back");
  const ap = await sb.appendNotes("L2", "Called, call back Monday");
  check(fake.calls.rpc.some((c) => c.fn === "crm_append_notes" && c.args.p_id === "L2" && c.args.p_text === "Called, call back Monday") && ap.notes === "Old note\nCalled, call back Monday",
    "appendNotes calls crm_append_notes (appended on the server)");

  const created = await sb.createLead({ instituteName: "Asha Found It", phone: "9830000007", assigneeId: "x", createdById: "y", closedAt: "z" });
  const ins = fake.calls.insert.find((c) => c.table === "outreach_leads");
  check(ins && fake.calls.upsert.length === 0 && !("updated_at" in ins.rows[0]) && /assigned_to/.test(ins.cols || ""), "createLead INSERTS (never upserts) and reads back the row with its columns");
  check(ins && ["assigneeId", "createdById", "closedAt"].every((k) => !(k in ins.rows[0].data)) && ins.rows[0].data.phone === "+919830000007", "...its data carries no mirror keys, and the phone is normalised");
  check(created.assigneeId === ASHA && created.createdById === ASHA, "...and the server decides whose it is (the member's own)");

  const delErr = await refusal(sb.deleteLead("L2"));
  check(delErr && delErr.message === "Only Mehdi deletes leads" && fake.calls.del.length === 1 && fake.calls.del[0].table === "outreach_leads",
    "deleteLead: 0 rows deleted (row security) is refused out loud: 'Only Mehdi deletes leads'; no separate history delete", delErr?.message);

  const ev = await sb.addEvent({ leadId: "L2", type: "call", channel: "call", detail: "Called", at: "2020-01-01T00:00:00.000Z", actorId: "forged" });
  const evIns = fake.calls.insert.find((c) => c.table === "outreach_events");
  check(evIns && !("created_at" in evIns.rows[0]) && !("actorId" in evIns.rows[0].data) && /actor_id/.test(evIns.cols || ""), "addEvent sends no created_at and no writer: the server stamps both");
  check(ev.actorId === ASHA && ev.at === "2026-10-01T10:00:00.123Z", "...and returns the SERVER row (its time and writer)", JSON.stringify(ev));

  const dup = await sb.findDuplicate({ phone: "098100 00002", email: "Office@Bilal.example" });
  const dc = fake.calls.rpc.find((c) => c.fn === "crm_find_duplicate");
  check(dc && dc.args.p_phone === "+919810000002" && dc.args.p_email === "office@bilal.example", "findDuplicate asks crm_find_duplicate (whole team) with the normalised phone and e-mail", JSON.stringify(dc?.args));
  check(dup && dup.leadId === "LB" && dup.assigneeName === "Bilal" && dup.visible === false && dup.instituteName === "Bilal Classes Two" && !dup.phone && !dup.email,
    "...and answers whose it is and that she cannot open it, with no contact detail", JSON.stringify(dup));

  const busy = await refusal(sb.patchLead("BUSY", { status: "contacted" }));
  check(busy instanceof M.CrmAccessError && busy.code === "54000" && /^That is more than one person may do in a day \(400 a day\)/.test(busy.message),
    "a refusal comes back as CrmAccessError with the database's sentence, its 'crm: ' cut (the daily budget, 54000)", busy?.message);
  const gone = await refusal(sb.patchLead("GONE", { status: "contacted" }));
  check(gone?.code === "P0002" && gone.message === "This lead is not yours any more (it may have been moved).", "P0002 reads: This lead is not yours any more", gone?.message);

  const dist = await sb.distributeLeads(["a", "b", "c"], [ASHA], "balanced");
  check(dist.length === 2 && dist[0].memberId === ASHA && dist[0].assigned === 2 && dist[1].memberId === null && dist[1].assigned === 1, "distributeLeads maps the rows (null = left over)");
  const stats = await sb.activityStats("2026-10-01T00:00:00.000Z");
  check(stats[0]?.firstWhatsapp === 3 && stats[0]?.callsConnected === 1 && stats[0]?.handoffsConfirmed === 2 && stats[0]?.notes === 0 && stats[0]?.lastSeenAt === "2026-10-01T09:00:00.000Z",
    "activityStats maps the SQL's columns to MemberStats", JSON.stringify(stats[0]));

  fake.calls.upsert.length = 0;
  const imp = await sb.importLeads(thirtyRows);
  check(imp.added.length === 30 && fake.calls.upsert.length === 1 && fake.calls.upsert[0].rows.length === 30, "0011 applied: an import is still ONE upsert");
  delete globalThis.__fakeSupabase;
}

/* 8c. Local store: the mirrors are read, never written into a lead's data. */
{
  const st = new M.LocalOutreachStore(memStorage());
  const l = await st.upsertLead({ instituteName: "Mirror School", phone: "9810012399", assigneeId: "m_x", createdById: "m_y", assigneeName: "X", closedAt: "2020-01-01" });
  const raw = JSON.parse(st["storage"].getItem(M.OUTREACH_LOCAL_KEY)).leads[0];
  check(!["assigneeId", "createdById", "assigneeName", "closedAt"].some((k) => k in raw), "local: upsertLead stores no mirror key it was handed", JSON.stringify(raw));
  check(l.assigneeId === null && l.createdById === "m_owner", "local: a lead Mehdi adds reads as his, Unassigned (the pool)");
  const p = await st.patchLead(l.id, { city: "  Patna ", phone: "098100 12399", website: "" });
  check(p.city === "Patna" && p.phone === "+919810012399" && !("website" in p) && p.kind === "other", "local: patchLead normalises only the keys it carries");
}

/* 8d. Odd stored values (an old row, any other writer) are dropped on read, never shown: one object
       where text belongs would otherwise break every CRM page for everyone. */
{
  const OWNER_ID = "22222222-2222-2222-2222-222222222222";
  const odd = leadRow("ODD", { city: { x: 1 }, tags: ["hot", 5, { y: 2 }], notes: ["a"], contactName: {}, status: "maybe", kind: 7, instituteName: { n: 1 }, updatedAt: 5 },
    { assigned_to: OWNER_ID, created_by: OWNER_ID });
  const fake = fakeTeamClient({
    actor: OWNER_ID,
    leads: [odd, leadRow("FINE", { city: "Patna", tags: ["warm"] }, { assigned_to: null, created_by: OWNER_ID })],
    events: [
      { id: "EV1", lead_id: "ODD", actor_id: "33333333-3333-3333-3333-333333333333", created_at: "2026-10-01T09:00:00+00:00",
        data: { id: "EV1", leadId: "ODD", type: "status", detail: ["Status: Contacted to Won"], stage: ["after_call"], outcome: 5 } },
      { id: "EV2", lead_id: "ODD", actor_id: OWNER_ID, created_at: "2026-10-01T09:05:00+00:00", data: { id: "EV2", leadId: "ODD", type: "note", detail: "Fine" } },
    ],
    fns: { crm_me: { data: { memberId: OWNER_ID, role: "owner", displayName: "Mehdi Alam", viewAll: true, canAddLeads: true, mayColdCall: true, newLeadCap: 1000, targets: {} } } },
  });
  globalThis.__fakeSupabase = fake;
  const sb = new M.SupabaseOutreachStore();
  const leads = await sb.listLeads();
  const o = leads.find((l) => l.id === "ODD");
  check(o && o.city === undefined && o.notes === undefined && o.contactName === undefined && JSON.stringify(o.tags) === JSON.stringify(["hot"]),
    "read: a value that is not text is dropped (city, notes, contact), tags keep only their words", JSON.stringify(o));
  check(o && o.instituteName === "" && o.status === "new" && o.kind === "other" && o.updatedAt === undefined && o.assigneeId === OWNER_ID,
    "read: no name reads as '', an unknown stage as New, an unknown kind as Other; the columns still come through", JSON.stringify(o));
  check(leads.find((l) => l.id === "FINE")?.city === "Patna", "read: an ordinary lead is untouched");
  const evs = await sb.listEvents("ODD");
  const e1 = evs.find((e) => e.id === "EV1");
  check(e1 && e1.type === "status" && e1.detail === undefined && e1.stage === undefined && e1.outcome === undefined && e1.at === "2026-10-01T09:00:00.000Z",
    "read: a history line's odd fields are dropped (no forged win reaches the numbers); a line with no time takes its row's", JSON.stringify(e1));
  check(evs.find((e) => e.id === "EV2")?.detail === "Fine", "read: an ordinary line is untouched");
  check(M.cleanLeadData([1, 2]).instituteName === "" && M.cleanEventData("x").type === "note", "read: data that is not an object at all reads as an empty lead or note");
  delete globalThis.__fakeSupabase;
}

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures.length} failed${NEGATIVE || DENTAL_NEGATIVE || SETTINGS_NEGATIVE ? " (NEGATIVE CONTROL: failures expected)" : ""}`);
if (SETTINGS_NEGATIVE) {
  const expected = [/quiet 20:00 to 10:00/, /moves to quiet hours ending 10:00/];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  if (missed.length) {
    console.log("SETTINGS NEGATIVE CONTROL FAILED: undetected " + missed.join(", "));
    process.exit(1);
  }
  console.log("Settings negative control failed as it should.");
  process.exit(0);
}
if (DENTAL_NEGATIVE) {
  const expected = [/segment DENTAL_SINGLE is dental/, /is dental by name/, /import as dental leads/, /category "Orthodontist" is dental/, /directory page is a new-website lead/];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  if (missed.length) {
    console.log("DENTAL NEGATIVE CONTROL FAILED: undetected " + missed.join(", "));
    process.exit(1);
  }
  console.log("Dental negative control failed as it should.");
  process.exit(0);
}
if (NEGATIVE) {
  if (failures.length === 0) {
    console.log("NEGATIVE CONTROL DID NOT FAIL: the checks are not reaching the phone matching.");
    process.exit(1);
  }
  console.log("Negative control failed as it should.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);

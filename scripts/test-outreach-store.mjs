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
    if (NEGATIVE) {
      b.onLoad({ filter: /outreach[\\/]store\.ts$/ }, (args) => {
        const src = readFileSync(args.path, "utf8");
        const sig = "export function normalizePhone(raw?: string | null): string | undefined {";
        if (!src.includes(sig)) throw new Error("negative control: normalizePhone signature not found");
        return {
          contents: src.replace(sig, sig + "\n  return raw ? raw.trim() || undefined : undefined;"),
          loader: "ts",
        };
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
  stdin: { contents: `export * from "@/lib/outreach/store";`, resolveDir: ROOT, loader: "ts" },
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
await store.addEvent({ leadId: a.id, type: "note", detail: "Call after 3 pm", at: new Date(Date.now() - 86400000 * 2).toISOString() });
check(/^oe_/.test(e1.id) && e1.at, "addEvent fills id and at");
check((await store.listEvents(a.id)).length === 2 && (await store.listEvents()).length === 3, "listEvents filters by lead");
const allEv = await store.listEvents();
check(allEv[0].leadId === b.id, "listEvents is newest first");
check(M.countSentToday(allEv, "whatsapp") === 2 && M.countSentToday(allEv, "email") === 0, "countSentToday counts today's sends per channel");

const s0 = await store.getSettings();
check(s0.whatsappDailyLimit === undefined && s0.autoAddDemos === true && s0.quietStart === "20:00" && s0.quietEnd === "09:00", "default settings: no WhatsApp limit, add demos to the CRM, quiet 20:00-09:00");
check(/Mehdi Alam/.test(s0.signature) && /\+91 77619 21786/.test(s0.signature), "default signature carries the real sender");
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
check((await store.listEvents(a.id)).length === 2, "deleteLead leaves other leads' events");

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

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures.length} failed${NEGATIVE ? " (NEGATIVE CONTROL: failures expected)" : ""}`);
if (NEGATIVE) {
  if (failures.length === 0) {
    console.log("NEGATIVE CONTROL DID NOT FAIL: the checks are not reaching the phone matching.");
    process.exit(1);
  }
  console.log("Negative control failed as it should.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);

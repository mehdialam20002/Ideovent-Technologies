/**
 * Tests the CRM side of Meta Lead Ads (meta-leads-spec 9.4): the import of
 * Meta's own lead downloads, local mode's Meta intake, and the lead lists.
 *
 *   node scripts/test-meta-import.mjs                    every check must pass (exit 0)
 *   META_IMPORT_NEGATIVE=1 node scripts/test-meta-import.mjs
 *       bundles store.ts with parseCsv's delimiter sniffing removed (rewritten
 *       in flight, no file touched): the tab-separated checks must FAIL and
 *       the run must exit 1.
 *
 * WHAT IS UNDER TEST
 *   1. decodeCsvBytes (src/lib/outreach/csvFile.ts): UTF-16LE with and without
 *      a BOM, UTF-16BE, UTF-8 with a BOM, windows-1252, and .xlsx / .xls bytes.
 *   2. parseCsv: every comma sheet parses exactly as the parser before 2 Oct
 *      2026 did (a copy of it is below; the sales kit's real CSVs too, read in
 *      memory only); tab and semicolon files are sniffed; a quoted tab or
 *      comma stays inside its field.
 *   3. metaCsvLayout: a forms download, a Leads Center download, and the
 *      CRM's own sheets (template, plain sheet, its own export, another CRM's
 *      export without a source column) told apart.
 *   4. mapCsvRow on Meta rows: Meta's id prefixes, p: phones, is_organic,
 *      platform, campaign and form, every answer in the notes, ol_meta_<id>,
 *      no follow-up date, a row without phone or e-mail skipped; Leads Center
 *      rows; the template and a plain sheet map exactly as before (snapshot).
 *   5. planImport: one Meta export imported twice adds nothing the second
 *      time; a lead the webhook already made is a duplicate; ONE storage write.
 *   6. normalizePhone: fields.js and store.ts agree on 30 spellings.
 *   7. Local intake (LocalOutreachStore and localIntake.simulate, in memory):
 *      created, already (same id; after a delete), duplicates by phone and by
 *      e-mail (a neutral line, the answers as a request only Mehdi and admins
 *      read, due now, one bell, the fourth touch of a day quiet, the next day
 *      again), the pool / Mehdi / rules, the bells, the cap, and a member
 *      refused.
 *   8. leadQuery: the Campaign filter (URL, NONE, non-Meta leads never
 *      match), the search text, cell()'s formula guard, and the CRM's own
 *      export importing back unchanged.
 *   9. The Meta page's words: status lines, checklist, Settings card, log.
 *  10. The live CRM: client.ts (bundled as in Supabase mode) against the REAL
 *      api/meta/webhook.js (/api/meta/connect) and api/meta/catchup.js, in
 *      this process, with a fake Supabase and a fake Graph API: signed out, a
 *      member, the dev server, 0011 / 0012 not run, before and after Connect,
 *      the token check, a changed App Secret or Page id, Fetch missed leads
 *      now; the log, the waiting list and Save; the columns, keys and events
 *      the page reads checked against 0012; no secret in any answer or log.
 *
 * Same harness as test-crm-access.mjs: esbuild bundles the real TypeScript
 * (and src/lib/meta/fields.js); nothing is mocked except storage. Every
 * fixture is fictional: Test Lead One..., +91 90000 0000x, @example.org,
 * Meta ids starting 9000.
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
const NEGATIVE = Boolean(process.env.META_IMPORT_NEGATIVE);

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}

let sniffRemoved = false;
const plugin = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/cms\/client$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { throw new Error('no Supabase in this test'); }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEGATIVE) {
      b.onLoad({ filter: /outreach[\\/]store\.ts$/ }, (args) => {
        const src = readFileSync(args.path, "utf8");
        const sniff = "const delim = delimiter || sniffDelimiter(src);";
        if (!src.includes(sniff)) throw new Error("negative mode: parseCsv's sniffing line not found in store.ts");
        sniffRemoved = true;
        return { contents: src.replace(sniff, 'const delim = delimiter || ",";'), loader: "ts" };
      });
    }
  },
};

const out = join(tmpdir(), `ideovent-test-meta-import-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export * from "@/lib/outreach/store";`,
      `export { decodeCsvBytes } from "@/lib/outreach/csvFile";`,
      `export * as fields from "@/lib/meta/fields";`,
      `export { metaCsvLayout, mapMetaCsvRow, unguardCells } from "@/lib/meta/metaCsv";`,
      `export { simulate, readLocal, localLog, saveLocalSettings, META_LOCAL_KEY } from "@/lib/meta/localIntake";`,
      `export { activeFilterCount, cell, EMPTY_FILTERS, matchesFilters, NONE, readFilters, toCsv, writeFilters } from "@/crm/leads/leadQuery";`,
      `export { readEnv, readStatus } from "@/lib/meta/client";`,
      `export { statusLines } from "@/crm/meta/MetaStatus";`,
      `export { checklistSteps } from "@/crm/meta/MetaChecklist";`,
      `export { cardLine } from "@/crm/meta/MetaSettingsCard";`,
      `export { logText } from "@/crm/meta/MetaLog";`,
      `export { randomWord } from "@/crm/meta/metaUi";`,
    ].join("\n"),
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  write: false,
  logLevel: "silent",
  plugins: [plugin],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });
const F = M.fields;

/* ── Plumbing ────────────────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
/** `tag` "tab" marks the checks the negative mode must break. */
function check(ok, message, got, tag) {
  if (ok) passes++;
  else {
    failures.push({ message, tag });
    console.log("FAIL  " + message + (got !== undefined ? "\n        got: " + String(typeof got === "string" ? got : JSON.stringify(got)).slice(0, 400) : ""));
  }
}
const tab = (ok, message, got) => check(ok, message, got, "tab");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function error(fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e;
  }
}
function memoryStorage() {
  const m = new Map();
  let writes = 0;
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { writes++; m.set(k, String(v)); },
    removeItem: (k) => m.delete(k),
    get writes() { return writes; },
  };
}
/** UTF-16LE bytes, with or without a byte-order mark. */
const utf16le = (s, bom = true) => Buffer.concat([bom ? Buffer.from([0xff, 0xfe]) : Buffer.alloc(0), Buffer.from(s, "utf16le")]);
/** UTF-16BE bytes with a byte-order mark. */
function utf16be(s) {
  const le = Buffer.from(s, "utf16le");
  for (let i = 0; i + 1 < le.length; i += 2) [le[i], le[i + 1]] = [le[i + 1], le[i]];
  return Buffer.concat([Buffer.from([0xfe, 0xff]), le]);
}
const NOW = new Date("2026-10-02T06:30:00.000Z"); // 12:00 India time
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString();

/** parseCsv exactly as store.ts had it before 2 Oct 2026 (fa1fb30): every comma sheet must parse the same. */
function legacyParseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const table = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      table.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); table.push(row); }
  const rows = table.filter((r) => r.some((f) => f.trim() !== ""));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => { if (h) o[h] = (r[i] ?? "").trim(); });
    return o;
  });
}

/* ── Fixtures: Meta's downloads, fictional ───────────────────────────────── */

const FORMS_HEADER = ["id", "created_time", "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name", "form_id", "form_name",
  "is_organic", "platform", "full_name", "phone_number", "email", "company_name", "city", "what_type_of_business_do_you_run?", "lead_status"];
const FORMS_ROWS = [
  ["l:900000000000001", "2026-10-01T10:15:00+0000", "ag:900000000000101", "Test ad", "as:900000000000201", "Test ad set", "c:900000000000301",
    "Test campaign", "f:900000000000401", "Website enquiry", "FALSE", "ig", "Test Lead One", "p:+919000000001", "one@example.org",
    "Example Test Classes", "Patna", "Coaching institute", "CREATED"],
  ["l:900000000000002", "2026-10-01T11:00:00+0000", "", "", "", "", "", "", "f:900000000000401", "Website enquiry", "TRUE", "fb",
    "Test Lead Two", "p:+919000000002", "two@example.org", "", "Gaya", "Other", "CREATED"],
  ["l:900000000000003", "2026-10-01T11:30:00+0000", "", "", "", "", "", "", "f:900000000000401", "Website enquiry", "1", "ig",
    "Test Lead Three", "", "", "", "Ranchi", "School", "CREATED"],
];
const FORMS_TSV = [FORMS_HEADER, ...FORMS_ROWS].map((r) => r.join("\t")).join("\r\n") + "\r\n";
const LC_CSV = [
  "Created,Name,Email,Phone,Stage,Source,Owner",
  "2026-10-01T09:00:00+05:30,Test Lead Four,four@example.org,+91 90000 00004,Intake,Instant form,Test Owner",
  "2026-10-01T09:30:00+05:30,Test Lead Five,,,Intake,Instant form,Test Owner",
].join("\n") + "\n";
const CRM_EXPORT_HEADER = "Institute,Contact name,Status,Kind,City,State,Phone,WhatsApp,Email,Website,Source,Assigned to,Old label,Tags,Demo,Demo opens,Last contact,Last channel,Next action,Created,Notes";

/* ── 1. Bytes to text ────────────────────────────────────────────────────── */

const ab = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
let d = M.decodeCsvBytes(ab(utf16le(FORMS_TSV)));
check(d.excel !== true && d.encoding === "utf-16le" && d.text === FORMS_TSV, "UTF-16LE with a BOM decodes to the text, BOM gone", d.encoding);
d = M.decodeCsvBytes(utf16le(FORMS_TSV, false));
check(d.encoding === "utf-16le" && d.text === FORMS_TSV, "UTF-16LE without a BOM is recognised by its zero bytes", d.encoding);
d = M.decodeCsvBytes(utf16be(FORMS_TSV));
check(d.encoding === "utf-16be" && d.text === FORMS_TSV, "UTF-16BE with a BOM decodes", d.encoding);
d = M.decodeCsvBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("name,city\nCafé Classes,Pune\n", "utf8")]));
check(d.encoding === "utf-8" && d.text === "name,city\nCafé Classes,Pune\n", "UTF-8 with a BOM decodes, BOM gone", d.text);
d = M.decodeCsvBytes(Buffer.from("name,city\nCaf\xe9 Classes,Pune\n", "latin1"));
check(d.encoding === "windows-1252" && d.text.includes("Café Classes"), "windows-1252 (an older Excel's CSV) decodes café", d);
d = M.decodeCsvBytes(Buffer.from("name,city\nExample Classes,Pune\n", "utf8"));
check(d.encoding === "utf-8" && d.text === "name,city\nExample Classes,Pune\n", "plain UTF-8 stays as it is", d);
check(M.decodeCsvBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00])).excel === true, "an .xlsx (zip) is recognised as Excel");
check(M.decodeCsvBytes(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])).excel === true, "an old .xls is recognised as Excel");
check(M.decodeCsvBytes(new Uint8Array(0)).text === "", "an empty file is empty text");

/* ── 2. parseCsv: the old sheets exactly as before, Meta's sniffed ───────── */

const thirty = ["name,phone,email,city,type", ...Array.from({ length: 30 }, (_, i) => `Example School ${i + 1},98765${String(43000 + i)},,Patna,school`)].join("\n") + "\n";
const legacyFixtures = {
  plain: "Name,Phone,Email,City,Type\nSunrise Tutorials,9876543210,,Patna,coaching\n",
  quoted: 'name,phone,notes\n"Example, Classes",98765 43210,"line one\nline two, with ""quotes"""\r\n',
  crlf: "name,phone\r\nA,1\r\nB,2\r\n",
  bom: "\uFEFFname,phone\nA,1\n",
  semicolonsInData: "name,notes\nA,one; two; three; four\n",
  blankLines: "\n\nname,phone\n\nA,1\n,,\n",
  noFinalNewline: "name,phone\nA,1",
  oneColumn: "name\nA\nB\n",
  template: M.leadImportTemplateCsv(),
  thirty,
  crmExport: CRM_EXPORT_HEADER + '\r\nExample Classes,Test Person,contacted,coaching,Patna,Bihar,+919000000001,,test@example.org,,CSV import,,,,,0,,,,,"first\nsecond"',
};
for (const [name, text] of Object.entries(legacyFixtures)) {
  check(same(M.parseCsv(text), legacyParseCsv(text)), `parseCsv reads the "${name}" sheet exactly as before`);
}
const kitCsvs = [join(KIT, "LEAD-SHEET-TEMPLATE.csv"), join(KIT, "PROSPECTS-DELHI-NCR.csv")].filter((p) => existsSync(p));
if (existsSync(KIT)) {
  for (const dir of readdirSync(KIT)) {
    const p = join(KIT, dir);
    if (/^outreach-/.test(dir) && existsSync(p)) for (const f of readdirSync(p)) if (/\.csv$/i.test(f)) kitCsvs.push(join(p, f));
  }
}
let kitSame = 0;
for (const f of kitCsvs) {
  const text = readFileSync(f, "utf8");
  if (same(M.parseCsv(text), legacyParseCsv(text))) kitSame++;
  else check(false, `parseCsv reads the sales kit's ${f.slice(KIT.length + 1)} exactly as before`);
}
console.log(`      sales kit CSVs parsed exactly as before: ${kitSame} of ${kitCsvs.length}`);

const tsv = M.parseCsv("name\tphone\tcity\nExample Classes\t+91 90000 00001\tPatna\n");
tab(tsv.length === 1 && tsv[0].name === "Example Classes" && tsv[0].phone === "+91 90000 00001" && tsv[0].city === "Patna", "a tab-separated sheet is sniffed and parsed", tsv);
const ssv = M.parseCsv("name;phone;city\r\nExample Classes;+91 90000 00001;Patna\r\n");
check(ssv.length === 1 && ssv[0].city === "Patna" && ssv[0].phone === "+91 90000 00001", "a semicolon sheet is sniffed", ssv);
const qTab = M.parseCsv('name\tnotes\n"Example\tClasses"\t"a, b"\n');
tab(qTab[0]?.name === "Example\tClasses" && qTab[0]?.notes === "a, b", "in a tab sheet a quoted tab or comma stays inside its field", qTab);
const qComma = M.parseCsv('name,notes\n"Example, Classes","a\tb"\n');
check(qComma[0]?.name === "Example, Classes" && qComma[0]?.notes === "a\tb", "in a comma sheet a quoted comma or tab stays inside its field", qComma);
check(M.sniffDelimiter('"a\tb",c\n1,2') === ",", "a tab inside quotes does not make a tab sheet");
check(M.sniffDelimiter("\n \nname;phone,city;x") === ";" && M.sniffDelimiter("a,b;c") === ",", "the first non-empty line decides; more semicolons than commas is semicolon");
check(M.parseCsv("name\tphone\nA\t1\n", ",").length === 1 && "name\tphone".replace(/\s/g, "_") in M.parseCsv("name\tphone\nA\t1\n", ",")[0], "an explicit delimiter wins over the sniffing");

/* ── 3. Which download is it ─────────────────────────────────────────────── */

const formsRows = M.parseCsv(M.decodeCsvBytes(utf16le(FORMS_TSV)).text);
const lcRows = M.parseCsv(LC_CSV);
tab(M.metaCsvLayout(Object.keys(formsRows[0] || {})) === "forms", "a forms download (UTF-16, tabs) reads as Meta's forms layout", Object.keys(formsRows[0] || {}));
check(M.metaCsvLayout(Object.keys(lcRows[0] || {})) === "leads_center", "a Leads Center download reads as Leads Center", Object.keys(lcRows[0] || {}));
const keysOf = (csv) => Object.keys(M.parseCsv(csv)[0] || {});
check(M.metaCsvLayout(keysOf(M.leadImportTemplateCsv())) === null, "LEAD-SHEET-TEMPLATE is not a Meta layout");
check(M.metaCsvLayout(keysOf(legacyFixtures.plain)) === null, "a plain name,phone,email,city,type sheet is not a Meta layout");
check(M.metaCsvLayout(keysOf(legacyFixtures.crmExport)) === null, "the CRM's own export is not a Meta layout");
check(M.metaCsvLayout(keysOf("Name,Email,Phone,Stage,Owner\nA,a@example.org,1,Won,B\n")) === null, "another CRM's export (Name, Email, Stage, Owner, no source) is not Leads Center");
check(M.metaCsvLayout(keysOf("org_name,name,phone,stage,source,owner\nA,B,1,NEW,x,y\n")) === null, "a sheet with the CRM's own columns is never Leads Center");
check(M.metaCsvLayout(["created_time", "platform"]) === null && M.metaCsvLayout(["created_time", "platform", "form_id"]) === "forms", "forms needs created_time and two of Meta's own columns");

/* ── 4. Meta rows to leads; the old formats exactly as before ────────────── */

const m1 = M.mapCsvRow(formsRows[0] || {});
const l1 = m1.lead || {};
tab(l1.id === "ol_meta_900000000000001" && l1.metaLeadId === "900000000000001", "a forms row keeps Meta's lead id: ol_meta_<id>, l: stripped", l1.id);
tab(l1.metaFormId === "900000000000401" && l1.metaCampaignId === "900000000000301" && l1.metaAdsetId === "900000000000201" && l1.metaAdId === "900000000000101",
  "f:, c:, as: and ag: prefixes are stripped from the ids", [l1.metaFormId, l1.metaCampaignId, l1.metaAdsetId, l1.metaAdId]);
tab(l1.phone === "+919000000001" && l1.email === "one@example.org" && l1.contactName === "Test Lead One", "the p: phone, the e-mail and the person's name", [l1.phone, l1.email, l1.contactName]);
tab(l1.source === "Instagram Lead Ads" && l1.metaPlatform === "ig", "platform ig is Instagram Lead Ads", l1.source);
tab(l1.metaCampaignName === "Test campaign" && l1.metaFormName === "Website enquiry" && l1.metaAdsetName === "Test ad set" && l1.metaAdName === "Test ad",
  "the campaign, form, ad set and ad names are kept");
tab(l1.instituteName === "Example Test Classes" && l1.kind === "coaching" && l1.city === "Patna", "the title is the business name, the kind from the business-type answer", [l1.instituteName, l1.kind]);
tab(l1.metaOrganic === "no" && l1.status === "new" && l1.createdAt === "2026-10-01T10:15:00.000Z" && !("nextActionAt" in l1),
  "is_organic FALSE is no; status New; created at Meta's time; NO follow-up date (an old export must not flood Today)", l1);
tab(/^Meta lead form, Instagram, 1 Oct 2026, 15:45 IST\n/.test(l1.notes || "") && /\nAnswers:\n/.test(l1.notes || "")
  && (l1.notes || "").includes("what_type_of_business_do_you_run?: Coaching institute") && !/lead_status|CREATED/.test(l1.notes || ""),
  "every answer is in the notes, Meta's own extras (lead_status) are not", l1.notes);
const l2 = M.mapCsvRow(formsRows[1] || {}).lead || {};
tab(l2.source === "Facebook Lead Ads" && l2.instituteName === "Lead from Facebook, Gaya" && l2.kind === "other" && l2.metaOrganic === "yes"
  && /No ad \(organic, or a test lead\)/.test(l2.notes || "") && !l2.metaCampaignName,
  "a Facebook row without a business: titled by platform and city (never the person's name), organic TRUE", [l2.instituteName, l2.metaOrganic]);
const s3 = M.mapCsvRow(formsRows[2] || {});
tab("skip" in s3 && /no phone or email/.test(s3.skip), "a row with neither phone nor e-mail is skipped, as any other row", s3);
check(M.mapCsvRow({ ...formsRows[0], is_organic: "1" }).lead?.metaOrganic === "yes" && M.mapCsvRow({ ...formsRows[0], is_organic: "0" }).lead?.metaOrganic === "no",
  "is_organic 1 and 0 read as yes and no");
const lc1 = M.mapCsvRow(lcRows[0] || {}).lead || {};
check(lc1.source === "Meta Leads Center" && lc1.contactName === "Test Lead Four" && lc1.phone === "+919000000004" && lc1.email === "four@example.org"
  && (lc1.notes || "").includes("Leads Center: stage Intake, source Instant form, owner Test Owner") && /^Meta Leads Center export/.test(lc1.notes || ""),
  "a Leads Center row: source Meta Leads Center, its stage, source and owner in the notes", lc1);
check(!lc1.id && !lc1.metaLeadId && lc1.status === "new" && lc1.createdAt === "2026-10-01T03:30:00.000Z", "Leads Center has no lead id of its own: none is made up", [lc1.id, lc1.createdAt]);
check("skip" in M.mapCsvRow(lcRows[1] || {}), "a Leads Center row without phone or e-mail is skipped");
check(M.mapCsvRow({ ...lcRows[0], id: "l:900000000000009" }).lead?.id === "ol_meta_900000000000009" && !M.mapCsvRow({ ...lcRows[0], id: "123" }).lead?.id,
  "a Leads Center id column counts only when it holds a real Meta id (10 digits or more)");

/* The snapshot of today's mapping (taken from store.ts at fa1fb30 before any Meta change). */
const SNAPSHOT = {
  plain: [
    { lead: { instituteName: "Sunrise Tutorials E2E", kind: "coaching", phone: "+919876543210", city: "Patna", source: "CSV import", status: "new", tags: ["coaching"] } },
    { lead: { instituteName: "Example Public School", kind: "school", phone: "+919876543211", email: "office@example.org", city: "Gaya", source: "CSV import", status: "new", tags: ["school"] } },
    { lead: { instituteName: "Example Dental Clinic", kind: "dental", phone: "+919876543212", city: "Ranchi", source: "CSV import", status: "new", tags: ["dental"] } },
  ],
  crmExport: [
    { lead: { instituteName: "Example Classes", kind: "coaching", contactName: "Test Person", phone: "+919000000001", email: "test@example.org", website: "https://example.org",
      city: "Patna", state: "Bihar", source: "CSV import", status: "contacted", notes: "first line\nsecond line", createdAt: "2026-09-29T09:00:00.000Z", tags: ["coaching"] } },
  ],
};
const PLAIN = "name,phone,email,city,type\nSunrise Tutorials E2E,9876543210,,Patna,coaching\nExample Public School,+91 98765 43211,office@example.org,Gaya,school\nExample Dental Clinic,098765 43212,,Ranchi,dental\n";
const EXPORT_ROW = CRM_EXPORT_HEADER + "\r\n"
  + 'Example Classes,Test Person,contacted,coaching,Patna,Bihar,+919000000001,,test@example.org,https://example.org,CSV import,Test Owner,,SCHOOL_CBSE,,0,2026-09-30T10:00:00.000Z,whatsapp,2026-10-03T04:30:00.000Z,2026-09-29T09:00:00.000Z,"first line\nsecond line"';
check(same(M.parseCsv(PLAIN).map((r) => M.mapCsvRow(r)), SNAPSHOT.plain), "a plain sheet maps exactly as before", M.parseCsv(PLAIN).map((r) => M.mapCsvRow(r)));
check(same(M.parseCsv(EXPORT_ROW).map((r) => M.mapCsvRow(r)), SNAPSHOT.crmExport), "the CRM's own export maps exactly as before");
const tplLead = M.mapCsvRow(M.parseCsv(M.leadImportTemplateCsv())[0]).lead || {};
check(tplLead.instituteName === "Example Public School" && tplLead.kind === "school" && tplLead.pitch === "fix_website" && tplLead.whatsapp === "+919876543210"
  && same(tplLead.tags, ["SCHOOL_CBSE"]) && tplLead.language === "en" && !Object.keys(tplLead).some((k) => k.startsWith("meta")),
  "the import template's example row maps exactly as before, with no meta keys", tplLead);
check(same(M.unguardCells({ a: "'=1+1", b: "'-x", c: "'@y", d: "'\tz", e: "'plain", f: "''=x" }), { a: "=1+1", b: "-x", c: "@y", d: "\tz", e: "'plain", f: "''=x" }),
  "unguardCells takes one ' off a guarded formula cell, and nothing else");

/* ── 5. Importing a Meta export twice, and after the webhook ─────────────── */

const plan1 = M.planImport(formsRows, [], {}, NOW);
tab(plan1.result.added.length === 2 && plan1.result.skipped.length === 1 && plan1.toSave.every((l) => l.id.startsWith("ol_meta_")),
  "a forms export plans 2 new Meta leads and 1 skipped row", plan1.result);
const plan2 = M.planImport(formsRows, plan1.toSave, {}, NOW);
tab(plan2.result.added.length === 0 && plan2.result.duplicates.length === 2 && plan2.toSave.length === 0, "the same export again adds nothing", plan2.result);
const fromWebhook = { id: "ol_meta_900000000000002", metaLeadId: "900000000000002", instituteName: "Lead from Facebook, Gaya", kind: "other", status: "contacted",
  phone: "+919000000098", createdAt: iso(NOW.getTime() - DAY), updatedAt: iso(NOW.getTime() - DAY) };
const plan3 = M.planImport(formsRows, [fromWebhook], {}, NOW);
tab(plan3.result.added.length === 1 && plan3.result.duplicates.some((x) => x.existingId === "ol_meta_900000000000002"),
  "an export whose lead the webhook already brought (same Meta id, other phone) is a duplicate", plan3.result);
const importStorage = memoryStorage();
const importStore = new M.LocalOutreachStore(importStorage, { now: () => NOW });
const w0 = importStorage.writes;
const imp1 = await importStore.importLeads(formsRows);
tab(imp1.added.length === 2 && importStorage.writes - w0 === 1, "the local store imports the Meta export in ONE storage write", { added: imp1.added.length, writes: importStorage.writes - w0 });
const imp2 = await importStore.importLeads(formsRows);
tab(imp2.added.length === 0 && imp2.duplicates.length === 2, "importing it again adds nothing", imp2);

/* ── 6. One phone rule ───────────────────────────────────────────────────── */

const SPELLINGS = [
  "+91 98100 12345", "098100-12345", "9810012345", "+91-11-46571119", "011-46508577", "0091 98100 12345", "919810012345",
  "+919810012345", "98100 12345, 91234 56789", "98100 12345 or 91234 56789", "98100 12345 / 91234 56789", "+44 20 7946 0958",
  "+1 (415) 555-0100", "12345", "", "abc", "+91 90000 00001", "9000000001", "09000000001", "+91 9000000001", "(+91) 98100-12345",
  "91 98100 12345", "0 98100 12345", "+91.98100.12345", "tel: +91 98100 12345", "98100-123-45", "+971 50 123 4567", "1234567",
  "00 44 20 7946 0958", " 9810012345 ",
];
let agree = 0;
for (const s of SPELLINGS) {
  const a = M.normalizePhone(s) || "";
  const b = F.normalizePhone(s);
  if (a === b) agree++;
  else check(false, `fields.js and store.ts read "${s}" the same`, { store: a, fields: b });
}
check(agree === 30 && SPELLINGS.length === 30, `fields.js and store.ts agree on all 30 phone spellings (${agree})`);
check(F.normalizePhone("p:+919000000001") === "+919000000001" && F.normalizeEmail("TEST@Example.org") === "test@example.org", "fields.js reads Meta's p: prefix and lower-cases e-mail");

/* ── 7. Local intake: localIntake.simulate over LocalOutreachStore ───────── */

let clock = NOW;
const crmStorage = memoryStorage();
const regStorage = memoryStorage();
const store = new M.LocalOutreachStore(crmStorage, { now: () => clock });
const sim = (fx) => M.simulate(fx, { store, storage: regStorage, now: clock });
const OWNER = "m_owner";
/** A lead as Meta's Graph API gives it (what the webhook reads), fictional. */
const graphLead = (id, o = {}) => ({
  id, created_time: iso(clock.getTime() - 3600e3), platform: o.platform || "ig", form_id: "900000000000401", form_name: "Website enquiry",
  campaign_id: "900000000000301", campaign_name: "Test campaign", ad_id: "900000000000101", ad_name: "Test ad", is_organic: false,
  field_data: [
    ["full_name", o.name ?? "Test Lead One"], ["phone_number", o.phone ?? "+91 90000 00011"], ["email", o.email ?? "eleven@example.org"],
    ["company_name", o.business ?? "Example Test Classes"], ["city", o.city ?? "Patna"], ["business_type", o.type ?? "Coaching institute"],
  ].filter(([, v]) => v).map(([name, v]) => ({ name, values: [v] })),
  custom_disclaimer_responses: [{ checkbox_key: "contact_ok", is_checked: true }],
});
const bellsOf = async (who) => {
  store.actAs(who === OWNER ? null : who);
  const n = await store.notifications();
  store.actAs(null);
  return n;
};
const metaLines = async (leadId) => (await store.listEvents(leadId)).filter((e) => e.id.startsWith("oe_meta_"));
const ashaId = await store.saveMember({ email: "asha@example.org", displayName: "Asha Test", role: "member", newLeadCap: 40 });
const ayeshaId = await store.saveMember({ email: "ayesha@example.org", displayName: "Ayesha Test", role: "admin" });

/* Created, into the pool (the default). */
const A = "900000000000011";
const ra = await sim(graphLead(A));
const la = (await store.getLead("ol_meta_" + A)) || {};
check(ra.result === "created" && ra.leadId === "ol_meta_" + A && ra.assignedTo === null, "a Meta lead is created as ol_meta_<id>, in the Unassigned pool", ra);
check(la.createdById === OWNER && la.assigneeId === null && la.status === "new" && la.nextActionAt === iso(clock) && la.createdAt === iso(clock.getTime() - 3600e3),
  "added by Mehdi, Unassigned, New, due now, created when the person sent the form", la);
check(la.instituteName === "Example Test Classes" && la.source === "Instagram Lead Ads" && la.metaCampaignName === "Test campaign" && la.metaConsent === "yes"
  && la.phone === "+919000000011" && la.kind === "coaching", "the lead carries the title, source, campaign, consent and contact", la);
const ALLOWED = new Set([...F.META_LEAD_KEYS, "id", "status", "createdAt", "updatedAt", "nextActionAt", "createdById", "assigneeId", "assignedAt", "assignedById", "qualifiedById", "closedAt"]);
check(Object.keys(la).every((k) => ALLOWED.has(k)), "only Meta's keys (and what the store adds)", Object.keys(la).filter((k) => !ALLOWED.has(k)));
check((JSON.parse(crmStorage.getItem(M.OUTREACH_LOCAL_KEY)).leads.find((l) => l.id === "ol_meta_" + A) || {}).createdById === OWNER,
  "its creator is stored, so its writer-less line can never make it Mehdi's on a later read");
const linesA = await store.listEvents("ol_meta_" + A);
check(linesA.length === 1 && linesA[0].id === "oe_meta_" + A && !linesA[0].actorId && linesA[0].type === "note"
  && linesA[0].detail === 'New lead from the Instagram lead form "Website enquiry" (campaign "Test campaign").', "one history line, written by nobody", linesA);
check((await bellsOf(OWNER)).some((n) => n.kind === "lead_in" && n.leadId === "ol_meta_" + A && n.title === "New lead from Instagram: Example Test Classes"),
  "Mehdi's bell: New lead from Instagram");
const regA = M.readLocal(regStorage);
check(regA.leads[A]?.status === "created" && regA.log.some((l) => l.event === "created" && l.leadgenId === A && l.crmLeadId === "ol_meta_" + A), "the registry and the log have it", regA.leads[A]);
check(!/Test Lead One|eleven@example\.org|Example Test Classes|\+919000000011/.test(JSON.stringify(regA)), "the local registry and log hold ids only");

/* Already: the same id; the CRM's own check without the registry; after a delete (erasure stays). */
const ra2 = await sim(graphLead(A));
check(ra2.result === "already" && ra2.leadId === "ol_meta_" + A && (await store.listLeads()).filter((l) => l.metaLeadId === A).length === 1, "the same Meta lead again: already, still one lead", ra2);
check((await M.simulate(graphLead(A), { store, storage: memoryStorage(), now: clock })).result === "already", "without the registry the CRM itself (ol_meta_<id>) answers already");
check((await store.simulateMetaLead(A, { instituteName: "x" })).result === "already", "the store alone answers already for an id it has");
await store.deleteLead("ol_meta_" + A);
const ra4 = await sim(graphLead(A));
check(ra4.result === "already" && ra4.leadId === null && !(await store.getLead("ol_meta_" + A)), "after Mehdi deletes it the same Meta lead never comes back", ra4);

/* Duplicates: by phone (another spelling) and by e-mail (capitals); 3 touches and 1 bell a day; the next day again. */
await store.upsertLead({ id: "ol_test_dup", instituteName: "Example Dup School", kind: "school", phone: "+91 90000 00021", email: "twentyone@example.org",
  status: "contacted", nextActionAt: iso(clock.getTime() + 5 * DAY) });
await store.assignLeads(["ol_test_dup"], ashaId);
const rb1 = await sim(graphLead("900000000000021", { phone: "09000000021", email: "", business: "Other Name" }));
const dup1 = (await store.getLead("ol_test_dup")) || {};
check(rb1.result === "duplicate" && rb1.leadId === "ol_test_dup" && !(await store.getLead("ol_meta_900000000000021")), "same phone, another spelling: a duplicate, no second lead", rb1);
check(dup1.nextActionAt === iso(clock) && dup1.assigneeId === ashaId, "the existing open lead is due now, and stays Asha's", dup1.nextActionAt);
/* Review, 3 Oct: whoever sent it may not be this lead, so its line is neutral and the answers go to Mehdi alone. */
const dl1 = await metaLines("ol_test_dup");
check(dl1.length === 1 && !dl1[0].actorId
  && dl1[0].detail === `Someone sent the Instagram lead form with this lead's phone number (form "Website enquiry", campaign "Test campaign"). Their answers went to Mehdi.`,
  "a neutral line on it: someone sent the form with this lead's phone number; their answers went to Mehdi", dl1[0]?.detail);
check(!/Test Lead One|eleven@example\.org|Other Name|Answers|full_name/.test(dl1[0]?.detail || ""), "...carrying none of the answers", dl1[0]?.detail);
const requestsAs = async (who) => {
  store.actAs(who === OWNER ? null : who);
  const list = await store.listRequests();
  store.actAs(null);
  return list.filter((r) => r.kind === "meta_form" && r.leadId === "ol_test_dup");
};
const ask1 = await requestsAs(OWNER);
check(ask1.length === 1 && !ask1[0].askedBy && ask1[0].hostId === OWNER && !ask1[0].resolvedAt && ask1[0].body.length <= 500
  && ask1[0].body.startsWith(`Sent on the Instagram form "Website enquiry" with this lead's phone number. Answers: full_name: Test Lead One; `)
  && ask1[0].body.includes("Other Name"),
  "the answers wait for Mehdi: a meta_form request, asked by nobody, to him", ask1);
check((await requestsAs(ashaId)).length === 0, "Asha, whose lead it is, does not read that request", await requestsAs(ashaId));
check((await requestsAs(ayeshaId)).length === 1, "an admin can read it (as in the database)");
const ashaBell = (list) => list.filter((n) => n.kind === "lead_in" && n.leadId === "ol_test_dup");
check(ashaBell(await bellsOf(ashaId)).length === 1 && ashaBell(await bellsOf(ashaId))[0].title === "Example Dup School: someone sent the Instagram form with this lead's phone number",
  "the bell goes to whoever works it (Asha), in neutral words", ashaBell(await bellsOf(ashaId))[0]?.title);
const rb2 = await sim(graphLead("900000000000022", { phone: "", email: "TwentyOne@Example.org" }));
check(rb2.result === "duplicate" && rb2.leadId === "ol_test_dup", "same e-mail in capitals: a duplicate", rb2);
check((await metaLines("ol_test_dup")).some((e) => e.detail.startsWith("Someone sent the Instagram lead form with this lead's e-mail ("))
  && (await requestsAs(OWNER)).some((r) => r.body.startsWith(`Sent on the Instagram form "Website enquiry" with this lead's e-mail. Answers: `)),
  "...and its line and request say it came with the lead's e-mail");
await sim(graphLead("900000000000023", { phone: "+91 90000 00021", email: "" }));
clock = new Date(NOW.getTime() + 10 * 60e3);
const rb4 = await sim(graphLead("900000000000024", { phone: "+91 90000 00021", email: "" }));
const dup4 = (await store.getLead("ol_test_dup")) || {};
check(rb4.result === "duplicate" && rb4.quiet === true && (await metaLines("ol_test_dup")).length === 3 && dup4.updatedAt === iso(NOW),
  "the fourth touch the same day is quiet: no line, the lead untouched", { quiet: rb4.quiet, updatedAt: dup4.updatedAt });
check(ashaBell(await bellsOf(ashaId)).length === 1, "one bell a day for that lead");
check(M.readLocal(regStorage).log.some((l) => l.leadgenId === "900000000000024" && l.event === "duplicate" && /quiet/.test(l.detail || "")), "the quiet one is logged");
clock = new Date(NOW.getTime() + DAY);
const rb5 = await sim(graphLead("900000000000025", { phone: "+91 90000 00021", email: "" }));
check(rb5.result === "duplicate" && !rb5.quiet && (await metaLines("ol_test_dup")).length === 4 && ashaBell(await bellsOf(ashaId)).length === 2,
  "the next India day: a line and a bell again", rb5);
check((await requestsAs(OWNER)).length === 4, "one request to Mehdi per form that touched the lead (4); the quiet one added none", (await requestsAs(OWNER)).length);
await store.upsertLead({ id: "ol_test_won", instituteName: "Example Won School", kind: "school", phone: "+91 90000 00026", status: "won", nextActionAt: iso(NOW.getTime() + 9 * DAY) });
const rw = await sim(graphLead("900000000000026", { phone: "+91 90000 00026", email: "" }));
const won = (await store.getLead("ol_test_won")) || {};
check(rw.result === "duplicate" && won.nextActionAt === iso(NOW.getTime() + 9 * DAY) && (await metaLines("ol_test_won")).length === 1
  && (await bellsOf(OWNER)).some((n) => n.kind === "lead_in" && n.leadId === "ol_test_won"), "a closed lead gets the line but no due date; the bell goes to Mehdi", won.nextActionAt);

/* Where new leads go: Mehdi; the rules in turn (a full person skipped; no rule fits: the pool). */
clock = new Date(NOW.getTime() + 2 * DAY);
M.saveLocalSettings("owner", null, regStorage, clock);
const rc = await sim(graphLead("900000000000031", { phone: "+91 90000 00031", email: "thirtyone@example.org", business: "Example Owner Classes" }));
check(rc.result === "created" && rc.assignedTo === OWNER && ((await store.getLead("ol_meta_900000000000031")) || {}).assigneeId === OWNER, "mode owner: the lead is Mehdi's", rc);
M.saveLocalSettings("rules", null, regStorage, clock);
await store.saveRule({ name: "Coaching", kind: "coaching", memberIds: [ashaId, ayeshaId] });
const ruleSim = (n) => sim(graphLead(`9000000000000${n}`, { phone: `+91 90000 000${n}`, email: `r${n}@example.org` }));
const r41 = await ruleSim(41);
const r42 = await ruleSim(42);
const r43 = await ruleSim(43);
check(r41.assignedTo === ashaId && r42.assignedTo === ayeshaId && r43.assignedTo === ashaId, "mode rules: Asha, then Ayesha, then Asha (the rule's turn)", [r41.assignedTo, r42.assignedTo, r43.assignedTo]);
const ashaNow = await bellsOf(ashaId);
check(ashaNow.some((n) => n.kind === "assigned" && n.leadId === "ol_meta_900000000000041" && n.title === "New Instagram lead assigned to you: Example Test Classes")
  && (await bellsOf(OWNER)).some((n) => n.kind === "lead_in" && n.leadId === "ol_meta_900000000000041"), "the assignee's bell says assigned; Mehdi still hears of it");
store.actAs(ashaId);
const ashaLeads = (await store.listLeads()).map((l) => l.id);
store.actAs(null);
check(ashaLeads.includes("ol_meta_900000000000041") && !ashaLeads.includes("ol_meta_900000000000042") && !ashaLeads.includes("ol_meta_900000000000031"),
  "Asha reads her Meta lead and not the others", ashaLeads);
const r44 = await sim(graphLead("900000000000044", { phone: "+91 90000 00044", email: "r44@example.org", type: "Dental clinic", business: "Example Smile Care" }));
check(r44.result === "created" && r44.assignedTo === null, "no rule fits (a dental lead): the pool", r44);
const r45 = await ruleSim(45);
await store.saveMember({ id: ashaId, newLeadCap: 2 });
const r46 = await ruleSim(46);
check(r45.assignedTo === ayeshaId && r46.assignedTo === ayeshaId, "Asha at her New cap is skipped in her turn", [r45.assignedTo, r46.assignedTo]);

/* Mehdi only; ids are digits; the data as 0012 takes it. */
store.actAs(ashaId);
const eMember = await error(() => store.simulateMetaLead("900000000000051", { instituteName: "Example", kind: "other" }));
const rMember = await sim(graphLead("900000000000052", { phone: "+91 90000 00052", email: "" }));
store.actAs(null);
check(eMember?.code === "42501", "a member cannot put a Meta lead in (42501)", eMember?.message);
check(rMember.result === "refused" && !(await store.getLead("ol_meta_900000000000052")) && !M.readLocal(regStorage).leads["900000000000052"], "Simulate as a member is refused and adds nothing", rMember);
check((await error(() => store.simulateMetaLead("12a", { instituteName: "x" })))?.code === "22023", "a Meta lead id that is not digits is refused (22023)");
check((await error(() => store.simulateMetaLead("900000000000053", { notes: "x".repeat(17000) })))?.code === "22023", "a lead over 16 KB is refused (22023)");
await store.simulateMetaLead("900000000000071", { instituteName: "  Example Shape Test  ", kind: "villa", source: "Google", metaLeadId: "1", phone: "+919000000071",
  notes: "n", evil: "x", city: 5, metaCampaignName: "x".repeat(300) }, { assignMode: "pool" });
const shaped = (await store.getLead("ol_meta_900000000000071")) || {};
check(shaped.kind === "other" && shaped.source === "Meta Lead Ads" && shaped.metaLeadId === "900000000000071" && !("evil" in shaped) && !("city" in shaped)
  && shaped.instituteName === "Example Shape Test" && shaped.metaCampaignName?.length === 200, "unknown keys and non-text dropped, kind and source from their lists, the id forced, cut to size", shaped);

/* The daily cap delays: nothing stored over it, one log line a day, the next day it fits. */
M.saveLocalSettings("pool", 1, regStorage, clock);
const rCap = await sim(graphLead("900000000000061", { phone: "+91 90000 00061", email: "" }));
await sim(graphLead("900000000000062", { phone: "+91 90000 00062", email: "" }));
const regCap = M.readLocal(regStorage);
check(rCap.result === "over_cap" && !(await store.getLead("ol_meta_900000000000061")) && !regCap.leads["900000000000061"], "over the daily cap: not stored, so it can come again", rCap);
check(regCap.log.filter((l) => l.event === "over_cap").length === 1, "one over_cap line for the day");
clock = new Date(NOW.getTime() + 3 * DAY);
check((await sim(graphLead("900000000000061", { phone: "+91 90000 00061", email: "" }))).result === "created", "the next day it fits");
check((await M.simulate(graphLead("900000000000063"), { store: { mode: "supabase" }, storage: memoryStorage(), now: clock })).result === "refused",
  "Simulate refuses on the live CRM (no local store)");

/* ── 8. The lead lists: the Campaign filter, search, the CSV guard ───────── */

const base = { kind: "other", status: "new", createdAt: iso(NOW), updatedAt: iso(NOW) };
const row = (lead) => ({ lead, opens: 0, freshOpens: 0, hot: false, recent: false, contacted: false, replied: false });
const LIST = [
  { ...base, id: "ol_meta_1", instituteName: "Meta One", metaLeadId: "9001", source: "Instagram Lead Ads", metaCampaignName: "Test campaign", metaFormName: "Website enquiry" },
  { ...base, id: "ol_meta_2", instituteName: "Meta Two", metaLeadId: "9002", source: "Facebook Lead Ads" },
  { ...base, id: "ol_meta_3", instituteName: "Meta Three", metaLeadId: "9003", source: "Meta Lead Ads", metaCampaignId: "9000000000009" },
  { ...base, id: "ol_plain", instituteName: "Plain School", source: "CSV import" },
].map(row);
const pick = (f) => LIST.filter((r) => M.matchesFilters(r, { ...M.EMPTY_FILTERS, ...f })).map((r) => r.lead.id);
check(same(pick({ campaign: "Test campaign" }), ["ol_meta_1"]) && same(pick({ campaign: "test CAMPAIGN" }), ["ol_meta_1"]), "Campaign filters Meta leads by campaign name");
check(same(pick({ campaign: M.NONE }), ["ol_meta_2"]), "No campaign: Meta leads without one, never a CSV lead", pick({ campaign: M.NONE }));
check(same(pick({ campaign: "Campaign 9000000000009" }), ["ol_meta_3"]) && same(pick({}), ["ol_meta_1", "ol_meta_2", "ol_meta_3", "ol_plain"]), "a campaign known by id only; no filter keeps all");
check(same(pick({ q: "website enquiry" }), ["ol_meta_1"]) && same(pick({ q: "test campaign" }), ["ol_meta_1"]), "the form and campaign names join the search");
const params = M.writeFilters(new URLSearchParams("view=all"), { campaign: "Test campaign" });
check(params.get("campaign") === "Test campaign" && params.get("view") === "all" && M.readFilters(params).campaign === "Test campaign"
  && M.activeFilterCount(M.readFilters(params)) === 1 && M.writeFilters(params, { campaign: "" }).get("campaign") === null, "?campaign= round-trips through the URL and clears");
check(M.cell("=1+1") === "'=1+1" && M.cell("@SUM(1)") === "'@SUM(1)" && M.cell("-1+cmd|' /C calc'!A0") === "'-1+cmd|' /C calc'!A0" && M.cell("\tfoo") === "'\tfoo",
  "the export puts ' before =, @, a tab, and -1+cmd (which starts with a digit after the minus)");
check(M.cell("+919000000001") === "+919000000001" && M.cell("+91 90000 00001") === "+91 90000 00001" && M.cell(42) === "42" && M.cell(undefined) === ""
  && M.cell('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"`, "a phone number stays as it is; a guarded cell with quotes is still quoted");
const exported = M.toCsv([row({ ...base, id: "ol_rt", instituteName: "Example Round Trip", kind: "school", contactName: "@example", phone: "+919000000081",
  notes: "- first point\n- second point" })]);
const back = M.mapCsvRow(M.parseCsv(exported)[0] || {}).lead || {};
check(exported.includes("'@example") && exported.includes("'- first point"), "the export guards a contact starting with @ and notes starting with -");
check(back.contactName === "@example" && back.notes === "- first point\n- second point" && back.phone === "+919000000081" && back.instituteName === "Example Round Trip",
  "the CRM's own export imports back unchanged", back);

/* ── 9. The Meta page's words for the live CRM's answers ─────────────────── */

/* meta_intake_status as 0012 answers it (tokenInfo is what /api/meta/connect stored: flat). */
const T = NOW.getTime();
const intake = (o = {}) => ({
  connected: true, current: true, relayConnected: false, relayCurrent: false, connectedAt: iso(T - 2 * DAY), connectedBy: "owner@example.org",
  pageId: "900000000000999", pageName: "Example Page", forms: [], assignMode: "pool", dailyCap: 300,
  tokenInfo: { set: true, valid: true, type: "SYSTEM_USER", expiresAt: null, scopes: ["leads_retrieval"], missing: [], extra: [], appMatches: true, subscribed: true, pageName: "Example Page", checkedAt: iso(T - DAY) },
  lastVerifiedAt: iso(T - DAY), lastTestAt: iso(T - DAY), lastReceivedAt: iso(T - 3600e3), lastLeadAt: iso(T - 3600e3), lastLeadId: "ol_meta_900000000000011",
  lastCatchupAt: iso(T - 5 * 3600e3), lastPollUntil: iso(T - 5 * 3600e3), alerts: { access: null, cap: null, page: null }, overCapToday: 0,
  counts: { today: 2, week: 9, duplicatesWeek: 1, duplicatesQuiet: 0, pending: 0, failedToken: 0, failedPermission: 0, failedOther: 0, testLeadsSeen: 1 },
  ...o,
});
const lines = (o, pageMatches = true, tokenSet = true) => Object.fromEntries(M.statusLines(M.readStatus(intake(o)), pageMatches, tokenSet, NOW).map((l) => [l.row, l]));
const good = lines({});
check(["connection", "token", "page", "leads", "waiting", "daily", "limit"].every((r) => good[r]?.state === "done") && !good.reach,
  "all connected: every status line is green", Object.values(good).map((l) => `${l.row}:${l.state}`));
check(good.token.text === "Valid, never expires" && good.page.text === "Example Page, subscribed to leads" && good.daily.text === "Ran today at 07:00"
  && good.leads.leadId === "ol_meta_900000000000011" && /today 2, this week 9/.test(good.leads.text), "the green lines' words", [good.token.text, good.daily.text]);
check(lines({ current: false }).connection.state === "warn" && /App Secret changed/.test(lines({ current: false }).connection.text), "a new App Secret: Connect again (amber)");
check(lines({ connected: false }).connection.state === "todo", "not connected: grey, press Connect");
/* Before Connect the server answers pageMatches false (no Page stored yet) and the daily check skips its runs. */
const fresh = lines({ connected: false, current: false, connectedAt: null, pageId: null, pageName: null, lastCatchupAt: null, lastPollUntil: null }, false);
check(fresh.page.state === "todo" && !/not the Page you connected/.test(fresh.page.text) && fresh.daily.state === "todo" && !/CRON_SECRET/.test(fresh.daily.text),
  "before Connect: the Page and the daily check are not yet (grey), never the amber Page-changed or CRON_SECRET lines", [fresh.page.text, fresh.daily.text]);
const noToken = lines({ tokenInfo: { set: false, valid: false, subscribed: false } }, true, false);
check(noToken.token.text === "Not set in Vercel yet (step 9)" && noToken.token.state === "todo" && noToken.page.state === "todo", "no token in Vercel yet: token and Page not yet (grey, not amber)");
const unchecked = lines({ tokenInfo: { set: false, valid: false, subscribed: false } }, true, true);
check(unchecked.token.text === "Set in Vercel: press Check again" && unchecked.token.state === "todo", "a token set after the last check: press Check again");
const soon = lines({ tokenInfo: { ...intake().tokenInfo, expiresAt: iso(T + 5 * DAY) } }).token;
check(soon.state === "warn" && /Valid until 7 Oct 2026/.test(soon.text), "a token ending within 10 days is amber", soon.text);
check(lines({ tokenInfo: { ...intake().tokenInfo, valid: false, error: "Graph 190/463 OAuthException" } }).token.text.includes("Graph 190/463"), "an invalid token says why");
check(/Missing permissions: ads_management/.test(lines({ tokenInfo: { ...intake().tokenInfo, missing: ["ads_management"] } }).token.text), "missing permissions are named");
check(lines({ tokenInfo: { ...intake().tokenInfo, extra: ["business_management"] } }).reach?.state === "warn", "a token that can do more than read leads is amber");
check(lines({}, false).page.state === "warn" && /not the Page you connected/.test(lines({}, false).page.text), "META_PAGE_ID changed: amber, press Connect");
const waiting = lines({ counts: { ...intake().counts, failedToken: 3, failedPermission: 2, pending: 1 } }).waiting;
check(waiting.state === "warn" && waiting.testId === "meta-pending" && /3 leads are waiting: the access token stopped working/.test(waiting.text)
  && /Meta will not show us 2 leads: check Leads access \(step 14\)/.test(waiting.text), "what waits, and the fix", waiting.text);
check(lines({ lastCatchupAt: iso(T - 27 * 3600e3) }).daily.state === "warn" && /CRON_SECRET/.test(lines({ lastCatchupAt: iso(T - 27 * 3600e3) }).daily.text),
  "the daily check older than 26 hours is amber: is CRON_SECRET set?");
check(lines({ lastCatchupAt: null, connectedAt: iso(T - 3600e3) }).daily.state === "todo", "just connected: the first daily check is tomorrow");
check(lines({ overCapToday: 4 }).limit.state === "warn" && /Today's limit of 300 is reached: 4 more are waiting at Meta/.test(lines({ overCapToday: 4 }).limit.text), "today's limit reached is amber");
const envAll = M.readEnv({ META_APP_ID: true, META_APP_SECRET: true, META_VERIFY_TOKEN: true, META_PAGE_ID: true, META_ACCESS_TOKEN: true, CRON_SECRET: true, META_GRAPH_VERSION: false, META_RELAY_SECRET: false }, ["CRON_SECRET"]);
check(envAll.META_APP_ID === "set" && envAll.CRON_SECRET === "short" && envAll.META_RELAY_SECRET === "unset", "env presence, with a value too short", envAll);
const stepsOk = Object.fromEntries(M.checklistSteps({ kind: "ok", env: { ...envAll, CRON_SECRET: "set" }, pageMatches: true, status: M.readStatus(intake()) }, NOW).map((s) => [s.id, s.state]));
check(Object.keys(stepsOk).length === 14 && ["vercel", "database", "connected", "webhook", "test", "token", "subscribed", "testlead", "daily"].every((k) => stepsOk[k] === "done")
  && ["require-secret", "publish", "leadsaccess", "forms", "audience"].every((k) => stepsOk[k] === "manual"), "the checklist ticks what the system knows, the rest is manual", stepsOk);
const stepsShort = Object.fromEntries(M.checklistSteps({ kind: "missing", env: envAll, needs0011: false }, NOW).map((s) => [s.id, s.state]));
check(stepsShort.vercel === "todo" && stepsShort.database === "todo" && stepsShort.connected === "todo", "a value too short and 0012 not run: not yet", stepsShort);
check(M.cardLine({ kind: "ok", env: envAll, pageMatches: true, status: M.readStatus(intake()) })[1].startsWith("Connected · last lead")
  && M.cardLine({ kind: "missing", env: envAll, needs0011: true })[1] === "Not set up yet: 0011 and 0012 are not run" && M.cardLine({ kind: "local" })[0] === "todo",
  "the Settings card's one line");
check(M.logText({ event: "created", formId: "900000000000401", adId: "900000000000101" }) === "Lead created (form …000401, ad …000101)"
  && M.logText({ event: "other_page" }).startsWith("Signed test from Meta's dashboard") && M.logText({ event: "failed", detail: "token (Graph 190/463)" }) === "Waiting: token (Graph 190/463)"
  && M.logText({ event: "duplicate", detail: "quiet: more than 3 today" }) === "Same lead again today: logged only", "the log's words");
check(/^[A-HJ-NP-Za-km-z2-9]{40}$/.test(M.randomWord()) && M.randomWord() !== M.randomWord(), "Make one: 40 letters and digits, a new one each time");

/* ── 10. The live CRM: client.ts against the REAL /api/meta functions ────── */
/*
 * On the live CRM the Meta page reads /api/meta/connect and /api/meta/catchup
 * (package M1's handlers) and three Supabase reads. Here client.ts is bundled
 * as in Supabase mode and the browser's fetch is a router: /api/meta/* goes to
 * the real api/meta/webhook.js and api/meta/catchup.js in this process; their
 * own calls go to a fake Supabase (the owner's session, is_admin, and 0012's
 * functions shaped as the migration builds them, checked below) and a fake
 * Graph API. So the page's words are tested on the server's real answers.
 * Every value is made up.
 */
const { createHash, createHmac } = await import("node:crypto");
const SQL12 = readFileSync(join(ROOT, "supabase", "migrations", "0012_meta_leads.sql"), "utf8");
const CLIENT_OUT = join(tmpdir(), `ideovent-test-meta-client-${process.pid}.mjs`);
const clientBuild = await build({
  stdin: { contents: `export * from "@/lib/meta/client";`, resolveDir: ROOT, loader: "ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
  plugins: [{
    name: "live",
    setup(b) {
      b.onResolve({ filter: /^@\/lib\/cms\/(config|client)$/ }, (a) => ({ path: a.path, namespace: "live" }));
      b.onLoad({ filter: /.*/, namespace: "live" }, (a) => ({
        loader: "js",
        contents: a.path.endsWith("config")
          ? `export const SUPABASE_URL = "https://example-project.supabase.test"; export const SUPABASE_ANON_KEY = "anon-key-not-real"; export const supabaseEnabled = true;`
          : `export function supabase() { return globalThis.__metaTestSupabase; }`,
      }));
      b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    },
  }],
});
writeFileSync(CLIENT_OUT, clientBuild.outputFiles[0].text);
const C = await import(pathToFileURL(CLIENT_OUT).href);
rmSync(CLIENT_OUT, { force: true });
const WEBHOOK = await import(pathToFileURL(join(ROOT, "api", "meta", "webhook.js")).href);
const CATCHUP = await import(pathToFileURL(join(ROOT, "api", "meta", "catchup.js")).href);

const SB = "https://example-project.supabase.test";
const GRAPH = "http://127.0.0.1:59999";
const APP_ID = "9900000000000001";
const SECRET = "test_app_secret_not_real_0001";
const PAGE = "900000000000999";
const ACCESS = "EAATESTSYSTEMUSERTOKEN0000000000000001";
const PAGE_TOKEN = "EAATESTPAGETOKEN00000000000000000000001";
const OWNER_JWT = "owner-session-not-real";
const MEMBER_JWT = "member-session-not-real";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const ingestHashOf = (secret) => sha(createHmac("sha256", secret).update("ideovent:meta-leads:ingest:v1").digest("hex"));
const L = { session: OWNER_JWT, noApi: false, has0011: true, has0012: true, settings: null, tooSoon: null, subscribed: false,
  scopes: [], expires: 0, calls: [], graph: [], strays: [], logs: [], queries: [], rpcs: [], tables: {}, readError: null, rpcError: null };
const reply = (status, body, type = "application/json") =>
  new Response(body === null ? null : typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": type } });
/* PostgREST's error shape; `details` carries a row, as Postgres does for a check violation (the server must drop it). */
const pgErr = (status, code, message) => reply(status, { code, message, details: "Failing row contains (Test Lead One, +919000000001)", hint: null });

/* meta_intake_status as 0012 builds it (its keys are checked against the migration below). */
const intakeStatus = (args) => {
  const s = L.settings;
  return {
    connected: Boolean(s), current: Boolean(s && s.ingest === String(args.p_ingest_sha256 || "").toLowerCase()),
    relayConnected: false, relayCurrent: false, connectedAt: s ? s.at : null, connectedBy: s ? "owner@example.org" : null,
    pageId: s ? s.pageId : null, pageName: s ? s.pageName : null, tokenInfo: s ? s.tokenInfo : {}, forms: [],
    assignMode: "pool", dailyCap: 300, lastVerifiedAt: null, lastTestAt: null, lastReceivedAt: null, lastLeadAt: null,
    lastLeadId: null, lastCatchupAt: null, lastPollUntil: null, alerts: { access: null, cap: null, page: null }, overCapToday: 0,
    counts: { today: 0, week: 0, duplicatesWeek: 0, duplicatesQuiet: 0, pending: 0, failedToken: 0, failedPermission: 0, failedOther: 0, testLeadsSeen: 0 },
  };
};

function fakeSupabase(url, headers, body) {
  const path = new URL(url).pathname;
  const bearer = /^Bearer (.+)$/.exec(headers.get("authorization") || "")?.[1] || null;
  const args = body ? JSON.parse(String(body)) : {};
  const fn = path.replace(/^\/rest\/v1\/rpc\//, "");
  L.calls.push({ fn, bearer, args });
  if (path === "/auth/v1/user") return [OWNER_JWT, MEMBER_JWT].includes(bearer) ? reply(200, { id: `u-${bearer}`, email: "someone@example.org" }) : reply(401, { msg: "bad jwt" });
  const missing = () => pgErr(404, "PGRST202", `Could not find the function public.${fn} in the schema cache`);
  const owner = bearer === OWNER_JWT;
  if (fn === "is_admin") return reply(200, owner);
  if (fn === "crm_me") return L.has0011 ? reply(200, { role: owner ? "owner" : "member" }) : missing();
  if (!fn.startsWith("meta_") || !L.has0012) return missing();
  if (fn === "meta_intake_status" || fn === "meta_connect") {
    if (!owner) return pgErr(403, "42501", "meta: only Mehdi sees the Meta Lead Ads settings");
    if (fn === "meta_intake_status") return reply(200, intakeStatus(args));
    L.settings = { ingest: args.p_ingest_sha256, pageId: args.p_page_id, pageName: args.p_page_name, tokenInfo: args.p_token_info, at: new Date().toISOString() };
    return reply(200, { connectedAt: L.settings.at });
  }
  /* The token functions: anon only (no session), and the ingest token's SHA-256 must be the stored one. */
  if (bearer) return pgErr(401, "42501", `permission denied for function ${fn}`);
  if (!L.settings) return pgErr(400, "28000", "meta: the intake is not connected yet (press Connect in CRM > Settings > Meta Lead Ads)");
  if (sha(String(args.p_token || "")) !== L.settings.ingest) return pgErr(400, "28000", "meta: the ingest token does not match (a new App Secret? press Connect again)");
  if (fn === "meta_catchup_end") return new Response(null, { status: 204 });
  if (fn !== "meta_catchup_begin") return missing();
  if (args.p_page_id !== L.settings.pageId) return reply(200, { ok: false, reason: "page_mismatch" });
  if (L.tooSoon) return reply(200, { ok: false, reason: "too_soon", nextAt: L.tooSoon });
  return reply(200, { ok: true, since: new Date(Date.now() - 3 * DAY).toISOString(), retry: [] });
}

/* The fake Graph API (META_GRAPH_BASE): the token check, the Page token, the subscription, no forms. */
function fakeGraph(url, method) {
  const path = new URL(url).pathname.replace(/^\/v\d+\.\d+/, "");
  L.graph.push(`${method} ${path}`);
  const ok = (b) => reply(200, b);
  if (path === "/debug_token") return ok({ data: { is_valid: true, type: "SYSTEM_USER", expires_at: L.expires, scopes: L.scopes, app_id: APP_ID } });
  if (path === "/me") return ok({ id: "900000000000555", name: "ideovent-crm-server" });
  if (path === "/me/accounts") return ok({ data: [{ id: PAGE, name: "Example Page", access_token: PAGE_TOKEN }] });
  if (path === `/${PAGE}`) return ok({ id: PAGE, name: "Example Page" });
  if (path === `/${PAGE}/leadgen_forms`) return ok({ data: [] });
  if (path === `/${PAGE}/subscribed_apps` && method === "POST") return (L.subscribed = true), ok({ success: true });
  if (path === `/${PAGE}/subscribed_apps`) return ok({ data: L.subscribed ? [{ id: APP_ID, subscribed_fields: ["leadgen"] }] : [] });
  return reply(400, { error: { code: 100, message: "not in this test" } });
}

/* The handlers' console lines are kept (and checked for secrets below), not printed. */
async function quietly(fn) {
  const keep = [console.log, console.error, console.warn];
  console.log = console.error = console.warn = (...a) => L.logs.push(a.map(String).join(" "));
  try {
    return await fn();
  } finally {
    [console.log, console.error, console.warn] = keep;
  }
}

/* fetch, as the browser on crm.ideovent.in and as the functions on Vercel. */
async function router(input, init = {}) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = String(init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  if (url.startsWith("/api/meta/")) {
    if (L.noApi) return reply(200, "<!doctype html><title>Ideovent</title>", "text/html");
    headers.set("origin", "https://crm.ideovent.in");
    headers.set("x-forwarded-host", "crm.ideovent.in");
    const req = new Request(`https://crm.ideovent.in${url}`, { method, headers, body: method === "POST" ? init.body : undefined });
    const mod = url.startsWith("/api/meta/catchup") ? CATCHUP : WEBHOOK;
    return quietly(() => (method === "POST" ? mod.POST(req) : mod.GET(req)));
  }
  if (url.startsWith(SB)) return fakeSupabase(url, headers, init.body);
  if (url.startsWith(GRAPH)) return fakeGraph(url, method);
  L.strays.push(url);
  return reply(599, { error: "no network in this test" });
}

/* The browser's Supabase client (supabase-js), for the log, the waiting list and the settings. */
globalThis.__metaTestSupabase = {
  auth: { getSession: async () => ({ data: { session: L.session ? { access_token: L.session } : null }, error: null }) },
  from(table) {
    const q = { table, cols: "", orders: [], within: null, limit: 0 };
    const chain = {
      select: (c) => ((q.cols = c), chain),
      order: (c, o) => (q.orders.push([c, Boolean(o && o.ascending)]), chain),
      in: (c, v) => ((q.within = [c, v]), chain),
      limit: (n) => ((q.limit = n), L.queries.push(q), Promise.resolve(L.readError ? { data: null, error: L.readError } : { data: L.tables[table] || [], error: null })),
    };
    return chain;
  },
  rpc: async (fn, args) => (L.rpcs.push({ fn, args }), L.rpcError ? { data: null, error: L.rpcError }
    : { data: { assignMode: args.p_assign_mode, dailyCap: args.p_daily_cap }, error: null }),
};

const ENV_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "META_APP_ID", "META_APP_SECRET",
  "META_VERIFY_TOKEN", "META_PAGE_ID", "META_ACCESS_TOKEN", "META_GRAPH_VERSION", "META_RELAY_SECRET", "CRON_SECRET", "META_GRAPH_BASE"];
const envBefore = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const setEnv = (o) => {
  for (const [k, v] of Object.entries(o)) if (v == null) delete process.env[k]; else process.env[k] = v;
};
const linesOf = (r) => (r.kind === "ok" ? Object.fromEntries(M.statusLines(r.status, r.pageMatches, r.env.META_ACCESS_TOKEN === "set").map((l) => [l.row, l])) : {});
const realFetch = globalThis.fetch;
const answers = [];
const keep = async (p) => (answers.push(await p), answers[answers.length - 1]);

setEnv({ VITE_SUPABASE_URL: SB, VITE_SUPABASE_ANON_KEY: "anon-key-not-real", SUPABASE_URL: null, SUPABASE_ANON_KEY: null, META_APP_ID: APP_ID,
  META_APP_SECRET: SECRET, META_VERIFY_TOKEN: "test_verify_token_not_real_01", META_PAGE_ID: PAGE, META_ACCESS_TOKEN: null,
  META_GRAPH_VERSION: null, META_RELAY_SECRET: null, CRON_SECRET: "tooshort", META_GRAPH_BASE: GRAPH });
globalThis.fetch = router;
try {
  /* Who asks, and from where. */
  L.session = null;
  const signedOut = await keep(C.loadStatus());
  check(signedOut.kind === "error" && /signed out/i.test(signedOut.message), "live: signed out, the Meta page says sign in again", signedOut);
  L.session = MEMBER_JWT;
  const member = await keep(C.loadStatus());
  check(member.kind === "error" && member.message === "Only Mehdi's login can do this.", "live: a member's session gets the function's 403 as Only Mehdi's login", member);
  L.session = OWNER_JWT;
  L.noApi = true;
  const dev = await keep(C.loadStatus());
  check(dev.kind === "error" && dev.noApi === true && dev.message === C.NO_API_TEXT && M.cardLine(dev)[0] === "todo", "live: the Vite dev server's HTML page reads as: the functions run on Vercel", dev);
  L.noApi = false;

  /* Before 0011 and 0012. */
  L.has0011 = false;
  L.has0012 = false;
  const no11 = await keep(C.loadStatus());
  check(no11.kind === "missing" && no11.needs0011 === true && M.cardLine(no11)[1] === "Not set up yet: 0011 and 0012 are not run", "live: before 0011, the page asks for 0011 then 0012", no11);
  L.has0011 = true;
  const no12 = await keep(C.loadStatus());
  check(no12.kind === "missing" && !no12.needs0011 && no12.env.META_APP_SECRET === "set" && no12.env.CRON_SECRET === "short" && no12.env.META_ACCESS_TOKEN === "unset",
    "live: before 0012, the page asks for 0012 and still shows which Vercel values are set (a too short one as too short)", no12);
  check((await keep(C.connect())).kind === "missing", "live: Connect before 0012 says run 0012");
  const f12 = await keep(C.fetchNow());
  check(f12.kind === "ok" && /Nothing fetched: 0012 is not run yet/.test(f12.text), "live: Fetch before 0012 fetches nothing and says why", f12);
  L.has0012 = true;

  /* Before Connect: grey, not amber. */
  const before = await keep(C.loadStatus());
  const lb = linesOf(before);
  check(before.kind === "ok" && before.pageMatches === false && before.status.connected === false, "live: before Connect the status loads (pageMatches false: no Page stored yet)", before);
  check(lb.connection?.state === "todo" && lb.page?.state === "todo" && lb.daily?.state === "todo" && lb.token?.text === "Not set in Vercel yet (step 9)"
    && M.cardLine(before)[1] === "Not connected yet: open to set it up", "live, before Connect: Connection, Page and Daily check are not yet (grey); the token is not set", Object.values(lb).map((l) => `${l.row}:${l.state}:${l.text}`));
  const fNot = await keep(C.fetchNow());
  check(fNot.kind === "ok" && /press Connect first/.test(fNot.text), "live: Fetch before Connect fetches nothing: press Connect first", fNot);

  /* Connect. */
  setEnv({ META_PAGE_ID: null });
  const cMiss = await keep(C.connect());
  check(cMiss.kind === "error" && /^Set META_PAGE_ID in Vercel first/.test(cMiss.message), "live: Connect without META_PAGE_ID names it", cMiss);
  setEnv({ META_PAGE_ID: PAGE });
  const cOk = await keep(C.connect());
  check(cOk.kind === "ok" && L.settings?.ingest === ingestHashOf(SECRET) && L.settings?.pageId === PAGE, "live: Connect stores the ingest token's SHA-256 and the Page", L.settings);
  const conn = await keep(C.loadStatus());
  const lc = linesOf(conn);
  check(conn.kind === "ok" && conn.pageMatches === true && lc.connection?.state === "done" && /^Connected \d/.test(lc.connection.text)
    && lc.daily?.state === "todo" && /First run tomorrow/.test(lc.daily.text), "live, connected: Connection green; the daily check runs from tomorrow", Object.values(lc).map((l) => `${l.row}:${l.state}`));
  const fNoTok = await keep(C.fetchNow());
  check(fNoTok.kind === "ok" && /fix any amber line above first/.test(fNoTok.text) && !L.graph.length, "live: Fetch with no token reads no form and says to fix the amber lines first (no Graph call)", fNoTok);

  /* The token in Vercel; Check again reads Meta (the fake Graph) and subscribes the Page. */
  setEnv({ META_ACCESS_TOKEN: ACCESS });
  L.scopes = ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "business_management", "public_profile"];
  L.expires = Math.floor(NOW.getTime() / 1000) + 400 * 86400;
  await keep(C.connect());
  const lt = linesOf(await keep(C.loadStatus()));
  check(lt.token?.state === "warn" && lt.token.text === "Missing permissions: ads_management" && lt.reach?.state === "warn" && /business_management/.test(lt.reach.text),
    "live: Check again with a token short of ads_management and with business_management: both amber", [lt.token?.text, lt.reach?.text]);
  check(lt.page?.state === "done" && lt.page.text === "Example Page, subscribed to leads" && L.subscribed, "live: Check again subscribed the Page to leads, and the page names it", lt.page);
  L.scopes = ["leads_retrieval", "pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "ads_management", "public_profile"];
  L.expires = 0;
  await keep(C.connect());
  const green = await keep(C.loadStatus());
  const lg = linesOf(green);
  check(lg.token?.text === "Valid, never expires" && !lg.reach && ["connection", "token", "page", "waiting", "limit"].every((r) => lg[r]?.state === "done")
    && M.cardLine(green)[0] === "done", "live: a complete token that never expires: the status is green", Object.values(lg).map((l) => `${l.row}:${l.state}`));
  check(M.checklistSteps(green).find((s) => s.id === "token")?.state === "done" && M.checklistSteps(green).find((s) => s.id === "subscribed")?.state === "done",
    "live: the checklist ticks the token and the subscription");
  const fRun = await keep(C.fetchNow());
  check(fRun.kind === "ok" && fRun.text === "Done: 0 new, 0 already in the CRM.", "live: Fetch missed leads now, every form read: done", fRun);
  L.tooSoon = "2026-10-02T06:31:00.000Z";
  const fSoon = await keep(C.fetchNow());
  check(fSoon.kind === "error" && fSoon.message === "Pressed a moment ago. Try again after 12:01.", "live: pressed again within the minute: try again after (India time)", fSoon);
  L.tooSoon = null;

  /* Vercel changed after Connect: a new App Secret, another Page id. */
  setEnv({ META_APP_SECRET: "another_app_secret_not_real_02" });
  const moved = linesOf(await keep(C.loadStatus()));
  check(moved.connection?.state === "warn" && /App Secret changed/.test(moved.connection.text), "live: a new App Secret in Vercel: Connection amber, press Connect again", moved.connection);
  const fSecret = await keep(C.fetchNow());
  check(fSecret.kind === "error" && /press Connect again/.test(fSecret.message), "live: and Fetch is refused by the database until Connect, and says so", fSecret);
  setEnv({ META_APP_SECRET: SECRET, META_PAGE_ID: "900000000000888" });
  const pm = await keep(C.loadStatus());
  check(pm.kind === "ok" && pm.pageMatches === false && linesOf(pm).page?.state === "warn" && M.cardLine(pm)[0] === "warn", "live: another Page id in Vercel: the Page line and the card amber", pm.kind);
  const fPage = await keep(C.fetchNow());
  check(fPage.kind === "error" && /not the Page you connected: press Connect/.test(fPage.message), "live: and Fetch says press Connect (409, nothing polled)", fPage);
  setEnv({ META_PAGE_ID: PAGE });
} finally {
  globalThis.fetch = realFetch;
  for (const [k, v] of Object.entries(envBefore)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
}

/* The log, the waiting list and the settings: the browser's own Supabase reads, as the owner (RLS: is_admin). */
L.tables.meta_ingest_log = [{ id: 7, at: iso(T - 3600e3), channel: "webhook", event: "created", leadgen_id: "9000000000000001",
  form_id: "900000000000401", ad_id: null, crm_lead_id: "ol_meta_9000000000000001", detail: "Instagram" }];
L.tables.meta_leads = [{ leadgen_id: "9000000000000002", status: "failed", error_kind: "token", last_error: "Graph 190/463 OAuthException",
  attempts: 2, received_at: iso(T - 7200e3) }];
const log = await keep(C.loadLog(100));
const waitList = await keep(C.loadWaiting());
check(log.kind === "ok" && log.rows[0]?.leadgenId === "9000000000000001" && log.rows[0]?.crmLeadId === "ol_meta_9000000000000001" && log.rows[0]?.adId === undefined
  && M.logText(log.rows[0]) === "Lead created (form …000401)", "live: the log's rows read as the page's lines", log);
check(waitList.kind === "ok" && waitList.rows[0]?.status === "failed" && waitList.rows[0]?.attempts === 2 && waitList.rows[0]?.errorKind === "token",
  "live: the waiting list reads Meta ids, tries and the error kind", waitList);
/* Every column the page selects exists in 0012's table, and the waiting list asks for pending and failed only. */
const columnsOf = (table) => {
  const m = new RegExp(`create table if not exists public\\.${table} \\(([\\s\\S]*?)\\n\\);`).exec(SQL12);
  return m ? m[1].split("\n").map((l) => /^\s*([a-z_]+)\s+[a-z]/.exec(l)?.[1]).filter(Boolean) : [];
};
for (const q of L.queries) {
  const cols = q.cols.split(",").map((c) => c.trim());
  const have = columnsOf(q.table);
  check(have.length > 5 && cols.every((c) => have.includes(c)) && q.orders.every(([c]) => have.includes(c)), `live: every column the page reads from ${q.table} exists in 0012`, { cols, have });
}
check(JSON.stringify(L.queries.find((q) => q.table === "meta_leads")?.within) === JSON.stringify(["status", ["pending", "failed"]]), "live: the waiting list is pending and failed rows only");
L.readError = { code: "PGRST205", message: "Could not find the table 'public.meta_ingest_log' in the schema cache" };
check((await C.loadLog(100)).kind === "missing" && (await C.loadWaiting()).kind === "missing", "live: before 0012 the log and the waiting list read as missing, not as errors");
L.readError = null;
const saved = await keep(C.saveSettings("rules", 120));
check(saved.kind === "ok" && saved.assignMode === "rules" && saved.dailyCap === 120 && JSON.stringify(L.rpcs[0]) === JSON.stringify({ fn: "meta_set_settings", args: { p_assign_mode: "rules", p_daily_cap: 120 } }),
  "live: Save calls meta_set_settings(p_assign_mode, p_daily_cap) and reads its answer", { saved, rpc: L.rpcs[0] });
check(/create function public\.meta_set_settings\(p_assign_mode text default null, p_daily_cap integer default null\)/.test(SQL12)
  && /jsonb_build_object\('assignMode', s\.assign_mode, 'dailyCap', s\.daily_cap\)/.test(SQL12), "live: 0012's meta_set_settings takes and answers exactly those");
L.rpcError = { code: "42501", message: "meta: only Mehdi changes the Meta Lead Ads settings" };
const refused = await keep(C.saveSettings("owner", null));
check(refused.kind === "error" && refused.message === "Only Mehdi's login can change this.", "live: a refused save says whose it is", refused);
L.rpcError = null;

/* The shape the fake database answers is 0012's: every key of meta_intake_status, and every event of the log has words. */
const statusFn = /create function public\.meta_intake_status[\s\S]*?\nend \$\$;/.exec(SQL12)?.[0] || "";
const built = new Set([...statusFn.matchAll(/'([A-Za-z]+)',\s/g)].map((m) => m[1]));
const fakeKeys = (o, out = []) => (Object.entries(o).forEach(([k, v]) => (out.push(k), v && typeof v === "object" && !Array.isArray(v) && k !== "tokenInfo" && fakeKeys(v, out))), out);
const absent = fakeKeys(intakeStatus({})).filter((k) => !built.has(k));
check(statusFn.length > 500 && !absent.length, "live: every key the page reads from meta_intake_status is one 0012 builds", absent);
const events = (/event\s+text not null check \(event in \(([^)]*)\)\)/.exec(SQL12)?.[1] || "").match(/'([a-z_]+)'/g)?.map((s) => s.slice(1, -1)) || [];
check(events.length === 12 && events.every((e) => M.logText({ event: e }) !== e), "live: every event 0012 logs has words on the page", events.filter((e) => M.logText({ event: e }) === e));

/* Nothing secret reached the browser's side, a database call it should not, or a log line. */
const SECRETS = [SECRET, ACCESS, PAGE_TOKEN, createHmac("sha256", SECRET).update("ideovent:meta-leads:ingest:v1").digest("hex")];
const leaked = (v) => SECRETS.filter((s) => JSON.stringify(v ?? "").includes(s)).length;
check(answers.length > 20 && answers.every((a) => !leaked(a)), "live: no answer the page got carries the App Secret, a token or the ingest token");
check(L.calls.filter((c) => c.fn === "meta_connect").every((c) => !leaked(c.args)) && L.calls.filter((c) => c.fn.startsWith("meta_catchup")).every((c) => !c.bearer),
  "live: Connect stores no secret or token; the catch-up's token functions go as anon (no session)");
check(!L.logs.some((l) => leaked(l)) && !L.strays.length, "live: no function log line carries a secret or a token, and nothing left this process", { strays: L.strays });

/* ── Result ──────────────────────────────────────────────────────────────── */

console.log(`\n${passes} passed, ${failures.length} failed`);
if (NEGATIVE) {
  const bit = failures.filter((f) => f.tag === "tab").length;
  console.log(sniffRemoved && bit
    ? `negative mode: parseCsv without sniffing broke ${bit} tab-separated checks, as it must`
    : "negative mode: NO tab-separated check failed, so these checks do not reach the sniffing");
  process.exit(sniffRemoved && bit ? 1 : 0);
}
process.exit(failures.length ? 1 : 0);

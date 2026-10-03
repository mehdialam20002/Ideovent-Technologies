/**
 * Tests the CRM team's rules in TypeScript (src/lib/outreach/access.ts) and
 * local mode's emulation of the database (LocalOutreachStore over
 * src/lib/outreach/localTeam.ts), spec 13.2.
 *
 *   node scripts/test-crm-access.mjs                     every check must pass (exit 0)
 *   CRM_ACCESS_NEGATIVE=1 node scripts/test-crm-access.mjs
 *       canSeeLead answers true for everyone (rewritten in flight, no file
 *       touched): the visibility checks must FAIL and the run must exit 1.
 *
 * WHAT IS UNDER TEST
 *   1. The SQL and the TypeScript cannot drift: the member key lists, the
 *      column keys, the daily limits, the 14-day window, the money stages and
 *      template pattern, the "to Won" line, the member line types and the size
 *      limits are read out of supabase/migrations/0011_crm_team.sql and
 *      compared with access.ts.
 *   2. The pure rules: can() against the matrix (spec 4.1) for every role and
 *      switch; guardPatch (free, add-only, fill-if-empty and locked keys; Call,
 *      Proposal, Won, Do not contact; the Lost reason; the server-dated touch;
 *      the window); guardNewLead (ownership, starts New, links stripped,
 *      duplicates across the team, the New cap); stampEvent (money, 4 KB, types);
 *      planDistribution and planRules on the SQL test's own cases, plus the
 *      preview counts; isEngaged (an open after a cold link does not count,
 *      3 Oct 2026) and linkWentCold; masking; crmErrorText; cadenceDone when
 *      derive.ts has it (work package D).
 *   3. LocalOutreachStore acting as Mehdi, an admin, members, See all, a
 *      switched-off person and a stranger: who sees what, every refusal with
 *      the database's message, assigning, sharing out, rules, switching off,
 *      hand-overs, Ask Mehdi, requests, the bell, the daily budget, the
 *      access log, password resets, and Mehdi's own data keeping its shape.
 *
 * Same harness as test-outreach-store.mjs: esbuild bundles the real
 * TypeScript; nothing is mocked except storage (in memory).
 */
import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.CRM_ACCESS_NEGATIVE);
const SQL_PATH = [process.env.CRM_MIGRATION, join(ROOT, "supabase", "migrations", "0011_crm_team.sql")].find((p) => p && existsSync(p));
if (!SQL_PATH) throw new Error("supabase/migrations/0011_crm_team.sql not found (or set CRM_MIGRATION)");

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}

const plugin = {
  name: "alias",
  setup(b) {
    /* The store loads the Supabase client lazily; these tests never reach it. */
    b.onResolve({ filter: /^@\/lib\/cms\/client$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { throw new Error('no Supabase in this test'); }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (NEGATIVE) {
      b.onLoad({ filter: /outreach[\\/]access\.ts$/ }, (args) => {
        const src = readFileSync(args.path, "utf8");
        const sig = /export function canSeeLead\([^)]*\)[^{]*\{/;
        if (!sig.test(src)) throw new Error("negative mode: canSeeLead not found in access.ts");
        return { contents: src.replace(sig, (m) => m + "\n  return true;"), loader: "ts" };
      });
    }
  },
};

const deriveSrc = readFileSync(join(SRC, "admin", "outreach", "derive.ts"), "utf8");
const HAS_CADENCE = /export function cadenceDone\(/.test(deriveSrc);
const out = join(tmpdir(), `ideovent-test-crm-access-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export * from "@/lib/outreach/access";`,
      `export * from "@/lib/outreach/team";`,
      `export { LocalOutreachStore, OUTREACH_LOCAL_KEY, prepareLead } from "@/lib/outreach/store";`,
      `export { LEAD_STATUSES, LEAD_KIND_VALUES } from "@/lib/outreach/types";`,
      `export { META_SOURCES, META_LEAD_ID_PREFIX, isMetaLead } from "./src/lib/meta/fields.js";`,
      `export { NO_META_CONSENT } from "@/lib/outreach/engine";`,
      HAS_CADENCE ? `export { cadenceDone } from "@/admin/outreach/derive";` : "",
    ].join("\n"),
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
  plugins: [plugin],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Plumbing ────────────────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
/** `tag` "visibility" marks the checks the negative mode must break. */
function check(ok, message, got, tag) {
  if (ok) passes++;
  else {
    failures.push({ message, tag });
    console.log("FAIL  " + message + (got !== undefined ? "\n        got: " + String(typeof got === "string" ? got : JSON.stringify(got)).slice(0, 400) : ""));
  }
}
const seen = (ok, message, got) => check(ok, message, got, "visibility");
/** The error a call throws (sync or async), or null. */
async function error(fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e;
  }
}
const DAY = 864e5;
const NOW = new Date();
const iso = (t) => new Date(t).toISOString();

/* ── 1. The SQL and the TypeScript say the same thing ────────────────────── */

const SQL = readFileSync(SQL_PATH, "utf8").replace(/\r\n/g, "\n");
const fnBody = (name) => {
  const m = SQL.match(new RegExp(`create or replace function private\\.${name}\\([^)]*\\)[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`));
  if (!m) throw new Error(`0011: function private.${name} not found`);
  return m[1];
};
const sqlArray = (name) => {
  const m = fnBody(name).match(/array\[([^\]]*)\]/);
  return m ? m[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "")) : null;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check(same(sqlArray("crm_member_free_keys"), [...M.MEMBER_FREE_KEYS]), "MEMBER_FREE_KEYS equals private.crm_member_free_keys()", sqlArray("crm_member_free_keys"));
check(same(sqlArray("crm_member_fill_keys"), [...M.MEMBER_FILL_KEYS]), "MEMBER_FILL_KEYS equals private.crm_member_fill_keys()", sqlArray("crm_member_fill_keys"));
check(same(sqlArray("crm_member_append_keys"), [...M.MEMBER_APPEND_KEYS]), "MEMBER_APPEND_KEYS equals private.crm_member_append_keys()", sqlArray("crm_member_append_keys"));
check(same(sqlArray("crm_column_keys"), [...M.COLUMN_KEYS]), "COLUMN_KEYS equals private.crm_column_keys()", sqlArray("crm_column_keys"));
const limits = Object.fromEntries([...fnBody("crm_daily_limit").matchAll(/when '(\w+)'\s+then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
check(same(limits, { ...M.DAILY_LIMITS }), "DAILY_LIMITS equals private.crm_daily_limit()", limits);
check(Number((fnBody("crm_closed_days").match(/select (\d+)/) || [])[1]) === M.CLOSED_READ_DAYS && M.CLOSED_READ_DAYS === 14, "CLOSED_READ_DAYS equals private.crm_closed_days() (14)");
const guard = fnBody("crm_events_guard");
const moneyStages = (guard.match(/'stage', ''\) in \(([^)]*)\)/) || [])[1]?.split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
check(same(moneyStages, [...M.MONEY_STAGES]), "MONEY_STAGES equals the history guard's stages", moneyStages);
check((guard.match(/'templateId', ''\) ~ '([^']+)'/) || [])[1] === M.MONEY_TEMPLATE_RE.source, "MONEY_TEMPLATE_RE equals the history guard's template pattern", M.MONEY_TEMPLATE_RE.source);
const winSql = (guard.match(/'detail', ''\) ~\* '([^']+)'/) || [])[1] || "";
/* The guard spells JavaScript's \b out as (^|[^a-z0-9_]) (review, 3 Oct: Postgres' \m follows the database's locale,
   so "éto Won" passed it while metrics.ts isWinEvent counted it). In JavaScript the two read every text alike. */
check(winSql === "(^|[^a-z0-9_])" + M.WIN_STATUS_LINE_RE.source.replace(/^\\b/, "") && M.WIN_STATUS_LINE_RE.flags.includes("i"),
  "WIN_STATUS_LINE_RE is the guard's '... to Won' test, its \\b written as (^|[^a-z0-9_]) (case-insensitive)", winSql);
{
  const sqlWin = new RegExp(winSql, "i");
  const texts = ["Status: Replied to Won", "Status: Contacted éto Won", "Status: Contacted xto Won", "Status: Contacted 1to Won", "Status: Contacted _to Won",
    "to Won", "Status: X to Proposal ", "Status: Contacted ½to Proposal", "Status: Contacted to Lost", "Status: Contacted TO WON", "Status: Contacted\tto\tWon"];
  const differ = texts.filter((t) => sqlWin.test(t) !== M.WIN_STATUS_LINE_RE.test(t));
  check(differ.length === 0 && sqlWin.test("Status: Contacted éto Won"), "...and in JavaScript both refuse the same lines, 'éto Won' among them", differ);
}
const types = (guard.match(/v_type not in \(([^)]*)\)/) || [])[1]?.split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
check(same(types, [...M.MEMBER_EVENT_TYPES]), "MEMBER_EVENT_TYPES equals the line types the guard lets a non-owner write", types);
const sizes = [...guard.matchAll(/::text\) > (\d+)/g)].map((m) => Number(m[1]));
check(same(sizes, [M.EVENT_MAX_BYTES, M.MEMBER_EVENT_MAX_BYTES]), "the history line limits (20 KB, 4 KB) equal the guard's", sizes);
check(Number((fnBody("crm_leads_guard").match(/::text\) > (\d+)/) || [])[1]) === M.LEAD_MAX_BYTES, "LEAD_MAX_BYTES equals the field guard's 32 KB");
check(/not in \('won', 'lost', 'do_not_contact'\)/.test(fnBody("crm_is_open")) && same([...M.CLOSED_LEAD_STATUSES], ["won", "lost", "do_not_contact"]), "the closed statuses equal private.crm_is_open()");
check(/> 1000 then/.test(fnBody("crm_check_assignee")) && M.OPEN_LEAD_CEILING === 1000, "OPEN_LEAD_CEILING equals crm_check_assignee's 1,000");
check(/left\(btrim\(coalesce\(p_text, ''\)\), (\d+)\)/.exec(SQL)?.[1] === String(M.NOTES_APPEND_MAX), "NOTES_APPEND_MAX equals crm_append_notes'");
check(new RegExp(`interval '${M.DEMO_OPEN_MAX_AGE_DAYS} days'`).test(guard), "DEMO_OPEN_MAX_AGE_DAYS equals the guard's demo-open window");
const valueLists = (name) => Object.fromEntries([...fnBody(name).matchAll(/when '(\w+)'\s+then array\[([^\]]*)\]/g)]
  .map((m) => [m[1], m[2].split(",").map((s) => s.trim().replace(/^'|'$/g, ""))]));
const leadValues = valueLists("crm_lead_values");
check(same(leadValues, JSON.parse(JSON.stringify(M.LEAD_VALUES))), "LEAD_VALUES equals private.crm_lead_values() (status, kind, pitch, language)", leadValues);
check(same([...M.LEAD_VALUES.status], [...M.LEAD_STATUSES]) && same([...M.LEAD_VALUES.kind], [...M.LEAD_KIND_VALUES]), "...and types.ts' LEAD_STATUSES and LEAD_KIND_VALUES");
const eventValues = valueLists("crm_event_values");
check(same(eventValues, JSON.parse(JSON.stringify(M.EVENT_VALUES))), "EVENT_VALUES equals private.crm_event_values() (channel, stage, outcome, topic)", eventValues);
check(same(sqlArray("crm_date_keys"), [...M.DATE_KEYS]), "DATE_KEYS equals private.crm_date_keys()", sqlArray("crm_date_keys"));
const logMax = fnBody("crm_log_detail_max").match(/when p_owner then (\d+) else (\d+)/);
check(logMax && Number(logMax[1]) === M.LOG_DETAIL_MAX.owner && Number(logMax[2]) === M.LOG_DETAIL_MAX.other, "LOG_DETAIL_MAX equals private.crm_log_detail_max() (2 KB Mehdi, 300 bytes anyone else)", logMax?.slice(1));
const phoneSql = fnBody("crm_phone_key");
check(/\) >= 7\s/.test(phoneSql) && /right\(regexp_replace\(p, '\\D', '', 'g'\), 10\)/.test(phoneSql)
  && M.phoneKey("+91 98100-00002") === "9810000002" && M.phoneKey("098100 00002") === "9810000002" && M.phoneKey("12345") === null,
  "phoneKey is private.crm_phone_key: the last ten digits, at least 7 digits", phoneSql);
check(/nullif\(lower\(btrim\(coalesce\(p, ''\)\)\), ''\)/.test(fnBody("crm_email_key")) && M.emailKey(" Office@School.Example ") === "office@school.example" && M.emailKey("  ") === null,
  "emailKey is private.crm_email_key: no case, no outer spaces");
for (const k of ["DUPLICATE_ON_ADD", "DUPLICATE_ON_FILL", "NO_ADDING", "NO_BOOKING_YET", "META_ID_REFUSED", "META_SOURCE_REFUSED", "META_CONSENT_REFUSED"]) {
  check(SQL.includes(`'${M[k]}'`), `${k} is the database's own sentence, word for word`, M[k]);
}
check(M.crmErrorText(M.META_CONSENT_REFUSED) === M.NO_META_CONSENT, "...and META_CONSENT_REFUSED reads on screen as engine.ts's NO_META_CONSENT", M.crmErrorText(M.META_CONSENT_REFUSED));
{
  /* After the callers' branches close (like Do not contact): every caller, Mehdi and the database's own functions too. */
  const at = guard.indexOf("if v_consent = 'no'");
  const shared = guard.indexOf("|| jsonb_build_object('id', new.id, 'leadId', new.lead_id, 'type', v_type)");
  check(at > shared && shared > 0 && /if v_type in \('sent', 'call'\) then/.test(guard)
    && /if v_consent = 'no'\s+and \(v_type = 'call'\s+or coalesce\(new\.data ->> 'channel', ''\) in \('whatsapp', 'call'\)\s+or coalesce\(new\.data ->> 'templateId', ''\) ~ '\^wa_'\)/.test(guard),
    "the history guard refuses a call or a WhatsApp line (its channel, or a wa_ template) to a lead whose metaConsent is no, for every caller",
    guard.slice(Math.max(0, at - 120), at + 260));
}
/* A member's new lead never passes for a Meta lead: the guard's prefix, sources and keys are fields.js's. */
const leadsGuard = fnBody("crm_leads_guard");
check(M.META_LEAD_ID_PREFIX === "ol_meta_" && leadsGuard.includes(`left(lower(new.id), ${M.META_LEAD_ID_PREFIX.length}) = '${M.META_LEAD_ID_PREFIX}'`),
  "the field guard's Meta id test is META_LEAD_ID_PREFIX (without case)");
const metaSourcesSql = (leadsGuard.match(/regexp_replace\(lower\(translate\(coalesce\(new\.data ->> 'source', ''\), 'K', 'k'\)\), '\[\^a-z\]', '', 'g'\)\s*= any \(array\[([^\]]*)\]\)/) || [])[1]
  ?.split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
check(same(metaSourcesSql, M.META_SOURCES.map((s) => s.toLowerCase().replace(/[^a-z]/g, ""))),
  "the field guard's Meta sources are META_SOURCES, compared on their letters only (no case, spaces, invisible characters or punctuation)", metaSourcesSql);
check(/where lower\(e\.k\) like 'meta%'/.test(leadsGuard) && /new\.data := new\.data - coalesce\(/.test(leadsGuard), "the field guard drops every meta... key from a member's new lead");
const memberInsert = leadsGuard.slice(leadsGuard.indexOf("if tg_op = 'INSERT' then\n    new.created_by"));
check(memberInsert.indexOf("'ol_meta_'") > 0 && memberInsert.indexOf("'ol_meta_'") < memberInsert.indexOf("crm_spend('lead_add')")
  && memberInsert.indexOf("crm_spend('lead_add')") < memberInsert.indexOf("crm_duplicate_of"), "...in the member INSERT branch, before the budget and the duplicate check");
const summarySql = (SQL.match(/create or replace function public\.crm_access_summary[\s\S]*?\$\$([\s\S]*?)\$\$/) || [])[1] || "";
check(new RegExp(`g\\.sign_ins > ${M.ACCESS_FLAG_SIGN_INS}\\b`).test(summarySql) && new RegExp(`g\\.logged > ${M.ACCESS_FLAG_LOGGED}\\b`).test(summarySql)
  && same([...summarySql.matchAll(/a\.action in \(([^)]*)\)\) as logged/g)].map((m) => m[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "")))[0], [...M.LOGGED_ACTIONS]),
  "ACCESS_FLAG_SIGN_INS, ACCESS_FLAG_LOGGED and LOGGED_ACTIONS equal crm_access_summary's");

/* ── 2. The pure rules ───────────────────────────────────────────────────── */

const me = (role, over = {}) => ({
  legacy: false, memberId: role ? `m_${role}` : null, role, displayName: role ? role[0].toUpperCase() + role.slice(1) : "",
  viewAll: role === "owner" || role === "admin", canAddLeads: role === "owner" || role === "admin", mayColdCall: role === "owner",
  waDailyLimit: role === "owner" ? null : 25, newLeadCap: 5, targets: {}, senderChecked: role === "owner", mustChangePassword: false, ...over,
});
const OWNER = me("owner");
const ADMIN = me("admin");
const MEMBER = me("member");
const SEE_ALL = me("member", { viewAll: true });
const ADDER = me("member", { canAddLeads: true, mayColdCall: true });
const OFF = M.noAccessMe("deactivated", "Off");
const LEGACY = M.legacyMe();

/* can(): the matrix in spec 4.1 */
const OWNER_ONLY = ["lead.delete", "lead.export", "lead.import", "stage.proposalWon", "stage.money", "dnc.lift", "finder", "demos.manage", "settings",
  "team.manage", "team.access", "team.resetPassword", "audit", "rules.manage"];
const STAFF = ["lead.assign", "lead.editIdentity", "lead.overwriteContact", "stage.call", "team.view", "team.performance", "review", "requests.resolve"];
for (const a of OWNER_ONLY) {
  check(M.can(OWNER, a) && !M.can(ADMIN, a) && !M.can(MEMBER, a) && !M.can(SEE_ALL, a) && !M.can(OFF, a), `can("${a}"): Mehdi only`);
}
for (const a of STAFF) {
  check(M.can(OWNER, a) && M.can(ADMIN, a) && !M.can(MEMBER, a) && !M.can(SEE_ALL, a) && !M.can(OFF, a), `can("${a}"): Mehdi and admins`);
}
check(M.can(OWNER, "lead.add") && M.can(ADMIN, "lead.add") && !M.can(MEMBER, "lead.add") && M.can(ADDER, "lead.add") && !M.can(OFF, "lead.add"), `can("lead.add"): a member only with "Can add leads"`);
check(M.can(OWNER, "call.cold") && M.can(ADMIN, "call.cold") && !M.can(MEMBER, "call.cold") && M.can(ADDER, "call.cold"), `can("call.cold"): a member only with "May cold-call"`);
check(M.can(MEMBER, "demo.publish") && M.can(OWNER, "demo.publish") && !M.can(OFF, "demo.publish"), `can("demo.publish"): everyone with access (on their own lead)`);
check(M.can(LEGACY, "lead.delete") && M.can(LEGACY, "settings") && !M.can(LEGACY, "team.view") && !M.can(LEGACY, "lead.assign") && !M.can(LEGACY, "audit"),
  "legacy (0011 not applied): Mehdi keeps everything he has today; the team screens stay hidden");
check(!M.can(null, "lead.add") && !M.can(undefined, "settings"), "nobody signed in can do nothing");
check(same(M.memberStages(), ["first", "after_yes", "follow_up", "closing"]), "memberStages: never After the call or Proposal");

/* canSeeLead: the window */
const L = (id, over = {}) => ({ id, instituteName: `Lead ${id}`, kind: "school", status: "new", createdAt: iso(NOW - 10 * DAY), updatedAt: iso(NOW - DAY), ...over });
const mine = L("A", { assigneeId: "m_member", status: "contacted", phone: "+919810000001", notes: "Old note", city: "Patna" });
const theirs = L("B", { assigneeId: "m_other", status: "contacted" });
seen(M.canSeeLead(MEMBER, mine) && !M.canSeeLead(MEMBER, theirs), "canSeeLead: a member sees her own lead, not another's");
seen(!M.canSeeLead(MEMBER, L("P", { assigneeId: null })), "canSeeLead: a member does not see the Unassigned pool");
seen(!M.canSeeLead(SEE_ALL, theirs), "canSeeLead: See all does not open another's lead in full (the overview does, without contacts)");
check(M.canSeeLead(OWNER, theirs) && M.canSeeLead(ADMIN, theirs), "canSeeLead: Mehdi and admins see every lead");
seen(!M.canSeeLead(OFF, mine) && !M.canSeeLead(null, mine), "canSeeLead: switched off or signed out, nothing");
const closedLong = { ...mine, status: "lost", closedAt: iso(NOW - 20 * DAY) };
const closedNow = { ...mine, status: "lost", closedAt: iso(NOW - 2 * DAY) };
seen(!M.canSeeLead(MEMBER, closedLong) && M.canSeeLead(MEMBER, closedNow), "canSeeLead: a closed lead for 14 days, then no more");
seen(!M.canSeeLead(MEMBER, { ...mine, status: "won", closedAt: undefined }), "canSeeLead: a closed lead without a closing date fails closed");

/* guardPatch: the field guard */
const err = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};
const ok = M.guardPatch(MEMBER, mine, { status: "replied", nextActionAt: iso(NOW + DAY), tags: ["hot"], language: "hi" }, NOW);
check(ok.status === "replied" && ok.tags[0] === "hot" && ok.updatedAt === NOW.toISOString() && ok.assigneeId === "m_member", "guardPatch: a member changes the free keys; the server stamps updatedAt; the lead stays hers");
const touch = M.guardPatch(MEMBER, { ...mine, lastContactedAt: iso(NOW - DAY) }, { lastContactedAt: "2020-01-01T00:00:00.000Z" }, NOW);
check(touch.lastContactedAt === NOW.toISOString(), "guardPatch: a member's touch is dated by the server (no backdating)");
const erased = M.guardPatch(MEMBER, { ...mine, lastContactedAt: iso(NOW - DAY) }, { lastContactedAt: undefined }, NOW);
check(erased.lastContactedAt === NOW.toISOString(), "guardPatch: ...and cannot be erased");
let e = err(() => M.guardPatch(MEMBER, mine, { phone: "+919000000000" }, NOW));
check(e?.code === "42501" && /"phone"/.test(e.message) && /Add a note instead/.test(e.message), "guardPatch: a filled phone is locked, naming it", e?.message);
check(M.guardPatch(MEMBER, mine, { email: "found@school.example", contactName: "Mrs Rao" }, NOW).email === "found@school.example", "guardPatch: an empty e-mail and contact may be filled");
e = err(() => M.guardPatch(MEMBER, { ...mine, email: "a@b.example" }, { email: "c@d.example" }, NOW));
check(e?.code === "42501" && /"email"/.test(e.message), "guardPatch: ...not changed once filled");
e = err(() => M.guardPatch(MEMBER, { ...mine, email: "a@b.example" }, { email: undefined }, NOW));
check(e?.code === "42501", "guardPatch: ...nor emptied");
for (const [k, v] of [["instituteName", "Renamed"], ["kind", "dental"], ["demoId", "d9"], ["assignedTo", "Bilal"], ["source", "x"], ["createdAt", iso(NOW)]]) {
  e = err(() => M.guardPatch(MEMBER, mine, { [k]: v }, NOW));
  check(e?.code === "42501" && e.message.includes(`"${k}"`), `guardPatch: a member cannot change ${k}`, e?.message);
}
e = err(() => M.guardPatch(MEMBER, mine, { notes: "Replaced" }, NOW));
check(e?.code === "42501" && /notes only grow/i.test(e.message), "guardPatch: notes only grow (no replacing)", e?.message);
e = err(() => M.guardPatch(MEMBER, mine, { notes: undefined }, NOW));
check(e?.code === "42501", "guardPatch: ...nor emptying");
check(M.guardPatch(MEMBER, mine, { notes: "Old note\nMore" }, NOW).notes === "Old note\nMore", "guardPatch: ...adding is fine");
check(M.guardPatch(MEMBER, mine, { observation: "No admissions page" }, NOW).observation === "No admissions page", "guardPatch: an empty observation may be filled");
e = err(() => M.guardPatch(MEMBER, { ...mine, observation: "Old" }, { observation: "New" }, NOW));
check(e?.code === "42501" && /observation/.test(e.message), "guardPatch: ...never replaced");
e = err(() => M.guardPatch(MEMBER, mine, { status: "call" }, NOW));
check(e?.code === "42501" && /Hand to Mehdi/.test(e.message), "guardPatch: a member never sets Call (a hand-over does)", e?.message);
e = err(() => M.guardPatch(MEMBER, { ...mine, status: "call" }, { status: "contacted" }, NOW));
check(e?.code === "42501", "guardPatch: ...nor moves a lead off Call");
for (const s of ["proposal", "won"]) {
  e = err(() => M.guardPatch(MEMBER, mine, { status: s }, NOW));
  check(e?.code === "42501" && /Proposal and Won/.test(e.message), `guardPatch: a member cannot move a lead to ${s}`);
  e = err(() => M.guardPatch(ADMIN, mine, { status: s }, NOW));
  check(e?.code === "42501", `guardPatch: an admin cannot either (${s})`);
}
check(M.guardPatch(OWNER, mine, { status: "won" }, NOW).status === "won", "guardPatch: Mehdi can mark Won");
e = err(() => M.guardPatch(ADMIN, { ...mine, status: "do_not_contact", closedAt: iso(NOW) }, { status: "new" }, NOW));
check(e?.code === "42501" && /Do not contact/.test(e.message), "guardPatch: only Mehdi lifts Do not contact");
check(M.guardPatch(OWNER, { ...mine, status: "do_not_contact", closedAt: iso(NOW) }, { status: "new" }, NOW).status === "new", "guardPatch: ...and he can");
e = err(() => M.guardPatch(MEMBER, mine, { status: "lost" }, NOW));
check(e?.code === "23514" && /why/.test(e.message), "guardPatch: Lost needs a reason");
const lost = M.guardPatch(MEMBER, mine, { status: "lost", lostReason: "Has a website vendor" }, NOW);
check(lost.status === "lost" && lost.closedAt === NOW.toISOString(), "guardPatch: ...with one it saves, and the closing date is the server's");
check(!("closedAt" in M.guardPatch(OWNER, { ...mine, status: "lost", closedAt: iso(NOW - DAY) }, { status: "contacted" }, NOW)), "guardPatch: re-opened, the closing date is gone");
e = err(() => M.guardPatch(MEMBER, mine, { tags: ["x".repeat(33000)] }, NOW));
check(e?.code === "22001", "guardPatch: a lead over 32 KB is refused for anyone but Mehdi");
check(M.guardPatch(OWNER, mine, { notes: "y".repeat(40000) }, NOW).notes.length === 40000, "guardPatch: ...Mehdi has no size limit");
e = err(() => M.guardPatch(MEMBER, theirs, { tags: ["x"] }, NOW));
check(e?.code === "P0002" && /not yours any more/.test(e.message), "guardPatch: another's lead: P0002, not yours any more", e?.message);
e = err(() => M.guardPatch(MEMBER, closedLong, { tags: ["x"] }, NOW));
seen(e?.code === "P0002", "guardPatch: a lead closed 20 days ago is out of reach");
const owned = M.guardPatch(MEMBER, mine, { assigneeId: "m_other", createdById: "x", closedAt: iso(0) }, NOW);
check(owned.assigneeId === "m_member" && owned.createdById === undefined && !("closedAt" in owned), "guardPatch: who a lead belongs to never changes through a patch");
const linked = M.guardPatch(OWNER, { ...mine, assigneeId: "m_member" }, { demoId: "d7" }, NOW);
check(linked.nextActionAt === NOW.toISOString(), "guardPatch: Mehdi linking a demo to someone's open lead makes it due now");
/* The shape every screen reads (anyone but Mehdi). */
for (const [patchSet, what] of [
  [{ contactName: { x: 1 } }, "an object as the contact name"],
  [{ city: ["Patna"] }, "a list as the city"],
  [{ tags: 5 }, "a number as the tags"],
  [{ tags: ["hot", 5] }, "a number inside the tags"],
  [{ notes: { x: 1 } }, "an object as the notes"],
  [{ status: "maybe" }, "a stage that does not exist"],
  [{ language: "fr" }, "a language the CRM does not write in"],
  [{ nextActionAt: "soon" }, "a follow-up that is not a date"],
  [{ nextActionAt: "3000-01-01T00:00:00.000Z" }, "a follow-up in the year 3000"],
]) {
  e = err(() => M.guardPatch(MEMBER, mine, patchSet, NOW));
  check(e?.code === "22023", `guardPatch: a member cannot write ${what}`, e?.message);
}
check(M.guardPatch(MEMBER, mine, { nextActionAt: "2026-10-05T15:30:00+05:30" }, NOW).nextActionAt === "2026-10-05T10:00:00.000Z",
  "guardPatch: a follow-up date is stored in the app's own format");
e = err(() => M.guardPatch(ADMIN, mine, { kind: "bakery" }, NOW));
check(e?.code === "22023" && /school, coaching, dental, other/.test(e.message), "guardPatch: an admin cannot set a kind that does not exist (the error lists them)", e?.message);
e = err(() => M.guardPatch(ADMIN, mine, { instituteName: undefined }, NOW));
check(e?.code === "23514", "guardPatch: ...nor remove the institute's name", e?.message);
check(M.guardPatch(MEMBER, { ...mine, city: { old: true } }, { status: "replied" }, NOW).status === "replied",
  "guardPatch: an odd old value blocks nothing: only the keys that change are looked at");

/* guardNewLead: a member's lead is theirs, starts New, carries no links; duplicates and the cap refuse */
const team = [mine, theirs, L("C", { assigneeId: "m_other", phone: "+919810000002", instituteName: "Bilal Classes Two" })];
const names = (id) => ({ m_other: "Bilal", m_member: "Member" })[id];
const added = M.guardNewLead(ADDER, L("N1", { phone: "+919830000007", status: "won", demoId: "d2", demoSlug: "x", pitchSlug: "y", assignedTo: "Bilal", assigneeId: "m_other" }), team, 0, NOW, names);
check(added.assigneeId === "m_member" && added.createdById === "m_member" && added.assignedById === "m_member" && added.status === "new"
  && !added.demoId && !added.demoSlug && !added.pitchSlug && !added.assignedTo && added.createdAt === NOW.toISOString(),
  "guardNewLead: a member's lead is hers whatever was asked, starts New, without demo, pitch or old label", added);
e = err(() => M.guardNewLead(ADDER, L("N2", { phone: "+919810000002" }), team, 0, NOW, names));
check(e?.code === "23505" && /already belongs to a lead in the CRM/.test(e.message) && !/Bilal|9810000002/.test(e.message),
  "guardNewLead: a contact already in the team is refused without naming the school, whose it is or the number", e?.message);
for (const ph of ["98100 00002", "+91 98100-00002", "098100 00002"]) {
  e = err(() => M.guardNewLead(ADDER, L("N2", { phone: ph }), team, 0, NOW, names));
  check(e?.code === "23505", `guardNewLead: bilal's number written as "${ph}" is the same number`, e?.message);
}
e = err(() => M.guardNewLead(ADDER, L("N2", { email: " Office@Bilal.Example " }), [...team, L("D", { email: "office@bilal.example" })], 0, NOW, names));
check(e?.code === "23505", "guardNewLead: an e-mail matches without case or outer spaces", e?.message);
e = err(() => M.guardNewLead(ADDER, L("N3", { phone: "+919830000099" }), team, 5, NOW, names));
check(e?.code === "22023" && /5 new leads waiting/.test(e.message), "guardNewLead: refused at the New-lead cap", e?.message);
e = err(() => M.guardNewLead(MEMBER, L("N4", { phone: "+919830000098" }), team, 0, NOW, names));
check(e?.code === "42501" && /not switched on/.test(e.message), "guardNewLead: refused without 'Can add leads'", e?.message);
const known = err(() => M.guardNewLead(MEMBER, L("N4", { phone: "+919810000002" }), team, 0, NOW, names));
check(known?.code === e?.code && known?.message === e?.message, "guardNewLead: ...with the SAME refusal for a number already in the CRM (asked first: no free lookup)", known?.message);
for (const [over, what, code] of [
  [{ instituteName: { x: 1 } }, "an object as the name", "22023"],
  [{ kind: 7 }, "a number as the kind", "22023"],
  [{ kind: "bakery" }, "a kind that does not exist", "22023"],
  [{ source: ["x"] }, "a list as the source", "22023"],
  [{ instituteName: "  " }, "no name", "23514"],
]) {
  e = err(() => M.guardNewLead(ADDER, L("N9", over), team, 0, NOW, names));
  check(e?.code === code, `guardNewLead: a member's lead with ${what} is refused (${code})`, e?.message);
}
e = err(() => M.guardNewLead(ADMIN, L("N9", { city: 5 }), team, 0, NOW, names));
check(e?.code === "22023", "guardNewLead: an admin's lead with a number as the city is refused too", e?.message);
/* Filling in a number or e-mail another lead already has (one school, one lead). */
e = err(() => M.guardPatch(MEMBER, mine, { whatsapp: "+91 98100 00002" }, NOW, team));
check(e?.code === "23505" && /another lead/.test(e.message) && !/Bilal|9810000002/.test(e.message), "guardPatch: a member cannot fill in bilal's number as her lead's WhatsApp", e?.message);
check(M.guardPatch(MEMBER, mine, { whatsapp: "+919810000001" }, NOW, team).whatsapp === "+919810000001", "guardPatch: ...but may put her lead's own number in");
e = err(() => M.guardPatch(MEMBER, mine, { email: "OFFICE@bilal.example" }, NOW, [...team, L("D", { email: "office@bilal.example" })]));
check(e?.code === "23505", "guardPatch: ...nor another lead's e-mail, in other capitals", e?.message);
check(M.guardPatch(ADMIN, mine, { whatsapp: "+919810000002" }, NOW, team).whatsapp === "+919810000002", "guardPatch: an admin's fill is not checked (the database checks members)");
const byOwner = M.guardNewLead(OWNER, L("N5", { status: "lost", assigneeId: "m_other" }), team, 0, NOW, names);
check(byOwner.assigneeId === null && byOwner.createdById === "m_owner" && byOwner.closedAt === NOW.toISOString(), "guardNewLead: Mehdi's lead is his (created by), Unassigned; a closed one is stamped closed");
e = err(() => M.guardNewLead(OFF, L("N6"), team, 0, NOW, names));
check(e?.code === "42501", "guardNewLead: no access, no lead");
/* A member's new lead never passes for one from Meta's forms: the id and the source are refused, the meta... keys go. */
for (const id of ["ol_meta_9000000000000071", "OL_META_9000000000000071", "Ol_Meta_x"]) {
  e = err(() => M.guardNewLead(ADDER, L(id, { phone: "+919830000071" }), team, 0, NOW, names));
  check(e?.code === "42501" && e.message === M.crmErrorText(M.META_ID_REFUSED), `guardNewLead: a member cannot add a lead with the id "${id}" (a Meta lead's place)`, e?.message);
}
/* On its letters only, as the guard (review, 3 Oct): the dashboard groups these with the Meta sources. */
for (const source of [...M.META_SOURCES, " instagram lead ads ", "META LEADS CENTER", "Meta Lead Ads ", "\tInstagram Lead Ads", "Facebook Lead Ads\n",
  "Meta Leads Center　", "Meta Lead Ads​", "﻿Meta Lead Ads", "FacebooK Lead Ads", "meta-lead-ads", "  Meta   Lead   Ads  "]) {
  e = err(() => M.guardNewLead(ADDER, L("N10", { phone: "+919830000072", source }), team, 0, NOW, names));
  check(e?.code === "42501" && e.message === M.crmErrorText(M.META_SOURCE_REFUSED), `guardNewLead: a member cannot add a lead whose source is ${JSON.stringify(source)}`, e?.message);
  check(M.isMetaSourceText(source), `isMetaSourceText(${JSON.stringify(source)})`);
}
for (const source of ["Manual", "Instagram", "Referral", "Meta Lead Ads (old campaign)", "", undefined]) {
  check(!M.isMetaSourceText(source) && Boolean(M.guardNewLead(ADDER, L("N10", { phone: "+919830000072", source }), team, 0, NOW, names)),
    `guardNewLead: a member may add a lead whose source is ${JSON.stringify(source)}`);
}
e = err(() => M.guardNewLead(ADDER, L("ol_meta_9000000000000073", { phone: "+919810000002" }), team, 0, NOW, names));
check(e?.code === "42501" && e.message === M.crmErrorText(M.META_ID_REFUSED), "guardNewLead: the Meta id is refused before the duplicate check, as in the database", e?.message);
const notMeta = M.guardNewLead(ADDER, L("N11", { phone: "+919830000074", source: "Instagram page", metaLeadId: "9000000000000074", metaPlatform: "ig",
  metaConsent: "yes", metaCampaignName: "Made up", metaCreatedAt: "2026-10-01T05:00:00.000Z", MetaOther: "x" }), team, 0, NOW, names);
check(!Object.keys(notMeta).some((k) => /^meta/i.test(k)) && notMeta.source === "Instagram page" && notMeta.phone === "+919830000074" && !M.isMetaLead(notMeta),
  "guardNewLead: a member's lead keeps none of the meta... keys (and is not a Meta lead), the rest as asked", notMeta);
const metaImport = M.guardNewLead(OWNER, L("ol_meta_9000000000000075", { source: "Meta Leads Center", metaLeadId: "9000000000000075", metaConsent: "no" }), team, 0, NOW, names);
check(metaImport.id === "ol_meta_9000000000000075" && metaImport.source === "Meta Leads Center" && metaImport.metaLeadId === "9000000000000075" && metaImport.metaConsent === "no",
  "guardNewLead: Mehdi's import of Meta's own files still adds Meta leads as they are");

/* stampEvent: the history guard */
const ev = (over = {}) => ({ id: "E", leadId: "A", type: "note", at: "2020-01-01T00:00:00.000Z", ...over });
const st = M.stampEvent(MEMBER, ev({ type: "call", actorId: "m_other", leadId: "A" }), mine, NOW);
check(st.actorId === "m_member" && st.at === NOW.toISOString(), "stampEvent: written by the caller, dated now, whatever was sent");
const opened = M.stampEvent(MEMBER, ev({ type: "demo_opened", at: iso(NOW - 2 * DAY) }), mine, NOW);
check(opened.at === iso(NOW - 2 * DAY), "stampEvent: a demo-opened line keeps the open's time");
check(M.stampEvent(MEMBER, ev({ type: "demo_opened", at: iso(NOW - 40 * DAY) }), mine, NOW).at === NOW.toISOString(), "stampEvent: ...not when it is over 30 days old");
for (const bad of [{ type: "sent", stage: "after_call" }, { type: "sent", stage: "proposal" }, { type: "sent", templateId: "em_proposal_chase_any_en" }, { type: "sent", templateId: "wa_after_call_en" }]) {
  e = err(() => M.stampEvent(MEMBER, ev(bad), mine, NOW));
  check(e?.code === "42501" && /Mehdi's/.test(e.message), `stampEvent: money is Mehdi's (${bad.stage || bad.templateId})`, e?.message);
}
e = err(() => M.stampEvent(ADMIN, ev({ type: "sent", stage: "proposal" }), mine, NOW));
check(e?.code === "42501", "stampEvent: an admin cannot log a proposal either");
check(M.stampEvent(OWNER, ev({ type: "sent", stage: "proposal" }), mine, NOW).stage === "proposal", "stampEvent: Mehdi can");
e = err(() => M.stampEvent(MEMBER, ev({ type: "status", detail: "Status: Replied to Won" }), mine, NOW));
check(e?.code === "42501", "stampEvent: no '... to Won' line from anyone but Mehdi");
for (const t of ["assign", "handoff"]) {
  e = err(() => M.stampEvent(MEMBER, ev({ type: t }), mine, NOW));
  check(e?.code === "42501" && e.message.includes(`"${t}"`), `stampEvent: nobody forges a "${t}" line`);
}
e = err(() => M.stampEvent(MEMBER, ev({ detail: "x".repeat(5000) }), mine, NOW));
check(e?.code === "22001" && /4 KB/.test(e.message), "stampEvent: a member's line over 4 KB is refused");
check(M.stampEvent(OWNER, ev({ detail: "x".repeat(5000) }), mine, NOW).detail.length === 5000, "stampEvent: ...Mehdi's is not (up to 20 KB)");
e = err(() => M.stampEvent(OWNER, ev({ detail: "x".repeat(21000) }), mine, NOW));
check(e?.code === "22001", "stampEvent: nobody writes a line over 20 KB");
e = err(() => M.stampEvent(OWNER, ev({ type: "sent", channel: "email" }), { ...mine, status: "do_not_contact" }, NOW));
check(e?.code === "42501" && /not to be contacted/.test(e.message), "stampEvent: nothing is sent to Do not contact, by anyone");
/* A Meta lead who left the WhatsApp-and-phone box unticked: e-mail only, from anyone (the history guard, review 3 Oct). */
{
  const unticked = { ...mine, source: "Instagram Lead Ads", metaLeadId: "9000000000000081", metaConsent: "no" };
  for (const [who, line, what] of [
    [MEMBER, { type: "sent", channel: "whatsapp", stage: "first" }, "a member's first WhatsApp"],
    [MEMBER, { type: "sent", channel: "whatsapp", stage: "follow_up_1" }, "a member's WhatsApp follow-up"],
    [MEMBER, { type: "call", channel: "call", outcome: "no_answer" }, "a member's call"],
    [MEMBER, { type: "call" }, "a call with no channel on it"],
    [MEMBER, { type: "sent", templateId: "wa_first_new_school_en" }, "a WhatsApp send with its channel left out"],
    [ADMIN, { type: "sent", channel: "whatsapp", stage: "first" }, "an admin's WhatsApp"],
    [OWNER, { type: "sent", channel: "whatsapp", stage: "first" }, "Mehdi's own WhatsApp"],
    [OWNER, { type: "call", channel: "call" }, "Mehdi's own call"],
  ]) {
    e = err(() => M.stampEvent(who, ev(line), unticked, NOW));
    check(e?.code === "42501" && e.message === M.NO_META_CONSENT, `stampEvent: box left unticked, ${what} is refused with the screen's sentence`, e?.message);
  }
  for (const [who, lead, line, what] of [
    [MEMBER, unticked, { type: "sent", channel: "email", stage: "first" }, "a member's e-mail"],
    [MEMBER, unticked, { type: "note", detail: "Wrote by e-mail" }, "a note"],
    [MEMBER, unticked, { type: "replied", channel: "whatsapp" }, "their own WhatsApp reply, logged"],
    [OWNER, unticked, { type: "sent", channel: "email", stage: "first" }, "Mehdi's e-mail"],
    [MEMBER, { ...unticked, metaConsent: "yes" }, { type: "sent", channel: "whatsapp", stage: "first" }, "a WhatsApp to a Meta lead who ticked it"],
    [MEMBER, { ...unticked, metaConsent: "none" }, { type: "call", channel: "call" }, "a call to a Meta lead whose form had no box"],
  ]) {
    check(!err(() => M.stampEvent(who, ev(line), lead, NOW)), `stampEvent: ...while ${what} is fine`, err(() => M.stampEvent(who, ev(line), lead, NOW))?.message);
  }
}
e = err(() => M.stampEvent(MEMBER, ev({ leadId: "B" }), theirs, NOW));
seen(e?.code === "42501", "stampEvent: no line on another's lead");
for (const [bad, what] of [
  [{ type: "status", detail: ["Status: Contacted to Won"] }, "a '... to Won' line hidden in a list"],
  [{ type: "sent", channel: "whatsapp", stage: ["after_call"] }, "an after-call stage hidden in a list"],
  [{ type: "sent", channel: "email", templateId: ["em_after_call"] }, "a money template id hidden in a list"],
  [{ type: "sent", channel: "whatsapp", stage: "after call" }, "a stage that does not exist"],
  [{ type: "sent", channel: "sms" }, "a channel the CRM does not have"],
  [{ type: "call", outcome: 5 }, "a number as the outcome"],
  [{ type: "note", topic: "gossip" }, "a topic Ask Mehdi does not have"],
]) {
  e = err(() => M.stampEvent(MEMBER, ev(bad), mine, NOW));
  check(e?.code === "22023", `stampEvent: no ${what}`, e?.message);
}
e = err(() => M.stampEvent(ADMIN, ev({ type: "status", detail: ["Status: Contacted to Won"] }), mine, NOW));
check(e?.code === "22023", "stampEvent: an admin cannot hide a win in a list either");
check(M.stampEvent(MEMBER, ev({ type: "call", channel: "call", outcome: "no_answer", detail: "No answer" }), mine, NOW).outcome === "no_answer",
  "stampEvent: a real call line with its outcome is kept");

/* planDistribution and planRules: the SQL test's own cases (section 9 of test-crm-rls) */
const P = (id, queue, open, cap = 60, isMember = true) => ({ id, queue, open, cap, isMember });
const pool = (i) => L(`U${i}`, { kind: i % 2 ? "school" : "coaching", city: i <= 3 ? "Patna" : "Ranchi", createdAt: "2026-09-20T05:00:00.000Z", assigneeId: null });
const six = [1, 2, 3, 4, 5, 6].map(pool);
let plan = M.planDistribution(six.slice(3), [P("bilal", 3, 4), P("chetan", 1, 1)], "balanced", false).plan;
check(plan.get("U4") === "chetan" && plan.get("U5") === "chetan" && plan.get("U6") === "bilal", "balanced: by New leads waiting (bilal 3, chetan 1): chetan, chetan, then bilal on the tie", [...plan]);
plan = M.planDistribution(six, [P("bilal", 0, 1), P("chetan", 1, 1)], "round_robin", false).plan;
check(same([...plan.values()], ["bilal", "chetan", "bilal", "chetan", "bilal", "chetan"]), "round-robin deals the six in turn: bilal, chetan, bilal...", [...plan]);
plan = M.planDistribution([pool(1)], [P("asha", 5, 5, 5)], "balanced", false).plan;
check(plan.get("U1") === null, "a share-out never passes a cap: the lead left over is null");
const uc = L("UC", { status: "contacted", assigneeId: null });
const up = L("UP", { status: "proposal", assigneeId: null });
const shut = L("UL", { status: "lost", assigneeId: null });
let pre = M.planDistribution([uc, up, shut], [P("chetan", 0, 0)], "balanced", false);
check(pre.plan.size === 0 && pre.skipped.contacted === 1 && pre.skipped.mehdis === 1 && pre.skipped.closed === 1, "a share-out takes only New leads: the contacted, Proposal and closed ones are counted for the preview", pre);
pre = M.planDistribution([uc, up], [P("chetan", 0, 0)], "balanced", true);
check(pre.plan.get("UC") === "chetan" && !pre.plan.has("UP") && pre.skipped.mehdis === 1, "with 'include contacted' the contacted one goes; a Proposal never does");
pre = M.planDistribution([pool(1), { ...pool(2), demoId: "d1" }, pool(3)], [P("a", 0, 0), P("b", 0, 0)], "balanced", false);
check(pre.noDemo === 2, "the preview counts the leads with no demo (make demos first)", pre.noDemo);
const mehdiHeavy = M.sharePeople(Array.from({ length: 1200 }, (_, i) => L(`H${i}`, { assigneeId: "m_owner" })), [{ id: "m_owner", role: "owner", active: true, newLeadCap: 1000 }], ["m_owner"], []);
check(M.planDistribution([pool(1)], mehdiHeavy, "balanced", false).plan.get("U1") === "m_owner", "Mehdi and admins have no New cap and no 1,000 ceiling (1,200 New leads, still takes more)", mehdiHeavy);
const people2 = M.sharePeople([L("A1", { assigneeId: "a" }), L("A2", { assigneeId: "a", status: "contacted" }), L("A3", { assigneeId: "a" })],
  [{ id: "a", role: "member", active: true, newLeadCap: 9 }, { id: "z", role: "member", active: false, newLeadCap: 9 }], ["a", "a", "z"], ["A3"]);
check(people2.length === 1 && people2[0].queue === 1 && people2[0].open === 2 && people2[0].cap === 9, "sharePeople: a repeat counts once, the switched-off are left out, the leads being shared do not count", people2);
const rules = [
  { id: 1, name: "Patna schools", kind: "school", city: "patna", memberIds: ["bilal", "chetan"], priority: 1, active: true, nextIndex: 0 },
  { id: 2, name: "Everything else", kind: null, city: null, memberIds: ["erin"], priority: 9, active: true, nextIndex: 0 },
];
const people = ["bilal", "chetan", "erin"].map((id) => ({ ...P(id, 0, 0), active: true }));
const rp = M.planRulesDetailed(six, rules, people, false);
check(rp.plan.get("U1") === "bilal" && rp.plan.get("U3") === "chetan" && ["U2", "U4", "U5", "U6"].every((id) => rp.plan.get(id) === "erin"),
  "rules: Patna schools rotate bilal, chetan; the rest go to erin", [...rp.plan]);
check(rp.nextIndex.get(1) === 0 && rp.nextIndex.get(2) === 0, "rules: whose turn it is moves on inside each rule");
const offErin = people.map((p) => (p.id === "erin" ? { ...p, active: false } : p));
check(!M.planRules(six, rules, offErin, false).has("U2"), "rules: a switched-off person is skipped; no fit stays Unassigned");
check(M.planRules([{ ...pool(1), assigneeId: "x" }, { ...pool(3), status: "contacted" }], rules, people, false).size === 0, "rules: only Unassigned New leads (unless told)");

/* isEngaged, masking, the error text */
check(!M.isEngaged(mine, []) && M.isEngaged(mine, [{ leadId: "A", type: "replied" }]) && M.isEngaged({ ...mine, status: "demo_opened" }, []),
  "isEngaged: a reply, a demo open or that stage (the cold-call gate)");
check(!M.isEngaged(mine, [{ leadId: "B", type: "replied" }]), "isEngaged: another lead's reply does not count");
/* An open after a cold link is not engagement (3 Oct 2026, the link in the first message, send-links D9): when the last
   message that carried their demo link was a cold first message (a twin with link "demo"), the open does not open the gate. */
{
  const at = (d) => `2026-10-0${d}T09:00:00.000Z`;
  const cold = { leadId: "A", type: "sent", channel: "email", templateId: "em_first_new_dental_en_link", stage: "first", at: at(1) };
  const open = { leadId: "A", type: "demo_opened", at: at(2) };
  const warm = { leadId: "A", type: "sent", channel: "whatsapp", templateId: "wa_after_reply_dental_en", stage: "after_reply", at: at(4) };
  const pointBack = { leadId: "A", type: "sent", channel: "email", templateId: "em_fu1_dental_en_after_link", stage: "follow_up_1", at: at(3) };
  check(M.isEngaged(mine, [open]) && !M.isEngaged(mine, [cold, open]), "isEngaged: a demo open counts, unless the last link they got went cold in a first message");
  check(M.isEngaged(mine, [cold, open, { leadId: "A", type: "replied", at: at(3) }]), "isEngaged: after a cold link, a reply still opens the gate");
  check(!M.isEngaged(mine, [cold, open, pointBack]), "isEngaged: a follow-up that only points back to the link changes nothing");
  check(M.isEngaged(mine, [cold, open, warm, { leadId: "A", type: "demo_opened", at: at(5) }]), "isEngaged: once the link went again after a yes, an open counts");
  check(M.isEngaged(mine, [{ ...cold, leadId: "B" }, open]), "isEngaged: another lead's cold link does not touch this lead's open");
  check(M.linkWentCold("A", [cold]) && !M.linkWentCold("A", [cold, warm]) && !M.linkWentCold("A", [pointBack]) && !M.linkWentCold("A", []) && !M.linkWentCold("B", [cold]),
    "linkWentCold: the latest message that carried the link decides; a point-back follow-up or another lead's send never does");
}
check(M.maskPhone("+919810012345") === "+91 98100 •••45" && M.maskEmail("office@school.example") === "of•••@school.example",
  "masking: +91 98100 •••45 and of•••@school.example", [M.maskPhone("+919810012345"), M.maskEmail("office@school.example")]);
check(M.maskPhone("") === "" && M.maskEmail(undefined) === "" && !M.maskPhone("+14155550123").includes("55501"), "masking: empty stays empty; another country's number is masked too");
check(M.crmErrorText({ code: "54000", message: "crm: that is more than one person may do in a day (300 a day)." }) === "That is more than one person may do in a day (300 a day).",
  "crmErrorText: the database's sentence, without 'crm: '");
check(M.crmErrorText({ code: "P0002", message: "crm: this lead is not yours, or it was deleted" }) === "This lead is not yours any more (it may have been moved).", "crmErrorText: P0002 in plain words");
check(/Ask Mehdi/.test(M.crmErrorText({ code: "42501", message: 'new row violates row-level security policy for table "outreach_leads"' })), "crmErrorText: a row-security refusal in plain words");
check(M.crmErrorText(new M.CrmAccessError("23505", "Already there.")) === "Already there.", "crmErrorText: a CrmAccessError reads as it is");
check(M.crmErrorText({ code: "23505", message: "crm: iQ Classes is already in the CRM (Bilal). Ask Mehdi before adding it again." }).startsWith("iQ Classes is already")
  && M.crmErrorText({ code: "23505", message: "crm: asha@example.org is already in the team. Open them in Team to change them." }).startsWith("asha@example.org"),
  "crmErrorText: a sentence that starts with a name or an e-mail keeps it exactly as written");

/* accessSummaryRows: filling the log makes a day to look at (more than 20 sign-ins, or more than 200 logged lines). */
const noonIst = "2026-10-01T06:30:00.000Z";
const logLines = (actorId, action, n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, at: noonIst, actorId, action, leadId: null, memberId: null, detail: {} }));
const accessCrew = [{ id: "m_a", role: "member", displayName: "A", active: true }, { id: "m_b", role: "member", displayName: "B", active: true }];
const accessDays = (audit) => M.accessSummaryRows(audit, [], accessCrew, new Date("2026-09-30T00:00:00.000Z"), new Date("2026-10-02T00:00:00.000Z"));
let ad = accessDays([...logLines("m_a", "sign_in", 20), ...logLines("m_b", "import", 200)]);
check(ad.find((d) => d.memberId === "m_a")?.suspicious === false && ad.find((d) => d.memberId === "m_b")?.suspicious === false,
  "accessSummaryRows: 20 sign-ins, or 200 logged lines, is an ordinary day", ad);
ad = accessDays([...logLines("m_a", "sign_in", 21), ...logLines("m_b", "import", 201)]);
check(ad.find((d) => d.memberId === "m_a")?.suspicious === true && ad.find((d) => d.memberId === "m_a")?.signIns === 21 && ad.find((d) => d.memberId === "m_b")?.suspicious === true,
  "accessSummaryRows: 21 sign-ins, or 201 logged lines, is a day to look at", ad);

/* cadenceDone (derive.ts, work package D) */
if (HAS_CADENCE) {
  const fresh = L("F", { status: "new" });
  check(!M.cadenceDone(fresh, [], NOW), "cadenceDone: a lead nobody has written to is not done");
  const replied = L("R", { status: "contacted", lastContactedAt: iso(NOW - 30 * DAY) });
  check(!M.cadenceDone(replied, [{ id: "r", leadId: "R", type: "replied", at: iso(NOW - 25 * DAY) }], NOW), "cadenceDone: a lead that replied is not closed off");
  check(!M.cadenceDone(L("W", { status: "won" }), [], NOW), "cadenceDone: a closed lead is never in Close these");
  /* An open after a cold link is not "came back" (3 Oct 2026: send-links D9 and its known gap 10.9, the rule isEngaged
     follows): a WhatsApp-only lead whose two messages went, the first with their sample's link, is offered for closing
     although that link was opened; after a first message without the link an open still keeps it out, as before. */
  const waOnly = L("C", { status: "contacted", phone: "+919810000009", lastContactedAt: iso(NOW - 16 * DAY) });
  const sentC = (id, days, templateId, stage) => ({ id, leadId: "C", type: "sent", channel: "whatsapp", templateId, stage, at: iso(NOW - days * DAY) });
  const openC = { id: "c_open", leadId: "C", type: "demo_opened", at: iso(NOW - 19 * DAY) };
  const coldTrail = [sentC("c1", 20, "wa_first_new_school_en_link", "first"), openC, sentC("c3", 16, "wa_fu1_en_after_link", "follow_up_1")];
  const plainTrail = [sentC("p1", 20, "wa_first_new_school_en", "first"), openC, sentC("p3", 16, "wa_fu1_en", "follow_up_1")];
  check(M.cadenceDone(waOnly, coldTrail, NOW), "cadenceDone: an open after a cold link is not 'came back': the finished lead is offered for closing");
  check(!M.cadenceDone(waOnly, plainTrail, NOW), "cadenceDone: an open after a first message without the link still counts");
  check(M.cadenceDone(waOnly, plainTrail.filter((e) => e !== openC), NOW), "cadenceDone: the same two messages and no open: done");
  check(!M.cadenceDone(waOnly, [...coldTrail, { id: "c_rep", leadId: "C", type: "replied", at: iso(NOW - 15 * DAY) }], NOW), "cadenceDone: after a cold link a reply still keeps it out");
} else {
  console.log("note  derive.ts has no cadenceDone yet (work package D): its checks run once it does");
}

/* ── 3. Local mode: LocalOutreachStore acting as each person ─────────────── */

function memStorage() {
  const m = new Map();
  return { map: m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}
const mem = memStorage();
const store = new M.LocalOutreachStore(mem);
const KEY = M.OUTREACH_LOCAL_KEY;
const raw = () => JSON.parse(mem.getItem(KEY) || "{}");
const setRaw = (fn) => {
  const d = raw();
  fn(d);
  mem.setItem(KEY, JSON.stringify(d));
};
const as = (who) => store.actAs(who ? ID[who] || who : null);
const ids = async () => (await store.listLeads()).map((l) => l.id).sort();
const ID = { owner: "m_owner" };

/* 3a. Mehdi's data as today's app wrote it, before any team: the migration, emulated. */
const P1 = { id: "P1", instituteName: "Prior Public School", kind: "school", status: "contacted", phone: "+919800000001", assignedTo: "Aman",
  createdAt: "2026-09-20T05:00:00.000Z", updatedAt: "2026-09-25T06:00:00.000Z", lastContactedAt: "2026-09-25T06:00:00.000Z" };
const P2 = { id: "P2", instituteName: "Prior Classes", kind: "coaching", status: "new", phone: "+919800000002", createdAt: "2026-09-20T05:00:00.000Z", updatedAt: "2026-09-20T05:00:00.000Z" };
const PE1 = { id: "PE1", leadId: "P1", type: "sent", channel: "whatsapp", templateId: "wa_first_new_school_en", at: "2026-09-25T06:00:00.000Z" };
mem.setItem(KEY, JSON.stringify({ leads: [P1, P2], events: [PE1], settings: null }));
let who = await store.me();
check(who.role === "owner" && who.memberId === "m_owner" && who.legacy === false && who.displayName === "Mehdi Alam", "local: with nobody acted as, the store is Mehdi (owner)", who);
let prior = Object.fromEntries((await store.listLeads()).map((l) => [l.id, l]));
check(prior.P1.assigneeId === "m_owner" && prior.P1.createdById === "m_owner" && prior.P2.assigneeId === null && prior.P2.createdById === "m_owner",
  "local: a lead he has written to (P1) reads as his; the untouched New one (P2) is the Unassigned pool", [prior.P1.assigneeId, prior.P2.assigneeId]);
check(prior.P1.assignedTo === "Aman", "local: the old free-text label is kept as it was");
check(!("team" in raw()) && mem.map.size === 1, "local: reading writes nothing (no team is stored until something changes)");
const before = { ...raw().leads.find((l) => l.id === "P2") };
await store.upsertLeads([{ ...prior.P2, notes: "old app save" }]);
const after = raw().leads.find((l) => l.id === "P2");
const shape = (o) => Object.keys(o).filter((k) => k !== "notes" && k !== "updatedAt").sort().join();
check(shape(after) === shape(before) && after.notes === "old app save", "local: Mehdi's whole-lead save keeps his lead's shape (no team fields are written into it)", Object.keys(after));
await store.addEvent({ leadId: "P2", type: "note", detail: "hi" });
check((await store.getLead("P2")).assigneeId === null, "local: a note by Mehdi does not take a lead out of the pool");
await store.addEvent({ leadId: "P2", type: "sent", channel: "whatsapp", templateId: "wa_first_new_school_en", stage: "first" });
check((await store.getLead("P2")).assigneeId === "m_owner" && !raw().events.some((e) => e.leadId === "P2" && e.type === "assign"),
  "local: his first SEND on an Unassigned lead makes it his, quietly (no 'Assigned' line)");

/* 3b. The team, through the owner's own functions. */
const crew = [
  ["asha", "member", { newLeadCap: 5, senderPhone: "+919811100001" }],
  ["bilal", "member", { viewAll: true }],
  ["chetan", "member", {}],
  ["ayesha", "admin", {}],
  ["erin", "member", {}],
  ["farah", "member", {}],
];
for (const [name, role, over] of crew) {
  ID[name] = await store.saveMember({ email: `${name}@example.org`, displayName: name[0].toUpperCase() + name.slice(1), role, newLeadCap: 60, ...over });
}
check(Object.values(ID).every(Boolean) && (await store.listMembers()).length === 7, "owner adds six people (members, one admin)");
as("asha");
e = await error(() => store.saveMember({ email: "x@example.org", displayName: "X" }));
check(e?.code === "42501" && /only Mehdi manages the team/i.test(e.message), "a member cannot add people", e?.message);
as("ayesha");
e = await error(() => store.saveMember({ email: "x@example.org", displayName: "X" }));
check(e?.code === "42501", "an admin cannot add people either (the Team page is Mehdi's)");
as(null);
e = await error(() => store.saveMember({ email: "owner@local.test", displayName: "Twin" }));
check(e?.code === "22023" && /owner's/.test(e.message), "the owner's e-mail cannot be added as a member");
e = await error(() => store.saveMember({ email: "asha@example.org", displayName: "Asha 2" }));
check(e?.code === "23505", "the same e-mail cannot be added twice");
e = await error(() => store.saveMember({ email: "z@example.org", displayName: "Z", role: "owner" }));
check(e?.code === "22023", "nobody is made owner through the Team page");

/* First sign-in: acting as someone is their sign-in (the login links). */
as("asha");
who = await store.me();
check(who.role === "member" && who.memberId === ID.asha && who.mustChangePassword === true && who.newLeadCap === 5 && who.senderChecked === false && who.hostWhatsapp === "+917761921786",
  "asha's first sign-in: member, must set her password, her cap, number not checked, Mehdi's number for 'Tell Mehdi'", who);
await store.passwordChanged();
check((await store.me()).mustChangePassword === false, "after setting her password the flag clears");
check(raw().team.members.find((m) => m.id === ID.asha).userId, "...and her login is linked");
for (const p of ["bilal", "chetan", "ayesha", "erin"]) {
  as(p);
  await store.me();
}
as("m_nobody");
who = await store.me();
check(who.role === null && who.reason === "not_a_member", "someone not in the team gets no role");
as(null);
await store.saveMember({ id: ID.asha, senderChecked: true });
as("asha");
check((await store.me()).senderChecked === true, "Mehdi ticks 'number checked' after her test message arrives");
as(null);
await store.saveMember({ id: ID.asha, senderPhone: "+919811100002" });
as("asha");
check((await store.me()).senderChecked === false, "a NEW company number clears the tick");
as(null);
await store.saveMember({ id: ID.asha, senderPhone: "+919811100001", senderChecked: true });

/* 3c. Leads, as the owner adds and assigns them. */
const mk = (id, name, over = {}) => store.createLead({ id, instituteName: name, kind: "school", ...over });
await mk("L1", "Asha School One", { phone: "+919810000001", email: "l1@school.example", city: "Kankarbagh, Patna", demoId: "d1", status: "contacted" });
await mk("L2", "Bilal Classes Two", { kind: "coaching", phone: "+919810000002", city: "Gaya", demoId: "d2", status: "contacted" });
await mk("L3", "Unassigned Three", { phone: "+919810000003", city: "Patna" });
await mk("L4", "Asha Do Not Contact", { phone: "+919810000004", status: "do_not_contact" });
await mk("L6", "Asha Empty Email", { phone: "+919810000006" });
for (let i = 1; i <= 6; i++) await mk(`U${i}`, `Pool ${i}`, { kind: i % 2 ? "school" : "coaching", city: i <= 3 ? "Patna" : "Ranchi", phone: `+91982000000${i}` });
check((await store.assignLeads(["L1", "L4", "L6"], ID.asha)) === 3, "owner assigns L1, L4, L6 to asha");
await store.assignLeads(["L2"], ID.bilal);
await store.addEvent({ leadId: "L1", type: "sent", channel: "whatsapp", templateId: "wa_first_new_school_en", stage: "first" });
check((await store.getLead("L1")).assigneeId === ID.asha, "Mehdi's send on asha's lead does not take it back (only an Unassigned lead is claimed)");
check((await store.listEvents("L1")).some((x) => x.type === "assign" && /Assigned to Asha \(was Unassigned\) by Mehdi Alam/.test(x.detail)), "the lead's history says who assigned it to whom");
as("asha");
check((await store.notifications()).some((n) => n.kind === "assigned" && /Mehdi Alam assigned you 3 leads/.test(n.title)), "asha's bell: 'Mehdi Alam assigned you 3 leads'");

/* 3d. Who sees which leads, and their history. */
as(null);
const total = (await store.listLeads()).length;
check(total === 13, "owner sees all 13 leads", total);
as("ayesha");
check((await store.listLeads()).length === 13, "an admin sees every lead");
as("asha");
seen(same(await ids(), ["L1", "L4", "L6"]), "asha (member) sees only her 3 leads", await ids());
seen((await store.getLead("L2")) === null, "asha cannot open bilal's lead by its id");
seen((await store.listEvents()).every((x) => ["L1", "L4", "L6"].includes(x.leadId)), "asha reads only her leads' history");
check((await store.leadsOverview()).length === 0, "asha (See all off) gets no overview rows");
as("bilal");
seen(same(await ids(), ["L2"]), "bilal (See all) still reads only HIS full rows", await ids());
const ov = await store.leadsOverview();
check(ov.length === 13 && ov.every((r) => !("phone" in r) && !("email" in r) && !("notes" in r)), "bilal (See all) lists all 13 leads, without phone, e-mail or notes");
check(ov.find((r) => r.id === "L1")?.assigneeName === "Asha", "...with whose each one is");
as("m_nobody");
seen((await store.listLeads()).length === 0 && (await store.listEvents()).length === 0, "someone not in the team sees nothing");

/* The 14-day window after a lead closes. */
setRaw((d) => (d.leads.find((l) => l.id === "L4").closedAt = iso(Date.now() - 20 * DAY)));
as("asha");
seen((await store.listLeads()).length === 2, "20 days after L4 closed, asha no longer reads it");
e = await error(() => store.patchLead("L4", { tags: ["x"] }));
seen(e?.code === "P0002", "...nor changes it");
e = await error(() => store.addEvent({ leadId: "L4", type: "note", detail: "x" }));
seen(Boolean(e), "...nor writes on its history");
e = await error(() => store.askOwner("L4", "question", "x"));
seen(Boolean(e), "...nor reaches it through Ask Mehdi");
setRaw((d) => (d.leads.find((l) => l.id === "L4").closedAt = iso(Date.now() - 2 * DAY)));
seen((await store.listLeads()).length === 3, "2 days after closing she still reads it");

/* 3e. What a member may change, through the store. */
let r = await store.patchLead("L1", { status: "replied", notes: "Principal said call Monday", nextActionAt: iso(Date.now() + DAY) });
check(r.status === "replied" && r.notes === "Principal said call Monday", "asha moves L1 to Replied and writes a first note");
e = await error(() => store.patchLead("L1", { phone: "+919000000000" }));
check(e?.code === "42501" && /phone/.test(e.message), "asha cannot change a filled phone number");
check((await store.patchLead("L6", { email: "found@school.example", contactName: "Mrs Rao" })).email === "found@school.example", "asha may FILL an empty e-mail and contact name");
r = await store.appendNotes("L1", "Also: wants Hindi");
check(r.notes === "Principal said call Monday\nAlso: wants Hindi", "appendNotes adds a line, keeping the old text");
e = await error(() => store.appendNotes("L1", "   "));
check(e?.code === "22023", "appendNotes refuses an empty line");
e = await error(() => store.patchLead("L1", { status: "call" }));
check(e?.code === "42501" && /Hand to Mehdi/.test(e.message), "asha cannot set stage Call");
e = await error(() => store.patchLead("L6", { status: "lost" }));
check(e?.code === "23514", "asha must say why a lead is lost");
check((await store.patchLead("L6", { status: "lost", lostReason: "Has a website vendor" })).status === "lost", "...and can, with a reason");
const l1Now = await store.getLead("L1");
e = await error(() => store.upsertLead({ ...l1Now, notes: "x" }));
check(e?.code === "42501", "asha's whole-lead upsert is refused (members use patchLead)", e?.message);
e = await error(() => store.deleteLead("L1"));
check(e?.message === "Only Mehdi deletes leads", "asha cannot delete a lead");
e = await error(() => store.saveSettings({ quietStart: "23:00" }));
check(e?.code === "42501", "asha cannot change the settings");
check((await store.getSettings()).quietEnd === "10:00", "...but reads them");
as(null);
await store.patchLead("L6", { status: "new", lostReason: undefined });
check((await store.getLead("L6")).status === "new" && !("closedAt" in (await store.getLead("L6"))), "Mehdi re-opens L6; its closing date goes");

/* 3f. Adding leads (Can add leads on): theirs, de-duplicated, capped. */
as("asha");
e = await error(() => store.createLead({ id: "LX", instituteName: "New", phone: "+919830000001" }));
check(e?.code === "42501", "asha cannot add a lead while Can add leads is off");
as(null);
await store.saveMember({ id: ID.asha, canAddLeads: true });
as("asha");
/* Never a lead that passes for one from Meta's forms: the id and the source refused, the meta... keys dropped. */
e = await error(() => store.createLead({ id: "ol_meta_9000000000000077", instituteName: "Meta Look", phone: "+919830000077" }));
check(e?.code === "42501" && e.message === M.crmErrorText(M.META_ID_REFUSED), "asha cannot add a lead with a Meta lead's id (ol_meta_...)", e?.message);
e = await error(() => store.createLead({ id: "LM1", instituteName: "Meta Look", phone: "+919830000077", source: "Facebook Lead Ads" }));
check(e?.code === "42501" && e.message === M.crmErrorText(M.META_SOURCE_REFUSED), "...nor one whose source says Facebook Lead Ads", e?.message);
check(!(await store.getLead("LM1")) && !(await store.getLead("ol_meta_9000000000000077")), "...and neither was added");
r = await store.createLead({ id: "LM2", instituteName: "Meta Look", phone: "+919830000078", source: "Walk-in", metaLeadId: "9000000000000078",
  metaPlatform: "ig", metaConsent: "yes", metaCampaignName: "Made up" });
const lm2 = await store.getLead("LM2");
check(lm2 && !Object.keys(r).some((k) => /^meta/i.test(k)) && !Object.keys(lm2).some((k) => /^meta/i.test(k)) && lm2.source === "Walk-in" && !M.isMetaLead(lm2),
  "a lead asha adds keeps none of the meta... keys: it is never a Meta lead", lm2);
as(null);
await store.deleteLead("LM2");
as("asha");
r = await store.createLead({ id: "L7", instituteName: "Asha Found It", phone: "+919830000007", demoId: "d2", status: "won", assigneeId: ID.bilal });
check(r.assigneeId === ID.asha && r.createdById === ID.asha && !r.demoId && r.status === "new", "asha adds L7 naming bilal: it is hers, the demo link is dropped, the stage starts at New", r);
e = await error(() => store.createLead({ id: "L8", instituteName: "Copy of Bilal", phone: "098100 00002" }));
check(e?.code === "23505" && /already belongs to a lead in the CRM/.test(e.message) && !/Bilal|9810000002/.test(e.message),
  "asha cannot add a school bilal already has: refused without naming the school, whose it is or the number", e?.message);
e = await error(() => store.patchLead("L6", { whatsapp: "098100 00002" }));
check(e?.code === "23505" && /another lead/.test(e.message), "asha cannot fill her lead's empty WhatsApp with bilal's number either", e?.message);
check(!(await store.getLead("L6")).whatsapp, "...and the WhatsApp stays empty");
e = await error(() => store.patchLead("L6", { city: { x: 1 } }));
check(e?.code === "22023", "asha cannot write an object where text belongs (it would break every page)", e?.message);
let dup = await store.findDuplicate({ phone: "+91 98100 00002" });
check(dup?.leadId === "L2" && dup.assigneeName === "Bilal" && dup.visible === false && !dup.phone, "findDuplicate tells asha it is bilal's, that she cannot open it, and no contact", dup);
dup = await store.findDuplicate({ email: "L1@SCHOOL.example" });
check(dup?.leadId === "L1" && dup.visible === true && dup.phone === "+919810000001", "the duplicate check matches e-mail without case; her own lead comes whole");
r = await store.createLead({ id: "L9", instituteName: "Third new", phone: "+919830000009", status: "contacted" });
check(r.status === "new", "a lead a member adds always starts at New");
await store.createLead({ id: "L10", instituteName: "Fourth new", phone: "+919830000010" });
await store.createLead({ id: "L11", instituteName: "Fifth new", phone: "+919830000011" });
e = await error(() => store.createLead({ id: "L12", instituteName: "Over the cap", phone: "+919830000012" }));
check(e?.code === "22023" && /limit/.test(e.message), "asha cannot hold more New leads than her cap (5)", e?.message);
await store.patchLead("L9", { status: "contacted" });
check((await store.createLead({ id: "L12", instituteName: "Room again", phone: "+919830000012" })).id === "L12", "once she has written to one there is room again: contacted leads do not count");
as(null);
await store.saveMember({ id: ID.asha, canAddLeads: false });

/* 3g. History lines: the writer and the time are the server's; money is Mehdi's. */
as("asha");
const call = await store.addEvent({ id: "E9", leadId: "L1", type: "call", channel: "call", at: "2020-01-01T00:00:00.000Z", actorId: ID.bilal });
check(call.actorId === ID.asha && !call.at.startsWith("2020"), "asha's call line is signed as asha and carries the server's time, whatever she sent");
e = await error(() => store.addEvent({ leadId: "L2", type: "note" }));
check(e?.code === "42501", "asha cannot write history on bilal's lead");
e = await error(() => store.addEvent({ leadId: "L4", type: "sent", channel: "whatsapp" }));
check(/not to be contacted/.test(e?.message || ""), "a 'sent' line on a Do-not-contact lead is refused");
e = await error(() => store.addEvent({ leadId: "L1", type: "status", detail: "Status: Replied to Won" }));
check(e?.code === "42501", "asha cannot write a '... to Won' line");
e = await error(() => store.addEvent({ leadId: "L1", type: "sent", channel: "whatsapp", stage: "proposal" }));
check(e?.code === "42501" && /Mehdi's/.test(e.message), "a forged proposal line from asha is refused with the database's message", e?.message);
e = await error(() => store.addEvent({ id: "E9", leadId: "L1", type: "note" }));
check(e?.code === "23505", "a line id is written once (a second 'demo opened' with the same id is refused, 23505)");
as(null);
e = await error(() => store.addEvent({ leadId: "L4", type: "sent", channel: "email" }));
check(Boolean(e), "...for Mehdi too: nothing is sent to Do not contact");

/* The daily write budget: anyone but Mehdi. */
const today = M.istDay(new Date());
setRaw((d) => (d.team.usage[`${ID.asha}|${today}|event`] = 300));
as("asha");
e = await error(() => store.addEvent({ leadId: "L1", type: "note", detail: "one more" }));
check(e?.code === "54000" && /more than one person may do in a day \(300 a day\)/.test(e.message), "past 300 history lines in a day, asha's next line is refused", e?.message);
e = await error(() => store.askOwner("L1", "question", "x"));
check(e?.code === "54000", "...Ask Mehdi counts in the same budget");
as(null);
check(Boolean(await store.addEvent({ leadId: "L1", type: "note", detail: "Mehdi" })), "Mehdi has no budget");
setRaw((d) => delete d.team.usage[`${ID.asha}|${today}|event`]);
check((raw().team.usage[`${ID.asha}|${today}|lead_change`] || 0) > 0, "asha's lead changes today are counted (refused ones are not)");

/* 3h. Assigning, sharing out, rules: caps hold. */
e = await error(() => store.assignLeads(["L3"], ID.asha));
check(e?.code === "22023" && /the limit is 5/.test(e.message), "owner cannot push asha past her cap; the error says so", e?.message);
as("asha");
e = await error(() => store.assignLeads(["L3"], ID.asha));
check(e?.code === "42501", "a member cannot assign leads");
as("ayesha");
check((await store.assignLeads(["L3"], ID.chetan)) === 1, "an admin assigns L3 to chetan");
as(null);
await store.assignLeads(["U1", "U2", "U3"], ID.bilal);
let dist = Object.fromEntries((await store.distributeLeads(["U4", "U5", "U6"], [ID.bilal, ID.chetan], "balanced")).map((x) => [x.memberId, x.assigned]));
check(dist[ID.bilal] === 1 && dist[ID.chetan] === 2, "balanced share-out goes by New leads waiting (bilal 3, chetan 1): chetan, chetan, then bilal", dist);
dist = Object.fromEntries((await store.distributeLeads(["U1", "U2", "U3", "U4", "U5", "U6"], [ID.bilal, ID.chetan], "round_robin")).map((x) => [x.memberId, x.assigned]));
const rr = Object.fromEntries((await store.listLeads()).filter((l) => /^U/.test(l.id)).map((l) => [l.id, l.assigneeId]));
check(dist[ID.bilal] === 3 && dist[ID.chetan] === 3 && rr.U1 === ID.bilal && rr.U2 === ID.chetan && rr.U3 === ID.bilal, "round-robin deals the six in turn: bilal, chetan, bilal...", rr);
const left = await store.distributeLeads(["U1"], [ID.asha], "balanced");
check(left.some((x) => x.memberId === null && x.assigned === 1), "a share-out never passes a cap: the lead asha cannot take is reported as left over", left);
e = await error(() => store.distributeLeads(["U1"], [ID.asha, "m_nobody"], "balanced"));
check(e?.code === "22023", "everyone picked for a share-out must be an active team member");
check((await store.assignLeads(["U1", "U2", "U3", "U4", "U5", "U6"], null)) === 6, "owner sends six back to the Unassigned list");
await mk("UC", "Contacted Pool", { phone: "+919840000001", status: "contacted" });
await mk("UP", "Proposal Lead", { phone: "+919840000002", status: "proposal" });
e = await error(() => store.assignLeads(["UP"], ID.chetan));
check(e?.code === "22023" && /Call or Proposal/.test(e.message), "a lead at Proposal is never assigned to a member");
await store.distributeLeads(["UC", "UP"], [ID.chetan], "balanced");
let ucup = { UC: (await store.getLead("UC")).assigneeId, UP: (await store.getLead("UP")).assigneeId };
check(ucup.UC === null && ucup.UP === null, "a share-out takes only New leads: a contacted one and a proposal stay put", ucup);
await store.distributeLeads(["UC", "UP"], [ID.chetan], "balanced", true);
ucup = { UC: (await store.getLead("UC")).assigneeId, UP: (await store.getLead("UP")).assigneeId };
check(ucup.UC === ID.chetan && ucup.UP === null, "with 'include leads already contacted' the contacted one goes; a proposal never does", ucup);
as("bilal");
check((await store.notifications()).some((n) => n.kind === "moved_away"), "bilal is told his leads moved");
as(null);
await store.saveRule({ name: "Patna schools", kind: "school", city: "patna", memberIds: [ID.bilal, ID.chetan], priority: 1 });
await store.saveRule({ name: "Everything else", kind: null, city: null, memberIds: [ID.erin], priority: 9 });
as("ayesha");
e = await error(() => store.saveRule({ name: "x", memberIds: [ID.erin] }));
check(e?.code === "42501", "an admin cannot write rules");
check((await store.listRules()).length === 2, "...but reads them");
as(null);
await store.applyRules(["U1", "U2", "U3", "U4", "U5", "U6"]);
const byLead = Object.fromEntries((await store.listLeads()).filter((l) => /^U\d/.test(l.id)).map((l) => [l.id, l.assigneeId]));
check(byLead.U1 === ID.bilal && byLead.U3 === ID.chetan && ["U2", "U4", "U5", "U6"].every((k) => byLead[k] === ID.erin), "rules: Patna schools rotate bilal, chetan; the rest go to erin", byLead);

/* 3i. Names, the team list, the bell. */
as("asha");
const ashaTeam = (await store.teamNames()).map((x) => x.displayName);
check(ashaTeam.includes("Mehdi Alam") && ashaTeam.includes("Asha") && ashaTeam.includes("Ayesha") && !ashaTeam.includes("Chetan") && !ashaTeam.includes("Erin") && !ashaTeam.includes("Farah"),
  "teamNames gives a member names only: Mehdi, the admins, herself, people on her own leads; not the roster", ashaTeam);
check((await store.listMembers()).length === 1 && (await store.listMembers())[0].id === ID.asha, "asha reads only her own team row");
as("ayesha");
check((await store.teamNames()).length === 7 && (await store.listMembers()).length === 7, "an admin gets the whole team");
as("asha");
const notes = await store.notifications();
await store.markNotificationsRead([notes[0].id]);
check((await store.notifications()).find((n) => n.id === notes[0].id)?.readAt, "asha marks a notification read");
as("bilal");
check(!(await store.notifications()).some((n) => n.id === notes[0].id), "...and nobody else reads hers");

/* 3j. Demos: the linked demo (drafts too), its opens, and turning its link on. */
mem.setItem("ideovent_cms_v1", JSON.stringify({
  __format: 2,
  home: { kept: true },
  demoSites: [
    { id: "d1", slug: "asha-one", status: "draft", instituteName: "Asha School One" },
    { id: "d2", slug: "bilal-two", status: "sent", instituteName: "Bilal Classes Two" },
    { id: "d9", slug: "closed-one", status: "closed", instituteName: "Closed" },
    { id: "d8", slug: "free-one", status: "free", instituteName: "Free" },
  ],
  demoSiteSlots: [],
  demoSiteOpens: [{ id: "o1", demoId: "d1", at: iso(Date.now() - DAY) }, { id: "o2", demoId: "d2", at: iso(Date.now() - DAY) }],
}));
as("asha");
const demos = await store.leadDemos();
check(demos.length === 1 && demos[0].id === "d1" && demos[0].status === "draft", "asha reads her lead's DRAFT demo", demos);
check(same((await store.demoOpens()).map((o) => o.id), ["o1"]), "asha gets the opens of her lead's demo only");
check((await store.publishLeadDemo("L1")) === "asha-one", "asha turns on her lead's demo link");
const cms = JSON.parse(mem.getItem("ideovent_cms_v1"));
check(cms.demoSites.find((d) => d.id === "d1").status === "sent" && cms.demoSiteSlots[0]?.id === "d1" && cms.demoSiteSlots[0]?.sentTo && cms.home?.kept && cms.__format === 2,
  "...the demo is marked sent and its slot written, the rest of the CMS snapshot untouched", cms.demoSiteSlots);
check((await store.listEvents("L1")).some((x) => x.detail === "Demo /site/asha-one marked sent" && x.actorId === ID.asha), "...and the lead's history says so");
e = await error(() => store.publishLeadDemo("L2"));
check(e?.code === "42501", "...but not the demo of bilal's lead");
as(null);
await store.patchLead("L9", { demoId: "d9" });
as("asha");
e = await error(() => store.publishLeadDemo("L9"));
check(e?.code === "42501" && /closed this demo/.test(e.message), "a demo Mehdi closed stays closed");
check((await store.notifications()).some((n) => n.kind === "demo_ready" && n.leadId === "L9"), "...linking it told her 'Demo ready'");
/* 3 Oct 2026: a Free slot is an empty page; no send publishes one, and neither does Turn on the link (the SQL's own refusal). */
as(null);
await store.patchLead("L9", { demoId: "d8" });
as("asha");
e = await error(() => store.publishLeadDemo("L9"));
check(e?.code === "42501" && /Free slot/.test(e.message) && JSON.parse(mem.getItem("ideovent_cms_v1")).demoSites.find((d) => d.id === "d8")?.status === "free",
  "a Free slot (an empty page) is never turned on: it stays free", e?.message);
as(null);
await store.patchLead("L9", { demoId: "d9" });
as("asha");

/* 3k. Hand-over, Ask Mehdi, Waiting on you. */
e = await error(() => store.handoff({ leadId: "L1", slotAt: iso(Date.now() + 3 * DAY), note: "Wants a call" }));
check(e?.code === "42501" && /comes later/.test(e.message), "asha cannot book Mehdi's time yet (phase 2): she hands over without a time", e?.message);
const ho = await store.handoff({ leadId: "L1", note: "Wants admissions page" });
const l1 = raw().leads.find((l) => l.id === "L1");
check(ho === null && l1.assigneeId === "m_owner" && l1.qualifiedById === ID.asha, "asha hands L1 to Mehdi: his now, and she keeps the credit", l1);
seen((await store.getLead("L1")) === null, "asha no longer reads L1's contact details...");
check((await store.leadsOverview()).some((x) => x.id === "L1" && x.qualifiedById === ID.asha), "...but follows it in her overview (no contacts)");
as(null);
check((await store.notifications()).some((n) => n.kind === "handoff" && /Asha handed over Asha School One: Wants admissions page/.test(n.title)), "Mehdi's bell: 'Asha handed over ...'");
check((await store.listEvents("L1")).some((x) => x.type === "handoff" && /Handed over to Mehdi Alam by Asha\. Note: Wants admissions page/.test(x.detail)), "the history says who handed it to whom");
await store.assignLeads(["L6"], ID.bilal);
as("bilal");
await store.handoff({ leadId: "L6", note: "Wrong number, the school has closed", qualified: false });
const l6 = raw().leads.find((l) => l.id === "L6");
check(l6.assigneeId === "m_owner" && !l6.qualifiedById && l6.status === "new", "bilal gives L6 back to Mehdi: no credit, stage unchanged", l6);
e = await error(() => store.handoff({ leadId: "L2", hostId: ID.asha }));
check(e?.code === "22023" && /Mehdi or an admin/.test(e.message), "a lead is only ever handed to Mehdi or an admin, never sideways to another intern");
as("asha");
await store.askOwner("L7", "demo", "They want to see a school site with an admissions form");
check((await store.listEvents("L7")).some((x) => x.topic === "demo" && /Demo request for Mehdi Alam: They want/.test(x.detail)), "asha asks Mehdi for a demo on L7; the lead's history keeps it");
e = await error(() => store.askOwner("L7", "riddle", "x"));
check(e?.code === "22023", "Ask Mehdi is a demo, a correction or a question");
as("bilal");
e = await error(() => store.askOwner("L7", "question", "x"));
check(e?.code === "42501", "bilal cannot write on asha's lead through Ask Mehdi");
as(null);
let open = await store.listRequests({ open: true });
check(open.some((q) => q.leadId === "L7" && q.kind === "demo" && q.askedBy === ID.asha) && open.some((q) => q.leadId === "L6" && q.kind === "give_back"),
  "Waiting on you: asha's demo request and bilal's give-back are open requests", open);
await store.markNotificationsRead((await store.notifications()).map((n) => n.id));
check((await store.listRequests({ open: true })).some((q) => q.leadId === "L7"), "...still open after he marks every notification read");
as("asha");
check((await store.listRequests()).length === 2, "asha reads her own requests (the hand-over and the demo)");
as("bilal");
check(!(await store.listRequests()).some((q) => q.askedBy === ID.asha), "bilal does not read asha's");
as(null);
await store.patchLead("L7", { demoId: "d7", demoSlug: "asha-found" });
check(Math.abs(Date.parse((await store.getLead("L7")).nextActionAt) - Date.now()) < 60000, "Mehdi links a demo to asha's lead: it is due now on her list");
check(!(await store.listRequests({ open: true })).some((q) => q.leadId === "L7"), "...and his open demo request closed by itself");
const hoReq = (await store.listRequests()).find((q) => q.leadId === "L1" && q.kind === "handoff");
as("ayesha");
e = await error(() => store.resolveRequest(hoReq.id, "accepted"));
check(e?.code === "42501", "an admin cannot close a request that went to Mehdi");
as(null);
e = await error(() => store.resolveRequest(hoReq.id, "no_action"));
check(e?.code === "22023", "a hand-over is 'accepted' or 'not real', not 'no action'");
await store.resolveRequest(hoReq.id, "accepted", "Real: wants an admissions page");
as("asha");
check((await store.notifications()).some((n) => n.kind === "resolved" && n.leadId === "L1" && /Mehdi Alam accepted your hand-over on Asha School One/.test(n.title)), "...she is told it was accepted");
const from = iso(Date.now() - 3600e3);
const mineStats = (await store.activityStats(from))[0];
check((await store.activityStats(from)).length === 1 && mineStats.memberId === ID.asha && mineStats.calls === 1 && mineStats.handoffs === 1 && mineStats.handoffsConfirmed === 1,
  "asha's numbers: only her own row (1 call, 1 hand-over, 1 accepted)", mineStats);
as(null);
const hers = (await store.activityStats(from)).find((x) => x.memberId === ID.asha);
check((await store.activityStats(from)).length === 7 && JSON.stringify(hers) === JSON.stringify(mineStats), "Mehdi's team numbers list everyone, and asha's row is identical to hers");
as("m_nobody");
check((await store.activityStats(from)).length === 0, "someone not in the team gets no numbers");

/* 3l. Reviews: about the line's writer, whatever was sent; a Fix tells them. */
as(null);
await store.addReview("E9", "fix", "Ask for the principal first");
const rv = (await store.listReviews())[0];
check(rv?.memberId === ID.asha && rv.reviewerId === "m_owner" && rv.leadId === "L1", "Mehdi reviews asha's call: the review is about the line's writer and lead", rv);
as("asha");
check((await store.listReviews()).length === 1 && (await store.notifications()).some((n) => n.kind === "review" && /Ask for the principal first/.test(n.title)), "asha reads the review of her work and is told");
e = await error(() => store.addReview("E9", "good"));
check(e?.code === "42501", "a member cannot review");
as("bilal");
check((await store.listReviews()).length === 0, "bilal does not read asha's reviews");

/* 3m. An admin's limits. */
as("ayesha");
check((await store.patchLead("L2", { notes: "admin note" })).notes === "admin note", "an admin edits any lead");
e = await error(() => store.patchLead("L2", { status: "won" }));
check(e?.code === "42501", "an admin cannot mark a lead Won");
e = await error(() => store.patchLead("L4", { status: "new" }));
check(e?.code === "42501", "an admin cannot lift Do not contact");
e = await error(() => store.deleteLead("L2"));
check(e?.message === "Only Mehdi deletes leads", "an admin cannot delete a lead");
e = await error(() => store.deactivateMember(ID.chetan, null));
check(e?.code === "42501", "an admin cannot switch anyone off");
check((await store.accessSummary(iso(Date.now() - DAY))).length === 0 && (await store.dbUsage()) === null, "an admin gets no access log and no database size");
as(null);
check((await store.patchLead("L4", { status: "new" })).status === "new", "Mehdi can lift Do not contact");

/* 3n. Switching off, and on. */
const chetanOpen = (await store.listLeads()).filter((l) => l.assigneeId === ID.chetan && M.isOpenStatus(l.status)).length;
check((await store.deactivateMember(ID.chetan, ID.bilal)) === chetanOpen && chetanOpen > 0, `owner switches chetan off; his ${chetanOpen} open leads move to bilal in the same step`);
as("chetan");
seen((await store.listLeads()).length === 0, "chetan sees 0 leads on his very next read");
e = await error(() => store.addEvent({ leadId: "L3", type: "note" }));
check(Boolean(e), "...and cannot write history any more");
who = await store.me();
check(who.role === null && who.reason === "deactivated" && who.displayName === "Chetan", "me() tells him why", who);
as(null);
e = await error(() => store.assignLeads(["L3"], ID.chetan));
check(e?.code === "22023", "nobody can assign to a switched-off person");
await store.reactivateMember(ID.chetan);
as("chetan");
seen((await store.listLeads()).length === 0 && (await store.me()).role === "member", "switched back on, he starts empty (his leads stayed with bilal)");
as(null);
await mk("UX", "Erin In Conversation", { phone: "+919840000003", status: "replied" });
await store.assignLeads(["UX"], ID.erin);
const erinNew = (await store.listLeads()).filter((l) => l.assigneeId === ID.erin && l.status === "new").map((l) => l.id);
await store.deactivateMember(ID.erin, null);
const after2 = Object.fromEntries((await store.listLeads()).map((l) => [l.id, l.assigneeId]));
check(after2.UX === "m_owner" && erinNew.length > 0 && erinNew.every((id) => after2[id] === null),
  "switching erin off with no one picked: New leads go back to the pool, the one in a conversation to Mehdi", { UX: after2.UX, erinNew });
check((await store.listEvents("UX")).some((x) => x.type === "assign" && /Assigned to Mehdi Alam \(was Erin\)/.test(x.detail)), "...and each moved lead's history says where it went");
check((await store.listMembers()).find((m) => m.id === ID.erin)?.active === false, "...her row (and so her name on history) stays");

/* 3o. The access log (Team > Access), the database size. */
as("bilal");
await store.logAccess("sign_in", undefined, { x: "y".repeat(400) });
await store.logAccess("sign_in", undefined, { x: "y".repeat(200) });
await store.logAccess("lead.view", "L2");
as("asha");
await store.logAccess("lead.view", "L2");
await store.logAccess("export", undefined, { x: "y".repeat(5000) });
as("m_nobody");
await store.logAccess("lead.view", "L2");
as(null);
const days = await store.accessSummary(iso(Date.now() - DAY));
const ashaDay = days.find((x) => x.memberId === ID.asha);
const bilalDay = days.find((x) => x.memberId === ID.bilal);
check(ashaDay?.flaggedClaims === 1 && ashaDay.suspicious === true && ashaDay.distinctLeadsViewed === 0 && ashaDay.exports === 0,
  "Access: asha 'viewing' bilal's lead is kept as a flagged claim (no lead counted), and her day is marked; the oversized log line was refused", ashaDay);
check(bilalDay?.leadViews === 1 && bilalDay.distinctLeadsViewed === 1, "Access: bilal's lead view is there", bilalDay);
check(bilalDay?.signIns === 1, "Access: a member's log detail over 300 bytes was refused, one under it kept", bilalDay);
check(!days.some((x) => x.memberId === "m_owner"), "Access lists the team, not Mehdi himself");
const audit = await store.listAudit(iso(Date.now() - DAY));
check(audit.some((a) => a.action === "lead.view" && a.actorId === ID.asha && a.leadId === null && a.detail.flag === "not_visible" && a.detail.claimedLeadId === "L2"),
  "the raw audit line keeps the claim flagged, never as a view of L2");
const emailFill = audit.find((a) => a.leadId === "L6" && a.detail.email);
check(emailFill?.detail.email === "(changed)", "audit: a contact change is logged without the value", emailFill);
check(audit.some((a) => a.action === "member.deactivate") && audit.some((a) => a.action === "member.add"), "audit: people added and switched off");
check((await store.dbUsage())?.crmBytes > 0, "Mehdi sees how much the CRM holds");

/* 3p. Password resets and invitations (local mode: no logins, the password is only shown). */
const pw = await store.resetPassword(ID.asha);
check(/^[A-Za-z2-9]{14}$/.test(pw), "Mehdi resets asha's password: a 14-character temporary one", pw);
as("asha");
check((await store.me()).mustChangePassword === true, "...she must set her own at the next sign-in");
as(null);
e = await error(() => store.resetPassword("m_owner"));
check(e?.code === "42501", "the owner's own password is never reset this way");
e = await error(() => store.resetPassword(ID.farah));
check(e?.code === "22023" && /no login linked/.test(e.message), "a person who never signed in cannot be reset", e?.message);
as("ayesha");
e = await error(() => store.resetPassword(ID.bilal));
check(e?.code === "42501", "an admin cannot reset passwords");
as(null);
e = await error(() => store.deleteInvite(ID.asha));
check(e?.code === "22023", "a person who has signed in cannot be deleted, only switched off");
await store.deleteInvite(ID.farah);
check(!(await store.listMembers()).some((m) => m.id === ID.farah), "an unused invitation can be removed");

/* 3q. Back to Mehdi: everything as today. */
as(null);
check((await store.listLeads()).length === total + 8, "Mehdi sees every lead, old and new (L7, L9 to L12, UC, UP, UX added since)", (await store.listLeads()).length);
await store.deleteLead("UC");
check(!(await store.getLead("UC")) && !raw().events.some((x) => x.leadId === "UC"), "Mehdi deletes a lead and its history");

/* ── Result ──────────────────────────────────────────────────────────────── */

const vis = failures.filter((f) => f.tag === "visibility");
console.log(`\n${passes} passed, ${failures.length} failed${NEGATIVE ? " (NEGATIVE MODE: canSeeLead answers true; the visibility checks must fail)" : ""}`);
if (NEGATIVE) {
  if (!vis.length) {
    console.log("NEGATIVE MODE DID NOT FAIL: no visibility check noticed canSeeLead letting everyone in.");
    process.exit(0);
  }
  console.log(`Negative mode failed as it must: ${vis.length} visibility checks failed.`);
  process.exit(1);
}
process.exit(failures.length ? 1 : 0);

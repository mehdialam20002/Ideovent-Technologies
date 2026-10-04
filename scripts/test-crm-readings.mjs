/**
 * THE CRM'S READINGS, against the live read-only test of 3 Oct 2026 (E:\myagency\_build\specs\crm-fixes-1004.md).
 *
 *   node scripts/test-crm-readings.mjs
 *
 * Bundles the real modules with esbuild (no browser, no network) and checks, on fictional leads built like the
 * ones the test found:
 *   A. a demo's "Sent" is the lead's own history (a message that carried its link), never the record's status
 *      "sent", which only means live (item 2: Dazzling read "Sent: link is live", never written to);
 *   B. an open before the link went to the lead (before any contact, or before the link) is not the lead's: it
 *      makes no lead Hot, counts as no Demo opened and shows no "since contact" (item 3: Dazzling's own-check open,
 *      Verma's opens of 27 Sep before the first e-mail of 28 Sep);
 *   C. one Hot everywhere: Leads (buildRows), Today (todayQueue), the Dashboard (computeMetrics, the badge) and Team >
 *      Performance (teamCards) list the same leads, a lead linked by its slug alone included (item 5: Hot 5 on Leads,
 *      1 on Today and the Dashboard, 0 on Performance);
 *   D. the funnel's "Replied or opened" counts the leads that opened their demo, so it is never below the Demo opened
 *      tile and list; the demo open rate is "X of Y demos sent" with Y from the history (item 4);
 *   E. the follow-up stage comes from the stages sent and their days, not from the number of e-mails (item 6, Verma:
 *      five e-mails in 40 minutes read "The closing e-mail has gone");
 *   F. Demos: "Created" falls back to preparedOn; the Status column says Sent or Live, not sent yet (items 2, 9);
 *   G. the town of an address for the filters and the breakdown, the address kept (item 10);
 *   H. the history: a line count that matches the list, no open id, an open before the link marked not counted
 *      (item 18);
 *   I. the owner's Me link under the rail and in the phone's More menu (item 17); Team > People's Last seen for the
 *      owner (item 14); Team > Performance counted in the browser for Mehdi and admins (item 8);
 *   J. the screens read these, from the source: More templates lists only the new ones (item 18), a new screen starts
 *      at the top (item 13), the dashboard's chart and 7-day table have room (items 11, 12).
 *
 * NEGATIVE: CRM_READINGS_NEGATIVE=1 puts back the readings before 4 Oct 2026 (every open of a lead's demo is the
 * lead's, a lead never contacted counts every open, the ladder counts e-mails, the City field is the town, a live
 * demo is Sent). The
 * checks tagged with a letter in EXPECT_NEGATIVE must then fail; the run exits 0 only when every one of them did.
 */
import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.CRM_READINGS_NEGATIVE);

function resolveTs(base) {
  for (const ext of ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  }
  return base;
}

/** Replaces `from` with `to` in a module's source, once, or stops the run: a negative mode must patch what it says. */
function patch(src, from, to, what) {
  if (!src.includes(from)) throw new Error(`negative mode: ${what} not found`);
  return src.replace(from, to);
}

const plugin = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^(\.\/client|@\/lib\/cms\/client)$/ }, () => ({ path: "fake-client", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({
      contents: "export const supabaseEnabled = false; export function supabase() { throw new Error('no Supabase in this test'); }",
      loader: "js",
    }));
    // Vite's ?raw imports (src/lib/pitch/reservedRoutes.ts reads App.tsx's text): the file's text, as Vite gives it.
    b.onResolve({ filter: /\?raw$/ }, (args) => {
      const p = args.path.replace(/\?raw$/, "");
      return { path: p.startsWith("@/") ? join(SRC, p.slice(2)) : resolve(args.resolveDir, p), namespace: "raw" };
    });
    b.onLoad({ filter: /.*/, namespace: "raw" }, (args) => ({ contents: `export default ${JSON.stringify(readFileSync(args.path, "utf8"))};`, loader: "js" }));
    b.onResolve({ filter: /^@\// }, (args) => ({ path: resolveTs(join(SRC, args.path.slice(2))) }));
    if (!NEGATIVE) return;
    b.onLoad({ filter: /admin[\\/]outreach[\\/]derive\.ts$/ }, (args) => {
      let src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      src = patch(src, "  if (!Number.isFinite(sent)) return [];\n  return allOpens(lead, opens, ctx).filter((o) => ms(o.at) >= sent);", "  void sent;\n  return allOpens(lead, opens, ctx);", "leadOpens' link rule");
      src = patch(src, "  const last = lastContactMs(lead, ctx.events);\n  if (!last) return [];", "  const last = lastContactMs(lead, ctx.events);", "opensSinceContact's never-contacted rule");
      return { contents: src, loader: "ts" };
    });
    b.onLoad({ filter: /admin[\\/]outreach[\\/]stages\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      return {
        contents: patch(src, "  const reached = ladderReached(lead, events, channel);",
          "  const reached = events.filter((e) => e.leadId === lead.id && e.type === \"sent\" && e.channel === channel && (!getTemplate(e.templateId)?.stage || getTemplate(e.templateId)?.stage === \"first\" || isLadder(getTemplate(e.templateId)?.stage || \"\"))).length;",
          "suggestFor's ladder reading"),
        loader: "ts",
      };
    });
    b.onLoad({ filter: /lib[\\/]outreach[\\/]city\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      return { contents: patch(src, "  if (parts.length === 1) return parts[0];", "  return raw;", "cityOf's split"), loader: "ts" };
    });
    b.onLoad({ filter: /crm[\\/]demos[\\/]model\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
      return { contents: patch(src, '  if (status === "sent") return sentAt ? "sent" : "live";', "  void sentAt;", "demoState's history rule"), loader: "ts" };
    });
  },
};

const out = join(tmpdir(), `ideovent-test-crm-readings-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: [
      `export * from "@/admin/outreach/derive";`,
      `export { computeMetrics, funnel, rates, demoRows, demoCreatedAt, countedOpens, breakdown } from "@/crm/metrics";`,
      `export { buildRows, VIEWS, viewOf, matchesFilters, EMPTY_FILTERS, sortRows } from "@/crm/leads/leadQuery";`,
      `export { todayQueue, nextStep } from "@/admin/outreach/compose";`,
      `export { teamCards } from "@/crm/performance/teamNumbers";`,
      `export { toItems, demoState, DEMO_STATE_TEXT, sortItems } from "@/crm/demos/model";`,
      `export { cityOf } from "@/lib/outreach/city";`,
      `export { historyLines, OPEN_NOT_COUNTED } from "@/admin/outreach/historyLines";`,
      `export { crmNav } from "@/crm/nav";`,
      `export { statsHere, periodStart } from "@/crm/performance/useActivityStats";`,
      `export { computeActivityStats } from "@/lib/outreach/access";`,
      `export { ladderReached, suggestFor } from "@/admin/outreach/stages";`,
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
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false, VITE_PUBLIC_URL: "https://www.ideovent.in" }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

/* ── Plumbing ────────────────────────────────────────────────────────────── */

let passes = 0;
const failures = [];
/** `tag`: the letter of a check the negative mode must break. */
function check(ok, message, got, tag) {
  if (ok) passes++;
  else {
    failures.push({ message, tag });
    console.log(`FAIL  ${message}${got !== undefined ? `\n        got: ${String(typeof got === "string" ? got : JSON.stringify(got)).slice(0, 500)}` : ""}`);
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ids = (list) => list.map((x) => x.lead?.id ?? x.id).sort();

/* ── The fictional CRM, built like the cases the live test found ─────────── */

const NOW = new Date("2026-10-04T08:00:00.000Z"); // 13:30 India time
const base = { createdAt: "2026-09-27T04:30:00.000Z", updatedAt: "2026-09-27T04:30:00.000Z" };

const demos = [
  // The Dazzling case: live by link, never sent, linked to its lead by the slug only, its one open a look at the live link.
  { id: "ds_live", slug: "example-dental-live", status: "sent", kind: "dental", instituteName: "Example Dental Live", preparedOn: "2026-09-30" },
  // The Verma case: its link went in the first e-mail of 28 Sep; three opens on 27 Sep came before it.
  { id: "ds_verma", slug: "example-coaching-verma", status: "sent", kind: "coaching", instituteName: "Example Coaching Verma", createdAt: "2026-09-26T10:00:00.000Z" },
  // A first WhatsApp without the link, then the link after a yes.
  { id: "ds_yes", slug: "example-classes-yes", status: "sent", kind: "coaching", instituteName: "Example Classes Yes", preparedOn: "2026-09-28" },
  // Linked by its slug only, sent and opened: Hot (Leads resolved the slug, Today and the Dashboard did not).
  { id: "ds_slug", slug: "example-school-slug", status: "sent", kind: "school", instituteName: "Example School Slug", preparedOn: "2026-09-29" },
  // A draft, and a live demo nobody tracks (no lead).
  { id: "ds_draft", slug: "example-draft", status: "draft", kind: "school", instituteName: "Example Draft", updatedAt: "2026-10-01T10:00:00.000Z" },
  { id: "ds_nolead", slug: "example-no-lead", status: "sent", kind: "school", instituteName: "Example No Lead", preparedOn: "2026-09-25" },
];

const leads = [
  { ...base, id: "L_live", instituteName: "Example Dental Live", kind: "dental", status: "new", demoSlug: "example-dental-live", city: "100 Feet Road, Sudarshan Nagar, Amritsar, Punjab" },
  { ...base, id: "L_verma", instituteName: "Example Coaching Verma", kind: "coaching", status: "contacted", demoId: "ds_verma", demoSlug: "example-coaching-verma",
    email: "office@verma.example", lastContactedAt: "2026-09-27T19:53:00.000Z", city: "Lawrence Road, Amritsar, Punjab 143001" },
  { ...base, id: "L_yes", instituteName: "Example Classes Yes", kind: "coaching", status: "contacted", demoId: "ds_yes", demoSlug: "example-classes-yes",
    phone: "+919000000001", lastContactedAt: "2026-10-02T06:00:00.000Z", city: "Rajouri Garden, New Delhi, Delhi 110027" },
  { ...base, id: "L_slug", instituteName: "Example School Slug", kind: "school", status: "contacted", demoSlug: "example-school-slug",
    phone: "+919000000002", lastContactedAt: "2026-10-01T06:00:00.000Z", city: "Sector 15, Noida, Uttar Pradesh 201301" },
  // The Holy Spirit case: Lost, never written to.
  { ...base, id: "L_lost", instituteName: "Example Convent Lost", kind: "school", status: "lost", lostReason: "Has a good site", city: "Lonikand, Pune, Maharashtra" },
];

const ev = (leadId, at, templateId, extra = {}) => ({ id: `e_${leadId}_${at}`, leadId, at, type: "sent", channel: templateId.startsWith("wa_") ? "whatsapp" : "email", templateId, ...extra });
const events = [
  // Verma, 28 Sep 2026 India time: the first e-mail three times, follow-ups 1 and 2, between 00:44 and 01:23.
  ev("L_verma", "2026-09-27T19:14:00.000Z", "em_first_new_coaching_en_link"),
  ev("L_verma", "2026-09-27T19:30:00.000Z", "em_first_new_coaching_en_link"),
  ev("L_verma", "2026-09-27T19:40:00.000Z", "em_first_new_coaching_en_link"),
  ev("L_verma", "2026-09-27T19:45:00.000Z", "em_fu1_any_en"),
  ev("L_verma", "2026-09-27T19:53:00.000Z", "em_fu2_any_en"),
  // Yes: a first WhatsApp without the link (the picture), then the link after their yes.
  ev("L_yes", "2026-09-30T06:00:00.000Z", "wa_first_new_coaching_en"),
  { id: "e_yes_reply", leadId: "L_yes", at: "2026-10-02T05:30:00.000Z", type: "replied", detail: "They replied." },
  ev("L_yes", "2026-10-02T06:00:00.000Z", "wa_after_reply_any_en"),
  // Slug: the link in a first WhatsApp With link.
  ev("L_slug", "2026-10-01T06:00:00.000Z", "wa_first_new_any_en_link"),
];

const op = (demoId, at, n = 0) => ({ id: `dso_${demoId}_${n}`, demoId, at });
const opens = [
  op("ds_live", "2026-10-03T05:46:00.000Z"), // 11:16 India time, 3 Oct: never contacted
  op("ds_verma", "2026-09-27T06:00:00.000Z", 1), op("ds_verma", "2026-09-27T07:00:00.000Z", 2), op("ds_verma", "2026-09-27T08:00:00.000Z", 3), // before the first e-mail
  op("ds_verma", "2026-10-02T10:00:00.000Z", 4), // after it: the lead's own
  op("ds_yes", "2026-10-01T09:00:00.000Z", 1), // after the first WhatsApp, before the link went
  op("ds_yes", "2026-10-02T07:00:00.000Z", 2), // after the link went
  op("ds_slug", "2026-10-02T09:00:00.000Z", 1),
  op("ds_nolead", "2026-10-03T09:00:00.000Z", 1),
];

const byId = new Map(demos.map((d) => [d.id, d]));
const bySlug = new Map(demos.map((d) => [d.slug, d]));
const demoForLead = (l) => (l.demoId && byId.get(l.demoId)) || (l.demoSlug ? bySlug.get(l.demoSlug) : undefined);
const ctx = { events, demoIdOf: (l) => demoForLead(l)?.id || l.demoId };
const L = Object.fromEntries(leads.map((l) => [l.id, l]));

/* ── A. Sent is the history ──────────────────────────────────────────────── */

check(M.linkSentAt("L_live", events) === undefined, "A: the Dazzling case: live by link and never written to, so never Sent", M.linkSentAt("L_live", events));
check(M.linkSentAt("L_verma", events) === "2026-09-27T19:14:00.000Z", "A: Sent is the FIRST message that carried the link (Verma's first e-mail)", M.linkSentAt("L_verma", events));
check(M.linkSentAt("L_yes", events) === "2026-10-02T06:00:00.000Z", "A: a first WhatsApp without the link is not Sent; the link after a yes is", M.linkSentAt("L_yes", events));
check(M.carriedDemoLink({ type: "sent", templateId: "wa_first_new_any_en_link" }) && !M.carriedDemoLink({ type: "sent", templateId: "wa_first_new_any_en" })
  && !M.carriedDemoLink({ type: "note", templateId: "wa_after_reply_any_en" }), "A: only a sent line whose message has {demoLink} carried it");

/* ── B. Opens before the link went are not the lead's ───────────────────── */

check(M.leadOpens(L.L_live, opens, ctx).length === 0 && M.allOpens(L.L_live, opens, ctx).length === 1,
  "B: the Dazzling case: its one open (a look at the live link before any message) is recorded but not the lead's", M.leadOpens(L.L_live, opens, ctx), "B");
check(M.opensSinceContact(L.L_live, opens, ctx).length === 0, "B: a lead never contacted has no open since contact", M.opensSinceContact(L.L_live, opens, ctx), "B");
check(same(M.leadOpens(L.L_verma, opens, ctx).map((o) => o.id), ["dso_ds_verma_4"]), "B: the Verma case: the three opens of 27 Sep, before the first e-mail, are not the lead's",
  M.leadOpens(L.L_verma, opens, ctx).map((o) => o.id), "B");
check(same(M.leadOpens(L.L_yes, opens, ctx).map((o) => o.id), ["dso_ds_yes_2"]), "B: an open after a first message WITHOUT the link, before the link went, is not the lead's",
  M.leadOpens(L.L_yes, opens, ctx).map((o) => o.id), "B");
check(M.contactedBefore(L.L_verma, events) && !M.contactedBefore(L.L_lost, events) && !M.contactedBefore(L.L_live, events),
  "B: contacted before is the history (a send, a call or a contact date), never the status (a Lost lead never written to)");

/* ── C. One Hot everywhere ───────────────────────────────────────────────── */

const hot = M.hotLeads(leads, opens, NOW, ctx);
const expectHot = ["L_slug", "L_verma", "L_yes"];
check(same(ids(hot), expectHot), "C: Hot is the leads whose own demo was opened since the last contact in 7 days: Verma, Yes and the slug-linked lead; never Dazzling", ids(hot), "C");
const rows = M.buildRows(leads, events, opens, demoForLead, NOW);
check(same(rows.filter((r) => r.hot).map((r) => r.lead.id).sort(), expectHot), "C: Leads (the table's Hot view) lists the same Hot leads", rows.filter((r) => r.hot).map((r) => r.lead.id), "C");
const q = M.todayQueue(leads, opens, NOW, ctx);
check(same(ids(q.hot), expectHot), "C: Today lists the same Hot leads", ids(q.hot), "C");
const m = M.computeMetrics({ leads, events, opens, demos, now: NOW, demoIdOf: ctx.demoIdOf });
check(same(ids(m.hot), expectHot), "C: the Dashboard (and the rail's badge) counts the same Hot leads", ids(m.hot), "C");
const cards = M.teamCards({ leads, events, opens, ownerId: "m_owner", unassigned: 0, waiting: 0, now: NOW, demoIdOf: ctx.demoIdOf });
check(same(cards.hotNotActed.map((l) => l.id).sort(), expectHot), "C: Team > Performance's Hot, not acted on counts the same leads (every lead, not only the team's), opened over 2 hours ago",
  cards.hotNotActed.map((l) => l.id), "C");
check(M.nextStep(L.L_verma, true, NOW).text === "Demo opened: call or message today" && M.nextStep(L.L_live, false, NOW).text === "Send the first message",
  "C: the next step says Hot only for a Hot lead");

/* ── D. The funnel, the tiles and the rate agree ─────────────────────────── */

const demoView = rows.filter(M.viewOf("demo").test).map((r) => r.lead.id).sort();
check(same(demoView, expectHot), "D: Demo opened (the tile and the list) is the leads that opened their own demo", demoView, "D");
const engaged = m.funnel.find((f) => f.stage === "engaged")?.count;
check(engaged === 3 && engaged >= demoView.length, "D: the funnel's Replied or opened counts the opened leads too (3: never below Demo opened)", m.funnel, "D");
check(m.rates.withDemo === 3 && m.rates.demoOpened === 3, "D: the demo open rate is X of Y demos SENT, Y from the history (3 sent, 3 opened)", m.rates, "D");
check(m.week.thisWeek.demoOpens === 3, "D: the 7-day table counts the leads' own opens (3), not looks at a live link", m.week.thisWeek, "D");
const all = M.countedOpens(leads, opens, ctx);
check(all.list.length === 3 && same([...all.opened].sort(), expectHot), "D: the counted opens are each lead's own, once");

/* ── E. The follow-up stage from what was sent (Verma) ──────────────────── */

const vs = M.suggestFor(L.L_verma, events, "email");
check(vs.stage === "follow_up_1" && !vs.done, "E: the Verma case: the first e-mail three times and two follow-ups in one night: the next is follow-up 1, not 'The closing e-mail has gone'", vs, "E");
check(M.ladderReached(L.L_verma, events, "email") === 1, "E: repeats count once and a follow-up the same day as the step before is not the next step", M.ladderReached(L.L_verma, events, "email"), "E");
{
  const lead = { ...base, id: "L_cad", kind: "coaching", status: "contacted", email: "a@b.example" };
  const day = (d, t = "06:00:00") => `2026-09-${String(d).padStart(2, "0")}T${t}.000Z`;
  const cad = [ev("L_cad", day(10), "em_first_new_coaching_en"), ev("L_cad", day(14), "em_fu1_any_en"), ev("L_cad", day(19), "em_fu2_any_en")];
  check(M.suggestFor(lead, cad, "email").stage === "follow_up_3" && !M.suggestFor(lead, cad, "email").done, "E: first, follow-up 1 on day 4 and 2 on day 9: the closing e-mail is next");
  const closed = [...cad, ev("L_cad", day(26), "em_fu3_any_en")];
  check(/closing e-mail has gone/.test(M.suggestFor(lead, closed, "email").done || ""), "E: once the closing e-mail actually went, nothing more on e-mail");
  const wa = [ev("L_cad", day(10), "wa_first_new_coaching_en"), ev("L_cad", day(14), "wa_fu1_en")];
  check(/one WhatsApp follow-up have gone/.test(M.suggestFor(lead, wa, "whatsapp").done || ""), "E: WhatsApp's one follow-up, sent on a later day: nothing more on WhatsApp");
  check(M.suggestFor(lead, [ev("L_cad", day(10), "wa_first_new_coaching_en"), ev("L_cad", day(10, "09:00:00"), "wa_fu1_en")], "whatsapp").stage === "follow_up_1",
    "E: a WhatsApp follow-up logged the same day as the first message is not the follow-up", undefined, "E");
  /* Lines from before the templates carry no stage: the first message, then (on a later day) the next step. */
  const bare = (d, t) => ({ id: `b_${d}_${t || ""}`, leadId: "L_cad", type: "sent", channel: "whatsapp", at: day(d, t) });
  check(/one WhatsApp follow-up have gone/.test(M.suggestFor(lead, [bare(10), bare(11)], "whatsapp").done || ""), "E: two sends with no stage on two days: the first message and the follow-up went");
  check(M.suggestFor(lead, [bare(10), bare(10, "10:00:00")], "whatsapp").stage === "follow_up_1" && !M.suggestFor(lead, [bare(10), bare(10, "10:00:00")], "whatsapp").done,
    "E: two sends with no stage on one day: only the first message counts");
}

/* ── F. Demos: Created and Sent ──────────────────────────────────────────── */

const items = M.toItems(m.demos, []);
const it = (id) => items.find((i) => i.demo.id === id);
check(it("ds_live")?.created === "2026-09-30" && it("ds_yes")?.created === "2026-09-28" && it("ds_verma")?.created === "2026-09-26T10:00:00.000Z" && it("ds_draft")?.created === "2026-10-01T10:00:00.000Z",
  "F: Created is createdAt, else updatedAt, else preparedOn (the imported demos carry only that)", items.map((i) => [i.demo.id, i.created]));
check(it("ds_live")?.state === "live" && M.DEMO_STATE_TEXT.live === "Live, not sent yet" && it("ds_verma")?.state === "sent" && it("ds_draft")?.state === "draft" && it("ds_nolead")?.state === "live",
  "F: the Status column says Sent only when the lead's history shows the link went; else Live, not sent yet", items.map((i) => [i.demo.id, i.state]), "F");
check(it("ds_live")?.opens === 0 && it("ds_live")?.allOpens === 1 && it("ds_verma")?.opens === 1 && it("ds_verma")?.allOpens === 4 && it("ds_nolead")?.opens === 1,
  "F: a demo's Opens are its lead's own (every open when no lead is linked); the rest stay recorded", items.map((i) => [i.demo.id, i.opens, i.allOpens]), "F");
check(it("ds_live")?.freshOpens === 0 && it("ds_verma")?.freshOpens === 1, "F: Since contact on Demos is the lead's own opens after the last contact", undefined, "F");
const sorted = M.sortItems(items, { key: "created", dir: "desc" }).map((i) => i.demo.id);
check(sorted[0] === "ds_draft" && sorted[sorted.length - 1] === "ds_nolead", "F: sorting by Created uses the same date (preparedOn included)", sorted);

/* ── G. The town of an address ───────────────────────────────────────────── */

const towns = [
  ["100 Feet Road, Sudarshan Nagar, Amritsar, Punjab", "Amritsar"],
  ["Lawrence Road, Amritsar, Punjab 143001", "Amritsar"],
  ["Rajouri Garden, New Delhi, Delhi 110027", "New Delhi"],
  ["Sector 15, Noida, Uttar Pradesh 201301", "Noida"],
  ["Lonikand, Pune, Maharashtra", "Pune"],
  ["Gurugram, Haryana 122001, India", "Gurugram"],
  ["Delhi, India", "Delhi"],
  ["Amritsar", "Amritsar"],
  ["", ""],
];
for (const [city, town] of towns) check(M.cityOf({ city }) === town, `G: the town of "${city}" is "${town}"`, M.cityOf({ city }), "G");
check(M.cityOf({ city: "Ghaziabad, Up" }) === "Ghaziabad" && M.cityOf({ city: "Bhiwadi, Alwar", state: "Alwar" }) === "Bhiwadi", "G: a short state or the lead's own state is left out");
const byCity = M.breakdown(leads, events, "city");
check(byCity.find((r) => r.label === "Amritsar")?.total === 2 && !byCity.some((r) => /Road|Nagar/.test(r.label)), "G: the breakdown by city has one row per town (two Amritsar addresses, one row)", byCity.map((r) => [r.label, r.total]), "G");
const amritsar = rows.filter((r) => M.matchesFilters(r, { ...M.EMPTY_FILTERS, city: "Amritsar" })).map((r) => r.lead.id).sort();
check(same(amritsar, ["L_live", "L_verma"]), "G: the City filter Amritsar finds both leads whose address is in Amritsar", amritsar, "G");
check(L.L_live.city === "100 Feet Road, Sudarshan Nagar, Amritsar, Punjab", "G: the address itself is kept on the lead");
const qSearch = rows.filter((r) => M.matchesFilters(r, { ...M.EMPTY_FILTERS, q: "sudarshan" })).map((r) => r.lead.id);
check(same(qSearch, ["L_live"]), "G: the search box still finds a lead by any word of its address", qSearch);

/* ── H. The history ──────────────────────────────────────────────────────── */

const hLive = M.historyLines(L.L_live, events, opens, ctx);
check(hLive.length === 2 && hLive.some((l) => l.kind === "created") && hLive.some((l) => l.kind === "open_uncounted" && l.text === M.OPEN_NOT_COUNTED),
  "H: the Dazzling case: two lines (its open, marked not counted, and Lead added), so the fold never says 0 entries over a line", hLive.map((l) => [l.kind, l.text]), "H");
{
  const logged = { id: "oe_open_dso_ds_verma_4", leadId: "L_verma", at: "2026-10-02T10:00:00.000Z", type: "demo_opened", detail: "Demo opened (1 open since last contact) [dso_ds_verma_4]" };
  const hv = M.historyLines(L.L_verma, [...events, logged], opens, ctx);
  check(!hv.some((l) => /\[dso_/.test(l.text)) && hv.some((l) => l.text === "Demo opened (1 open since last contact)"), "H: a Demo opened line never shows the open's id", hv.map((l) => l.text));
  check(hv.filter((l) => l.kind === "open").length === 0 && hv.filter((l) => l.kind === "open_uncounted").length === 3 && hv.length === 5 + 1 + 3 + 1,
    "H: the open the line names is listed once; the three opens before the first e-mail are marked not counted", hv.map((l) => [l.kind, l.text]), "H");
}

/* ── I. Me, Last seen, Performance ───────────────────────────────────────── */

const ownerNav = M.crmNav({ role: "owner", legacy: false });
check(ownerNav.railFooter.some((i) => i.label === "Me") && ownerNav.moreFooter.some((i) => i.label === "Me") && !ownerNav.rail.some((i) => i.label === "Me"),
  "I: the owner's Me sits under the rail's list and in the phone's More menu", { rail: ownerNav.rail.map((i) => i.label), footer: ownerNav.railFooter.map((i) => i.label) });
check(M.crmNav({ role: "owner", legacy: true }).railFooter.some((i) => i.label === "Me") && M.crmNav({ role: "admin", legacy: false }).railFooter.some((i) => i.label === "Me")
  && !M.crmNav({ role: "member", legacy: false }).railFooter.length, "I: Me under the rail for the owner (legacy too) and admins; a member has it in the list");
{
  const me = { legacy: false, memberId: "m_owner", role: "owner", displayName: "Owner", viewAll: true, canAddLeads: true, mayColdCall: true, waDailyLimit: null, newLeadCap: 0, targets: {}, senderChecked: true, mustChangePassword: false };
  const members = [
    { id: "m_owner", role: "owner", displayName: "Owner", active: true, userId: "u1", createdAt: "2026-10-01T00:00:00.000Z", lastSeenAt: "2026-10-04T07:59:00.000Z", viewAll: true, canAddLeads: true, mayColdCall: true, waDailyLimit: null, newLeadCap: 0, targets: {}, mustChangePassword: false },
    { id: "m_asha", role: "member", displayName: "Asha", active: true, userId: "u2", createdAt: "2026-10-01T00:00:00.000Z", viewAll: false, canAddLeads: false, mayColdCall: false, waDailyLimit: 25, newLeadCap: 40, targets: {}, mustChangePassword: false },
  ];
  const evs = [
    { id: "s1", leadId: "L_yes", at: "2026-10-04T05:00:00.000Z", type: "sent", channel: "whatsapp", templateId: "wa_first_new_any_en", stage: "first", actorId: "m_asha" },
    { id: "s2", leadId: "L_yes", at: "2026-10-01T05:00:00.000Z", type: "sent", channel: "email", templateId: "em_first_new_any_en", stage: "first", actorId: "m_owner" },
  ];
  const periods = ["today", "7d", "14d", "month"];
  const here = M.statsHere(periods, { me, members, leads, events: evs, requests: [], now: NOW });
  const direct = M.computeActivityStats({ me, members, leads, events: evs, requests: [], from: M.periodStart("today", NOW), to: new Date(NOW.getTime() + 5 * 60_000), now: NOW });
  check(periods.every((p) => Array.isArray(here[p]) && here[p].length === 2) && same(here.today, direct),
    "I: Team > Performance counted in the browser for Mehdi and admins: every period, the same numbers as computeActivityStats (no crm_activity_stats request)", here.today);
  check(here.today.find((r) => r.memberId === "m_asha")?.firstWhatsapp === 1 && here["7d"].find((r) => r.memberId === "m_owner")?.firstEmail === 1 && here.today.find((r) => r.memberId === "m_owner")?.firstEmail === 0,
    "I: each period counts its own window (today, last 7 days)");
  check(here.today.find((r) => r.memberId === "m_owner")?.lastSeenAt === "2026-10-04T07:59:00.000Z", "I: the owner's last seen comes through like anyone's");
}
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/\r\n/g, "\n");
check(!/owner \? "-" : seenLabel/.test(read("crm/team/PeopleTab.tsx")) && /<Stat label="Last seen"[^>]*>\{seenLabel\(m\.lastSeenAt, now\)\}<\/Stat>/.test(read("crm/team/PeopleTab.tsx")),
  "I: Team > People shows Last seen for the owner's row too (it used to be a dash)");
check(/useActivityStats\(FETCH, \{ members \}\)/.test(read("crm/performance/TeamPerformance.tsx")), "I: Team > Performance hands the team's rows over, so it is counted in the browser");
{
  const me = read("crm/me/CrmMePage.tsx");
  const phone = read("crm/me/PhoneSetup.tsx");
  check(/data-testid="me-sender-owner"/.test(me) && /owner \? \(/.test(me) && /data-testid="phone-setup-owner"/.test(phone) && /\{!owner && \(\s*<li>\s*<b>Send a test to Mehdi\.<\/b>/.test(phone),
    "I: the owner's Me page has its own sender panel and phone card: no 'Send a test to Mehdi', no 'Mehdi adds it' about himself");
}

/* ── J. The screens read these (source) ──────────────────────────────────── */

{
  const panel = read("admin/outreach/ComposePanel.tsx");
  check(/const more = ranked\.filter\(\(t\) => !short\.includes\(t\)\);/.test(panel) && /More templates for this stage \(\{more\.length\}\)/.test(panel) && /<TemplateList items=\{more\}/.test(panel),
    "J: More templates lists only the templates not shown above, and counts those (it said 10 over the 3 above)");
  check(/contactedBefore: contactedBefore\(lead, events\)/.test(panel), "J: the compose passes contacted-before from the history to the engine");
  const layout = read("crm/CrmLayout.tsx");
  check(/useLayoutEffect\(\(\) => \{\s*const el = mainRef\.current;\s*if \(el\) el\.scrollTop = 0;\s*\}, \[pathname\]\);/.test(layout) && /<main ref=\{mainRef\} id="crm-main"/.test(layout),
    "J: a new screen starts at its top (the CRM's scroll area resets on every new address)");
  check(/margin=\{\{ top: 8, right: 18, bottom: 0, left: 0 \}\}/.test(read("crm/dashboard/ActivityChart.tsx")), "J: the activity chart's y axis has its own room (no negative left margin)");
  check(/overflow-x-auto/.test(read("crm/dashboard/WeekTable.tsx")) && /2xl:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(0,1fr\)\]/.test(read("crm/dashboard/CrmDashboard.tsx")),
    "J: the 7-day table never clips: side by side only from 2xl, and it scrolls if a card is narrower");
  const card = read("crm/lead/LeadDemoCard.tsx");
  check(/Live, not sent yet/.test(card) && /Sent \$\{fmtDate\(sentAt\)\}, link is live/.test(card) && /manages && status === "sent" \? \(\s*<a className=\{crm\.btn\} href=\{teamDemoUrl\(demo\.slug\)\}/.test(card),
    "J: the lead's demo card says Sent (date) or Live, not sent yet, and Mehdi's Open on a live demo is a team preview");
}

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log(`test-crm-readings: ${passes} passed, ${failures.length} failed${NEGATIVE ? " (negative mode: the readings before 4 Oct 2026)" : ""}`);
if (NEGATIVE) {
  const EXPECT_NEGATIVE = ["B", "C", "D", "E", "F", "G", "H"];
  const missed = EXPECT_NEGATIVE.filter((t) => !failures.some((f) => f.tag === t));
  if (missed.length) {
    console.log(`NEGATIVE MODE FAILED: no failure in ${missed.join(", ")}: those checks do not measure what they claim.`);
    process.exit(1);
  }
  console.log("Negative mode failed as it must: every letter caught the old readings.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);

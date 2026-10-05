/**
 * WHAT IS DUE, AND WHEN (client-process-spec 11).
 *
 * Every date is an India date. Working days are Monday to Saturday. A rule
 * whose anchor is missing gives no date ("no date yet"). The tasks of one
 * project come from its open items (stage 4's due column), the ladders of
 * 11.3 (proposal, advance, launch payment, waiting on the client, content rows,
 * review windows, the weekly update, the support window, a split advance's
 * part 2, proforma validity, TDS, after the exit) and, at the client level,
 * the care plan renewal ladder and the domain, hosting and SSL dates.
 *
 * Today shows the tasks due today or late: money late first, then other late
 * tasks (oldest first), then today's. A task can be snoozed a day (stored on
 * the project or the client). Health (11.4) and the "Next:" line come from the
 * same functions, so the board, the list, the client page and the dashboard
 * agree. Pure; no I/O.
 */
import { addDays, addWorkingDays, daysBetween, fmtDate, indiaDate, isWorkingDay, weekdayOf } from "./numbering";
import { counts, docBalance, findLaunchInvoice, isPaid, overdueDocs } from "./money";
import {
  advanceProformas, approvalOf, creditDate, entryOf, gateApplies, hasPlan, isDone, ITEM_BY_ID, itemState, launchInvoice, nextItem, notNeededReason, openIssues,
  pathOf, proformaRefusals, proposalOpen, s1s2Recent, sendsOf, STAGE_BY_ID, supportWindow, type ProjectCtx,
} from "./stages";
import type { MessageAbout } from "./compose";
import type { CrmClient, CrmDocument, CrmPayment, CrmProject, DocKind, Hold, Milestone } from "./types";

export type TaskAction =
  | { type: "message"; templateId: string; alsoTemplateId?: string; about?: MessageAbout }
  | { type: "item"; itemId: string }
  | { type: "document"; kind: DocKind; milestone?: Milestone; part?: 1 | 2 }
  | { type: "payment"; docId?: string }
  | { type: "deemed"; what: string; notice: string; roundN?: number }
  | { type: "hold"; hold: Hold }
  | { type: "note" };

export interface ClientTask {
  /** Stable, for snoozing: "<project or client id>:<key>". */
  id: string;
  clientId: string;
  projectId: string | null;
  label: string;
  due: string;
  money: boolean;
  /** Who acts: Ideovent, or a chase of the client. */
  who: "us" | "client";
  action: TaskAction;
  /** The item it belongs to, when there is one (the client page highlights it). */
  itemId?: string;
}

const iso = (d?: string | null) => (d ? d.slice(0, 10) : null);
const plus = (d: string | null | undefined, n: number) => (d ? addDays(d.slice(0, 10), n) : null);
const plusW = (d: string | null | undefined, n: number) => (d ? addWorkingDays(d.slice(0, 10), n) : null);

/* ── Anchors (11.1) ─────────────────────────────────────────────────────── */

export function anchors(c: ProjectCtx) {
  const p = c.project;
  const goLive = p.dates.goLive || p.dates.goLiveTarget || null;
  const win = supportWindow(p);
  const lastRound = [...(p.rounds || [])].filter((r) => r.sentAt).sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""))[0];
  const notice = p.dates.reviewNotice || plus(p.dates.goLiveTarget, -14);
  const inv = launchInvoice(c);
  const invPay = inv ? c.payments.filter((x) => x.status === "recorded" && x.againstDoc === inv.id).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn))[0] : null;
  return {
    call: iso(p.dates.call),
    sent: iso(p.dates.proposalSent),
    yes: iso(p.dates.yes),
    paperwork: iso(p.dates.paperworkSent),
    credit: creditDate(c),
    kickoff: iso(p.dates.kickoff),
    cutoff: iso(p.dates.contentCutoff),
    notice,
    accepted: iso(p.dates.accepted),
    goLiveTarget: iso(p.dates.goLiveTarget),
    goLive,
    start: win?.start || null,
    end: win?.end || null,
    approval: iso(p.dates.designApproved),
    lastRound: lastRound?.sentAt ? indiaDate(lastRound.sentAt) : null,
    training: iso(p.training?.at),
    handover: iso(p.dates.handover),
    invoiceDay: inv?.issuedOn || null,
    launchCredit: inv && isPaid(inv, c.docs, c.payments) ? invPay?.receivedOn || null : null,
  };
}

/** The due date of an item (stage 4's "due" column); null: no date yet. */
export function itemDue(c: ProjectCtx, itemId: string): string | null {
  const a = anchors(c);
  const corrections = c.project.notesByKey?.corrections;
  switch (itemId) {
    case "p_brief": case "p_scope": case "p_hold": return a.call;
    case "p_legal": case "p_quote": case "p_designed": case "p_sent": return plus(a.call, 1);
    case "p_archive": return a.sent;
    case "p_d1": return plus(a.sent, 1);
    case "p_d3": return plus(a.sent, 3);
    case "p_d5": return plus(a.sent, 5);
    case "p_d7": return plus(a.sent, 7);
    case "p_d14": return plus(a.sent, 14);
    case "p_d21": return plus(a.sent, 21);
    case "p_d30": return plus(a.sent, 30);
    case "a_yes": case "a_billing": case "a_four": case "a_partner": case "a_nda": case "a_pi": case "a_paperwork": return a.yes;
    case "a_optout": return a.paperwork;
    case "a_receipt": case "w_welcome": case "w_receipt": case "w_folder": case "w_repo": case "w_staging": case "w_vault": case "w_pack": case "w_docs": return a.credit;
    case "w_kickoff": return plus(a.credit, 2);
    case "w_form": return plus(a.kickoff, -1);
    case "k_call": case "k_A": case "k_D": case "k_E": case "k_B": case "k_C": case "k_stuck": case "k_summary": return a.kickoff;
    case "d_close": case "d_files": case "b_start": return a.approval;
    case "b_features": case "b_phone": case "q_qa": return plus(a.notice, -1);
    case "q_care": return plus(a.goLiveTarget, -14);
    case "q_accuracy": return plus(a.goLiveTarget, -14);
    case "q_fix": return corrections ? plus(corrections, 1) : null;
    case "q_invoice": return a.accepted;
    case "l_proposed": return a.invoiceDay;
    case "l_receipt": return a.launchCredit;
    case "l_ttl": return plus(a.goLive, -2);
    case "l_before": return plus(a.goLive, -1);
    case "l_cutover": case "l_verify": case "l_live": return a.goLive;
    case "l_t24": return plus(a.goLive, 1);
    case "h_access": case "h_2fa": case "h_source": case "h_training": case "h_doc": case "h_wa": case "h_care": return plus(c.project.dates.goLive, 3);
    case "h_rotate": return plus(c.project.dates.goLive, 7);
    case "h_guide": return plus(a.training, 1);
    case "h_signed": return plus(a.handover, 7);
    case "s_day7": case "s_check": return plus(a.start, 7);
    case "s_testimonial": return clearDay(c, plus(c.project.dates.goLive, 1));
    case "s_review": {
      const approved = c.client.testimonial?.status === "permission_on_file" && c.client.testimonial.consentAt ? plus(c.client.testimonial.consentAt, 1) : null;
      return clearDay(c, approved || plus(c.project.dates.goLive, 7));
    }
    case "s_referral": {
      const review = sendsOf(c, ["cp_feedback_review_wa_hi", "cp_feedback_review_em_en"])[0];
      const earliest = plus(c.project.dates.goLive, 10);
      const after = review ? plus(indiaDate(review.at), 3) : null;
      return clearDay(c, after && earliest ? (after > earliest ? after : earliest) : earliest);
    }
    case "s_day25": return plus(a.end, -5);
    case "s_close": case "s_access": return a.end;
    case "x_letter": case "x_access": case "x_held": case "x_archive": return a.end;
    case "ca_sign": case "ca_terms": case "ca_baseline": case "ca_dates": return a.end;
    case "ca_invoice": return c.client.carePlan?.startOn ? plus(c.client.carePlan.startOn, -7) : a.end;
    default: return null;
  }
}

/**
 * The first day on or after `from` that is clear for a feedback ask: no S1 or S2 issue open, none closed
 * in the 7 days before, and no invoice reminder or payment chase due that day (Testimonial-Request-Kit
 * section 1; WHATSAPP-PLAYBOOK section 3.9). null while an S1 or S2 is open.
 */
export function clearDay(c: ProjectCtx, from: string | null): string | null {
  if (!from) return null;
  if (openIssues(c.project, ["S1", "S2"]).length) return null;
  const moneyDays = new Set(moneyTasks(c).map((t) => t.due));
  let d = from;
  for (let i = 0; i < 60; i++) {
    if (!s1s2Recent(c.project, d) && !moneyDays.has(d)) return d;
    d = addDays(d, 1);
  }
  return d;
}

/* ── The ladders ────────────────────────────────────────────────────────── */

const sentFor = (c: ProjectCtx, ids: string[], doc?: string) => sendsOf(c, ids, doc).length > 0;

function task(c: ProjectCtx, key: string, label: string, due: string | null, action: TaskAction, opts: { money?: boolean; who?: "us" | "client"; itemId?: string } = {}): ClientTask | null {
  if (!due) return null;
  return { id: `${c.project.id}:${key}`, clientId: c.client.id, projectId: c.project.id, label, due, money: Boolean(opts.money), who: opts.who || "us", action, itemId: opts.itemId };
}

/** The payment ladders of one project: the advance (A1 to A3), a split advance's part 2, the launch invoice (M1 to M3), a change request's one reminder. */
export function moneyTasks(c: ProjectCtx): ClientTask[] {
  const out: (ClientTask | null)[] = [];
  const p = c.project;
  if (p.outcome) return [];
  const pis = advanceProformas(c);
  for (const d of c.docs.filter((x) => x.status === "issued" && ["proforma", "invoice"].includes(x.kind) && x.dueOn && counts(x, c.docs) && docBalance(x, c.docs, c.payments) > 0)) {
    const due = d.dueOn!;
    const n = d.number || "";
    const isAdvance = pis.some((x) => x.id === d.id);
    const part2 = isAdvance && d.data?.part === 2;
    const about = { docId: d.id };
    if (isAdvance && !part2) {
      if (!sentFor(c, ["cp_agreement_a1_wa_hi"], d.id)) out.push(task(c, `A1:${d.id}`, `A1: the advance ${n} is past due (WhatsApp, then e-mail)`, plus(due, 1), { type: "message", templateId: "cp_agreement_a1_wa_hi", alsoTemplateId: "cp_invoice_m1_em_en", about }, { money: true, who: "client" }));
      else if (!sentFor(c, ["cp_agreement_a2_em_en"], d.id)) out.push(task(c, `A2:${d.id}`, `A2: holding the start date (${n})`, plus(due, 6), { type: "message", templateId: "cp_agreement_a2_em_en", about }, { money: true, who: "client" }));
      else if (!sentFor(c, ["cp_agreement_a3_em_en"], d.id)) out.push(task(c, `A3:${d.id}`, `A3: should I release the slot? (${n})`, plus(due, 10), { type: "message", templateId: "cp_agreement_a3_em_en", about }, { money: true, who: "client" }));
      else if (p.hold !== "no_advance") out.push(task(c, `release:${d.id}`, "Release the slot: hold \"no advance\"", plus(due, 10), { type: "hold", hold: "no_advance" }, { money: true, who: "client" }));
      if (d.validUntil && d.validUntil < c.today) out.push(task(c, `expired:${d.id}`, `Proforma ${n} expired on ${fmtDate(d.validUntil)}: reissue it before asking again`, d.validUntil, { type: "note" }, { money: true }));
      continue;
    }
    if (d.milestone === "CHANGE_REQUEST") {
      if (!sentFor(c, ["cp_invoice_m1_em_en"], d.id)) out.push(task(c, `CR1:${d.id}`, `Change request advance ${n} unpaid: one reminder, then it lapses`, plus(due, 1), { type: "message", templateId: "cp_invoice_m1_em_en", about }, { money: true, who: "client" }));
      continue;
    }
    if (d.milestone === "AMC") continue;
    // The launch invoice (and a split advance's part 2, chased without A2 or A3: work has started).
    const m1 = part2 ? "cp_agreement_a1_wa_hi" : "cp_launch_m1_wa_hi";
    if (!sentFor(c, [m1, "cp_invoice_m1_em_en"], d.id)) out.push(task(c, `M1:${d.id}`, `${part2 ? "A1" : "M1"}: ${n} is past due (WhatsApp, then e-mail)`, plus(due, 1), { type: "message", templateId: m1, alsoTemplateId: "cp_invoice_m1_em_en", about }, { money: true, who: "client" }));
    else if (!sentFor(c, ["cp_launch_m2_em_en"], d.id)) out.push(task(c, `M2:${d.id}`, `M2: ${n}, ${daysBetween(due, plus(due, 7)!)} days overdue, stop date ${fmtDate(plus(due, 10))}`, plus(due, 7), { type: "message", templateId: "cp_launch_m2_em_en", alsoTemplateId: "cp_launch_m2_wa_hi", about }, { money: true, who: "client" }));
    else if (!sentFor(c, ["cp_launch_pause_em_en"], d.id)) out.push(task(c, `PAUSE:${d.id}`, `The stop date: the work-pause notice for ${n}, by e-mail and post`, plus(due, 10), { type: "message", templateId: "cp_launch_pause_em_en", about }, { money: true, who: "client" }));
    else if (!sentFor(c, ["cp_launch_m3_em_en"], d.id)) out.push(task(c, `M3:${d.id}`, `M3: final notice for ${n}, to the signatory, by e-mail and post`, plus(due, 15), { type: "message", templateId: "cp_launch_m3_em_en", about }, { money: true, who: "client" }));
  }
  // A split advance's part 2: issue it on its agreed date (never when the screen would refuse it: part 2 already
  // standing, part 1 asking for the whole advance, or the launch invoice billing the project; stages.ts proformaRefusals).
  if (p.splitAdvance && pis.length && !proformaRefusals(c, { kind: "proforma", milestone: "ADVANCE_50", data: { part: 2 } }).length) {
    out.push(task(c, "split2", "Issue proforma part 2 of the advance (its agreed date)", p.splitAdvance.part2DueOn, { type: "document", kind: "proforma", milestone: "ADVANCE_50", part: 2 }, { money: true }));
  }
  return out.filter((t): t is ClientTask => Boolean(t));
}

/** The waiting ladder (SOP-09 section 3): 3 working days, day 10, day 15, day 45, from when it was asked for. */
function waitingTasks(c: ProjectCtx): ClientTask[] {
  const out: (ClientTask | null)[] = [];
  const stage = STAGE_BY_ID[c.project.stage];
  for (const item of stage.items) {
    if (!item.waitsFrom || itemState(c, item).state !== "open") continue;
    const since = c.project.dates[item.waitsFrom];
    if (!since) continue;
    out.push(...waitLadder(c, `wait:${item.id}`, item.label, since, item.id));
  }
  return out.filter((t): t is ClientTask => Boolean(t));
}

function waitLadder(c: ProjectCtx, key: string, label: string, since: string, itemId?: string): (ClientTask | null)[] {
  const about = { item: { key, label: shortLabel(label), since } };
  const sent = (t: string) => (c.project.sends || []).some((s) => s.t === t && s.doc === `item:${key}`);
  const out: (ClientTask | null)[] = [];
  if (!sent("cp_chase_d3_wa_hi")) out.push(task(c, `${key}:d3`, `Waiting 3 working days: ${shortLabel(label)} (the escalation contact)`, plusW(since, 3), { type: "message", templateId: "cp_chase_d3_wa_hi", about }, { who: "client", itemId }));
  else if (!sent("cp_chase_d10_em_en")) out.push(task(c, `${key}:d10`, `Waiting 10 days: ${shortLabel(label)}`, plus(since, 10), { type: "message", templateId: "cp_chase_d10_em_en", about }, { who: "client", itemId }));
  else if (!sent("cp_chase_d15_wa_hi")) out.push(task(c, `${key}:d15`, `Waiting 15 days: ${shortLabel(label)} (cl. 4.4: other work may be scheduled)`, plus(since, 15), { type: "message", templateId: "cp_chase_d15_wa_hi", about }, { who: "client", itemId }));
  else if (!sent("cp_chase_d45_em_en")) out.push(task(c, `${key}:d45`, `Waiting 45 days: ${shortLabel(label)} (cl. 4.5: invoice the work to date; by post too)`, plus(since, 46), { type: "message", templateId: "cp_chase_d45_em_en", about }, { who: "client", itemId }));
  return out;
}

const shortLabel = (s: string) => s.split(/[:(]/)[0].replace(/["\s]+$/, "").trim();

/** The content tracker's ladder (Content-Collection-Checklist section 2), per row, until the cut-off. */
function contentTasks(c: ProjectCtx): ClientTask[] {
  const out: (ClientTask | null)[] = [];
  const p = c.project;
  if (!p.dates.kickoff || stageAt(p, "kickoff") < 0) return [];
  for (const r of p.content || []) {
    if (!r.due || ["delivered", "approved", "not_available"].includes(r.status)) continue;
    const key = `content:${r.id}`;
    const sent = (t: string) => (p.sends || []).some((s) => s.t === t && s.doc === `item:${key}`);
    if (r.due <= c.today && !sent("cp_chase_d3_wa_hi")) out.push(task(c, `${key}:due`, `Content outstanding: ${r.label}${r.owner ? ` (${r.owner})` : ""}`, r.due, { type: "note" }, { who: "client" }));
    if (!sent("cp_chase_d3_wa_hi")) out.push(task(c, `${key}:d3`, `Content 3 working days late: ${r.label}, to its owner, copied to the main contact`, plusW(r.due, 3), { type: "message", templateId: "cp_chase_d3_wa_hi", about: { item: { key, label: r.label, since: r.due } } }, { who: "client" }));
    else if (!(p.goLiveHistory || []).some((h) => h.cause === "client" && indiaDate(h.at) >= r.due!)) out.push(task(c, `${key}:d7`, `Content 7 working days late: ${r.label}. Issue the revised go-live date in writing`, plusW(r.due, 7), { type: "message", templateId: "cp_slip_client_wa_hi" }, { who: "client" }));
  }
  const moved = (p.content || []).map((r) => r.movedAt || "").filter(Boolean).sort();
  const lastMove = moved[moved.length - 1] || p.dates.kickoff;
  const waiting = (p.content || []).some((r) => !["delivered", "approved", "not_available"].includes(r.status));
  if (waiting && lastMove && !sendsOf(c, ["cp_chase_d45_em_en"]).length) {
    out.push(task(c, "content:45", "45 continuous days with no content row moving: the project-level pause (cl. 4.5)", plus(lastMove, 46),
      { type: "message", templateId: "cp_chase_d45_em_en", about: { item: { key: "content:45", label: "the content", since: indiaDate(lastMove) } } }, { who: "client" }));
  }
  return out.filter((t): t is ClientTask => Boolean(t));
}

const stageAt = (p: CrmProject, id: CrmProject["stage"]) => {
  const order = ["proposal", "agreement", "welcome", "kickoff", "content", "design", "build", "review", "launch", "handover", "support", "aftercare"];
  return order.indexOf(p.stage) - order.indexOf(id);
};

/** Review windows (SA cl. 3.3): a round sent, or the accuracy notice, plus 7 days with no list: "Record deemed acceptance". */
function windowTasks(c: ProjectCtx): ClientTask[] {
  const out: (ClientTask | null)[] = [];
  const p = c.project;
  if (p.stage === "design") {
    for (const r of p.rounds || []) {
      if (!r.sentAt || r.listAt || r.deemedAt || approvalOf(c, "d_ok")) continue;
      out.push(task(c, `round:${r.n}`, `Round ${r.n}: the 7-day window closed with no list. Record deemed acceptance?`, plus(indiaDate(r.sentAt), 7),
        { type: "deemed", what: `round:${r.stage}:${r.n}`, notice: indiaDate(r.sentAt), roundN: r.n }, { who: "client" }));
    }
  }
  if (p.stage === "review" && p.dates.reviewNotice && !approvalOf(c, "q_accepted")) {
    out.push(task(c, "accept", "The 7-day review window closed: record the acceptance, or deemed acceptance (cl. 3.3)", plus(p.dates.reviewNotice, 7),
      { type: "deemed", what: "q_accepted", notice: p.dates.reviewNotice }, { who: "client", itemId: "q_accepted" }));
  }
  return out.filter((t): t is ClientTask => Boolean(t));
}

/** The weekly update: every agreed weekday from development start until go-live. */
function weeklyTasks(c: ProjectCtx): ClientTask[] {
  const p = c.project;
  const wd = Number(p.weeklyUpdateDay);
  if (!(wd >= 1 && wd <= 6) || !p.dates.devStart || !["build", "review", "launch"].includes(p.stage) || p.dates.goLive) return [];
  // The latest weekly day on or before today (at most six days back).
  let d = c.today;
  for (let i = 0; i < 7 && weekdayOf(d) !== wd; i++) d = addDays(d, -1);
  if (d < p.dates.devStart) return [];
  const sent = (p.sends || []).some((s) => ["cp_build_weekly_em_en", "cp_build_weekly_wa_hi"].includes(s.t) && indiaDate(s.at) >= addDays(d, -1));
  if (sent) return [];
  const t = task(c, `weekly:${d}`, "The weekly update, whether or not there is news", d, { type: "message", templateId: "cp_build_weekly_em_en", alsoTemplateId: "cp_build_weekly_wa_hi" }, { itemId: "b_weekly" });
  return t ? [t] : [];
}

/** TDS: three months after each payment with TDS, the certificate and the credit against the firm's PAN (README-BILLING section 7). */
function tdsTasks(c: ProjectCtx): ClientTask[] {
  return c.payments.filter((x) => x.status === "recorded" && x.tds > 0).map((x) => {
    const rc = c.docs.find((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === x.id);
    return task(c, `tds:${x.id}`, `TDS certificate for ${rc?.number || "the receipt"} received, and the credit visible against the firm's PAN in Form 26AS / AIS`,
      addMonthsIso(x.receivedOn, 3), { type: "note" });
  }).filter((t): t is ClientTask => Boolean(t));
}

function addMonthsIso(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${String(mm + 1).padStart(2, "0")}-${String(Math.min(Number(iso.slice(8, 10)), last)).padStart(2, "0")}`;
}

/** The open items of the current stage that have a due date, as tasks. */
function itemTasks(c: ProjectCtx): ClientTask[] {
  const p = c.project;
  if (p.outcome || p.hold) return [];
  if (p.stage === "proposal" && !proposalOpen(p)) return [];
  const out: (ClientTask | null)[] = [];
  for (const item of STAGE_BY_ID[p.stage].items) {
    if (item.who === "client" || item.waitsFrom) continue;
    if (item.id === "p_hold" || item.id === "b_weekly") continue;
    if (item.gateOneOf && item.gateOneOf.some((id) => isDone(c, id))) continue;
    if (itemState(c, item).state !== "open") continue;
    // Stage 12's other path, a custody step when Ideovent held nothing, day 25 and the access removal while a care
    // plan runs: the stage card says "Not needed" for the same items (stages.ts notNeededReason).
    if (notNeededReason(c, item)) continue;
    if (item.id === "q_fix" && !gateApplies(c, item)) continue;
    out.push(task(c, `item:${item.id}`, item.label, itemDue(c, item.id), { type: "item", itemId: item.id }, { itemId: item.id }));
  }
  return out.filter((t): t is ClientTask => Boolean(t));
}

/** After a project closed: the Lost file's records reminder (24 months from the last message). */
function closedTasks(c: ProjectCtx): ClientTask[] {
  const p = c.project;
  if (p.outcome !== "lost") return [];
  const last = [...(p.sends || [])].sort((a, b) => b.at.localeCompare(a.at))[0];
  const from = last ? indiaDate(last.at) : p.dates.lost || p.dates.closed;
  const t = from ? task(c, "records24", "Delete or anonymise this enquiry's contact details (issued quotations stay, as numbered documents)", addMonthsIso(from, 24), { type: "note" }) : null;
  return t ? [t] : [];
}

/** Every task of one project, whatever its date. */
export function projectTasks(c: ProjectCtx): ClientTask[] {
  if (c.project.outcome) return [...closedTasks(c), ...tdsTasks(c)];
  return [...itemTasks(c), ...moneyTasks(c), ...waitingTasks(c), ...contentTasks(c), ...windowTasks(c), ...weeklyTasks(c), ...tdsTasks(c)];
}

/* ── The client level: renewals and after the exit ─────────────────────── */

export interface ClientLevelCtx {
  client: CrmClient;
  /** The client's own documents (care plan invoices) and payments. */
  docs: CrmDocument[];
  payments: CrmPayment[];
  /** Whether a handover document was issued for this client (the domain courtesy reminder points to it). */
  handoverIssued: boolean;
  today: string;
}

const ctask = (c: ClientLevelCtx, key: string, label: string, due: string | null, action: TaskAction, money = false): ClientTask | null =>
  due ? { id: `${c.client.id}:${key}`, clientId: c.client.id, projectId: null, label, due, money, who: "us", action } : null;

export function clientTasks(c: ClientLevelCtx): ClientTask[] {
  const out: (ClientTask | null)[] = [];
  const cl = c.client;
  const sent = (t: string, after?: string) => (cl.sends || []).some((s) => s.t === t && (!after || indiaDate(s.at) >= after));
  const plan = cl.carePlan;
  if (plan && plan.status !== "ended" && plan.renewalOn) {
    const T = plan.renewalOn;
    const cycle = addDays(T, -60);
    const amc = c.docs.filter((d) => d.kind === "invoice" && d.milestone === "AMC" && d.status === "issued");
    const renewalInv = amc.find((d) => (d.issuedOn || "") >= addDays(T, -30));
    const paid = renewalInv ? isPaid(renewalInv, c.docs, c.payments) : false;
    if (!sent("cp_care_t45_em_en", cycle)) out.push(ctask(c, `t45:${T}`, `Care plan renewal T-45: the reminder (AMC cl. 8.7), renews ${fmtDate(T)}`, addDays(T, -45), { type: "message", templateId: "cp_care_t45_em_en", about: { renewal: "care_plan" } }));
    if (!sent("cp_care_t30_em_en", cycle)) out.push(ctask(c, `t30:${T}`, "Care plan renewal T-30: a suggestion for next year", addDays(T, -30), { type: "message", templateId: "cp_care_t30_em_en", about: { renewal: "care_plan" } }));
    if (!renewalInv) out.push(ctask(c, `t14:${T}`, "Care plan renewal T-14: issue the renewal invoice", addDays(T, -14), { type: "document", kind: "invoice", milestone: "AMC" }, true));
    if (renewalInv && !sent("cp_care_t7_wa_en", cycle)) out.push(ctask(c, `t7:${T}`, "Care plan renewal T-7: one line on WhatsApp", addDays(T, -7), { type: "message", templateId: "cp_care_t7_wa_en", about: { renewal: "care_plan" } }));
    if (paid && !sent("cp_care_t0_em_en", cycle)) out.push(ctask(c, `t0:${T}`, "Care plan renewed: what is covered", T, { type: "message", templateId: "cp_care_t0_em_en", about: { renewal: "care_plan" } }));
    if (!paid) {
      out.push(ctask(c, `t3:${T}`, "Care plan not renewed, no reply: a phone call, not another e-mail (T+3)", addDays(T, 3), { type: "note" }));
      if (!sent("cp_care_t7grace_em_en", cycle)) out.push(ctask(c, `t7g:${T}`, "Care plan T+7: the grace note (cover has paused)", addDays(T, 7), { type: "message", templateId: "cp_care_t7grace_em_en", about: { renewal: "care_plan" } }));
      out.push(ctask(c, `t30h:${T}`, "Care plan T+30: offer the handover pack (backups, credentials, documentation)", addDays(T, 30), { type: "note" }));
    }
    // A care plan invoice unpaid: +7 a written reminder, +15 may suspend on 3 working days' notice, +45 may end (AMC cl. 11).
    for (const d of amc.filter((x) => x.dueOn && docBalance(x, c.docs, c.payments) > 0)) {
      const sentFor = (t: string) => (cl.sends || []).some((s) => s.t === t && s.doc === d.id);
      if (!sentFor("cp_invoice_m1_em_en")) out.push(ctask(c, `amc7:${d.id}`, `Care plan invoice ${d.number} unpaid: a written reminder (AMC cl. 11.1)`, addDays(d.dueOn!, 7), { type: "message", templateId: "cp_invoice_m1_em_en", about: { docId: d.id } }, true));
      out.push(ctask(c, `amc15:${d.id}`, `${d.number}: 15 days unpaid. Cover may be suspended on 3 working days' written notice; never the site, data, backups or domain (AMC cl. 11.2, 11.3)`, addDays(d.dueOn!, 15), { type: "note" }, true));
      out.push(ctask(c, `amc45:${d.id}`, `${d.number}: 45 days unpaid. The plan may end; the handover of AMC cl. 13 still applies`, addDays(d.dueOn!, 45), { type: "note" }, true));
    }
  }
  const watched = Boolean(plan && plan.status === "active") || cl.custodyModel === "ideovent_managed";
  for (const key of ["domain", "hosting", "ssl", "email"] as const) {
    const row = cl.renewals?.[key];
    if (!row?.renewsOn) continue;
    const r = row.renewsOn;
    const name = key === "ssl" ? "SSL" : key === "email" ? "E-mail" : key[0].toUpperCase() + key.slice(1);
    if (watched) {
      for (const n of [60, 30, 14, 7]) out.push(ctask(c, `${key}${n}:${r}`, `${name} renews on ${fmtDate(r)} (${n} days): check it is in hand (Hosting Terms cl. 7.1)`, addDays(r, -n), { type: "note" }));
      out.push(ctask(c, `${key}0:${r}`, `${name} renews today: confirm it renewed`, r, { type: "note" }));
      out.push(ctask(c, `${key}x:${r}`, `${name} renewal date passed: confirm it did not expire`, addDays(r, 1), { type: "note" }));
    } else if (key === "domain" && !sent("cp_renewal_domain_wa_hi", addDays(r, -60)) && !sent("cp_renewal_domain_wa_en", addDays(r, -60))) {
      out.push(ctask(c, `domain30:${r}`, `Domain renews on ${fmtDate(r)}: one courtesy reminder`, addDays(r, -30),
        { type: "message", templateId: cl.language === "en" ? "cp_renewal_domain_wa_en" : "cp_renewal_domain_wa_hi", about: { renewal: "domain" } }));
    }
  }
  if (cl.exitedOn) {
    if (!sent("cp_winback_em_en")) out.push(ctask(c, "winback", "Win-back: a free 20-minute outside check, then the findings with no pitch", addDays(cl.exitedOn, 180), { type: "message", templateId: "cp_winback_em_en" }));
    out.push(ctask(c, "records3y", "Delete or anonymise this client's project records and correspondence; keep invoices and receipts as Indian tax law requires", addMonthsIso(cl.exitedOn, 36), { type: "note" }));
  }
  return out.filter((t): t is ClientTask => Boolean(t));
}

/* ── Today, health, next action ─────────────────────────────────────────── */

export const snoozedTask = (t: ClientTask, until: Record<string, string> | undefined, today: string) => Boolean(until?.[t.id] && until[t.id] > today);

/** Due today or late, not snoozed: money late first, then other late tasks (oldest first), then today's (11.2). */
export function dueToday(tasks: ClientTask[], today: string, snoozes: (t: ClientTask) => Record<string, string> | undefined): ClientTask[] {
  const due = tasks.filter((t) => t.due <= today && !snoozedTask(t, snoozes(t), today));
  const rank = (t: ClientTask) => (t.due < today ? (t.money ? 0 : 1) : 2);
  return due.sort((a, b) => rank(a) - rank(b) || a.due.localeCompare(b.due) || a.label.localeCompare(b.label));
}

export type Health = "on_hold" | "overdue" | "waiting" | "on_track";
export const HEALTH_LABEL: Record<Health, string> = { on_hold: "On hold", overdue: "Overdue", waiting: "Waiting on client", on_track: "On track" };

export function healthOf(c: ProjectCtx, tasks = projectTasks(c)): Health {
  if (c.project.hold) return "on_hold";
  const lateUs = tasks.some((t) => t.who === "us" && t.due < c.today && !snoozedTask(t, c.project.snoozed, c.today));
  if (lateUs || overdueDocs(c.docs, c.payments, c.today).length) return "overdue";
  const next = nextItem(c);
  if (next && next.who === "client") return "waiting";
  return "on_track";
}

/** "Next: <item> (due <when>)". */
export function nextAction(c: ProjectCtx): { label: string; due: string | null; itemId: string } | null {
  if (c.project.outcome) return null;
  const item = nextItem(c);
  if (!item) return null;
  return { label: item.label, due: itemDue(c, item.id), itemId: item.id };
}

/** Is a money chase or an invoice due today on this project? (No feedback ask on such a day.) */
export function isMoneyDay(c: ProjectCtx): boolean {
  if (c.docs.some((d) => d.issuedOn === c.today && ["invoice", "proforma"].includes(d.kind) && d.status === "issued")) return true;
  return moneyTasks(c).some((t) => t.due === c.today);
}

/** The care plan or exit path, as a label. */
export const pathLabel = (p: CrmProject) => (pathOf(p) === "care_plan" ? "Care plan" : "Exit");
/** A launch invoice issued on the project (for the money card's "Billed on" line). */
export const launchOf = (projectId: string, docs: CrmDocument[]) => findLaunchInvoice(projectId, docs);
/** The termination right exists from invoice day + 38 (cl. 13.5: more than 30 days overdue). */
export const terminationRightFrom = (inv: CrmDocument | null) => (inv?.issuedOn ? addDays(inv.issuedOn, 38) : null);
/** True on a working day. */
export const workingDay = isWorkingDay;
/** Whether the plan's path is chosen. */
export const planChosen = (p: CrmProject) => hasPlan(p);
/** An item's checklist entry, for the screens. */
export const entry = entryOf;
/** The item definitions, for the screens. */
export const itemDef = (id: string) => ITEM_BY_ID[id];

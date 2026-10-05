/**
 * A CLIENT MESSAGE, RENDERED AND CHECKED (client-process-spec 7.1, 7.2).
 *
 *   renderClientMessage(template, ctx) -> { subject?, body, blanks, warnings }
 *     Every {field} of FIELDS is filled from the client, the project, its
 *     documents and payments, and Settings; a missing value becomes its
 *     [blank label] and a [blank] blocks the send. The greeting reuses the lead
 *     engine's greetingFor / addressFor, but never their no-name fallback ("Sir",
 *     "Principal ji", "Doctor"): a client without a contact name gets the
 *     [contact name] blank. Text is tidied with the engine's tidy(). The two
 *     proposal e-mails from templates.ts end as the lead page ends them,
 *     "Regards," and the signature; every other e-mail ends with its own
 *     sign-off and nothing is added (no opt-out line: these are client e-mails).
 *   checkClientSend(template, rendered, ctx) -> { blockers, warnings }
 *     Blocks do-not-contact, a Meta-consent refusal on WhatsApp, a missing or
 *     unsafe address, a subject over 200 characters, any [blank], a dash, a
 *     template whose truth conditions fail, money words for a client outside
 *     India, attachments not issued yet, and an e-mail with attachments until
 *     "I attached" is ticked. Warns on quiet hours and Sunday, "New wording",
 *     and the same template to this client in the last 24 hours. The lead's
 *     cold rules (one link, demo truths, the daily WhatsApp limit) do not apply.
 *   clientSuggestionsFor(name, ctx): the project's own figures for money blanks
 *     and the next working days for dates. Never a price list (decision 21).
 *   afterSend(...): what a send records on the project (ticks, dates, rounds,
 *     the send itself). Nothing is ever sent by the CRM.
 */
import { addressFor, admissionSession, DEFAULT_SIGNATURE, greetingFor, inQuietHours, kindNounFor, metaConsentRefused, MAX_SUBJECT,
  normalisePhone, PLACEHOLDER_RE, tidy, unfilledPlaceholders, whatsappUrl, whatsappWebUrl, mailtoUrl } from "@/lib/outreach/engine";
import { safeMailAddress, zohoComposeLink, type ZohoLink } from "@/lib/outreach/mailLinks";
import { HOURLY_RATE } from "@/lib/pricing";
import {
  advanceOf, CARE_PLANS, contractValueOf, docBalance, feeOf, findLaunchInvoice, inrGroup, isPaid, receiptFigures, splitParts,
} from "./money";
import { addDays, addWorkingDays, daysBetween, fmtDate, fmtMeeting, indiaDate, indiaTime, isWorkingDay, WEEKDAY_NAMES, weekdayOf } from "./numbering";
import {
  advanceCredited, advanceProformas, approvalOf, creditDate, hasPlan, isDone, launchPaid, openIssues, s1s2Recent, sendsOf, supportWindow, type ProjectCtx,
} from "./stages";
import { isMoneyDay } from "./tasks";
import { needsApproval, TEMPLATE_BY_ID, type ClientTemplate, type NeedId } from "./templates";
import type { ClientSettings, CrmClient, CrmDocument, CrmPayment, CrmProject, Language, SendRecord } from "./types";

/* ── The context ────────────────────────────────────────────────────────── */

export interface MessageAbout {
  /** The document a ladder step, a receipt e-mail or a reminder is about. */
  docId?: string;
  /** The payment a receipt e-mail or a part-payment line is about. */
  paymentId?: string;
  issueId?: string;
  crNo?: string;
  /** The client item being chased (the waiting ladder, a content row). */
  item?: { key: string; label: string; since: string };
  /** A go-live change: from and to. */
  slip?: { from?: string; to: string };
  roundN?: number;
  /** A renewal message: the care plan or the domain. */
  renewal?: "care_plan" | "domain";
}

export interface ComposeCtx {
  client: CrmClient;
  /** null for a client-level message (renewals, win-back). */
  project: CrmProject | null;
  /** The project's documents (or the client's own, for client-level messages). */
  docs: CrmDocument[];
  payments: CrmPayment[];
  settings: ClientSettings;
  /** The linked lead, while it exists: do-not-contact and the Meta consent are read from it. */
  lead?: { status?: string; metaConsent?: string } | null;
  /** The CRM's e-mail signature (outreach settings), for the two proposal e-mails from templates.ts. */
  signature?: string;
  quietStart?: string;
  quietEnd?: string;
  now: Date;
  about?: MessageAbout;
  /** Whether any client has a testimonial on file (the e-mail ask says Ideovent has none yet). */
  anyTestimonialOnFile?: boolean;
  /**
   * A client-level message (care plan renewals, win-back): the live address of the site Ideovent built for this
   * client (its latest project with one). {siteUrl} names it; the lead's own website is the site from before.
   */
  builtSite?: string;
}

export const todayOf = (c: ComposeCtx) => indiaDate(c.now);
const pctx = (c: ComposeCtx): ProjectCtx | null =>
  c.project ? { client: c.client, project: c.project, docs: c.docs, payments: c.payments, settings: c.settings, today: todayOf(c) } : null;

/* ── Merge fields (7.2): the blank each one leaves when its fact is missing ─ */

export const FIELDS: Record<string, string | null> = {
  greeting: "[contact name]", addressAs: "[contact name]", contactName: "[contact name]", signatoryName: "[name of the person who signed]",
  orgName: "[business name]", legalName: "[legal name]", kindNoun: null, projectName: "[project name]", sowRef: "[SOW reference]",
  quoteNo: "[quotation number]", proposalNo: "[proposal number]", validUntil: "[valid until]", callDate: "[discovery call date]",
  totalFee: "[total fee]", advanceAmount: "[advance amount]", finalAmount: "[launch amount]", proformaNo: "[advance invoice number]",
  invoiceNo: "[invoice number]", invoiceDate: "[invoice date]", dueDate: "[due date]", amount: "[amount]", daysOverdue: "[days overdue]",
  dateWorkStops: "[date work stops]", reminder1Date: "[date of the first reminder]", reminder2Date: "[date of the second reminder]",
  finalDeadline: "[final deadline]", effectiveDate: "[agreement date]", receiptNo: "[receipt number]", amountReceived: "[amount received]",
  balanceAmount: "[balance amount]", paymentDate: "[payment date]", utr: "[reference]", advanceDate: "[date the advance was credited]",
  docNo: "[invoice number]", advanceReceived: "[advance received]", advanceBalance: "[advance balance]", advanceBalanceDue: "[date part 2 is due]",
  projectReplyTarget: null, backupDeleteDate: "[date the last backup is deleted]", coveredUntil: "[covered until]",
  kickoffDate: "[kickoff date]", kickoffTime: "[kickoff time]", contentCutoff: "[content cut-off date]", devStartDate: "[development start date]",
  goLiveDate: "[go-live date]", goLiveTime: "[go-live time]", newGoLiveDate: "[new go-live date]", holdUntil: "[date you hold the slot until]",
  stagingUrl: "[staging link]", reviewLink: "[link to the designs]", liveUrl: "[live address]", domainName: "[domain]", siteUrl: "[their website]",
  round: null, weeklyUpdateDay: "[weekly update day]", pointOfContact: "[point of contact]", escalationContact: "[escalation contact]",
  commsChannel: "[channel]", supportStartDate: "[support start date]", supportEndDate: "[support end date]", durationWeeks: "[weeks]",
  hourlyRate: null, restartFee: null, googleReviewLink: "[Google review link]", carePlan: "[plan]", carePlanFee: "[plan fee]",
  renewalDate: "[renewal date]", renewalNoticeDate: "[renewal notice date]", domainRenewalDate: "[domain renewal date]",
  item: "[what we are waiting for]", itemSince: "[date it was asked for]", days: "[days]", messagesCount: "[number of messages]",
  custodyText: "[whose account the hosting is on]", finalPaidDate: "[date of the final payment]", finalReceiptNo: "[final receipt number]",
  sourceTransferredDate: "[date the source code was handed over]", handoverDate: "[handover date]", accessRemovedDate: "[date access was removed]",
  issuesReported: null, leftOpen: null, senderName: null, senderPhone: null,
  /* Fields the catalogue adds (each documented where it is used). */
  reviewBy: null, balanceLine: null, issuesCount: null, removalDays: "[removal days]", buildStart: "[build start date]",
  designsDated: "[date of the designs]", approvedOn: "[date of the approval]", crNo: "[CR number]", crCost: "[cost]", crDays: "[working days]",
  essentialMonthly: null, needList: null, needFromYou: "[what you need from them]", needBy: "[by when]", todayDate: null, sessionYear: null,
  issueSummary: "[the issue in a few words]", severityLine: "[severity]", coverLine: "[cover]", goLiveLine: null, requestsList: null,
  requestsDays: "[working days]", quote: "[their approved words]", dueWhenHi: null, warningDate: "[date of the warning]",
  /* What is still open on the document a reminder is about: its amount less the payments (amount + TDS) and credit
     notes against it. A ladder step after a part payment asks for this, never the full amount again. */
  amountDue: "[amount due]",
};

const lang = (t: ClientTemplate): Language => t.language;
const has = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const fd = (iso?: string | null) => (iso ? fmtDate(iso) : undefined);
/** "The enquiry form..." mid-sentence: "the enquiry form..." (an acronym such as "SSL" keeps its capitals). */
const lcFirst = (s?: string) => (s && /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * The engine's tidy (no double spaces, no space before punctuation), except that the space before a file
 * extension stays: "(.ai, .svg, .eps or .pdf)", never "(.ai,.svg,.eps or.pdf)".
 */
const EXT_DOT = /(\s)\.(?=[a-z0-9])/gi;
const KEEP_DOT = "\u0001";
export const tidyClient = (s: string) => tidy(s.replace(EXT_DOT, `$1${KEEP_DOT}`)).split(KEEP_DOT).join(".");

/** The latest issued quotation of the project. */
const latestQuote = (docs: CrmDocument[]) =>
  [...docs].filter((d) => d.kind === "quotation" && d.status === "issued").sort((a, b) => (b.issuedOn || "").localeCompare(a.issuedOn || ""))[0];
/**
 * The care plan invoice for the renewal: the issued one whose period starts on or after the renewal date. Without
 * periods recorded on any invoice, the latest issued one. The first period's invoice, paid months ago, is never
 * read as the renewal ("has renewed", "Invoice went over last week" would be untrue).
 */
export function renewalInvoiceOf(docs: CrmDocument[], renewalOn?: string): CrmDocument | undefined {
  const amc = docs.filter((d) => d.kind === "invoice" && d.milestone === "AMC" && d.status === "issued")
    .sort((a, b) => (b.issuedOn || "").localeCompare(a.issuedOn || ""));
  if (!amc.some((d) => d.data?.period?.from)) return amc[0];
  return renewalOn ? amc.find((d) => (d.data?.period?.from || "") >= renewalOn) : undefined;
}

/** The document a message is about: the one named, else a sensible default for its stage. */
export function aboutDoc(t: ClientTemplate | null, c: ComposeCtx): CrmDocument | null {
  if (c.about?.docId) return c.docs.find((d) => d.id === c.about!.docId) || null;
  if (c.about?.paymentId) {
    const pay = c.payments.find((p) => p.id === c.about!.paymentId);
    return pay ? c.docs.find((d) => d.id === pay.againstDoc) || null : null;
  }
  if (!t) return null;
  const pc = pctx(c);
  if (pc && (t.stage === "agreement" || t.id === "cp_agreement_paperwork_em_en")) return advanceProformas(pc)[0] || null;
  if (pc && t.stage === "launch") return findLaunchInvoice(pc.project.id, c.docs);
  return null;
}

/**
 * The payment a message is about: the one named, else (a receipt e-mail or a part-payment line opened from
 * its item, w_receipt or l_receipt) the latest payment recorded on this project or client, which is the one
 * whose receipt the item asks to send. Never a voided payment.
 */
export function aboutPayment(c: ComposeCtx): CrmPayment | null {
  if (c.about?.paymentId) return c.payments.find((p) => p.id === c.about!.paymentId) || null;
  if (c.about?.docId) return null;
  return [...c.payments].filter((p) => p.status === "recorded" && (c.project ? p.projectId === c.project.id : !p.projectId))
    .sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null;
}

/** The ladder sends about a document, by the steps the ladder names. */
function stepSent(c: ComposeCtx, docId: string | undefined, ids: string[]): SendRecord | undefined {
  if (!c.project) return (c.client.sends || []).filter((s) => ids.includes(s.t) && (!docId || s.doc === docId))[0];
  return sendsOf({ project: c.project }, ids, docId)[0];
}

const M1_IDS = ["cp_launch_m1_wa_hi", "cp_agreement_a1_wa_hi", "cp_invoice_m1_em_en"];
const M2_IDS = ["cp_launch_m2_em_en"];

function goLiveOf(p: CrmProject | null): string | undefined {
  return p ? p.dates.goLive || p.dates.goLiveTarget : undefined;
}

function weeklyNeeds(c: ComposeCtx): { list: string; first?: { label: string; due?: string } } {
  const p = c.project;
  if (!p) return { list: "Nothing this week, thank you" };
  const today = todayOf(c);
  const until = addDays(today, 7);
  const rows = (p.content || []).filter((r) => r.due && r.due <= until && !["delivered", "approved", "not_available"].includes(r.status))
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  if (!rows.length) return { list: "Nothing this week, thank you" };
  return { list: rows.map((r) => `- ${r.label}, by ${fmtDate(r.due)}`).join("\n"), first: { label: rows[0].label, due: rows[0].due } };
}

function goLiveLineOf(p: CrmProject | null): string | undefined {
  if (!p) return undefined;
  const target = p.dates.goLiveTarget;
  if (!target) return undefined;
  const moved = (p.goLiveHistory || []).filter((h) => h.from && h.from !== h.to && (!p.dates.kickoff || indiaDate(h.at) >= p.dates.kickoff));
  if (!moved.length) return `Go-live date: ${fmtDate(target)}, on track.`;
  const first = moved[0].from!;
  return `Go-live date: ${fmtDate(target)}, moved from ${fmtDate(first)}: [why, in one sentence]`;
}

function issueLines(p: CrmProject | null, win: { start: string; end: string } | null): { reported: string; leftOpen: string } {
  const issues = (p?.issues || []).filter((i) => !win || (indiaDate(i.at) >= win.start && indiaDate(i.at) <= win.end));
  const reported = issues.length
    ? issues.map((i) => `${fmtDate(i.at)}: ${i.summary.replace(/[.\s]+$/, "")}. ${(i.done || (i.status === "closed" ? "Fixed" : "Open")).replace(/[.\s]+$/, "")}.`).join("\n")
    : "Nothing was reported.";
  const open = (p?.issues || []).filter((i) => i.status === "open");
  const leftOpen = open.length
    ? open.map((i) => `${i.summary.replace(/[.\s]+$/, "")}${i.owedBy ? `, owed by ${i.owedBy}` : ""}${i.by ? `, by ${fmtDate(i.by)}` : ""}.`).join(" ")
    : "None.";
  return { reported, leftOpen };
}

/** Every merge field's value for this message; undefined leaves the field's blank. */
export function fieldValues(t: ClientTemplate, c: ComposeCtx): Record<string, string | undefined> {
  const L = lang(t);
  const cl = c.client;
  const p = c.project;
  const pc = pctx(c);
  const today = todayOf(c);
  const name = (cl.contactName || "").trim();
  const doc = aboutDoc(t, c);
  const pay = aboutPayment(c);
  const fee = p ? feeOf(p) : null;
  const split = p ? splitParts(p) : null;
  const pis = pc ? advanceProformas(pc) : [];
  const quote = latestQuote(c.docs);
  const launchInv = p ? findLaunchInvoice(p.id, c.docs) : null;
  const win = p ? supportWindow(p) : null;
  const cr = p && c.about?.crNo ? (p.changeRequests || []).find((x) => x.no === c.about!.crNo) : undefined;
  const issue = p && c.about?.issueId ? (p.issues || []).find((x) => x.id === c.about!.issueId) : undefined;
  const plan = cl.carePlan;
  const planName = plan ? CARE_PLANS[plan.plan].name : p?.carePlanDecision && p.carePlanDecision !== "none" ? CARE_PLANS[p.carePlanDecision].name : undefined;
  const renewal = c.about?.renewal === "domain" ? cl.renewals?.domain?.renewsOn : plan?.renewalOn;
  const advancePays = c.payments.filter((x) => x.status === "recorded" && pis.some((d) => d.id === x.againstDoc));
  const weekly = weeklyNeeds(c);
  const slip = c.about?.slip;
  const issuesTxt = issueLines(p, win);
  const roundsUsed = (p?.rounds || []).filter((r) => r.sentAt).length;
  const lastRound = [...(p?.rounds || [])].filter((r) => r.sentAt).sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""))[0];
  const roundN = c.about?.roundN || (lastRound ? lastRound.n : 1);
  const absorbed = [...(p?.waived || []).map((w) => w.what), ...(p?.changeRequests || []).filter((x) => x.status === "waived").map((x) => x.description)];
  // The requests the re-baseline e-mail lists: every one logged (SOP-09 section 2 is offered from the third), never
  // padded past three, so "each of them" is always true of the list Mehdi sends.
  const reqList = [...absorbed, ...(p?.changeRequests || []).filter((x) => x.status !== "waived").map((x) => x.description)].slice(0, 8);
  while (reqList.length < 3) reqList.push(`[request ${reqList.length + 1}]`);
  const itemSends = c.about?.item && p ? (p.sends || []).filter((s) => s.doc === `item:${c.about!.item!.key}`).length : 0;
  const amcInv = renewalInvoiceOf(c.docs, cl.carePlan?.renewalOn);
  const reqDays = (p?.changeRequests || []).reduce((s, x) => s + (x.days || 0), 0);
  const crGoLive = cr && p?.dates.goLiveTarget ? addWorkingDays(p.dates.goLiveTarget, cr.days) : undefined;
  const stopDate = doc?.dueOn ? addDays(doc.dueOn, 10) : undefined;
  const figures = pay ? (() => { const against = c.docs.find((d) => d.id === pay.againstDoc); return against ? receiptFigures(pay, against, c.docs, c.payments) : null; })() : null;
  const receipt = pay ? c.docs.find((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === pay.id) : undefined;
  const finalPay = launchInv ? c.payments.filter((x) => x.status === "recorded" && x.againstDoc === launchInv.id).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn))[0] : undefined;
  const finalReceipt = finalPay ? c.docs.find((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === finalPay.id) : undefined;
  const approvalD = p ? approvalOf({ project: p }, "d_ok") : undefined;
  const coverLine = issue
    ? issue.cover === "defect"
      ? `This is a defect in what was delivered, so it is fixed free of charge ${win && today <= win.end ? "under the thirty-day warranty" : "under your care plan"}.`
      : issue.cover === "change"
        ? planName && plan?.status === "active" ? `This is a content change, which comes out of your ${planName} plan's included hours. It will take about [minutes] minutes of them.` : undefined
        : "This is new work. It is not a fault, it is something the site does not currently do. I will send you a short quote today so you can decide with the number in front of you."
    : undefined;
  const custody = cl.custodyModel === "client_held" ? (L === "hinglish" ? "aapke apne account" : "your own account")
    : cl.custodyModel === "ideovent_managed" ? (L === "hinglish" ? "hamare provider account" : "our provider account") : undefined;
  const dueWhen = doc?.dueOn ? (addDays(doc.dueOn, 1) === today ? "kal" : `${fmtDate(doc.dueOn)} ko`) : undefined;
  const advReceived = advancePays.reduce((s, x) => s + x.amount, 0);
  const warning = p ? sendsOf({ project: p }, ["cp_abuse_warning_em_en"])[0] : undefined;
  const balance = doc ? docBalance(doc, c.docs, c.payments) : null;

  const v: Record<string, string | undefined> = {
    greeting: name ? greetingFor(name, cl.kind, L) : undefined,
    addressAs: name ? addressFor(name, cl.kind, L) : undefined,
    contactName: name || undefined,
    signatoryName: has(cl.signatoryName) ? cl.signatoryName : undefined,
    orgName: has(cl.orgName) ? cl.orgName.trim() : undefined,
    legalName: has(cl.legalName) ? cl.legalName : cl.legalSameAsTrading ? cl.orgName : undefined,
    kindNoun: kindNounFor(cl.kind, L),
    projectName: p ? (has(p.name) ? p.name : undefined) : planName ? `the ${planName} care plan` : undefined,
    sowRef: p?.sowRef,
    quoteNo: quote?.number || undefined,
    proposalNo: p?.proposalNo || quote?.number || undefined,
    validUntil: fd(quote?.validUntil),
    callDate: fd(p?.dates.call),
    totalFee: p ? (contractValueOf(p) !== null ? inrGroup(contractValueOf(p)!) : undefined) : undefined,
    advanceAmount: doc && doc.kind === "proforma" ? inrGroup(doc.amount || 0) : split ? inrGroup(split.part1) : fee !== null ? inrGroup(advanceOf(fee)) : undefined,
    finalAmount: launchInv ? inrGroup(launchInv.amount || 0) : fee !== null ? inrGroup(fee - advanceOf(fee)) : undefined,
    proformaNo: doc && doc.kind === "proforma" ? doc.number || undefined : pis[0]?.number || undefined,
    invoiceNo: doc?.number || undefined,
    invoiceDate: fd(doc?.issuedOn),
    dueDate: fd(doc?.dueOn),
    amount: doc && doc.amount !== null ? inrGroup(doc.amount) : undefined,
    amountDue: doc && doc.status === "issued" && balance !== null ? inrGroup(Math.max(0, balance)) : undefined,
    daysOverdue: doc?.dueOn && doc.dueOn < today ? String(daysBetween(doc.dueOn, today)) : undefined,
    dateWorkStops: stopDate ? fmtDate(t.ladder === "PAUSE" && today > stopDate ? today : stopDate) : undefined,
    reminder1Date: fd(stepSent(c, doc?.id, M1_IDS)?.at),
    reminder2Date: fd(stepSent(c, doc?.id, M2_IDS)?.at),
    finalDeadline: doc?.dueOn ? fmtDate(addDays(doc.dueOn, 31)) : undefined,
    effectiveDate: fd(p?.dates.effective),
    receiptNo: receipt?.number || undefined,
    amountReceived: pay ? inrGroup(pay.amount) : undefined,
    balanceAmount: figures ? inrGroup(Math.max(0, figures.balance)) : balance !== null ? inrGroup(Math.max(0, balance)) : undefined,
    paymentDate: fd(pay?.receivedOn),
    utr: pay ? pay.reference || undefined : advancePays.map((x) => x.reference).filter(Boolean).join(", ") || undefined,
    advanceDate: pc ? fd(creditDate(pc)) : undefined,
    docNo: pay ? c.docs.find((d) => d.id === pay.againstDoc)?.number || undefined : doc?.number || undefined,
    advanceReceived: advReceived > 0 ? inrGroup(advReceived) : undefined,
    advanceBalance: split ? inrGroup(split.part2) : undefined,
    advanceBalanceDue: fd(p?.splitAdvance?.part2DueOn),
    backupDeleteDate: plan?.renewalOn ? fmtDate(addDays(plan.renewalOn, 30)) : undefined,
    // The last day the paid renewal invoice covers: its own period when it has one (the invoice prints "14 Feb 2027
    // to 13 Mar 2027"), else the renewal date + the plan's term, less a day.
    coveredUntil: amcInv?.data?.period?.to ? fmtDate(amcInv.data.period.to)
      : plan?.renewalOn ? fmtDate(addDays(plan.billing === "annual" ? addMonths(plan.renewalOn, 12) : addMonths(plan.renewalOn, 1), -1)) : undefined,
    kickoffDate: fd(p?.dates.kickoff),
    kickoffTime: p?.kickoffTime || undefined,
    contentCutoff: fd(p?.dates.contentCutoff),
    devStartDate: fd(p?.dates.devStart),
    goLiveDate: fd(slip?.from || goLiveOf(p)),
    goLiveTime: p?.goLiveTime || undefined,
    newGoLiveDate: fd(slip?.to || crGoLive || p?.notesByKey?.newGoLive),
    holdUntil: undefined,
    stagingUrl: p?.stagingUrl || undefined,
    reviewLink: (p?.rounds || []).find((r) => r.n === roundN)?.reviewLink || lastRound?.reviewLink || undefined,
    liveUrl: p?.liveUrl || undefined,
    domainName: p?.domainName || undefined,
    // At the proposal (day 7, "one thing I noticed on ...") it is their own site from before; after that, the site
    // Ideovent built: the project's live address, or for a client-level message the latest one built for them.
    siteUrl: t.stage === "proposal" ? cl.website || undefined : p?.liveUrl || c.builtSite || cl.website || p?.domainName || undefined,
    round: `Round ${roundN} of 2`,
    weeklyUpdateDay: p?.weeklyUpdateDay ? WEEKDAY_NAMES[p.weeklyUpdateDay] : undefined,
    pointOfContact: p?.pointOfContact || undefined,
    escalationContact: p?.escalationContact || undefined,
    commsChannel: p?.commsChannel || undefined,
    supportStartDate: fd(win?.start),
    supportEndDate: fd(win?.end),
    durationWeeks: p?.durationWeeks ? String(p.durationWeeks) : undefined,
    hourlyRate: inrGroup(c.settings.policy.hourlyRate || HOURLY_RATE),
    restartFee: inrGroup(c.settings.policy.restartFee || 4000),
    googleReviewLink: c.settings.googleReviewLink || undefined,
    carePlan: planName,
    carePlanFee: plan ? `${inrGroup(plan.fee)} ${plan.billing === "annual" ? "a year" : "a month"}` : undefined,
    renewalDate: fd(renewal),
    renewalNoticeDate: renewal ? fmtDate(addDays(renewal, -30)) : undefined,
    domainRenewalDate: fd(cl.renewals?.domain?.renewsOn),
    item: c.about?.item?.label,
    itemSince: fd(c.about?.item?.since),
    days: c.about?.item ? String(daysBetween(c.about.item.since, today)) : undefined,
    // "I have sent 2 messages about it": counted from the sends about this item; none recorded leaves the blank
    // (a "0 messages ... reaching the right person" sentence would be untrue).
    messagesCount: itemSends > 0 ? `${itemSends} ${itemSends === 1 ? "message" : "messages"}` : undefined,
    custodyText: custody,
    finalPaidDate: fd(finalPay?.receivedOn),
    finalReceiptNo: finalReceipt?.number || undefined,
    sourceTransferredDate: fd(p?.dates.sourceTransferred),
    handoverDate: fd(p?.dates.handover),
    accessRemovedDate: fd(p?.dates.accessRemoved),
    issuesReported: issuesTxt.reported,
    leftOpen: issuesTxt.leftOpen,
    senderName: "Mehdi Alam",
    senderPhone: "+91 77619 21786",
    reviewBy: fmtDate(addDays(today, 7)),
    balanceLine: figures && pay
      ? figures.balance > 0
        ? `Balance outstanding on ${c.docs.find((d) => d.id === pay.againstDoc)?.number || "[invoice number]"}: Rs. ${inrGroup(figures.balance)}.`
        : `Nothing is outstanding on ${c.docs.find((d) => d.id === pay.againstDoc)?.number || "[invoice number]"}.`
      : "[balance line]",
    issuesCount: String((p?.issues || []).length),
    removalDays: c.settings.policy.removalDays ? String(c.settings.policy.removalDays) : undefined,
    buildStart: fd(p?.dates.buildStart),
    designsDated: fd(lastRound?.sentAt),
    approvedOn: fd(approvalD?.at),
    crNo: cr?.no,
    crCost: cr ? inrGroup(cr.cost) : undefined,
    crDays: cr ? String(cr.days) : undefined,
    essentialMonthly: inrGroup(CARE_PLANS.essential.monthly),
    needList: weekly.list,
    needFromYou: weekly.first?.label,
    needBy: fd(weekly.first?.due),
    todayDate: fmtDate(today),
    sessionYear: admissionSession(c.now),
    issueSummary: lcFirst(issue?.summary),
    severityLine: issue ? ({ S1: "S1 down", S2: "S2 major", S3: "S3 minor", S4: "S4 change request" } as const)[issue.severity] : undefined,
    coverLine,
    goLiveLine: goLiveLineOf(p) || "Go-live date: [go-live date], on track.",
    requestsList: reqList.map((r, i) => `${i + 1}. ${r}`).join("\n"),
    requestsDays: reqDays > 0 ? String(reqDays) : undefined,
    quote: cl.testimonial?.quote || undefined,
    dueWhenHi: dueWhen || "[kab]",
    warningDate: fd(warning?.at),
  };
  if (roundsUsed > 2) v.round = `Round ${roundN}`;
  return v;
}

function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const d = Number(iso.slice(8, 10));
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${String(mm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/* ── Rendering ─────────────────────────────────────────────────────────── */

export interface RenderedClientMessage {
  subject?: string;
  body: string;
  blanks: string[];
  warnings: string[];
  /** Unknown {fields} left in the text: a test failure. */
  unknown: string[];
}

const SCHOOLISH = new Set(["school", "coaching"]);

/**
 * The launch invoice bills more (or less) than the plain 50% balance: approved change requests, an unpaid part of
 * a split advance, an earlier invoice; or part of it is already paid (or credited), so what is left is not the 50%.
 * Then "baaki 50% payment" would be untrue (E19).
 */
export function launchNotHalf(c: Pick<ComposeCtx, "project" | "docs"> & { payments?: CrmPayment[] }): boolean {
  const p = c.project;
  if (!p) return false;
  const inv = findLaunchInvoice(p.id, c.docs);
  const fee = feeOf(p);
  if (!inv || fee === null) return false;
  if ((inv.amount || 0) !== fee - advanceOf(fee)) return true;
  return docBalance(inv, c.docs, c.payments || []) < (inv.amount || 0);
}

/** The payment a message is about went against a proforma (the advance, or a change request's advance), not an invoice (E23). */
export function aboutProforma(c: ComposeCtx): boolean {
  const pay = aboutPayment(c);
  return Boolean(pay) && c.docs.find((d) => d.id === pay!.againstDoc)?.kind === "proforma";
}

/** The quotation's validity date has passed (A3, day 14: "the price holds until" a date already gone would be untrue, E18). */
export function quoteExpired(c: Pick<ComposeCtx, "docs" | "now">): boolean {
  const q = latestQuote(c.docs);
  return Boolean(q?.validUntil) && q!.validUntil! < indiaDate(c.now);
}

/**
 * The variant's body: E3 / E11 / E16 for a school or coaching client (schoolOnly: a school), E15 with a split
 * advance, E14 with fewer than two rounds, E18 once the quotation has expired, E19 when the launch invoice is not
 * the plain 50% (or is part paid), E20 when nothing was reported in the support window, E23 when the payment went
 * against a proforma.
 */
export function bodyFor(t: ClientTemplate, c: ComposeCtx): string {
  for (const a of t.alt || []) {
    if (a.when === "school" && SCHOOLISH.has(c.client.kind)) return a.body;
    if (a.when === "schoolOnly" && c.client.kind === "school") return a.body;
    if (a.when === "split" && c.project?.splitAdvance) return a.body;
    if (a.when === "fewerRounds" && (c.project?.rounds || []).filter((r) => r.sentAt).length < 2) return a.body;
    if (a.when === "quoteExpired" && quoteExpired(c)) return a.body;
    if (a.when === "notHalf" && launchNotHalf(c)) return a.body;
    if (a.when === "noIssues" && c.project && !(c.project.issues || []).length) return a.body;
    if (a.when === "oneIssue" && c.project && (c.project.issues || []).length === 1) return a.body;
    if (a.when === "proforma" && aboutProforma(c)) return a.body;
  }
  return t.body;
}

function fill(text: string, values: Record<string, string | undefined>, unknown: Set<string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (!(key in FIELDS)) {
      unknown.add(whole);
      return whole;
    }
    const v = values[key];
    if (v !== undefined && v !== "") return v;
    return FIELDS[key] || `[${key}]`;
  });
}

export function renderClientMessage(t: ClientTemplate, c: ComposeCtx): RenderedClientMessage {
  const values = fieldValues(t, c);
  const unknown = new Set<string>();
  const warnings: string[] = [];
  const parts = [t.frameHead, bodyFor(t, c), t.frameTail].filter((x): x is string => Boolean(x));
  let body = tidyClient(fill(parts.join("\n\n"), values, unknown));
  const subject = t.subject !== undefined ? tidyClient(fill(t.subject, values, unknown)) : undefined;
  if (t.channel === "email" && t.engineEnding) {
    const signature = (c.signature || "").trim() || DEFAULT_SIGNATURE;
    if (!body.includes(signature)) body = `${body}\n\nRegards,\n${signature}`;
  }
  const blanks = unfilledPlaceholders(`${subject ?? ""}\n${body}`);
  if (!(c.client.contactName || "").trim() && /\{(greeting|addressAs|contactName)\}/.test(`${t.frameHead || ""}${t.subject || ""}${bodyFor(t, c)}`)) {
    warnings.push("No contact name on the client card: the greeting waits for it (a client is never \"Sir\").");
  }
  return { subject, body, blanks, warnings, unknown: [...unknown] };
}

/* ── Truth conditions ───────────────────────────────────────────────────── */

type NeedCheck = (c: ComposeCtx, t: ClientTemplate) => string | null;
const need = (cond: boolean, why: string) => (cond ? null : why);

export const NEEDS: Record<NeedId, NeedCheck> = {
  designed_done: (c) => need(Boolean(c.project && isDone(pctx(c)!, "p_designed")), "This is about the designed proposal (page 2): tick \"Designed proposal\" first."),
  proposal_email_first: (c) => need(Boolean(c.project?.sends?.some((s) => /^cp_proposal_(send_em|full_em)/.test(s.t))), "Send the proposal e-mail first: this WhatsApp says it went to their e-mail."),
  in_india: (c) => need(c.client.inIndia !== false, "Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet)."),
  doc_overdue: (c, t) => {
    const d = aboutDoc(t, c);
    if (!d) return "Pick the invoice or proforma this reminder is about.";
    if (d.status !== "issued") return "That document is not issued.";
    if (!d.dueOn || d.dueOn >= todayOf(c)) return `This reminder is for after the due date (${fmtDate(d.dueOn)}).`;
    return need(docBalance(d, c.docs, c.payments) > 0, `Nothing is outstanding on ${d.number}.`);
  },
  part_payment: (c) => {
    const pay = aboutPayment(c);
    if (!pay) return "Pick the payment this line is about.";
    const against = c.docs.find((d) => d.id === pay.againstDoc);
    const receipt = c.docs.some((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === pay.id);
    if (!receipt) return "Issue the receipt for this payment first: the line says it is attached.";
    return need(Boolean(against) && docBalance(against!, c.docs, c.payments) > 0, "That payment cleared the document: it is not a part payment.");
  },
  paid_today: (c) => { const pay = aboutPayment(c); return need(Boolean(pay) && pay!.receivedOn === todayOf(c), `This says "received today"; the payment was received on ${fmtDate(pay?.receivedOn)}.`); },
  advance_credited: (c) => need(Boolean(c.project && advanceCredited(pctx(c)!)), "The advance is not credited yet (credited, not sent)."),
  receipt_emailed: (c) => need(Boolean(c.project?.sends?.some((s) => s.t === "cp_payment_receipt_em_en")), "E-mail the receipt first: this message says it has been e-mailed."),
  staging_url: (c) => need(Boolean(c.project?.stagingUrl), "Set the staging link first."),
  review_link: (c, t) => need(Boolean(fieldValues(t, c).reviewLink), "Set the link to the designs for this round first."),
  qa_done: (c) => need(Boolean(c.project && isDone(pctx(c)!, "q_qa")), "It says your own testing is finished: tick SOP-05 sections A to J first."),
  qa_accepted: (c) => need(Boolean(c.project && isDone(pctx(c)!, "q_qa") && isDone(pctx(c)!, "q_accepted")), "It opens \"Everything is tested and your content check is complete\": QA and the client's acceptance first."),
  golive_morning: (c) => {
    const p = c.project;
    const d = p?.dates.goLive || p?.dates.goLiveTarget;
    if (!d || !p?.goLiveTime) return "Set the go-live date and time first.";
    const hour = Number(p.goLiveTime.slice(0, 2));
    return need(isWorkingDay(d) && hour < 12, "It says \"a working-day morning\": pick a Monday to Saturday morning (never after 3pm, never a Friday evening).");
  },
  m2_email_first: (c, t) => need(Boolean(stepSent(c, aboutDoc(t, c)?.id, M2_IDS)), "Send the M2 e-mail first: \"Do not send this one alone\"."),
  stop_date_reached: (c, t) => {
    const d = aboutDoc(t, c);
    return need(Boolean(d?.dueOn) && todayOf(c) >= addDays(d!.dueOn!, 10), `The stop date is ${fmtDate(d?.dueOn ? addDays(d.dueOn, 10) : "")}: the notice goes on that day, not before.`);
  },
  paused: (c, t) => need(Boolean(c.project?.hold === "non_payment" && stepSent(c, aboutDoc(t, c)?.id, ["cp_launch_pause_em_en"])), "It says the work is paused: send the pause notice and carry it out first."),
  reminders_sent: (c, t) => {
    const d = aboutDoc(t, c);
    const ids = t.ladder === "M3" ? [...M1_IDS, ...M2_IDS] : M2_IDS;
    const ok = ids === M2_IDS ? Boolean(stepSent(c, d?.id, M2_IDS)) : Boolean(stepSent(c, d?.id, M1_IDS)) && Boolean(stepSent(c, d?.id, M2_IDS));
    return need(ok, "It names the dates the reminders were sent: send them first.");
  },
  verify_done: (c) => need(Boolean(c.project && isDone(pctx(c)!, "l_verify")), "It says you have just checked the live site: finish the go-live verification first."),
  rollback: (c) => need(Boolean(c.project?.rolledBackAt), "Record the rollback first."),
  handover_truth: (c) => {
    const p = c.project;
    if (!p) return "No project.";
    if (p.domainInClientName === "moved_to_them") return "This message says the domain was theirs from the start: write this one by hand.";
    if (p.domainInClientName !== "from_start") return "It says the domain has been in their name from the start: mark \"Domain in the client's name\" as \"Yes, from the start\" once you have checked it.";
    const pc = pctx(c)!;
    if (!launchPaid(pc)) return "It says the code became theirs with the final payment: the launch payment is not credited (an override does not change what this message may say).";
    return need(Boolean(p.dates.sourceTransferred), "It says the source code is theirs: hand it over first (h_source).");
  },
  handover_doc_issued: (c) => need(c.docs.some((d) => d.kind === "handover" && d.status === "issued"), "It points to the handover document: make it final first."),
  handover_unsigned: (c) => need(Boolean(c.project && !isDone(pctx(c)!, "h_signed")), "The signed handover page is back."),
  handover_signed: (c) => need(Boolean(c.project && isDone(pctx(c)!, "h_signed")), "The handover page is not back: send the day-7 reminder that says so instead."),
  week_since_live: (c) => { const g = c.project?.dates.goLive; return need(Boolean(g) && daysBetween(g!, todayOf(c)) >= 7, "It says the site has been live a week."); },
  no_s1s2: (c) => need(!(c.project && openIssues(c.project, ["S1", "S2"]).length), "An S1 or S2 issue is open: not while something is broken."),
  no_s1s2_7d: (c) => need(!s1s2Recent(c.project, todayOf(c)), "Not while something is broken, or in the week after something was broken (Testimonial-Request-Kit section 1)."),
  not_money_day: (c) => need(!(c.project && isMoneyDay(pctx(c)!)), "Not on a day an invoice reminder or a payment chase is due: it reads as a condition of being paid."),
  ask_3d_ago: (c) => { const s = c.project ? sendsOf({ project: c.project }, ["cp_feedback_testimonial_wa_hi", "cp_feedback_testimonial_em_en"])[0] : undefined; return need(Boolean(s) && daysBetween(indiaDate(s!.at), todayOf(c)) >= 3, "The nudge goes three days after the ask, once."); },
  quote_approved: (c) => need(["received", "permission_on_file"].includes(c.client.testimonial?.status || "") && Boolean(c.client.testimonial?.quote), "Record their approved words first (the consent line is about \"the words above\")."),
  removal_days: (c) => need(Boolean(c.settings.policy.removalDays), "Set the removal days in Settings > Client process first."),
  no_testimonials_yet: (c) => need(!c.anyTestimonialOnFile, "This e-mail says Ideovent has no testimonials yet: one is on file now. Use the WhatsApp ask."),
  no_decline_90d: (c) => { const d = c.client.testimonial?.declinedAt; return need(!d || daysBetween(indiaDate(d), todayOf(c)) >= 90, "They declined less than 90 days ago: never asked twice in the same quarter."); },
  no_plan: (c) => need(Boolean(c.project && !hasPlan(c.project)), "They chose a care plan."),
  issues_closed: (c) => need(Boolean(c.project && !openIssues(c.project).length), "It says every reported item has been fixed: close the open issues first."),
  access_removed: (c) => need(Boolean(c.project?.dates.accessRemoved), "It says Ideovent's access was removed: record the date first (s_access)."),
  plan_paid: (c) => {
    const inv = c.docs.find((d) => d.kind === "invoice" && d.milestone === "AMC" && d.status === "issued");
    return need(Boolean(inv) && isPaid(inv!, c.docs, c.payments), "The care plan's first payment is not credited yet.");
  },
  renewal_invoice_7d: (c) => {
    const inv = renewalInvoiceOf(c.docs, c.client.carePlan?.renewalOn);
    return need(Boolean(inv?.issuedOn) && daysBetween(inv!.issuedOn!, todayOf(c)) >= 7, "It says \"Invoice went over last week\": issue the renewal invoice first (T-14).");
  },
  renewal_paid: (c) => {
    const inv = renewalInvoiceOf(c.docs, c.client.carePlan?.renewalOn);
    return need(Boolean(inv) && isPaid(inv!, c.docs, c.payments), "It says the plan has renewed: cover begins when the payment is received (AMC cl. 8.2).");
  },
  not_renewed_unpaid: (c) => {
    const r = c.client.carePlan?.renewalOn;
    const inv = renewalInvoiceOf(c.docs, r);
    return need(Boolean(r) && todayOf(c) > r! && !(inv && isPaid(inv, c.docs, c.payments)), "The plan has not lapsed: it is renewed or its date has not passed.");
  },
  can_move_down: (c) => need(Boolean(c.client.carePlan) && c.client.carePlan!.plan !== "essential", "They are on Essential: there is no tier below it."),
  partners_yes: (c) => need(Boolean(c.project && approvalOf({ project: c.project }, "partners_terminate")), "Terminating needs both partners' written yes (SOP-09 note 5): record it first."),
  rounds_used_2: (c) => need((c.project?.rounds || []).filter((r) => r.sentAt).length >= 2, "It says both included rounds have been used."),
  round_2: (c) => need((c.project?.rounds || []).some((r) => r.n === 2 && r.sentAt), "This is the Round 2 note: send Round 2 first."),
  approval_recorded: (c) => need(Boolean(c.project && approvalOf({ project: c.project }, "d_ok")), "Record the client's approval first (the word \"approved\" in an e-mail)."),
  slip_client: (c) => need(Boolean(c.about?.slip && c.project?.goLiveHistory?.some((h) => h.to === c.about!.slip!.to && h.cause === "client")), "Record the go-live change, caused by the client, first."),
  slip_own: (c) => need(Boolean(c.about?.slip && c.project?.goLiveHistory?.some((h) => h.to === c.about!.slip!.to && h.cause === "ideovent")), "Record the go-live change, caused by Ideovent, first."),
  overdue_item: (c) => need(Boolean(c.about?.item), "Pick what you are waiting for."),
  days_15: (c) => need(Boolean(c.about?.item) && daysBetween(c.about!.item!.since, todayOf(c)) >= 15, "It says 15 days have passed."),
  days_45: (c) => need(Boolean(c.about?.item) && daysBetween(c.about!.item!.since, todayOf(c)) > 45, "It says more than 45 continuous days."),
  kickoff_held: (c) => need(Boolean(c.project && isDone(pctx(c)!, "k_call")), "It refers to the kickoff call: hold it first."),
  cr_selected: (c) => { const cr = c.project && c.about?.crNo ? c.project.changeRequests.find((x) => x.no === c.about!.crNo) : null; return need(Boolean(cr) && cr!.cost >= 0 && cr!.days >= 0, "Pick the change request, with its cost and days."); },
  issue_selected: (c) => need(Boolean(c.about?.issueId && c.project?.issues.some((i) => i.id === c.about!.issueId)), "Pick the issue this answers."),
  absorbed_requests: (c) => need(Boolean(c.project && ((c.project.waived || []).length > 0 || c.project.changeRequests.some((x) => x.status === "waived"))), "It says you have been absorbing requests: none was waived."),
  logo_and_text_missing: (c) => need(Boolean(c.project && !isDone(pctx(c)!, "c_logo") && !isDone(pctx(c)!, "c_text")), "It says the logo and the homepage text are both missing."),
  winback_replied: (c) => need(Boolean(c.client.winback?.repliedAt), "Only if they replied to the findings (AMC-SALES-GUIDE section 12, step 3)."),
  work_to_date_invoice: (c, t) => { const d = aboutDoc(t, c); return need(Boolean(d && d.kind === "invoice" && d.status === "issued" && d.data?.workToDate), "Issue the invoice for work to date first (cl. 4.5)."); },
};

/* ── The send check ─────────────────────────────────────────────────────── */

export interface ClientSendCheck {
  blockers: string[];
  warnings: string[];
}

const DASH_RE = new RegExp(`[${String.fromCharCode(8212)}${String.fromCharCode(8211)}]`);

/** The documents an e-mail attaches that must be issued, resolved for this project. */
export function attachmentsOf(t: ClientTemplate, c: ComposeCtx): { label: string; doc: CrmDocument | null; required: boolean }[] {
  const out: { label: string; doc: CrmDocument | null; required: boolean }[] = [];
  for (const a of t.attaches || []) {
    if (a.byHand) {
      out.push({ label: a.byHand, doc: null, required: true });
      continue;
    }
    let doc: CrmDocument | null = null;
    if (a.which === "about" || !a.doc) {
      doc = aboutDoc(t, c);
      if (doc && a.doc && doc.kind !== a.doc) doc = null;
      if (!doc && a.doc && a.which === "about" && a.doc !== "receipt") doc = latestIssued(c, a.doc, a.milestone);
      if (a.doc === "receipt") {
        const pay = aboutPayment(c);
        doc = pay ? c.docs.find((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === pay.id) || null : null;
      }
    } else {
      doc = latestIssued(c, a.doc, a.milestone);
    }
    if (a.optional && !doc) continue;
    out.push({ label: doc?.number || (a.doc ? DOC_LABEL[a.doc] : "the document"), doc, required: !a.optional });
  }
  return out;
}

const DOC_LABEL: Record<string, string> = {
  quotation: "the quotation", proforma: "the proforma", invoice: "the invoice", receipt: "the receipt", credit_note: "the credit note",
  welcome: "the welcome pack", handover: "the handover document", care_plan: "the care plan options", closing: "the closing letter", change_request: "the change request form",
};

function latestIssued(c: ComposeCtx, kind: CrmDocument["kind"], milestone?: CrmDocument["milestone"]): CrmDocument | null {
  if (kind === "change_request" && c.about?.crNo) return c.docs.find((d) => d.kind === kind && d.data?.crNo === c.about!.crNo && d.status === "issued") || null;
  return [...c.docs].filter((d) => d.kind === kind && d.status === "issued" && (!milestone || d.milestone === milestone))
    .sort((a, b) => (b.issuedOn || "").localeCompare(a.issuedOn || ""))[0] || null;
}

/** The number a WhatsApp goes to: their WhatsApp, else their phone. */
export const clientWhatsapp = (cl: CrmClient) => normalisePhone(cl.whatsapp) || normalisePhone(cl.phone);

export function checkClientSend(
  t: ClientTemplate,
  r: { subject?: string; body: string },
  c: ComposeCtx,
  opts: { attachedConfirmed?: boolean } = {},
): ClientSendCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const dnc = c.lead ? c.lead.status === "do_not_contact" : c.client.dnc === true;
  if (dnc || c.client.dnc) blockers.push("This client is marked do not contact.");
  if (t.channel === "whatsapp" && metaConsentRefused(c.lead || { metaConsent: c.client.metaConsent })) {
    blockers.push("They did not tick the box on the Facebook or Instagram form that allows WhatsApp and calls. E-mail them only.");
  }
  if (t.channel === "whatsapp" && !clientWhatsapp(c.client)) blockers.push("No WhatsApp or phone number on the client card.");
  if (t.channel === "email" && !safeMailAddress(c.client.email)) blockers.push(c.client.email ? "The e-mail address on the client card cannot go in a link: check it." : "No e-mail address on the client card.");
  if (t.channel === "email" && (r.subject || "").length > MAX_SUBJECT) blockers.push(`The subject is longer than ${MAX_SUBJECT} characters.`);
  const holes = unfilledPlaceholders(`${r.subject || ""}\n${r.body}`);
  if (holes.length) blockers.push(`Fill in ${holes.join(" and ")} before sending.`);
  if (DASH_RE.test(`${r.subject || ""}${r.body}`)) blockers.push("The text contains a dash character; use a comma.");
  for (const id of t.needs || []) {
    const why = NEEDS[id](c, t);
    if (why) blockers.push(why);
  }
  if (c.client.inIndia === false && (t.money || (t.attaches || []).some((a) => a.doc && ["quotation", "proforma", "invoice", "receipt", "credit_note"].includes(a.doc)))) {
    const msg = "Clients outside India: the MSA and the export invoice in 03-legal-docs govern (not in the CRM yet).";
    if (!blockers.includes(msg)) blockers.push(msg);
  }
  if (t.channel === "email") {
    const att = attachmentsOf(t, c);
    for (const a of att) if (!a.doc && a.required && !(t.attaches || []).find((x) => x.byHand === a.label)) blockers.push(`Issue ${a.label} first: this e-mail attaches it.`);
    if (att.length && !opts.attachedConfirmed) blockers.push(`Tick "I attached: ${att.map((a) => a.label).join(", ")}" once the files are attached in your mail app.`);
  }
  const quietStart = c.quietStart || "20:00";
  const quietEnd = c.quietEnd || "10:00";
  if (inQuietHours(c.now, quietStart, quietEnd)) warnings.push(`It is ${indiaTime(c.now)} in India: quiet hours (${quietStart} to ${quietEnd}). You decide.`);
  if (weekdayOf(todayOf(c)) === 0) warnings.push("It is Sunday. You decide.");
  if (needsApproval(t) && !c.settings.approvedWording[t.id]) warnings.push("New wording: approve it once in Settings > Client process.");
  const recent = [...(c.project?.sends || []), ...(c.client.sends || [])].some((s) => s.t === t.id && c.now.getTime() - Date.parse(s.at) < 864e5);
  if (recent) warnings.push("The same message went to this client in the last 24 hours.");
  return { blockers, warnings };
}

/* ── Suggestions for a blank: the project's own figures, never a price list ─ */

export function clientSuggestionsFor(name: string, c: ComposeCtx): string[] {
  const n = name.toLowerCase();
  if (/amount|fee|price|cost|rs\b|rupee|balance|kitna/.test(n)) {
    const out: string[] = [];
    const p = c.project;
    const fee = p ? feeOf(p) : null;
    if (fee !== null) out.push(inrGroup(fee), inrGroup(advanceOf(fee)), inrGroup(fee - advanceOf(fee)));
    const doc = aboutDoc(null, c);
    if (doc) out.push(inrGroup(Math.max(0, docBalance(doc, c.docs, c.payments))));
    return [...new Set(out)];
  }
  if (/date|day|din|tarikh|taareekh|when|kab|by\b/.test(n)) {
    const out: string[] = [];
    let d = todayOf(c);
    while (out.length < 6) {
      d = addDays(d, 1);
      if (isWorkingDay(d)) out.push(fmtMeeting(d));
    }
    return out;
  }
  return [];
}

/* ── Sending: the links, and what a send records ────────────────────────── */

export interface ClientSendLinks {
  whatsapp?: string;
  whatsappWeb?: string;
  zoho?: ZohoLink | null;
  mailto?: string;
}

export function sendLinksFor(t: ClientTemplate, r: { subject?: string; body: string }, c: ComposeCtx, zohoSetting?: string | null): ClientSendLinks {
  if (t.channel === "whatsapp") {
    const n = clientWhatsapp(c.client);
    return n ? { whatsapp: whatsappUrl(n, r.body), whatsappWeb: whatsappWebUrl(n, r.body) } : {};
  }
  const to = safeMailAddress(c.client.email);
  if (!to) return {};
  return { zoho: zohoComposeLink({ to, subject: r.subject || "", body: r.body }, zohoSetting), mailto: mailtoUrl({ to, subject: r.subject || "", body: r.body }) };
}

/** Dates a send sets on the project the first time (spec 9, 11.1 anchors). */
const SEND_DATES: Record<string, keyof CrmProject["dates"]> = {
  cp_proposal_send_em_en: "proposalSent", cp_proposal_send_em_hi: "proposalSent", cp_proposal_send_wa_hi: "proposalSent", cp_proposal_send_wa_en: "proposalSent",
  cp_proposal_full_em_en: "proposalSent", cp_proposal_full_wa_hi: "proposalSent", cp_agreement_paperwork_em_en: "paperworkSent",
  cp_kickoff_summary_em_en: "summarySent", cp_design_wireframes_em_en: "wireframesSent", cp_review_accuracy_em_en: "reviewNotice",
  cp_launch_golive_em_en: "goAheadAsked", cp_handover_doc_em_en: "handover",
};

/**
 * What one send records on the project: the send itself (template, channel, the document or item it was
 * about), the items the template completes, the dates it starts, a design round's step, and the pause
 * notice's hold. The screen also writes a "sent" line on the client's timeline (never a lead "sent" line,
 * decision 5).
 */
export function afterSend(p: CrmProject, t: ClientTemplate, channel: "whatsapp" | "email", about: MessageAbout | undefined, now: Date): CrmProject {
  const at = now.toISOString();
  const day = indiaDate(now);
  const docKey = about?.docId || (about?.item ? `item:${about.item.key}` : about?.paymentId ? `pay:${about.paymentId}` : undefined);
  const sends = [...(p.sends || []), { t: t.id, at, ch: channel, ...(docKey ? { doc: docKey } : {}) }];
  const checklist = { ...(p.checklist || {}) };
  for (const id of t.ticks || []) if (!checklist[id] || checklist[id].state !== "done") checklist[id] = { state: "done", at, via: t.id };
  const dates = { ...p.dates };
  const key = SEND_DATES[t.id];
  if (key && !dates[key]) dates[key] = day;
  let rounds = p.rounds || [];
  if (t.id === "cp_design_review_em_en") {
    const n = about?.roundN || (rounds.filter((r) => r.sentAt).length + 1);
    const exists = rounds.some((r) => r.n === n);
    rounds = exists ? rounds.map((r) => (r.n === n ? { ...r, sentAt: r.sentAt || at } : r)) : [...rounds, { stage: p.designStages?.[0] || "Design", n, sentAt: at }];
  }
  if (t.id === "cp_design_buckets_wa_hi") {
    const n = about?.roundN || Math.max(1, ...rounds.filter((r) => r.sentAt).map((r) => r.n));
    rounds = rounds.map((r) => (r.n === n ? { ...r, listAt: r.listAt || at } : r));
  }
  if (t.id === "cp_design_round_done_em_en") {
    const n = about?.roundN || Math.max(1, ...rounds.filter((r) => r.sentAt).map((r) => r.n));
    rounds = rounds.map((r) => (r.n === n ? { ...r, doneAt: r.doneAt || at } : r));
  }
  let hold = p.hold;
  if (t.id === "cp_launch_pause_em_en") {
    hold = "non_payment";
    dates.paused = dates.paused || day;
    dates.holdSince = dates.holdSince || day;
  }
  if (t.id === "cp_proposal_d5_wa_hi" && !checklist.p_d5) checklist.p_d5 = { state: "done", at, via: t.id, note: "no answer" };
  return { ...p, sends, checklist, dates, rounds, hold };
}

/** The template a timeline line names (a deleted or renamed one stays readable). */
export const templateLabel = (id?: string | null) => (id && TEMPLATE_BY_ID[id]?.label) || id || "";

/** A blank's own regular expression, for the screens (the same as the lead page's). */
export const BLANK_RE = PLACEHOLDER_RE;

/**
 * For a client-level message (renewals, win-back): the client's own documents and payments, and the live address
 * of the latest site Ideovent built for this client (from this client's projects only, decision 17).
 */
export function clientCtx(client: CrmClient, docs: CrmDocument[], payments: CrmPayment[], settings: ClientSettings, now: Date, projects: CrmProject[] = []): ComposeCtx {
  const built = projects.filter((p) => p.clientId === client.id && has(p.liveUrl))
    .sort((a, b) => (b.dates.goLive || b.createdAt || "").localeCompare(a.dates.goLive || a.createdAt || ""))[0];
  return {
    client, project: null, settings, now,
    docs: docs.filter((d) => d.clientId === client.id && !d.projectId),
    payments: payments.filter((p) => p.clientId === client.id && !p.projectId),
    ...(built ? { builtSite: built.liveUrl } : {}),
  };
}

/** For a project message: that project's documents and payments only (decision 17). */
export function projectCtx(client: CrmClient, project: CrmProject, docs: CrmDocument[], payments: CrmPayment[], settings: ClientSettings, now: Date): ComposeCtx {
  return {
    client, project, settings, now,
    docs: docs.filter((d) => d.projectId === project.id || (d.clientId === client.id && !d.projectId && d.milestone === "AMC")),
    payments: payments.filter((p) => p.projectId === project.id || (p.clientId === client.id && !p.projectId)),
  };
}

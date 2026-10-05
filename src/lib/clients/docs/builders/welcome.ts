/**
 * The welcome pack (client-process-spec 6.6): a new composition, every sentence from a named source,
 * approved by Mehdi once (Settings > Client process). Thirteen sections in this order. A fact not known
 * yet prints the fixed phrase the spec gives, never a guess; the reply-time and working-hours sentences
 * are left out until Settings has them. A client outside India gets no money section (decision 16).
 * No Udyam number, no bank details, no claims beyond these sentences. Blocks on the project name and the
 * contact name.
 */
import { advanceOf, CARE_PLANS, contractValueOf, feeOf, inrGroup, splitParts } from "../../money";
import { fmtDate, fmtMeeting, WEEKDAY_NAMES } from "../../numbering";
import { advanceProformas, creditDate } from "../../stages";
import { HOURLY_RATE } from "@/lib/pricing";
import type { DocCtx } from "../context";
import type { Block, DocModel } from "../model";
import { GST_LINE, projectName } from "./common";

/** The approved bios (FACTS.md, "CORRECTION, 1 Oct 2026", item 6), word for word. */
export const BIOS = {
  mehdi: "Mehdi Alam, Software Developer and Partner. A partner in the firm and the developer who writes your code. He started Ideovent in 2019, before college, and has built production software at Finolity Consultancy, the International Water Management Institute and Witness The Fitness, where he worked on the WTFGO gym platform. You talk to him about scope, timelines and price.",
  abhishek: "Abhishek Tiwari, Product Manager and Partner. A partner in the firm. He turns what you ask for into a written scope with clear acceptance criteria, and every change is agreed in writing before it is built, so what you approved is what you get.",
  saif: "Saif Ali, Senior App Developer. Builds the apps in our client projects, from the first screen to the release.",
  abhilasha: "Abhilasha Kumari, Developer. Builds the React front-ends of our websites and web apps: the part your customers see and use.",
} as const;

/** The SOW section 12 milestones, cells word for word (Statement-of-Work-Template section 12). */
function milestoneRows(c: DocCtx, domain: string): string[][] {
  const p = c.project;
  const dt = (iso?: string) => (iso ? fmtDate(iso) : "fixed at kickoff");
  const support = p?.dates.goLive || p?.dates.goLiveTarget;
  // The section numbers are the SOW's, so the pack says so ("SOW section 9"): the pack itself has no section 9.
  return [
    ["M0 Kickoff", "Project plan, staging URL reserved, kickoff checklist confirmed", "Signs SOW, pays advance, names contacts", dt(p?.dates.kickoff)],
    ["M1 Content and access cut-off", "Confirms what has been received", "Supplies everything in SOW section 9", dt(p?.dates.contentCutoff)],
    ["M2 Design approval", "Layouts for every page in SOW section 6", "Approves or sends one consolidated response", dt(p?.dates.designApproved)],
    ["M3 Build complete on staging", "Every feature in SOW section 7 working on staging", "Reviews within the window in SOW section 11", dt(p?.dates.reviewNotice)],
    ["M4 Go-live", `Deployment to ${domain} with HTTPS`, "Confirms DNS and gives final approval", dt(p?.dates.goLiveTarget)],
    ["M5 Handover", "Credentials, how-to notes, handover session", "Attends the session", support && p?.dates.handover ? fmtDate(p.dates.handover) : "fixed at kickoff"],
  ];
}

export function buildWelcome(c: DocCtx): DocModel {
  const cl = c.client;
  const p = c.project;
  const s = c.settings;
  const inIndia = cl.inIndia !== false;
  const fee = p ? feeOf(p) : null;
  const total = p ? contractValueOf(p) : null;
  const adv = fee !== null ? advanceOf(fee) : null;
  const split = p ? splitParts(p) : null;
  const pctx = p ? { client: cl, project: p, docs: c.docs, payments: c.payments, settings: s, today: c.today } : null;
  const pis = pctx ? advanceProformas(pctx) : [];
  const credited = c.payments.filter((x) => x.status === "recorded" && pis.some((d) => d.id === x.againstDoc));
  const receiptOf = (payId: string) => c.docs.find((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === payId)?.number;
  const contact = (cl.contactName || "").trim() || "[contact name]";
  const domain = p?.domainName || "your domain";
  const rate = inrGroup(s.policy.hourlyRate || HOURLY_RATE);
  const restart = inrGroup(s.policy.restartFee || 4000);
  const weekly = p?.weeklyUpdateDay ? WEEKDAY_NAMES[p.weeklyUpdateDay] : null;
  const dueBy = (label: string) => {
    const row = (p?.content || []).find((r) => r.label.toLowerCase().includes(label) && r.due);
    return row?.due ? `by ${fmtDate(row.due)}` : "by the date we agree at kickoff";
  };

  const glance: [string, string][] = [
    ["Project", projectName(p)],
    ["Scope document", `Statement of Work ${p?.sowRef || "[SOW reference]"}`],
  ];
  if (inIndia) {
    glance.push(["Total fee", total !== null ? `Rs. ${inrGroup(total)}` : "[total fee]"]);
    if (split && p?.splitAdvance) {
      for (const pay of credited) glance.push(["Advance received", `Rs. ${inrGroup(pay.amount + pay.tds)} on ${fmtDate(pay.receivedOn)}${receiptOf(pay.id) ? `, receipt ${receiptOf(pay.id)}` : ""}`]);
      const paid = credited.reduce((sum, x) => sum + x.amount + x.tds, 0);
      if (paid < (adv || 0)) glance.push(["Advance still to come", `Rs. ${inrGroup((adv || 0) - paid)} due on ${fmtDate(p.splitAdvance.part2DueOn)}`]);
    } else {
      const first = credited[0];
      const date = pctx ? creditDate(pctx) : null;
      glance.push(["Advance received", first ? `Rs. ${inrGroup(credited.reduce((sum, x) => sum + x.amount + x.tds, 0))} on ${fmtDate(date || first.receivedOn)}${receiptOf(first.id) ? `, receipt ${receiptOf(first.id)}` : ""}` : "[advance received]"]);
    }
    glance.push(["Balance at launch", fee !== null && adv !== null ? `Rs. ${inrGroup(fee - adv)}` : "[launch amount]"]);
  }
  glance.push(["Your point of contact", p?.pointOfContact || "named at our kickoff call"]);
  glance.push(["Kickoff call", p?.dates.kickoff ? fmtMeeting(p.dates.kickoff, p.kickoffTime) : "we fix it together this week"]);

  const how: string[] = [
    "Approvals and sign-offs go by e-mail to contact@ideovent.in, so both of us have a record. If you approve on WhatsApp or on a call, we will put it in an e-mail the same day and ask you to reply 'confirmed'.",
    "Quick questions on WhatsApp at +91 77619 21786.",
    `A written update every ${weekly || "week, on a day we fix at kickoff"}, whether or not there is news.`,
  ];
  if (s.policy.projectReplyTarget?.trim()) how.push(`We reply to project messages within ${s.policy.projectReplyTarget.trim()}, counted in working hours.`);
  if (s.policy.workingHours?.trim()) how.push(`Working days and hours: ${s.policy.workingHours.trim()}.`);
  how.push("You have 7 calendar days to review each deliverable and send one consolidated response. No written response in that time counts as acceptance.");

  const blocks: Block[] = [
    { type: "heading", text: "Thank you" },
    // "everything in it is also in the agreement" was not true: the bios, the weekly update, the WhatsApp number,
    // the care plan prices and the password rule are not in the Service Agreement. What the pack says about
    // payments, dates, revisions and ownership is, and the agreement governs (SA cl. 2.5; Quotation section 7).
    { type: "paragraph", text: "Thank you for choosing us. This pack is what happens next, what we need from you, and how we work together. Keep it. What it says about payments, dates, revisions and ownership comes from the agreement you signed, and if the two ever differ, the agreement governs." },
    { type: "heading", text: "Who you are working with" },
    { type: "paragraph", text: "Ideovent Technologies is a partnership firm of two partners, Mehdi Alam and Abhishek Tiwari, in Saket, New Delhi." },
    { type: "bullets", items: [BIOS.mehdi, BIOS.abhishek] },
  ];
  const also = (p?.alsoOnProject || []).map((k) => BIOS[k]);
  if (also.length) blocks.push({ type: "paragraph", text: "Also on your project:" }, { type: "bullets", items: also });
  blocks.push(
    { type: "heading", text: "Your project at a glance" },
    { type: "keyValue", rows: glance },
  );
  if (inIndia) blocks.push({ type: "paragraph", text: GST_LINE });
  blocks.push(
    { type: "heading", text: "What happens next" },
    { type: "table", columns: [{ label: "Milestone", width: 34 }, { label: "Ideovent delivers", width: 56 }, { label: "You do", width: 50 }, { label: "Date", width: 34 }], rows: milestoneRows(c, domain) },
    { type: "paragraph", text: `The indicative timeline is ${p?.durationWeeks || "[weeks]"} weeks of working time, counted from the later of two dates: the day the advance is received, and the day your content and access are with us.` },
    { type: "paragraph", text: "After go-live: 30 days of free defect fixes." },
    { type: "heading", text: "What we need from you, and by when" },
    { type: "bullets", items: [
      `The onboarding form, completed, ${dueBy("onboarding")}.`,
      `Your logo in vector form (.ai, .svg, .eps or .pdf), ${dueBy("logo")}.`,
      `Page text for every page in the content checklist, by the content cut-off date${p?.dates.contentCutoff ? ` (${fmtDate(p.dates.contentCutoff)})` : ""}.`,
      `Images, original files, 1600px or wider, that you have the right to use, ${dueBy("image")}.`,
      "Hosting and domain registrar access (see \"Keeping your accounts safe\").",
      "One person who can approve on your side, and someone we can reach if they are away for three working days.",
    ] },
    { type: "heading", text: "How we work together" },
    { type: "bullets", items: how },
    { type: "heading", text: "Revisions and changes" },
    { type: "bullets", items: [
      "Two rounds of revisions are included at each design stage. A round is one consolidated written list of change points.",
      "Agreeing the structure first, on plain grey wireframes, does not use a round.",
      `Something new (a page, a feature, a new layout idea) is a change request: we price it and date it on a short form, and you decide with the number in front of you. Work on it starts once the form is signed and its advance is paid. Extra rounds and work outside the scope are charged at Rs. ${rate} per hour.`,
    ] },
  );
  if (inIndia) {
    const paid = credited.reduce((sum, x) => sum + x.amount + x.tds, 0);
    const first = split && p?.splitAdvance
      ? `The 50% advance: Rs. ${inrGroup(paid)} received with thanks, and Rs. ${inrGroup(Math.max(0, (adv || 0) - paid))} due on ${fmtDate(p.splitAdvance.part2DueOn)}, as agreed.`
      : "50% advance, received with thanks.";
    blocks.push(
      { type: "heading", text: "Payments" },
      { type: "bullets", items: [
        `${first} 50% at launch: when you accept the finished work on the staging link, before it goes live. Going live, the source code, the design files and the admin credentials follow that payment.`,
        "Invoices are payable within 7 days of their date. Overdue amounts carry interest at 1.5% per month. If an invoice is more than 7 days overdue, work may pause on written notice.",
        "Pay by bank transfer or UPI to the account on the invoice, quoting the invoice number. A receipt follows every payment.",
        GST_LINE,
      ] },
    );
  }
  blocks.push(
    { type: "heading", text: "When dates move" },
    { type: "bullets", items: [
      "If something we need from you is late, the dates after it move day for day. That is arithmetic, not a penalty, and we will tell you on the day it happens rather than at the end.",
      // SA cl. 4.5 says "Ideovent may": a right, not something that happens by itself.
      `If an input or approval is more than 15 days late, we may move our people to other work and reschedule. If the project is held up for more than 45 continuous days, we may invoice the work done so far and charge a restart fee of Rs. ${restart} before we resume.`,
    ] },
    { type: "heading", text: "What you own" },
    { type: "bullets", items: [
      "Your domain is yours: where we register one for you, it is registered in your name, not ours.",
      "On the final payment, the custom source code, the design files and the finished site are assigned to you, and we hand over the source code and the administrator credentials. Our own reusable components stay ours, and you get a permanent licence to use them as part of your site.",
      "Everything you give us (text, photographs, logo) stays yours.",
    ] },
    { type: "heading", text: "After launch" },
    { type: "bullets", items: [
      "For 30 days from go-live we fix defects free of charge: anything that does not work the way the scope document says it would. New features, content changes and design changes are not defects.",
      `After that, support is available under a care plan or at Rs. ${rate} per hour, agreed in writing before work starts. No care plan is compulsory.`,
      ...(inIndia ? (Object.values(CARE_PLANS).map((pl) => `${pl.name}: Rs. ${inrGroup(pl.monthly)} a month, or Rs. ${inrGroup(pl.yearly)} a year paid in advance.`)) : []),
    ] },
    { type: "heading", text: "Keeping your accounts safe" },
    { type: "bullets", items: [
      "Never send a password by e-mail or WhatsApp. Where we need access, add us as a separate user on your own account, or we will send you a one-time secure link that stops working once it is opened.",
      "Ideovent will never e-mail you a password, and will never ask you to e-mail one. If a message appears to come from Ideovent asking for a password, a one-time code or a payment to a new account, it is not from Ideovent. Telephone +91 77619 21786 and check before you act on it.",
    ] },
    { type: "heading", text: "Who to contact" },
    { type: "paragraph", text: "Mehdi Alam · +91 77619 21786 (calls and WhatsApp) · contact@ideovent.in · www.ideovent.in · Ideovent Technologies, Saket, New Delhi, India" },
  );
  return {
    title: "Welcome to Ideovent Technologies",
    subtitle: `${projectName(p)} · ${cl.orgName} · {{issuedOn}}`,
    fileName: "welcome",
    requires: contact === "[contact name]" ? ["[contact name]"] : [],
    blocks,
  };
}

/** The welcome pack's thirteen headings (the docs test checks them). */
export const WELCOME_HEADINGS = [
  "Thank you", "Who you are working with", "Your project at a glance", "What happens next", "What we need from you, and by when",
  "How we work together", "Revisions and changes", "Payments", "When dates move", "What you own", "After launch",
  "Keeping your accounts safe", "Who to contact",
];

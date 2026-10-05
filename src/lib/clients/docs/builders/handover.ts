/**
 * The handover document (03-legal-docs/forms/Project-Handover-Document.md sections 1 to 11, in its order,
 * with its own words; client-process-spec 6.7). The transfer record comes from the access record (h_access)
 * and carries "No password is written in this table, only the method and the date." The deliverables are
 * copied word for word from the SOW. The severity table has its response column only when Settings has
 * P1 to P3, and the working-hours sentence only when set. A fact the CRM does not hold prints the form's
 * own ink line (______), never a guess. Blocks on the live URL, the domain, the go-live date, the
 * deliverables, the domain registered in the client's name, section 11's "Received on" (the launch
 * payment: it waits for l_paid) and the signatory.
 */
import { CARE_PLANS, inrGroup } from "../../money";
import { fmtDate } from "../../numbering";
import { launchInvoice, supportWindow } from "../../stages";
import type { DocCtx } from "../context";
import type { Block, DocModel } from "../model";
import { AUTHORISED, GST_LINE, legalName, projectName, signatory } from "./common";
import { carePlanBlocks } from "./carePlan";

const INK = "______";
const METHOD: Record<string, string> = { own_email_invite: "Admin account on their own e-mail", one_time_link: "One-time secret link, username by the other channel", not_applicable: "Not applicable" };

export function buildHandover(c: DocCtx): DocModel {
  const cl = c.client;
  const p = c.project;
  const s = c.settings;
  const h = p?.handover || {};
  const v = (k: string) => (h[k] || "").trim() || INK;
  const legal = legalName(cl);
  const sow = p?.sowRef || "[SOW reference]";
  const goLive = p?.dates.goLive ? fmtDate(p.dates.goLive) : "[go-live date]";
  const win = p ? supportWindow(p) : null;
  const end = win ? fmtDate(win.end) : "[support end date]";
  const domainYes = p?.domainInClientName === "from_start" || p?.domainInClientName === "moved_to_them";
  const pctx = p ? { client: cl, project: p, docs: c.docs, payments: c.payments, settings: s, today: c.today } : null;
  const inv = pctx ? launchInvoice(pctx) : null;
  const finalPay = inv ? c.payments.filter((x) => x.status === "recorded" && x.againstDoc === inv.id).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn))[0] : null;
  const ren = cl.renewals || {};
  const tool = (s.policy.secretTool || "").trim();
  const responses = [s.policy.p1, s.policy.p2, s.policy.p3].every((x) => (x || "").trim());
  const deliverables = p?.deliverables || [];
  const open = (p?.issues || []).filter((i) => i.status === "open");
  // The form was written for a school. Its school-only words (parents and students, the admission form, circulars)
  // follow the client's kind, as the messages do (E3, E11, E16): every other sentence is the form's own.
  const kind = cl.kind;
  const audience = kind === "school" ? "your parents and students" : kind === "coaching" ? "your students" : kind === "dental" ? "your patients" : "your customers";
  const readers = kind === "school" ? "Parents" : kind === "coaching" ? "Students" : kind === "dental" ? "Patients" : "Visitors";
  const mainForm = kind === "school" || kind === "coaching" ? "Admission form" : kind === "dental" ? "Appointment form" : "Enquiry form";

  const access = (p?.access || []).map((r) => [r.system, r.username || INK, r.method ? METHOD[r.method] : INK, r.transferredOn ? fmtDate(r.transferredOn) : INK, r.changedByClient ? "Yes" : "No"]);
  const severity = responses
    ? { columns: [{ label: "Severity", width: 26 }, { label: "What it means", width: 54 }, { label: "Examples", width: 56 }, { label: "First response target", width: 38 }], rows: [
      ["1 Critical", "The site is unreachable, or something central to it cannot be used at all.", `Site down. ${mainForm} fails for everyone. Payment page broken. Security incident.`, s.policy.p1!.trim()],
      ["2 Major", "An important function is wrong or unusable, but the site works.", "A page will not load. Images missing on mobile. Enquiry emails not arriving.", s.policy.p2!.trim()],
      ["3 Minor", "Something is wrong but nothing is blocked.", "A typo Ideovent introduced, a misaligned element on one screen size, a broken link.", s.policy.p3!.trim()],
      ["Not a defect", "It works as specified, and the request is a change.", "New page, new feature, content update, design change.", "Quoted as a change request"],
    ] }
    : { columns: [{ label: "Severity", width: 30 }, { label: "What it means", width: 70 }, { label: "Examples", width: 74 }], rows: [
      ["1 Critical", "The site is unreachable, or something central to it cannot be used at all.", `Site down. ${mainForm} fails for everyone. Payment page broken. Security incident.`],
      ["2 Major", "An important function is wrong or unusable, but the site works.", "A page will not load. Images missing on mobile. Enquiry emails not arriving."],
      ["3 Minor", "Something is wrong but nothing is blocked.", "A typo Ideovent introduced, a misaligned element on one screen size, a broken link."],
      ["Not a defect", "It works as specified, and the request is a change.", "New page, new feature, content update, design change. Quoted as a change request."],
    ] };
  const supportBullets = [
    "A first-response target is a commitment to reply and say what is happening, not a promise that every fault is repaired within that time. A one-line change and a database repair are not the same job.",
    ...((s.policy.workingHours || "").trim() ? [`Response targets are counted in Ideovent's working hours, ${s.policy.workingHours!.trim()} IST, and not in calendar hours. A request that arrives on a Sunday evening is answered against the target from the start of the next working day.`] : []),
    "At the end of the window Ideovent sends a short closing note listing everything reported, what was done and anything left open by agreement.",
    `After the window, support is available under a care plan or at Rs. ${inrGroup(s.policy.hourlyRate || 1000)} per hour, pre-approved in writing before any work starts. GST not applicable. Supplier is not registered under GST.`,
  ];
  const renewalRow = (what: string, key: "domain" | "hosting" | "ssl" | "email") => {
    const r = ren[key];
    return [what, r?.provider || INK, r?.inWhoseName || (key === "domain" && domainYes ? legal : INK), r?.renewsOn ? fmtDate(r.renewsOn) : INK, r?.cost || INK, r?.whoPays || INK, INK];
  };
  const plan = cl.carePlan;

  const blocks: Block[] = [
    { type: "paragraph", text: `Client ${legal} · Project ${projectName(p)} · SOW ${sow} · Go-live ${goLive} · Handover {{issuedOn}} · Support window ends ${end}`, muted: true, size: 8.5 },
    { type: "paragraph", text: `This document is the end of the build and the beginning of ownership. Everything Ideovent made for you under Statement of Work ${sow} is listed here, along with where it lives, who can get into it, and what to do when something needs attention.` },
    { type: "paragraph", text: "Keep it. In two years, when somebody asks where the domain is registered or who to call about the SSL certificate, this is the page that answers it. Save a copy somewhere that does not depend on one person's inbox." },
    { type: "heading", text: "1. What is live, and where" },
    { type: "table", columns: [{ label: "Field", width: 46 }, { label: "Value", width: 60 }, { label: "Note", width: 68 }], rows: [
      ["Live website", p?.liveUrl || "[live address]", ""],
      ["Redirects in place from", v("redirects"), "Old URLs, the www / non-www pair, and any additional domains."],
      ["Admin panel", p?.adminUrl || INK, "Bookmark it. It is not linked from the public site, by design."],
      ["Staging or preview site", p?.stagingUrl || INK, "If one exists. Do not publish or share this address. It is a copy, and changes made there do not reach the live site."],
      ["Payment gateway dashboard", v("gateway"), "In your own name, against your own KYC. Ideovent has no standing access to it."],
      ["Analytics", v("analytics"), "Google Analytics property, under an account you own."],
      ["Search Console", v("searchConsole"), ""],
      ["Google Business Profile", v("gbp"), ""],
      ["Source code repository", p?.repo || INK, "Where the code is held, and on what terms, see section 4 and the Service Agreement on intellectual property."],
      ["Site launched on", goLive, ""],
    ] },
    { type: "heading", text: "2. Credential transfer" },
    { type: "paragraph", text: "Passwords are the part of a handover that most agencies do badly, and it is the part that causes real damage later. The rule Ideovent follows is simple and it does not bend: a password is never sent by email, never sent as a WhatsApp message, never written into a document, and never put in a shared spreadsheet." },
    { type: "paragraph", text: "The reason is not paranoia. An email exists on at least four servers, stays there for years, is searchable by anyone who later gains access to either mailbox, and gets forwarded without thinking. A password in a WhatsApp thread lives in an unencrypted phone backup. A password in a document survives every copy of that document ever made." },
    { type: "callout", title: "The one rule worth memorising", lines: ["Ideovent will never email you a password, and will never ask you to email one. If a message appears to come from Ideovent asking for a password, a one-time code or a payment to a new account, it is not from Ideovent. Telephone +91 77619 21786 and check before you act on it."] },
    { type: "heading", text: "How access is actually handed over", level: 2 },
    { type: "bullets", numbered: true, items: [
      "Where possible, no password is transferred at all. Ideovent creates an administrator account against your own email address. The system sends you a link, you set your own password, and Ideovent never knows it. This is the method used wherever the platform supports it, and it is the only method that leaves no copy of a secret anywhere.",
      `Where a password genuinely must be handed over, it goes through a one-time secret link. The password is placed in a service that destroys it the moment it is opened${tool ? `, for example ${tool}` : ""}. You receive a link, you open it once, and it stops existing. If the link is already dead when you open it, tell Ideovent immediately: it means somebody else opened it, and the credential is rotated the same hour.`,
      "The username and the secret link travel on different channels. Username by email, the one-time link by WhatsApp, or the other way round. Never both in the same thread. Anyone who gets into one channel then has half of nothing.",
      "You change the password on first login. Even when it arrived by a one-time link. From that moment the only person who knows your administrator password is you, which is the correct number of people.",
      "Two-factor authentication is switched on wherever it is available. Domain registrar, hosting account, Google account and payment gateway at minimum. Most account takeovers are a guessed or reused password, and two-factor authentication stops almost all of them.",
      "Everyone gets their own login. Nobody shares one. A single shared \"admin\" account that four people use cannot be audited and cannot be revoked when one of them leaves. Separate accounts can be removed one at a time.",
      "Ideovent's own access is reduced at the end of the support window. During the thirty-day window Ideovent holds the access it needs to fix defects. At the end of it, that access is removed unless a care plan is running, and the removal is confirmed to you in writing. If you would rather it was removed on day one, say so and it will be.",
      "Nothing here is retrospective. Rotate anything that was ever emailed. If a password for any of these systems was sent by email or message at any point during the project (by anybody, to anybody) change it this week. Treat it as known.",
    ] },
    { type: "heading", text: "Transfer record", level: 2 },
    { type: "paragraph", text: "No password is written in this table, only the method and the date." },
    { type: "table", columns: [{ label: "System", width: 40 }, { label: "Account / username", width: 40 }, { label: "Method used", width: 44 }, { label: "Transferred on", width: 26 }, { label: "Password changed by client", width: 24 }],
      rows: access.length ? access : [["[the access record]", INK, INK, INK, INK]] },
    { type: "heading", text: "3. Hosting, domain and technical details" },
    { type: "table", columns: [{ label: "Field", width: 46 }, { label: "Value", width: 60 }, { label: "Note", width: 68 }], rows: [
      ["Domain name", p?.domainName || "[domain]", ""],
      ["Registrar", ren.domain?.provider || INK, ""],
      ["Registered in the name of", domainYes ? legal : "[domain in the client's name: check it]", "The domain is yours. Ideovent does not hold client domains in its own name."],
      ["Expires on", ren.domain?.renewsOn ? fmtDate(ren.domain.renewsOn) : INK, ""],
      ["Nameservers / DNS managed at", v("dns"), ""],
      ["Hosting provider", ren.hosting?.provider || INK, ""],
      ["Account in the name of", ren.hosting?.inWhoseName || INK, ""],
      ["Paid until", ren.hosting?.renewsOn ? fmtDate(ren.hosting.renewsOn) : INK, ""],
      ["SSL expires on", ren.ssl?.renewsOn ? fmtDate(ren.ssl.renewsOn) : INK, "Usually renews automatically. Section 9 says how to confirm that it did."],
      ["Email provider", ren.email?.provider || INK, ""],
      ["Built with", v("stack"), "Recorded so that any competent developer can pick this up later without reverse-engineering it."],
      ["Third-party services in use", v("thirdParty"), "Payment gateway, SMS provider, maps, fonts, form handler. Each may have its own account and its own renewal."],
    ] },
    { type: "heading", text: "4. Delivered against the Statement of Work" },
    { type: "table", columns: [{ label: "#", width: 8 }, { label: "Deliverable as written in the SOW", width: 96 }, { label: "Delivered", width: 22 }, { label: "Where to see it", width: 32 }, { label: "Accepted", width: 16 }],
      rows: deliverables.length ? deliverables.map((x, i) => [String(i + 1), x.text, x.delivered === "yes" ? "Yes" : "Part", INK, INK]) : [["1", "[the deliverables, word for word from the SOW]", "", "", ""]] },
    ...deliverables.filter((x) => x.delivered === "part").map((x): Block => ({ type: "paragraph", text: `Part: ${x.text}. What remains: ${x.remains || "[what remains]"}; who owes it: ${x.owner || "[who owes it]"}; by ${x.by ? fmtDate(x.by) : "[by when]"}.` })),
    { type: "bullets", items: [
      `Copy the deliverables across from Statement of Work ${sow} word for word. Do not paraphrase them here: a handover that describes the work differently from the contract creates an argument that did not need to exist.`,
      "Anything marked \"Part\" needs a line underneath saying what remains, who owes it and by when. An honest partial delivery with a date is a professional document; a tick in the wrong box is a dispute waiting six months.",
      "Items requested after the SOW was signed should appear as change requests with their own numbers, not quietly folded into this list.",
    ], size: 8.5 },
    { type: "heading", text: "5. What is outside the warranty" },
    { type: "paragraph", text: "Ideovent fixes, free of charge and within the support window, anything that does not work as the Statement of Work said it would. That is the warranty, and it is a real one." },
    { type: "paragraph", text: "The list below is not a way of avoiding work. It is the line between fixing a defect and doing new work, written down before either of you needs it. Everything on this list can still be done. It is quoted, agreed and paid for, or it is included in a care plan." },
    { type: "bullets", items: [
      "New pages, new features or changes to how something works that were not in the Statement of Work. These are change requests, and there is a form for them.",
      "Content changes after acceptance, new text, swapped photographs, updated fees, added staff. Routine, and either your own work in the admin panel or care-plan hours.",
      "Design changes. \"Can we just move this\" after sign-off is a design change, not a defect, however small the movement.",
      "Anything broken by a change made in the admin panel, in the code or on the server by you or by a third party after handover.",
      "Failures of third-party services: the payment gateway, the SMS provider, an external API, a plugin's own bug, or a browser update that changes behaviour.",
      "Downtime caused by your hosting provider, or by a domain, hosting or SSL renewal that was not paid.",
      "Search engine rankings, traffic, enquiry volume and advertising results. Ideovent builds the site properly; nobody can contract for the behaviour of a search engine or a stranger.",
      "Email delivery problems arising from your mail provider, your domain's mail records or a recipient's spam filter.",
      kind === "school" ? "Data entry, loading your staff list, your gallery or your circulars." : "Data entry, loading your staff list or your gallery.",
      "Training beyond the session recorded in section 7.",
      "Devices, browsers or operating systems outside the supported list in the Statement of Work, including browsers that are no longer maintained by their makers.",
      "Recovery of data you deleted, beyond what the most recent backup holds.",
    ] },
    { type: "heading", text: "6. The thirty-day support window" },
    { type: "paragraph", text: `For thirty days from ${goLive}, ending on ${end}, Ideovent corrects defects in what was delivered at no charge. A defect is something that does not work the way the Statement of Work said it would.` },
    { type: "paragraph", text: "The window is thirty calendar days and it is not extended by weekends, holidays or the fact that nobody looked at the site for three weeks. Use it: go through the site properly in the first week, on a phone and on a computer, and report everything you find at once." },
    { type: "heading", text: "How to raise an issue", level: 2 },
    { type: "bullets", numbered: true, items: [
      `Send it to contact@ideovent.in, with the subject line starting "${projectName(p)}, ". One issue per email, so that each can be tracked and closed on its own.`,
      "Say what you did, what you expected, and what happened instead. Three sentences is usually enough.",
      "Attach a screenshot or a screen recording. One screenshot saves roughly four emails.",
      "Say which device and browser, \"Android phone, Chrome\" or \"laptop, Edge\". Many reported faults exist on exactly one setup.",
      "Say whether it is stopping you working. That is what sets the severity in the table below.",
      "For a Severity 1 outage only, also message +91 77619 21786 on WhatsApp after sending the email. Not instead of: the email is the record.",
    ] },
    { type: "heading", text: responses ? "Severity and response" : "Severity", level: 2 },
    { type: "table", columns: severity.columns, rows: severity.rows },
    { type: "bullets", items: supportBullets, size: 8.5 },
    { type: "heading", text: "7. Training" },
    { type: "table", columns: [{ label: "Field", width: 46 }, { label: "Value", width: 128 }], rows: [
      ["Session held on", p?.training?.at ? fmtDate(p.training.at) : INK],
      ["Duration", p?.training?.minutes ? `${p.training.minutes} minutes` : INK],
      ["Conducted by", "Mehdi Alam, Ideovent Technologies"],
      ["Attendees", p?.training?.attendees || INK],
      ["Recording provided?", p?.training?.recordingUrl ? `Yes, where: ${p.training.recordingUrl}` : INK],
      ["Written guide provided?", p?.training?.guideSent ? "Yes" : INK],
    ] },
    // In the form this is a checklist ("- [ ]"), ticked for what the session actually covered. Printed as plain
    // bullets it claimed every topic was covered, for a landing page with no news or staff pages too, and the
    // client signs section 11 on it. So each topic keeps an ink box to tick.
    { type: "paragraph", text: "Covered in the session (tick each topic that was covered)", bold: true },
    { type: "table", columns: [{ label: "Topic", width: 150 }, { label: "Covered", width: 24 }], rows: [
      "Logging in, and what to do if the password is forgotten", "Editing text on an existing page and publishing the change", "Adding and replacing images, and what size to use",
      kind === "school" ? "Adding a news item, an event or a circular" : "Adding a news item or an event", "Uploading a document for download", "Adding and removing a staff member",
      "Where enquiry form submissions arrive, and who checks them", "What not to touch, and why", "How to tell whether a change is live, and clearing a cached page", "How to raise an issue with Ideovent",
    ].map((topic) => [topic, INK]) },
    { type: "heading", text: "8. Backups" },
    { type: "table", columns: [{ label: "Field", width: 56 }, { label: "Value", width: 60 }, { label: "Note", width: 58 }], rows: [
      ["Backup taken at handover", v("backupTaken"), "A full copy of files and database at the moment of go-live, before anyone starts editing."],
      ["Where that backup is stored", v("backupLocation"), ""],
      ["Ongoing automatic backups", plan?.status === "active" ? "Care plan" : v("ongoingBackups"), "If this reads \"None\", there is no ongoing backup. That is a decision, and it should be a deliberate one."],
      ["Frequency", plan?.status === "active" ? ({ essential: "Monthly", growth: "Weekly", priority: "Daily" } as const)[plan.plan] : v("backupFrequency"), ""],
      ["Retention", v("backupRetention"), ""],
      ["Restore ever tested?", v("restoreTested"), "An untested backup is a belief, not a backup. Test one at least once a year."],
    ] },
    { type: "heading", text: "9. Renewal calendar" },
    { type: "table", columns: [{ label: "What renews", width: 30 }, { label: "Provider", width: 28 }, { label: "In whose name", width: 30 }, { label: "Renews on", width: 24 }, { label: "Approx. cost", width: 22 }, { label: "Who pays", width: 22 }, { label: "Reminder set", width: 18 }], rows: [
      renewalRow("Domain name", "domain"), renewalRow("Hosting", "hosting"), renewalRow("SSL certificate", "ssl"), renewalRow("Business email", "email"),
      ...(plan ? [["Care plan", "Ideovent", legal, plan.renewalOn ? fmtDate(plan.renewalOn) : INK, `Rs. ${inrGroup(plan.fee)}`, legal, INK]] : []),
    ] },
    { type: "bullets", items: [
      "Put every date in this table into a calendar today, with a reminder thirty days ahead and a second one seven days ahead. Set them on an account that survives a staff change: not one person's personal calendar.",
      "An expired domain does not fail politely. The site disappears, email stops, and recovering a lapsed name can cost far more than the renewal and sometimes cannot be done at all.",
      `An expired SSL certificate shows every visitor a browser warning telling them the site is not secure. ${readers} do not read the detail; they close the tab.`,
      "Where Ideovent is asked to renew something on your behalf, it is invoiced at cost plus any handling stated in the Hosting and Domain Terms. Ideovent does not renew anything automatically without instruction, so do not assume it has been done.",
    ], size: 8.5 },
    { type: "heading", text: "10. After the support window, care plan options" },
    ...carePlanBlocks(),
    { type: "heading", text: "11. Acceptance" },
    { type: "paragraph", text: `By signing below, ${legal} confirms each of the following.` },
    { type: "bullets", items: [
      `The deliverables listed in section 4 have been reviewed and are accepted as delivered under Statement of Work ${sow}.`,
      "Access to the systems listed in section 2 has been transferred, and passwords have been changed by us where the record shows it.",
      "The training session in section 7 was held, and we understand how to make routine changes ourselves.",
      "We understand the thirty-day support window, what it covers, what it does not, and how to raise an issue.",
      "We understand the renewal dates in section 9 and that keeping them is our responsibility unless a separate written arrangement says otherwise.",
      "We understand that changes requested from this point are quoted separately or drawn from care-plan hours.",
    ] },
    { type: "callout", title: "If this page is never signed", lines: [`If this page comes back unsigned, nothing stops. Under Clauses 3.3 and 3.4 of the Service Agreement a deliverable is treated as accepted once the Review Window passes without a written list of defects, and it is treated as accepted the moment it is put to live use. Which, for a site already serving ${audience}, it now is. The signature below records the handover; it does not create the acceptance. The support window in section 6 runs from ${goLive} whether or not this page is signed. Waiting to sign shortens the free window; it does not extend it.`] },
    { type: "table", columns: [{ label: "Field", width: 52 }, { label: "Value", width: 56 }, { label: "Note", width: 66 }], rows: [
      ["Final payment due", inv ? `Rs. ${inrGroup(inv.amount || 0)}` : "[final payment]", `Against invoice ${inv?.number || "[invoice number]"}. ${GST_LINE}`],
      ["Received on", finalPay ? fmtDate(finalPay.receivedOn) : "[date the final payment was received]", ""],
      ["Any item left open by agreement", open.length ? open.map((i) => i.summary).join("; ") : "None", "Write \"none\" if there is none. A blank here is read as an unanswered question."],
      ["Date by which open items close", open.length ? open.map((i) => (i.by ? fmtDate(i.by) : INK)).join("; ") : "Not applicable", ""],
    ] },
    { type: "signatures",
      left: [`For ${legal}`, "Signature: ____________________________", cl.signatoryName || INK, `Designation: ${(cl.signatoryDesignation || "").trim() || INK}`, "Date: ______"],
      right: ["For Ideovent Technologies", "Signature: ____________________________", `${signatory(s)}, ${AUTHORISED}`, "Saket, New Delhi, India", "Date: ______"] },
    { type: "paragraph", text: `Issued under Statement of Work ${sow} and the Service Agreement between the parties. Where this document and the Service Agreement differ, the Service Agreement governs. ${GST_LINE}`, italic: true, size: 8.5 },
    { type: "paragraph", text: "Ideovent Technologies · Since 2019 · Partnership firm since 2024 · Saket, New Delhi, India · +91 77619 21786 · www.ideovent.in · contact@ideovent.in · @ideovent_official", muted: true, size: 8 },
  ];
  return {
    title: "Project Handover Document",
    subtitle: "What went live, what you now own, who holds which key, and what happens for the next thirty days.",
    fileName: "handover",
    templateNote: true,
    requires: deliverables.some((x) => x.delivered === "part" && (!x.remains || !x.owner || !x.by)) ? ["[what remains on a part deliverable]"] : [],
    blocks,
  };
}

export const CARE_NAMES = Object.values(CARE_PLANS).map((x) => x.name);

/**
 * ONE LEAD PIPELINE.
 * ════════════════════════════════════════════════════════════════════════════
 * Every enquiry on the site, from the contact form and from the pop-up, goes
 * through submitLead() below, and every internship application from
 * /internship goes through submitApplication() at the end of the file, on the
 * same two routes and under the same rule. Before 26 Sep 2026 the delivery logic lived
 * inside ContactForm.tsx, which meant a second form would have been a second
 * copy of it, and the two copies would have drifted on the one question that
 * matters here:
 *
 *   DID THIS ENQUIRY REACH MEHDI?
 *
 * Not "did the code run without throwing". The two are different, and the
 * difference is a lost lead that the visitor believes was sent.
 *
 *   Supabase (live mode)  a row in a table only the admin can read. Delivery.
 *   EmailJS               an e-mail in Mehdi's inbox. Delivery.
 *   Local mode            a row in localStorage in the VISITOR'S OWN browser.
 *                         We never see it. It is kept (so /admin on the same
 *                         machine can show test submissions) but it is
 *                         storage, not delivery, and it never licenses a
 *                         thank-you on its own.
 *
 * `delivered` is true only when at least one route that reaches Mehdi said
 * yes. The forms show a thank-you on `delivered` and on nothing else.
 *
 * TODAY (25-26 Sep 2026) both routes are down: EmailJS answers 412
 * "Gmail_API: Invalid grant" until Gmail is reconnected in the EmailJS
 * dashboard, and Supabase is not wired yet. So every submission fails, and
 * the forms say so plainly and put WhatsApp first. That is correct behaviour,
 * not a bug to paper over.
 *
 * THE SUPABASE WRITE IS ONE fetch(), NOT THE SDK. Same reasoning as
 * src/lib/demo/opens.ts: the store's Supabase path imports roughly 800 KB of
 * @supabase/supabase-js and then UPSERTS, and `anon` may only INSERT
 * (supabase/migrations/0005, policy "insert leads anon"), so an upsert is the
 * wrong request as well as the heavy one. This is the plain PostgREST insert
 * the policy was written for, with `return=minimal` because anon cannot read
 * the row back.
 *
 * NOT IN THE ENTRY CHUNK. Only lazy code imports this module: the pop-up, the
 * contact form's body (src/components/lead/ContactFormBody.tsx), the lazy
 * /internship page and the admin.
 * The render-time half (the choices, the WhatsApp link, the pop-up's memory)
 * is src/components/lead/core.ts, re-exported below, and that is the only
 * part the entry chunk carries. EmailJS itself is a further dynamic import,
 * fetched at the moment somebody presses Send.
 */
import type { Application, ContactSubmission } from "@/lib/cms/types";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseEnabled } from "@/lib/cms/config";
import {
  LIMITS,
  NEEDS,
  budgetLabel,
  needLabel,
  rememberLeadSent,
  timelineLabel,
  type Lead,
  type LeadField,
} from "@/components/lead/core";

export * from "@/components/lead/core";

/* ───────────────────────────── Phone ───────────────────────────── */

export type PhoneResult =
  | { ok: true; e164: string; display: string; whatsapp: string; kind: "mobile" | "landline" | "international" }
  | { ok: false; error: string };

/**
 * An Indian number the way people actually type it, and anybody else's with a
 * country code.
 *
 *   98765 43210        +91 98765 43210      +919876543210     09876543210
 *   919876543210       0091 98765 43210     011 2345 6789 (landline)
 *   +44 20 7946 0958   +1 (415) 555-0100
 *
 * Mobile numbers in India are 10 digits starting 6, 7, 8 or 9. A landline
 * with its STD code is 0 plus 10 digits; it is accepted because an office
 * number is a real way to reach an owner, but it gets no WhatsApp
 * link, because WhatsApp cannot reach it.
 */
export function normalisePhone(input: string): PhoneResult {
  const raw = (input || "").trim();
  if (!raw) return { ok: false, error: "Enter a phone or WhatsApp number" };
  if (/[^\d\s+().-]/.test(raw)) {
    return { ok: false, error: "Use digits only, with a + in front of a country code" };
  }
  let s = raw.replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.lastIndexOf("+") > 0) return { ok: false, error: "A + can only come at the start of the number" };

  const india = (ten: string, kind: "mobile" | "landline"): PhoneResult => ({
    ok: true,
    e164: "+91" + ten,
    // A landline keeps the grouping it was typed with: STD codes run from
    // two to four digits, so there is no one right place for the spaces.
    display: kind === "mobile" ? `+91 ${ten.slice(0, 5)} ${ten.slice(5)}` : raw,
    whatsapp: kind === "mobile" ? "91" + ten : "",
    kind,
  });

  if (s.startsWith("+")) {
    const d = s.slice(1);
    if (d.startsWith("91")) {
      const rest = d.slice(2);
      if (/^[6-9]\d{9}$/.test(rest)) return india(rest, "mobile");
      if (/^[1-5]\d{9}$/.test(rest)) return india(rest, "landline");
      return { ok: false, error: "After +91 an Indian number has 10 digits, for example +91 98765 43210" };
    }
    if (!/^[1-9]\d{7,14}$/.test(d)) {
      return { ok: false, error: "After the + put the country code and the number: 8 to 15 digits in all" };
    }
    return { ok: true, e164: "+" + d, display: "+" + d, whatsapp: d, kind: "international" };
  }

  if (/^[6-9]\d{9}$/.test(s)) return india(s, "mobile");
  if (/^0[6-9]\d{9}$/.test(s)) return india(s.slice(1), "mobile");
  if (/^91[6-9]\d{9}$/.test(s)) return india(s.slice(2), "mobile");
  if (/^0[1-5]\d{9}$/.test(s)) return india(s.slice(1), "landline");

  if (s.length < 10) return { ok: false, error: "That number looks short. An Indian mobile number has 10 digits" };
  if (s.length === 10) {
    return { ok: false, error: "Indian mobile numbers start with 6, 7, 8 or 9. For a landline, start with 0 and the area code" };
  }
  return { ok: false, error: "For a number outside India, start with + and the country code" };
}

/* ───────────────────────────── Validation ───────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Field errors, keyed by field, in the order the form shows them (so the
 * first key is the field focus should move to). Messages are written to be
 * read out of context in the error summary: each one names its field.
 */
export function validateLead(lead: Lead, scope: "quick" | "full" = "full"): Partial<Record<LeadField, string>> {
  const e: Partial<Record<LeadField, string>> = {};
  // 26 Sep 2026: the form is the free website check. Required: the website
  // (or the business name), a phone, and what they run. The name is optional
  // (HOMEPAGE-COPY-DECK.md decision 9, the recommended default).
  const website = (lead.website || "").trim();
  if (!website) {
    e.website = lead.need === "software"
      ? "Enter your business or idea, in a few words"
      : "Enter your website address, or your business name";
  }
  if (!lead.need) e.need = "Choose what you run";
  const phone = normalisePhone(lead.phone);
  if ("error" in phone) e.phone = phone.error;
  if (scope === "full") {
    const email = (lead.email || "").trim();
    if (email && (!EMAIL_RE.test(email) || email.length > LIMITS.email)) {
      e.email = "Check the email address, or leave it empty: it is optional";
    }
  }
  return e;
}

const cap = (v: string | undefined, n: number) => (v || "").trim().replace(/\s+\n/g, "\n").slice(0, n);

/* ───────────────────────────── Reply link ───────────────────────────── */

/** Mehdi's one-tap reply from /admin and from the e-mail. First line names their need. */
export function whatsappToLead(lead: { name?: string; need?: string; whatsapp?: string }): string {
  if (!lead.whatsapp) return "";
  const first = (lead.name || "").trim().split(/\s+/)[0];
  const need = NEEDS.find((n) => n.label === lead.need || n.id === lead.need);
  const about = need?.id === "software"
    ? " You asked about an app or custom software on our website."
    : " You asked for a free website check on our website.";
  const text = `Hello${first ? " " + first : ""}, this is Mehdi from Ideovent Technologies.${about}`;
  return `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(text)}`;
}

/* ───────────────────────────── Delivery ───────────────────────────── */

const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_q5dptxe",
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_v6zkm1n",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "zq5EixmXACyLZqpG7",
};

/** Under this many ms between the form rendering and Send, it was not typed by a person. */
export const MIN_FILL_MS = 3000;

export type LeadSource = "popup" | "contact-form";

export interface LeadGuard {
  /** Date.now() when the form first rendered. */
  startedAt: number;
  /** The hidden field's value. A person never sees it, so it is empty for a person. */
  honeypot?: string;
  /** Local mode only: write the record into this browser's store, so /admin on the same machine can show it. */
  saveLocal?: (doc: ContactSubmission) => Promise<unknown>;
  /** The pop-up's optional second step: the id of the enquiry this adds detail to. */
  followUpOf?: string;
}

export type RouteOutcome = "delivered" | "failed" | "off" | "local";

export interface LeadResult {
  delivered: boolean;
  id: string;
  routes: { database: RouteOutcome; email: RouteOutcome };
  /** Why nothing was attempted. The caller shows an honest failure, never a fake thank-you. */
  blocked?: "honeypot" | "too-fast";
}

let seq = 0;
const leadId = () =>
  `sub_${Date.now().toString(36)}_${(seq++).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

/** A promise that rejects after `ms`, so a hung request cannot leave the button spinning forever. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

/**
 * One anonymous INSERT into `content`. The policy lets `anon` insert into
 * `submissions` and `applications` and nothing else, and never read back, so
 * a non-2xx here (RLS refusal, size check, outage) is simply "not delivered".
 */
async function insertRow(collection: "submissions" | "applications", doc: { id: string }): Promise<boolean> {
  const url = `${(SUPABASE_URL || "").replace(/\/$/, "")}/rest/v1/content`;
  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${SUPABASE_ANON_KEY as string}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ collection, doc_id: doc.id, data: doc }),
    }),
    12000,
  );
  return res.ok;
}

/** One EmailJS send. Resolves only when EmailJS said yes; any failure throws. */
async function sendEmail(params: Record<string, string>): Promise<void> {
  const { default: emailjs } = await import("@emailjs/browser");
  await withTimeout(emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, params, EMAILJS.publicKey), 15000);
}

/**
 * Send an enquiry. Resolves, never rejects: every failure is a `delivered:
 * false` the caller has to show.
 */
export async function submitLead(input: Lead, source: LeadSource, guard: LeadGuard): Promise<LeadResult> {
  const id = leadId();
  const routes: LeadResult["routes"] = { database: "off", email: "failed" };

  // Spam guards. Neither sends anything, and neither pretends to have: the
  // visitor sees the ordinary failure message with WhatsApp in front of it,
  // so a real person caught by mistake still has a way through.
  if (guard.honeypot && guard.honeypot.trim()) return { delivered: false, id, routes, blocked: "honeypot" };
  if (Date.now() - guard.startedAt < MIN_FILL_MS) return { delivered: false, id, routes, blocked: "too-fast" };

  const phone = normalisePhone(input.phone);
  const lead = {
    website: cap(input.website, LIMITS.website),
    name: cap(input.name, LIMITS.name),
    organisation: cap(input.organisation, LIMITS.organisation),
    city: cap(input.city, LIMITS.city),
    email: cap(input.email, LIMITS.email),
    message: cap(input.message, LIMITS.message),
  };
  const page = typeof window !== "undefined" ? window.location.pathname : "";

  const doc: ContactSubmission = {
    id,
    name: lead.name,
    email: lead.email,
    phone: phone.ok ? phone.display : cap(input.phone, LIMITS.phone),
    message: lead.message,
    // Kept for submissions written before `source` and `page` existed, which
    // the admin still lists by this field.
    sourcePage: `${source === "popup" ? "pop-up" : "contact form"} on ${page || "/"}`,
    status: "new",
    receivedAt: new Date().toISOString(),
    need: needLabel(input.need),
    website: lead.website || undefined,
    organisation: lead.organisation || undefined,
    city: lead.city || undefined,
    timeline: timelineLabel(input.timeline || "") || undefined,
    budget: budgetLabel(input.budget || "") || undefined,
    source,
    page,
    phoneE164: phone.ok ? phone.e164 : undefined,
    whatsapp: phone.ok ? phone.whatsapp : undefined,
    followUpOf: guard.followUpOf,
  };

  // Route 1: the database.
  if (supabaseEnabled) {
    try {
      routes.database = (await insertRow("submissions", doc)) ? "delivered" : "failed";
    } catch {
      routes.database = "failed";
    }
  } else if (guard.saveLocal) {
    try {
      await guard.saveLocal(doc);
      routes.database = "local";
    } catch {
      /* storage in the visitor's own browser; its failure changes nothing */
    }
  }

  // Route 2: e-mail. Sent even when the row was written, because the row is
  // only useful once somebody opens /admin and the e-mail is what makes him.
  try {
    const reply = whatsappToLead({ name: doc.name, need: doc.need, whatsapp: doc.whatsapp });
    await sendEmail(emailParams(doc, reply));
    routes.email = "delivered";
  } catch {
    routes.email = "failed";
  }

  const delivered = routes.database === "delivered" || routes.email === "delivered";
  if (delivered) rememberLeadSent();
  return { delivered, id, routes };
}

/**
 * The EmailJS template variables. Documented, with a template body to paste,
 * in EMAILJS_TEMPLATE.md at the project root: keep the two in step.
 *
 * `message` is the whole enquiry as plain text, the visitor's own words first
 * and then every field. That is deliberate: the template live in the EmailJS
 * dashboard today only prints {{from_name}}, {{from_email}}, {{phone}} and
 * {{message}}, so until Mehdi pastes the new body, `message` is the only place
 * the new fields can reach him at all.
 */
function emailParams(doc: ContactSubmission, replyLink: string): Record<string, string> {
  const lines: [string, string | undefined][] = [
    ["Website to check", doc.website],
    ["Runs", doc.need],
    ["Phone / WhatsApp", doc.phone],
    ["Business or organisation", doc.organisation],
    ["City", doc.city],
    ["Wants to start", doc.timeline],
    ["Budget", doc.budget],
    ["Email", doc.email],
    ["Sent from", doc.sourcePage],
    ["Adds detail to enquiry", doc.followUpOf],
    ["Reply on WhatsApp", replyLink],
  ];
  const details = lines.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  return {
    // name, email and title are the variables the template in the EmailJS
    // dashboard actually uses today ("Contact Us: {{title}}", {{name}},
    // {{email}}); sent alongside the documented ones so the e-mail is complete
    // whichever template body is pasted in.
    name: doc.name || doc.website || "Website check",
    email: doc.email || "",
    title: `${doc.need || "New"} enquiry: ${doc.website || doc.name || "website check"}`,
    from_name: doc.name || doc.website || "Website check",
    from_email: doc.email || "",
    reply_to: doc.email || "",
    phone: doc.phone,
    message: `${doc.message || "(no message)"}\n\n${details}`,
    visitor_message: doc.message || "",
    need: doc.need || "",
    website: doc.website || "",
    organisation: doc.organisation || "",
    city: doc.city || "",
    timeline: doc.timeline || "",
    budget: doc.budget || "",
    source: doc.source === "popup" ? "Pop-up" : "Contact form",
    page: doc.page || "/",
    whatsapp_link: replyLink,
    received_at: doc.receivedAt,
    submission_id: doc.id,
    follow_up_of: doc.followUpOf || "",
  };
}

/* ───────────────────────────── Internship applications ───────────────────────────── */

/*
 * The LaunchPad form on /internship. Until 26 Sep 2026 it called
 * actions.saveDoc("applications") and showed "Application received" whatever
 * happened. In local mode that wrote only to the applicant's own browser, and
 * once Supabase is on the store UPSERTS, which the anon policy refuses. Either
 * way the application reached nobody while the page said it had. So it now
 * takes the same two routes as an enquiry, under the same rule: a thank-you
 * only on `delivered`.
 *
 * It uses the SAME EmailJS template as the enquiries (one template is all the
 * free plan comfortably gives us). The variables are mapped so the e-mail
 * still reads right: `need` says "Internship application", `website` carries
 * the applicant and college so the subject names them, and `visitor_message`
 * carries the whole application, because the template's labelled lines
 * (institute, city, budget) are for enquiries. See EMAILJS_TEMPLATE.md.
 */

export const APPLICATION_LIMITS = {
  fullName: 80,
  email: 254,
  phone: 24,
  college: 120,
  stream: 80,
  notes: 2000,
} as const;

export interface ApplicationInput {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  stream: string;
  /** GitHub and anything else. The form asks for links, not files: EmailJS cannot carry an attachment. */
  notes: string;
}

export const APPLICATION_NEED = "Internship application";
const PROGRAMME = "Ideovent LaunchPad, 12-week web development internship";

const appId = () =>
  `app_${Date.now().toString(36)}_${(seq++).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Every http(s) link or bare github.com path in the notes, so the e-mail lists them on one line. */
function linksIn(text: string): string {
  const found = text.match(/\bhttps?:\/\/[^\s<>()]+|\b(?:www\.)?github\.com\/[^\s<>()]+/gi) || [];
  return [...new Set(found.map((l) => l.replace(/[.,;:!?]+$/, "")))].slice(0, 8).join("  ");
}

export interface ApplicationGuard {
  startedAt: number;
  honeypot?: string;
  /** Local mode only: a record for /admin on this machine. Storage, never proof of delivery. */
  saveLocal?: (doc: Application) => Promise<unknown>;
}

/**
 * Send an internship application. Resolves, never rejects, with the same
 * LeadResult shape as submitLead so the page can reuse the same failure logic.
 */
export async function submitApplication(input: ApplicationInput, guard: ApplicationGuard): Promise<LeadResult> {
  const id = appId();
  const routes: LeadResult["routes"] = { database: "off", email: "failed" };

  if (guard.honeypot && guard.honeypot.trim()) return { delivered: false, id, routes, blocked: "honeypot" };
  if (Date.now() - guard.startedAt < MIN_FILL_MS) return { delivered: false, id, routes, blocked: "too-fast" };

  const L = APPLICATION_LIMITS;
  const phone = normalisePhone(input.phone);
  // Capped per field, so the row stays far below the table's 20,000-byte check
  // and the e-mail far below EmailJS's 50 KB request limit.
  const doc: Application = {
    id,
    fullName: cap(input.fullName, L.fullName),
    email: cap(input.email, L.email),
    phone: phone.ok ? phone.display : cap(input.phone, L.phone),
    college: cap(input.college, L.college),
    stream: cap(input.stream, L.stream),
    notes: cap(input.notes, L.notes),
    paymentStatus: "pending",
    seatConfirmed: false,
    submittedAt: new Date().toISOString(),
  };

  // Route 1: the database. Its own plain INSERT, never the store's upsert.
  if (supabaseEnabled) {
    try {
      routes.database = (await insertRow("applications", doc)) ? "delivered" : "failed";
    } catch {
      routes.database = "failed";
    }
  } else if (guard.saveLocal) {
    try {
      await guard.saveLocal(doc);
      routes.database = "local";
    } catch {
      /* the applicant's own browser; its failure changes nothing */
    }
  }

  // Route 2: e-mail, always, for the same reason as an enquiry.
  try {
    await sendEmail(applicationParams(doc, phone.ok ? phone.whatsapp : ""));
    routes.email = "delivered";
  } catch {
    routes.email = "failed";
  }

  const delivered = routes.database === "delivered" || routes.email === "delivered";
  return { delivered, id, routes };
}

/** The same variables as emailParams(), filled for an application. Keep in step with EMAILJS_TEMPLATE.md. */
function applicationParams(doc: Application, whatsappDigits: string): Record<string, string> {
  const first = doc.fullName.split(/\s+/)[0];
  const replyText = `Hello ${first}, this is Mehdi from Ideovent Technologies, about your LaunchPad internship application.`;
  const reply = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(replyText)}` : "";
  const page = typeof window !== "undefined" ? window.location.pathname : "/internship";
  const lines: [string, string | undefined][] = [
    ["Applying for", PROGRAMME],
    ["Name", doc.fullName],
    ["Email", doc.email],
    ["Phone / WhatsApp", doc.phone],
    ["College or institute", doc.college],
    ["Stream / branch", doc.stream],
    ["Links", linksIn(doc.notes)],
    ["Reply on WhatsApp", reply],
  ];
  const details = lines.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  const body = `${details}\n\nIn their words:\n${doc.notes || "(nothing written)"}`;
  return {
    name: doc.fullName,
    email: doc.email,
    title: `Internship application: ${doc.fullName}${doc.college ? `, ${doc.college}` : ""}`,
    from_name: doc.fullName,
    from_email: doc.email,
    reply_to: doc.email,
    phone: doc.phone,
    message: body,
    visitor_message: body,
    need: APPLICATION_NEED,
    website: `${doc.fullName}, ${doc.college}`,
    organisation: doc.college,
    city: "",
    timeline: "",
    budget: "",
    source: "Internship form",
    page,
    whatsapp_link: reply,
    received_at: doc.submittedAt,
    submission_id: doc.id,
    follow_up_of: "",
  };
}

/* ───────────────────────────── Demo-open alert ───────────────────────────── */

/*
 * "A director just opened the demo." Sent from the PUBLIC /site/<slug> route
 * by src/lib/demo/opens.ts, which decides WHETHER to send (the setting, sent
 * demos only, never an admin, once per demo per browser per day). This
 * function only decides WHAT the e-mail says.
 *
 * Same EmailJS template as the enquiries, whose subject is
 * "{{need}}: {{website}}", so need = "Demo opened" and website = the
 * institute's name make the subject read "Demo opened: <institute>". The
 * body is `message`, plain text: which demo, which page, when, the link, and
 * the one thing to do about it.
 */

export const DEMO_OPENED_NEED = "Demo opened";

export interface DemoOpenedAlert {
  instituteName: string;
  slug: string;
  demoId: string;
  city?: string;
  /** The path that was opened, for example /site/sunrise-public/admissions. */
  page: string;
  /** The full link, as the director opened it. */
  link: string;
  /** ISO time of the open. */
  at: string;
}

/** The EmailJS variables for a demo-open alert. Exported for the test. */
export function demoOpenedParams(a: DemoOpenedAlert): Record<string, string> {
  const when = (() => {
    try {
      return new Date(a.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
    } catch {
      return a.at;
    }
  })();
  const name = a.instituteName || a.slug;
  const lines: [string, string | undefined][] = [
    ["Demo", `${name}${a.city ? `, ${a.city}` : ""}`],
    ["Page opened", a.page],
    ["When", when],
    ["Demo link", a.link],
    ["Demo id", a.demoId],
  ];
  const details = lines.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  const message =
    `Somebody just opened the demo site made for ${name}.\n\n${details}\n\n` +
    "Follow up now, while it is fresh: open Admin, Outreach, find this lead and send the next message. " +
    "One open in this browser per day is reported, so a refresh does not send a second alert.";
  return {
    name,
    email: "",
    title: `${DEMO_OPENED_NEED}: ${name}`,
    from_name: "Ideovent demo alert",
    from_email: "",
    reply_to: "",
    phone: "",
    message,
    visitor_message: message,
    need: DEMO_OPENED_NEED,
    website: name,
    organisation: name,
    city: a.city || "",
    timeline: "",
    budget: "",
    source: "Demo site",
    page: a.page,
    whatsapp_link: "",
    received_at: a.at,
    submission_id: a.demoId,
    follow_up_of: "",
  };
}

/**
 * Send the alert. Resolves true when EmailJS said yes, false otherwise. Never
 * rejects: the caller is a stranger's phone and must not find out.
 */
export async function sendDemoOpenedAlert(a: DemoOpenedAlert): Promise<boolean> {
  try {
    await sendEmail(demoOpenedParams(a));
    return true;
  } catch {
    return false;
  }
}

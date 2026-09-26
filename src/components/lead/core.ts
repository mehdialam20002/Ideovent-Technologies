/**
 * THE ENTRY-CHUNK HALF OF THE LEAD PIPELINE.
 * ════════════════════════════════════════════════════════════════════════════
 * Everything the site needs BEFORE anybody presses Send: the choices a form
 * renders, the WhatsApp link it prints, and the pop-up's memory and timing
 * rules. It is imported by Layout (through LeadPopupMount) and by the
 * ContactForm shell, which are both in the entry chunk, so it is kept to
 * plain data and small functions.
 *
 * The other half, validation and delivery, is src/lib/leads.ts. That module
 * re-exports this one, so code that is already lazy (the pop-up, the form
 * body, the admin) imports everything from "@/lib/leads", and code in the
 * entry chunk imports from here and never pulls the delivery code in.
 *
 * Why split at all: the redesign's budget lets the entry chunk grow by at most
 * 10 KB across every track, and the whole pipeline minified came to about
 * 24 KB. Nothing in the delivery half is needed to paint a page.
 */

/* ───────────────────────────── The choices ───────────────────────────── */

/**
 * What they run. Neutral business types first, so any owner finds themselves
 * in the list: shop, clinic, gym, firm, then schools and coaching fifth, then
 * software sixth, then an escape. Copy: _assets/HOMEPAGE-COPY-DECK-V2.md B2.
 * The label is what EmailJS sends as `need`, what Supabase stores and what
 * the enquiry e-mail prints in its "Runs" row. The phrase completes "We are
 * ..." in the WhatsApp message to us ("I am ..." for software).
 * Keep the id "software": whatsappToLead in src/lib/leads.ts keys on it.
 * Old rows keep their old labels ("School", "Coaching institute", "Business",
 * "App or custom software"); whatsappToLead falls back to its generic reply.
 */
export const NEEDS = [
  { id: "shop", label: "Shop or restaurant", phrase: "a shop or restaurant" },
  { id: "clinic", label: "Clinic or salon", phrase: "a clinic or salon" },
  { id: "gym", label: "Gym or fitness", phrase: "a gym or fitness business" },
  { id: "firm", label: "Office or firm (law, CA, real estate)", phrase: "an office or firm" },
  { id: "education", label: "School or coaching", phrase: "a school or coaching institute" },
  { id: "software", label: "Startup or app idea", phrase: "working on a startup or an app idea" },
  { id: "other", label: "Something else", phrase: "" },
] as const;
export type NeedId = (typeof NEEDS)[number]["id"];

/**
 * The words on the first field and the submit button, by need. The form is
 * the free website check, but a visitor who picks "Startup or app idea" has an
 * idea, not a website, and "Check my website" reads as a form for somebody
 * else. Only the words change: the field id, the validation and the EmailJS
 * variable (`website`) stay exactly the same.
 */
export function leadCopyFor(need: Lead["need"]) {
  if (need === "software") {
    return {
      websiteLabel: "Your business or idea, in a few words",
      websitePlaceholder: "For example: an app for tuition fees",
      websiteHint: "Have a website already? Paste the address instead.",
      submit: "Send it to us",
      // The pop-up's own heading and offer are about checking a website. A
      // visitor who says they have an idea is asking a different question.
      heading: "Tell us the idea.",
      subheading:
        "Leave your number and a line about the app or software. We reply on WhatsApp with what it would take. The first call is free.",
    };
  }
  return {
    websiteLabel: "Your website address",
    websitePlaceholder: "Website address, or your business name",
    websiteHint: "No website yet? Write your business name.",
    submit: "Check my website",
    heading: undefined as string | undefined,
    subheading: undefined as string | undefined,
  };
}

export const TIMELINES = [
  { id: "this-month", label: "This month" },
  { id: "1-3-months", label: "In 1 to 3 months" },
  { id: "exploring", label: "Just exploring" },
] as const;
export type TimelineId = (typeof TIMELINES)[number]["id"];

/**
 * Budget options. EVERY FIGURE IS FROM THE CURRENT TABLE IN _assets/FACTS.md
 * ("CORRECTIONS CONFIRMED BY MEHDI, 24 Sep 2026", §2) and matches /pricing.
 * Cheapest first, per the presentation rule in the same section. The ranges
 * overlap (a website and a portal share 40,000 to 45,000) because the
 * canonical ranges do; the hint says which offer each one is.
 */
export const BUDGETS = [
  { id: "8k-20k", label: "₹8,000-₹20,000", hint: "landing page or single page" },
  { id: "20k-45k", label: "₹20,000-₹45,000", hint: "website" },
  { id: "40k-85k", label: "₹40,000-₹85,000", hint: "portal or web app" },
  { id: "90k-plus", label: "From ₹90,000", hint: "custom software" },
  { id: "usd", label: "Outside India, from $300", hint: "priced in US dollars" },
  { id: "not-sure", label: "Not sure yet", hint: "" },
] as const;
export type BudgetId = (typeof BUDGETS)[number]["id"];

export const needLabel = (id?: string) => NEEDS.find((n) => n.id === id)?.label ?? "";
export const timelineLabel = (id?: string) => TIMELINES.find((t) => t.id === id)?.label ?? "";
export const budgetLabel = (id?: string) => {
  const b = BUDGETS.find((x) => x.id === id);
  return b ? (b.hint ? `${b.label} (${b.hint})` : b.label) : "";
};

/**
 * `/contact?for=school|coaching|business|abroad` can still arrive from older
 * links and pitch pages. School and coaching both map to "education" so the
 * visitor does not answer the same question twice. "business" is too broad to
 * pick a type for them, so it preselects nothing. "abroad" is a market, not a
 * need, so it preselects the dollar budget instead.
 */
export function prefillFromQuery(search: string): { need?: NeedId; budget?: BudgetId } {
  const v = new URLSearchParams(search).get("for");
  if (v === "school" || v === "coaching") return { need: "education" };
  if (v === "abroad") return { budget: "usd" };
  return {};
}

/* ───────────────────────────── The lead ───────────────────────────── */

export interface Lead {
  /** Their website address, or their business name if they have none. Required. */
  website: string;
  /** Optional since 26 Sep 2026: the check needs the site and a number, not a name. */
  name: string;
  phone: string;
  need: NeedId | "";
  organisation?: string;
  city?: string;
  timeline?: TimelineId | "";
  budget?: BudgetId | "";
  email?: string;
  message?: string;
}

export type LeadField = keyof Lead;

/** Length caps. Enforced on submit (trimmed and cut) and as maxLength on the inputs. */
export const LIMITS = {
  website: 200,
  name: 80,
  phone: 24,
  organisation: 120,
  city: 80,
  email: 254,
  message: 2000,
} as const;

/* ───────────────────────────── WhatsApp ───────────────────────────── */

/**
 * The visitor's own "or WhatsApp us" link. Prefilled with whatever they have
 * already told us, so a visitor whose form submission failed does not type it
 * all again. Only what they typed goes in; nothing is invented.
 */
export function whatsappToUs(ourNumber: string, lead?: Partial<Lead>): string {
  const digits = (ourNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  const need = NEEDS.find((n) => n.id === lead?.need);
  const parts: string[] = [];
  const site = lead?.website?.trim();
  parts.push(site ? `Hello Ideovent, please check my website: ${site}.` : "Hello Ideovent, I would like a free website check.");
  if (need?.phrase) parts.push(need.id === "software" ? `I am ${need.phrase}.` : `We are ${need.phrase}.`);
  const name = lead?.name?.trim();
  const org = lead?.organisation?.trim();
  if (name) parts.push(`My name is ${name}${org ? `, from ${org}` : ""}.`);
  else if (org) parts.push(`This is ${org}.`);
  if (lead?.city?.trim()) parts.push(`City: ${lead.city.trim()}.`);
  if (lead?.timeline) parts.push(`Start: ${timelineLabel(lead.timeline)}.`);
  if (lead?.budget) parts.push(`Budget: ${budgetLabel(lead.budget)}.`);
  if (lead?.message?.trim()) parts.push(lead.message.trim().slice(0, 600));
  return `https://wa.me/${digits}?text=${encodeURIComponent(parts.join(" "))}`;
}

/* ───────────────────────────── Pop-up memory ───────────────────────────── */

/**
 * localStorage, per browser, forever: "dismissed" or "sent". Versioned so the
 * stored shape can change; do NOT bump it to re-show the pop-up to people who
 * closed it, because "once closed, never again" is the promise.
 */
export const POPUP_MEMORY_KEY = "ideovent.leadPopup.v1";
/** sessionStorage, this visit only: engaged milliseconds counted so far. */
export const POPUP_ENGAGED_KEY = "ideovent.leadPopup.engagedMs.v1";
/** sessionStorage, this visit only: the card has opened and has not been closed. */
export const POPUP_OPEN_KEY = "ideovent.leadPopup.open.v1";

/**
 * NEGATIVE CONTROL for scripts/e2e-lead-popup.mjs. With this set at build or
 * dev time, a dismissal is neither written nor read, so the "never again"
 * assertion MUST fail. It is never set in any deployed environment.
 */
const FORGET_DISMISSAL = import.meta.env.VITE_LEAD_POPUP_FORGET_DISMISSAL === "1";

export type PopupMemory = "dismissed" | "sent" | null | "unavailable";

/**
 * What this browser remembers. "unavailable" means storage is blocked (some
 * private windows, some in-app browsers): the pop-up then never shows at all,
 * because a pop-up that cannot remember being closed would come back on every
 * visit, and that breaks the one promise it makes.
 */
export function popupMemory(): PopupMemory {
  try {
    const raw = localStorage.getItem(POPUP_MEMORY_KEY);
    if (!raw) return null;
    const state = (JSON.parse(raw) as { state?: string }).state;
    if (state === "sent") return "sent";
    if (state === "dismissed") return FORGET_DISMISSAL ? null : "dismissed";
    return null;
  } catch {
    return "unavailable";
  }
}

export function rememberPopup(state: "dismissed" | "sent"): void {
  if (state === "dismissed" && FORGET_DISMISSAL) return;
  try {
    localStorage.setItem(POPUP_MEMORY_KEY, JSON.stringify({ state, at: new Date().toISOString() }));
    sessionStorage.removeItem(POPUP_OPEN_KEY);
  } catch {
    /* nothing to do: popupMemory() reports "unavailable" and the card stays away */
  }
}

/** Any delivered enquiry, from either form, retires the pop-up in this browser. */
export function rememberLeadSent(): void {
  rememberPopup("sent");
}

export const LEAD_POPUP_DEFAULTS = {
  enabled: true,
  delaySeconds: 60,
  // Keep identical to settings.leadPopup in src/lib/cms/seed.ts.
  heading: "Want to know what your customers see on your site?",
  subheading: "Leave your website address and number. We check it on a phone and reply on WhatsApp with what we found. Free.",
};

/**
 * Where the card may appear. An ALLOWLIST, so a route added later is excluded
 * until somebody decides otherwise. Everything not listed is out, which covers
 * /contact (the form is already on screen), /admin/**, /site/** (a demo is the
 * client's own website), /pitch/** and every bare /:slug pitch (a proposal
 * is somebody else's page), /verify/** (a certificate check), the four legal
 * pages, /internship (students, not buyers) and the 404. Detail routes that
 * fall through to a "not found" page are caught at run time by their noindex
 * meta; see isNoindexPage().
 */
const POPUP_PATHS = [
  /^\/$/,
  /^\/about\/?$/,
  /^\/services(\/[^/]+)?\/?$/,
  /^\/work(\/[^/]+)?\/?$/,
  /^\/blogs?(\/[^/]+)?\/?$/,
  /^\/pricing\/?$/,
  /^\/faq\/?$/,
  /^\/eduflow\/?$/,
];

export const isPopupPath = (pathname: string) => POPUP_PATHS.some((re) => re.test(pathname));

/** A "not found" render sets robots noindex. The card never shows on one. */
export function isNoindexPage(): boolean {
  if (typeof document === "undefined") return true;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]');
  return Array.from(metas).some((m) => /noindex/i.test(m.content));
}

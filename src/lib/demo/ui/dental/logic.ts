/**
 * DENTAL LOGIC: pure functions the kit, the shell and the pages share. No
 * React, no DOM, so scripts can test them. Contract: DENTAL-ARCHITECTURE.md.
 */

import type { DemoCurrency, DemoSite, DentalContent, DentalDoctor, DentalSession, DentalTreatment } from "@/lib/cms/types";
import type { DemoLang } from "@/lib/demo/language";
import { bi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import { doctorSlug, treatmentSlug } from "@/lib/demo/site/context";
import { showSampleLine } from "@/lib/demo/site/sample";

const digits = (s?: string) => (s || "").replace(/\D/g, "");

/** The dental block, never undefined. */
export function dentalOf(site: Pick<DemoSite, "dental">): DentalContent {
  return site.dental || {};
}

/** wa.me link with a prefilled message, or undefined when there is no number. */
export function whatsappHref(number: string | undefined, text?: string): string | undefined {
  const n = digits(number);
  if (!n) return undefined;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** tel: link, or undefined. */
export function telHref(phone: string | undefined): string | undefined {
  return digits(phone) ? `tel:${(phone || "").replace(/[^\d+]/g, "")}` : undefined;
}

/**
 * Every way to reach the clinic. The emergency line falls back to the main
 * phone; a duplicate has neither until Mehdi types them, and every button
 * that reads one renders nothing without it.
 */
export function dentalContact(site: DemoSite) {
  const c = site.contact || {};
  const e = dentalOf(site).emergency || {};
  return {
    phone: (c.phone || "").trim() || undefined,
    tel: telHref(c.phone),
    whatsapp: (c.whatsapp || "").trim() || undefined,
    emergencyPhone: (e.phone || c.phone || "").trim() || undefined,
    emergencyTel: telHref(e.phone || c.phone),
    emergencyWhatsapp: (e.whatsapp || c.whatsapp || "").trim() || undefined,
    email: (c.email || "").trim() || undefined,
  };
}

/** "Rs 3,500" for INR, else the currency's symbol. Amount as typed, digits and commas. */
export function money(amount: string | undefined, currency: DemoCurrency | undefined = "INR"): string {
  const a = (amount || "").trim();
  if (!a) return "";
  if (!/^\d/.test(a)) return a;
  const sym: Record<DemoCurrency, string> = { INR: "Rs ", USD: "$", GBP: "£", AED: "AED ", AUD: "A$" };
  return `${sym[currency || "INR"]}${a}`;
}

/* ── Opening hours ───────────────────────────────────────────────────────── */

export interface OpenStatus {
  /** open now, opens later today, or closed all day. */
  state: "open" | "later" | "closed";
  /** "17:00" when state is "later". */
  opensAt?: string;
  /** "20:30" when open. */
  closesAt?: string;
  /** When closed for the rest of today: the next open day (0 Sun to 6 Sat) and how many days ahead (1 = tomorrow). */
  nextDay?: number;
  daysAhead?: number;
}

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/**
 * Where the clinic is right now, by its sessions. `now` is injectable for
 * tests. Nothing on a record: null, and the chip renders nothing.
 */
export function openStatus(sessions: DentalSession[] | undefined, now: Date = new Date()): OpenStatus | null {
  const list = (sessions || []).filter((s) => s.days?.length && s.from && s.to);
  if (!list.length) return null;
  const day = now.getDay();
  const t = now.getHours() * 60 + now.getMinutes();
  const today = list.filter((s) => s.days.includes(day)).sort((a, b) => mins(a.from) - mins(b.from));
  const cur = today.find((s) => mins(s.from) <= t && t < mins(s.to));
  if (cur) return { state: "open", closesAt: cur.to };
  const next = today.find((s) => mins(s.from) > t);
  if (next) return { state: "later", opensAt: next.from };
  /* Look ahead up to a week, so a closed day reads "Opens tomorrow, 10 am"
     rather than a bare "Closed today". */
  for (let k = 1; k <= 7; k++) {
    const d = (day + k) % 7;
    const first = list.filter((s) => s.days.includes(d)).sort((a, b) => mins(a.from) - mins(b.from))[0];
    if (first) return { state: "closed", opensAt: first.from, nextDay: d, daysAhead: k };
  }
  return { state: "closed" };
}

/** "17:00" to "5 pm", "10:30" to "10:30 am". */
export function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
}

/* ── Lookups ─────────────────────────────────────────────────────────────── */

export function findTreatment(site: DemoSite, slug: string | undefined): DentalTreatment | undefined {
  return (dentalOf(site).treatments || []).find((t) => t.name && treatmentSlug(t) === slug);
}

export function findDoctor(site: DemoSite, slug: string | undefined): DentalDoctor | undefined {
  return (dentalOf(site).doctors || []).find((d) => d.name && doctorSlug(d) === slug);
}

/** Treatments grouped by `category`, in first-seen order. Ungrouped go under "". */
export function treatmentGroups(site: DemoSite): { category: string; items: DentalTreatment[] }[] {
  const out: { category: string; items: DentalTreatment[] }[] = [];
  for (const t of dentalOf(site).treatments || []) {
    if (!t.name) continue;
    const c = (t.category || "").trim();
    let g = out.find((x) => x.category === c);
    if (!g) out.push((g = { category: c, items: [] }));
    g.items.push(t);
  }
  return out;
}

/** The lead doctor: flagged `lead`, else the first. */
export function leadDoctor(site: DemoSite): DentalDoctor | undefined {
  const ds = (dentalOf(site).doctors || []).filter((d) => d.name);
  return ds.find((d) => d.lead) || ds[0];
}

/* ── The hero's doctor line (1 Oct 2026) ─────────────────────────────────── */

/** The kids hero's credit: the lead doctor's name, then degree and speciality. */
export function leadDoctorCredit(site: DemoSite, lang: DemoLang): { name: string; rest: string[] } | null {
  const doc = leadDoctor(site);
  if (!doc) return null;
  return { name: bi(doc, "name", lang), rest: [bi(doc, "qualification", lang), bi(doc, "specialisation", lang)].filter(Boolean) };
}

/** The calm hero's credential: the hero's own line, else the lead doctor's name, degree and registration. */
export function heroCredential(site: DemoSite, lang: DemoLang): string {
  const own = bi(dentalOf(site).hero, "credential", lang);
  if (own) return own;
  const doc = leadDoctor(site);
  return doc ? [bi(doc, "name", lang), bi(doc, "qualification", lang), bi(doc, "regNo", lang)].filter(Boolean).join(", ") : "";
}

/** The mark, in the words the templates' registration numbers already use. */
export const SAMPLE_MARK: Bilingual = { en: "(sample)", hi: "(नमूना)" };

const MARKED = /\((?:sample|नमूना)\)/i;
/** A doctor's name without its title, so "Dr. Simran Bedi" is found in "Simran Bedi, BDS" too. */
const bareName = (s?: string) => (s || "").trim().replace(/^(?:dr\.\s*|dr\s+|डॉ\.\s*|डॉ\s+)/i, "").trim();

/**
 * THE HERO'S DOCTOR LINE, MARKED WHILE IT IS SAMPLE. The kids hero credits
 * the lead doctor ("Dr. Simran Bedi, BDS, MDS ...") and the calm hero prints
 * a credential naming one. On a template duplicate that doctor is the
 * template's fiction under the clinic's name, and the hero had no mark of its
 * own: the doctors' sample line is further down the page. So while that line
 * shows (the doctors block is still the template's and not marked real: see
 * showSampleLine), a hero line naming one of the block's doctors ends in
 * "(sample)" / "(नमूना)", as the registration numbers do. Nothing is added to
 * a line that already says so (d4's "Reg. no. A-00000 (sample)") or to one
 * rewritten to name somebody else. Returns the mark, or "".
 */
export function heroDoctorMark(site: DemoSite, line: string, lang: DemoLang): string {
  const text = line.trim();
  if (!text || MARKED.test(text) || !showSampleLine(site, "doctors")) return "";
  const names = (dentalOf(site).doctors || []).flatMap((d) => [d.name, d.hi?.name]).map(bareName);
  return names.some((n) => n.length > 2 && text.includes(n)) ? tr(SAMPLE_MARK, lang) : "";
}

/** The booking preset a page passes to the booking sheet. */
export interface BookingPreset {
  reason?: string;
  treatment?: string;
  doctor?: string;
  branch?: string;
}

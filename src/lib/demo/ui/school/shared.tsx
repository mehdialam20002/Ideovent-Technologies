/**
 * SHARED SCHOOL-PAGE HELPERS. Small, pure and cheap: the home page may import
 * this file. Anything heavy (lightbox, FLIP filters, the age checker, the map)
 * lives in its own file under this folder and is imported only by the page
 * that needs it, so it lands in that page's lazy chunk.
 *
 * Every helper reads the record as typed and never invents a value.
 */

import type { ReactNode } from "react";
import type { DemoNotice, DemoPhoto, DemoSite } from "@/lib/cms/types";
import { demoDate } from "@/lib/demo/record";
import { bi, hasDevanagari, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { DemoLang } from "@/lib/demo/language";
import { liveNotices } from "@/lib/demo/site/pages";

/* ── Plain strings with no Hindi twin (facilities, stops, safety norms) ── */

/**
 * A plain string from the record. A plain field is English by contract; if
 * one still carries Devanagari (a content leak), it is marked lang="hi" so
 * the English page's DOM stays honest and check-demo-lang can find it.
 */
export function Str({ text, as: Tag = "span", className }: { text: string; as?: "span" | "p" | "li" | "div"; className?: string }) {
  if (!text.trim()) return null;
  return <Tag className={className} lang={hasDevanagari(text) ? "hi" : undefined}>{text}</Tag>;
}

export const clean = (list: (string | undefined)[] | undefined): string[] =>
  (list || []).map((s) => (s || "").trim()).filter(Boolean);

/* ── Photos: the new `photos` list plus the older `gallery` list ── */

export interface SchoolPhoto {
  key: string;
  src: string;
  /** The record object, for <Bi of={p.obj} k="caption">. */
  obj: DemoPhoto;
  width?: number;
  height?: number;
}

/**
 * Every photograph the record has, in order: `photos` first, then the older
 * `gallery` entries (which carry only src and alt). Entries with no file are
 * kept only when `withCaptionOnly` is set: they become typographic plates.
 */
export function schoolPhotos(site: DemoSite, withCaptionOnly = false): SchoolPhoto[] {
  const out: SchoolPhoto[] = [];
  (site.photos || []).forEach((p, i) => {
    if (p.src || (withCaptionOnly && (p.caption || p.alt || p.hi?.caption))) out.push({ key: `p${i}`, src: p.src || "", obj: p, width: p.width, height: p.height });
  });
  (site.gallery || []).forEach((g, i) => {
    if (g.src || (withCaptionOnly && g.alt)) out.push({ key: `g${i}`, src: g.src || "", obj: { src: g.src || "", alt: g.alt || "" } });
  });
  return out;
}

/** A photo's category in the reader's language, or "" when it has none. */
export function photoCategory(p: SchoolPhoto, lang: DemoLang): string {
  return bi(p.obj, "category", lang);
}

/* ── Notices ── */

/** Pinned first, then newest `posted` first; entries without a date keep their order. */
export function sortedNotices(site: DemoSite, today: string): DemoNotice[] {
  const list = liveNotices(site, today).map((x, i) => ({ x, i }));
  list.sort((a, b) => {
    if (!!a.x.pinned !== !!b.x.pinned) return a.x.pinned ? -1 : 1;
    const pa = a.x.posted || "";
    const pb = b.x.posted || "";
    if (pa && pb && pa !== pb) return pa < pb ? 1 : -1;
    return a.i - b.i;
  });
  return list.map((v) => v.x);
}

/** ISO date `days` before `today`. */
export function isoMinus(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * The home page's notice section hides when nothing is newer than 60 days.
 * A notice with no ISO `posted` date cannot be aged; it stays while it is
 * live (liveNotices already drops anything past `expires`).
 */
export function freshNotices(site: DemoSite, today: string, days = 60): DemoNotice[] {
  const since = isoMinus(today, days);
  return sortedNotices(site, today).filter((x) => !x.posted || x.posted >= since);
}

/** The newest ISO date on the board, for the "Last updated" line. */
export function lastPosted(list: DemoNotice[]): string {
  return list.reduce((m, x) => (x.posted && x.posted > m ? x.posted : m), "");
}

/* ── The dated admissions status chip ── */

const STATUS: Record<string, Bilingual> = {
  openUntil: { en: "Admissions {session} open until {date}", hi: "Admission {session} {date} तक खुले हैं" },
  session: { en: "Admissions {session}", hi: "Admission {session}" },
};

/**
 * The status line that replaces tickers and pop-ups. It names its date, and
 * after that date it says only the session, so it can never go stale.
 */
export function admissionStatus(site: DemoSite, lang: DemoLang, today: string): { text: string; open: boolean } {
  const session = bi(site, "sessionLabel", lang);
  if (!session) return { text: "", open: false };
  const open = !!site.admissionsOpenUntil && site.admissionsOpenUntil >= today;
  return open
    ? { text: trf(STATUS.openUntil, lang, { session, date: demoDate(site.admissionsOpenUntil, site.market) }), open }
    : { text: trf(STATUS.session, lang, { session }), open };
}

/** A rounded chip in the current colour. */
export function Chip({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${strong ? "border-transparent bg-[hsl(var(--ds-cta))] text-[hsl(var(--ds-on-cta))]" : "border-current"}`}>
      {children}
    </span>
  );
}

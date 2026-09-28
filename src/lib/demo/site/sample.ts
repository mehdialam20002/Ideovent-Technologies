/**
 * SAMPLE CONTENT ON A TEMPLATE DUPLICATE, and how the page and the admin know.
 *
 * A duplicate carries the whole template (src/lib/demo/templates/fromTemplate.ts):
 * teachers, fees, results, reviews, timings, photos. Most of it is ordinary
 * sales mock-up copy that Mehdi edits into the institute's own. Two blocks are
 * different in kind, because a parent reads them as the institute's record:
 * RESULTS (ranks, toppers, pass percentages, selections, trust figures) and
 * REVIEWS (testimonials and a rating). While either is still the template's,
 * the page prints a small line under it: "Sample figures for this
 * demonstration" / "Sample reviews for this demonstration".
 *
 * HOW "STILL THE TEMPLATE'S" IS KNOWN WITHOUT LOADING THE TEMPLATE. At the
 * moment of duplication `fromTemplate` stores a fingerprint of each block as it
 * landed (`site.sample.prints`). A block whose fingerprint still matches is
 * untouched; the first edit changes it and the line goes. The admin switch
 * "Results and reviews on this demo are the institute's real ones" sets
 * `site.sample.real` and removes both lines at once. The admin checklist reads
 * the same prints for all six blocks.
 *
 * Pure, tiny, and imported by the lazy site chunk and the admin alike.
 */

import type { DemoSampleMarks, DemoSite } from "@/lib/cms/types";
import type { Bilingual } from "./bilingual";

export type SampleBlock = keyof DemoSampleMarks["prints"];

export const SAMPLE_BLOCKS: SampleBlock[] = ["faculty", "results", "fees", "reviews", "timings", "photos", "stats", "cases", "doctors"];

/**
 * DENTAL (28 Sep 2026). Three blocks were added: `stats` (the hero trust row,
 * patient counts), `cases` (before-after) and `doctors`. The dental parts of
 * the older blocks (fees, timings, photos) are appended ONLY on a record that
 * has a dental block, so the print of every school and coaching demo already
 * made is byte for byte what it was and none of them reads as edited.
 */

/** What each block is made of. The same list feeds the print and the check. */
function blockData(site: Partial<DemoSite>, block: SampleBlock): unknown {
  const courses = site.courses || [];
  const d = site.dental;
  switch (block) {
    case "stats":
      return [site.stats, d?.hero?.nextSlot];
    case "cases":
      return d?.cases;
    case "doctors":
      return (d?.doctors || []).map(({ photo: _p, photoConsent: _c, ...rest }) => rest);
    case "faculty":
      return (site.faculty || []).map(({ photo: _p, photoConsent: _c, ...rest }) => rest);
    case "results":
      return [site.results, site.stats, site.boardResults];
    case "reviews":
      return [site.reviews, site.rating];
    case "fees":
      return [
        courses.map((c) => [c.fee, c.feeNote, c.instalments, c.hi?.feeNote]),
        site.admissions?.fees,
        site.admissions?.feeNote,
        site.feesPolicy,
        ...(d ? [d.fees, d.payment, d.plans, (d.treatments || []).map((t) => [t.fromPrice, t.priceNote])] : []),
      ];
    case "timings":
      return [
        courses.map((c) => [c.timings, c.batchStarts]), site.schedule, site.dayPlan,
        ...(d ? [d.sessions, d.booking?.morning, d.booking?.evening, (d.doctors || []).map((x) => x.days)] : []),
      ];
    case "photos":
      return [
        site.heroImage,
        site.sectionPhotos,
        (site.photos || []).map((p) => p.src),
        (site.gallery || []).map((g) => g.src),
        (site.faculty || []).map((f) => f.photo || ""),
        ...(d ? [
          (d.doctors || []).map((x) => x.photo || ""),
          (d.treatments || []).map((x) => x.image || ""),
          (d.technology || []).map((x) => x.image || ""),
          (d.branches || []).map((x) => x.photo || ""),
        ] : []),
      ];
  }
}

/**
 * JSON with sorted keys and without undefined, empty strings or empty
 * containers, so a round trip through the store or the form (which may add
 * "" for an untouched input, or reorder keys) does not read as an edit.
 */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const c = canonical((v as Record<string, unknown>)[k]);
      if (c === undefined || c === "" || (Array.isArray(c) && !c.length)) continue;
      if (c && typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length) continue;
      out[k] = c;
    }
    return out;
  }
  return v === null ? undefined : v;
}

/** A short, stable fingerprint (FNV-1a, 32 bit, hex). Not security, identity. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function samplePrint(site: Partial<DemoSite>, block: SampleBlock): string {
  return hash(JSON.stringify(canonical(blockData(site, block)) ?? null));
}

/** True when the block holds anything at all, so an empty block is never "carried". */
export function blockHasContent(site: Partial<DemoSite>, block: SampleBlock): boolean {
  const c = canonical(blockData(site, block));
  const walk = (v: unknown): boolean =>
    Array.isArray(v) ? v.some(walk) : v && typeof v === "object" ? Object.values(v).some(walk) : v !== undefined;
  return walk(c);
}

/** Every block, printed. `fromTemplate` stores this; blocks with nothing in them are left out. */
export function samplePrints(site: Partial<DemoSite>): DemoSampleMarks["prints"] {
  const out: DemoSampleMarks["prints"] = {};
  for (const b of SAMPLE_BLOCKS) if (blockHasContent(site, b)) out[b] = samplePrint(site, b);
  return out;
}

/** True while `block` is exactly what the template duplicate carried. */
export function isCarried(site: Partial<DemoSite>, block: SampleBlock): boolean {
  const p = site.sample?.prints?.[block];
  return Boolean(p) && p === samplePrint(site, block);
}

/** The blocks that print a line on the page. */
export type SampleLineBlock = "results" | "reviews" | "stats" | "cases" | "doctors";

/** True when the page should print the sample line under this block. */
export function showSampleLine(site: Partial<DemoSite>, block: SampleLineBlock): boolean {
  return !site.sample?.real && isCarried(site, block);
}

/** The line itself, in both languages. No em dashes. */
export const SAMPLE_COPY: Record<SampleLineBlock, Bilingual> = {
  results: { en: "Sample figures for this demonstration", hi: "इस डेमो के लिए नमूने के आँकड़े" },
  reviews: { en: "Sample reviews for this demonstration", hi: "इस डेमो के लिए नमूने के रिव्यू" },
  stats: { en: "Sample figures for this demonstration", hi: "इस डेमो के लिए नमूने के आँकड़े" },
  cases: {
    en: "Illustrations only, not real patients. The clinic's own cases appear here with written consent.",
    hi: "ये केवल चित्र हैं, असली मरीज़ नहीं। क्लिनिक के अपने केस लिखित सहमति के साथ यहाँ दिखेंगे।",
  },
  doctors: { en: "Sample doctor profiles for this demonstration", hi: "इस डेमो के लिए नमूने की डॉक्टर प्रोफ़ाइल" },
};

/** The admin's names for the six blocks, for the checklist. */
export const SAMPLE_BLOCK_LABEL: Record<SampleBlock, string> = {
  faculty: "Faculty",
  results: "Results and figures",
  fees: "Fees",
  reviews: "Reviews",
  timings: "Timings and schedule",
  photos: "Photos",
  stats: "Trust figures",
  cases: "Before and after cases",
  doctors: "Doctors",
};

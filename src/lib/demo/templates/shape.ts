/**
 * THE EXACT SHAPE OF A TEMPLATE. Read this before writing one.
 *
 * A template is two halves, kept in two places on purpose:
 *
 *   META     id, kind, segment, design family, theme, label, one line of
 *            description. Lives in ./index.ts, the registry, because the
 *            Templates tab lists all ten without downloading any of them.
 *
 *   CONTENT  the institute itself: name, city, courses, faculty, notices, the
 *            lot. Lives in its own file under ./school/ or ./coaching/, one
 *            file per template, reached ONLY through a dynamic import in the
 *            registry. Rollup therefore gives each one its own chunk, and none
 *            of it is in the entry chunk every homepage visitor downloads.
 *
 * A CONTENT FILE LOOKS EXACTLY LIKE THIS, AND NOTHING ELSE:
 *
 *   import { defineTemplateContent } from "../shape";
 *
 *   export default defineTemplateContent("school", {
 *     instituteName: "…",
 *     city: "…", state: "…", country: "India",
 *     market: "india", currency: "INR",
 *     …every other field is optional…
 *   });
 *
 * `kind` is repeated as the first argument so the loader can check the file
 * against the registry and refuse a school file wired to a coaching id.
 * `theme` is NOT in the content: the registry owns it, so the family and the
 * palette on the card can never disagree with the page.
 *
 * ── WHAT THE TYPE FORBIDS, AND WHY ────────────────────────────────────────
 *   id, slug, status, expiresAt, preparedOn, isExample, templateId, order,
 *   createdAt, updatedAt    Lifecycle. A template is never a document; the
 *                           preview and the duplicate each set these.
 *   kind, theme             Owned by the registry, see above.
 *   palette                 Superseded by theme. Nothing new sets it.
 *   logo                    NO CREST. A fictional institute has none.
 *   officialWebsite         A fictional institute has no real site to link to.
 *   results[].studentName   NO STUDENT IS EVER NAMED. A named child beside a
 *                           rank is the one line a family acts on, and an
 *                           invented one reads as real.
 *   results[].photo, founder photo, and every photoConsent flag
 *                           No face beside a rank or a founder's story.
 *
 * ── PHOTOGRAPHS (26 September 2026) ───────────────────────────────────────
 * Templates now carry STOCK photos from public/demo/img/ (licensed, listed in
 * its manifest.json, typed in src/lib/demo/images). Only those: every photo
 * field below is typed as a stock path, so a URL of anybody's campus is a
 * compile error. Write them with `stockPhoto("school/hero-...")`.
 *   heroImage               the home hero. One per template.
 *   faculty[].photo         a people/* portrait. The same person never twice
 *                           in one template.
 *   sectionPhotos           one photo per section slot (campus, academics,
 *                           admissions, transport, hostel...). Not every slot:
 *                           rhythm matters.
 *   photos[].src, gallery[].src
 *                           a stock path, or "" for a caption-only entry.
 * The alt text comes from the manifest, in both languages, and describes the
 * scene; nothing may caption a stock photo as the institute's own building.
 * A duplicate carries these paths (rule "stock" in ./fromTemplate.ts), and
 * the admin checklist says "Photos are stock photos from the template" until
 * Mehdi replaces the hero.
 *
 * ── THE FICTION RULES, which the type cannot check ────────────────────────
 * Every template is fiction written to show a segment well. So:
 *   - The institute's name must not be, or read as, a well-known real one.
 *   - Phone "+91 00000 00000" and WhatsApp "910000000000" only: an Indian
 *     number never starts with 0, so neither can ring anybody.
 *   - Email on example.com only (reserved by IANA, delivers to nobody).
 *   - The street is "Example Road" and the PIN ends in 000, which is not
 *     allocated anywhere.
 *   - Any affiliation line says "example affiliation no. 00000000" on its face.
 *   - Real city and state are fine. A real person's name is not.
 *   - No em dashes anywhere. The domain is www.ideovent.in; the old .com
 *     domain is never written in new copy.
 *   - No "nurturing young minds", "holistic development", "state of the art",
 *     "elevate", "empowering tomorrow's leaders". Short declarative sentences,
 *     precise numbers ("1,080 pupils", not "1000+ students").
 *
 * ── WHAT SURVIVES A DUPLICATE ─────────────────────────────────────────────
 * See the table at the top of ./fromTemplate.ts. In short, every fact about
 * the institute is cleared and the structure is kept. Two consequences for
 * whoever writes a template:
 *
 *   FACILITIES, ADMISSIONS STEPS AND DOCUMENTS ARE KEPT WORD FOR WORD, so
 *   write them generic: "Science laboratories", "Library and reading room",
 *   "Visit on a weekday morning and see an ordinary day". No counts, no
 *   amounts, no dates, no hours, no names, and only facilities that nearly
 *   every institute in the segment has: a facility is itself a claim, and it
 *   lands on a real institute's page. Put the distinctive ones (a workshop, a
 *   garden, a hostel wing) in `about` or a course `detail`, which are cleared.
 *   scripts/test-from-template.mjs fails on a digit, a rupee sign or a number
 *   word ("one", "two", "twenty") in any kept line; class ranges such as
 *   "Class 11 to 12" or "Class XII" are allowed.
 *
 *   COURSES KEEP name, level, subjects, duration, timings and mode, and lose
 *   batchStarts, seats, fee, feeNote and detail. So the specific, persuasive
 *   line about a batch belongs in `detail`.
 *
 *   AN FAQ IS KEPT ONLY WHEN IT IS MARKED `generic: true`, and it may be
 *   marked only when its answer would be true of any institute in the segment
 *   and names no fee, date, count, person or place. The fee question is never
 *   generic.
 *
 * ── WHICH FIELDS EACH RENDERER READS ──────────────────────────────────────
 * Filling a field the renderer ignores costs nothing and shows nothing.
 *   school    about, admissions, admissionsHeadline, boardOrAffiliation,
 *             city/state/country, contact, courses (as age bands), currency,
 *             established, establishedYear, facilities, faculty, gallery,
 *             instituteName, notices, principalMessage, principalName,
 *             principalTitle, results, resultsHeading, resultsNote, shortName,
 *             tagline
 *   coaching  about, boardOrAffiliation, city/state/country, contact, courses
 *             (as batches), currency, established, establishedYear, faculty,
 *             faq, focusAreas, instituteName, market, method, notices,
 *             results, resultsHeading, resultsNote, schedule, scheduleNote,
 *             shortName, tagline, trial
 * A SCHOOL tagline may carry ONE phrase in *asterisks*; the school template
 * sets it in the serif italic accent. A COACHING tagline never does: that
 * template puts its accent on a word of ours in the headline and prints the
 * tagline verbatim, asterisks included.
 *
 * The coaching hero headline is built from `focusAreas` and the city ("JEE
 * and NEET coaching in Kota"), so keep focusAreas to two or three short exam
 * or subject names.
 *
 * ── THE MULTI-PAGE FIELDS (26 September 2026) ─────────────────────────────
 * The ten templates now point at multi-page themes, so every page in
 * src/lib/demo/pages/README.md section 10 reads from the content file.
 *   sitePages   set it from src/lib/demo/site/pageSets.ts, e.g.
 *               `sitePages: [...SCHOOL_PAGE_SETS["s1-urban-cbse"]]`. It is
 *               KEPT on duplicate; everything institute-specific is CLEARED.
 *   hi          LANGUAGE RULE: every plain text field is ENGLISH. Hindi goes
 *               in the object's own `hi` block under the same key, never in
 *               the plain field (scripts/check-demo-lang.mjs fails on it).
 *               s2 may set `defaultLang: "hi"` to open in Hindi.
 *   photos      a stock path or "" (see PHOTOGRAPHS above).
 *   founder     no photograph.
 *   results     follow CCPA 2024: courseName, courseDuration and paid on
 *               every coaching result; still no studentName.
 *   reviews     fiction reads as fiction: a relation ("Parent, Class 8"),
 *               never a full name that could be a real person.
 */

import type {
  DemoCurrency,
  DemoFaculty,
  DemoFounder,
  DemoKind,
  DemoPhoto,
  DemoMarket,
  DemoPoint,
  DemoResult,
  DemoSite,
} from "@/lib/cms/types";
import type { TemplateId } from "./ids";
import type { DemoSectionPhotos, StockHeroSrc, StockPhotoSrc, StockPortraitSrc } from "../images";
import type { DesignFamily, FamilyTheme } from "./families";

/* ── Meta: the registry half ─────────────────────────────────────────────── */

/**
 * Where a template sells. The Templates tab filters on it.
 *
 *   urban        a metro or a large city, English-first parents
 *   rural        a village, a small town or a tier-2/3 town
 *   specialised  defined by what it teaches or who it takes, not by where:
 *                a play school, a boarding school, a single-subject or a
 *                foundation centre
 */
export type TemplateSegment = "urban" | "rural" | "specialised";

export const TEMPLATE_SEGMENTS: TemplateSegment[] = ["urban", "rural", "specialised"];

export const TEMPLATE_SEGMENT_LABEL: Record<TemplateSegment, string> = {
  urban: "Urban",
  rural: "Rural and small town",
  specialised: "Specialised",
};

interface MetaOf<K extends DemoKind, F extends DesignFamily> {
  id: TemplateId;
  kind: K;
  segment: TemplateSegment;
  designFamily: F;
  /** One theme from this family, for this kind. It is the template's palette. */
  theme: FamilyTheme<K, F>;
  /** What the card is headed. Plain words, the segment as Mehdi would say it. */
  label: string;
  /** One line: who it is for and what it leads with. */
  description: string;
}

/**
 * One registry entry. A union over every kind and family, so `theme` is
 * checked against `kind` and `designFamily` together: a Warm school template
 * naming "ledger" is a compile error, not a card that lies.
 */
export type DemoTemplateMeta = {
  [K in DemoKind]: { [F in DesignFamily]: MetaOf<K, F> }[DesignFamily];
}[DemoKind];

/* ── Content: the file half ──────────────────────────────────────────────── */

/** Fields a template never carries. The reasons are in the header above. */
type NotInTemplate =
  | "id" | "order" | "createdAt" | "updatedAt"
  | "slug" | "status" | "expiresAt" | "preparedOn" | "isExample" | "templateId"
  | "kind" | "theme" | "palette"
  | "logo" | "officialWebsite";

/** Re-declared below, either narrower or required. */
type Redeclared =
  | "instituteName" | "city" | "state" | "country" | "market" | "currency"
  | "faq" | "results" | "faculty" | "gallery" | "photos" | "founder"
  | "heroImage" | "sectionPhotos";

/**
 * A question and its answer. `generic: true` means it survives a duplicate;
 * see the header. Leave it off unless the answer would be true of any
 * institute in the segment and names nothing specific.
 */
export interface TemplateFaq extends DemoPoint {
  generic?: true;
}

/** A result with no named student and no photograph. */
export type TemplateResult = Omit<DemoResult, "studentName" | "photo" | "photoConsent">;

/**
 * A teacher. The name is fictional; the photo, if any, is a stock portrait
 * (people/*), which needs no consent flag because it is a licensed model.
 */
export type TemplateFaculty = Omit<DemoFaculty, "photo" | "photoConsent"> & {
  photo?: StockPortraitSrc;
};

/** A gallery entry: a stock photo, or "" for a caption alone. */
export interface TemplateGalleryItem {
  src: "" | StockPhotoSrc;
  alt: string;
}

/**
 * A categorised photo for the Gallery page: a stock photo, or "" for a
 * caption alone. With a stock photo, leave `alt` "" (the manifest's alt is
 * used) and keep `caption` generic: it is cleared on a duplicate.
 */
export type TemplatePhoto = Omit<DemoPhoto, "src"> & { src: "" | StockPhotoSrc };

/** Section photos: stock paths only. */
export type TemplateSectionPhotos = { [K in keyof DemoSectionPhotos]?: StockPhotoSrc };

/** The founder, with no photograph. */
export type TemplateFounder = Omit<DemoFounder, "photo" | "photoConsent">;

export type TemplateContent = Omit<DemoSite, NotInTemplate | Redeclared> & {
  instituteName: string;
  city: string;
  state: string;
  country: string;
  market: DemoMarket;
  currency: DemoCurrency;
  faq?: TemplateFaq[];
  results?: TemplateResult[];
  faculty?: TemplateFaculty[];
  gallery?: TemplateGalleryItem[];
  photos?: TemplatePhoto[];
  founder?: TemplateFounder;
  /** The home hero: a hero-sized stock photo. */
  heroImage?: StockHeroSrc;
  sectionPhotos?: TemplateSectionPhotos;
};

/** What a content file default-exports. Build it with `defineTemplateContent`. */
export interface TemplateModule {
  kind: DemoKind;
  content: TemplateContent;
}

/**
 * The one function a content file calls. It does nothing at runtime except
 * pair the kind with the content; its job is the type check on the literal,
 * which is where a forbidden field (a logo, a named student, a photograph)
 * turns into a compile error.
 */
export function defineTemplateContent(kind: DemoKind, content: TemplateContent): TemplateModule {
  return { kind, content };
}

/** Both halves, once the content file has been loaded. */
export interface LoadedTemplate {
  meta: DemoTemplateMeta;
  content: TemplateContent;
}

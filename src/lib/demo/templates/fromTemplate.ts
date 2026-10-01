/**
 * DUPLICATING A TEMPLATE INTO A DEMO FOR A NAMED INSTITUTE.
 *
 * ── THE RULE (26 September 2026, Mehdi's brief) ───────────────────────────
 * A demo is a sales mock-up shown to one institute's director: "this is what
 * your website could look like". So a duplicate carries THE WHOLE TEMPLATE,
 * already filled, and Mehdi edits only what he wants before he sends it.
 * Pressing Duplicate asks for the institute's name (and optionally its city
 * and its Hindi name); every occurrence of the template's fictional name, in
 * every English and Hindi string of the copy, becomes that name.
 *
 * What keeps it honest is not emptiness but labelling, in four layers:
 *   1. every demo page already carries the top banner "A demonstration
 *      website, built by Ideovent Technologies for <name>. Not their live
 *      site. Every name, number and date below is example content", is
 *      noindex, and opens only by its link;
 *   2. CONTACT IS CLEARED, the one exception to "keep everything": a phone,
 *      WhatsApp, email, street address, map or social link that is not the
 *      institute's would route a real parent's call to a stranger. Every page
 *      renders cleanly without them, and the editor marks them "Add from
 *      their own website";
 *   3. RESULTS AND REVIEWS CARRY A "SAMPLE" LINE on the page (results, toppers,
 *      pass percentages, selections, trust figures, testimonials, rating)
 *      until Mehdi edits that block or ticks "Results and reviews on this demo
 *      are the institute's real ones". So does the history on the About page
 *      (the founding story and year, 30 Sep 2026), until he edits it; the
 *      switch does not cover it. See src/lib/demo/site/sample.ts;
 *   4. THE EDITOR'S CHECKLIST lists every block still identical to the
 *      template (faculty, results, fees, reviews, timings, photos, the dental
 *      trust figures, cases and doctors, the founding story) and every
 *      empty contact field, under "Carried from template <name>: review
 *      before you mark it sent".
 *
 * ── THE TABLE ─────────────────────────────────────────────────────────────
 *
 *   field                  rule       what the copy gets
 *   ─────────────────────  ─────────  ──────────────────────────────────────
 *   id                     NEW        a fresh document id
 *   slug                   NEW        from the new name, unique against every
 *                                     demo and pitch page (uniqueDemoSlug)
 *   status                 NEW        "draft": the public link is the 404
 *                                     until Mark sent
 *   templateId             NEW        the template's id, as provenance; the
 *                                     list shows "From template: <label>"
 *   preparedOn             NEW        today
 *   createdAt, updatedAt   NEW        left off; the store stamps them on save
 *   isExample              NEW        false
 *   order                  NEW        the end of the list
 *   expiresAt              NEW        none
 *   sample                 NEW        fingerprints of the carried blocks, so
 *                                     the page and the checklist can tell
 *                                     "still the template's" from "edited"
 *
 *   instituteName          IDENTITY   the name typed in the dialog
 *   shortName              IDENTITY   empty, and its Hindi twin removed: the
 *                                     nav and every title use the full name
 *   city                   IDENTITY   the city typed, else the template's
 *   state                  IDENTITY   the template's; emptied when a
 *                                     different city is typed, because the
 *                                     template's state no longer follows
 *
 *   contact                CONTACT    phone, WhatsApp, email, address lines,
 *                                     landmark, map link, map search,
 *                                     branches and the transport desk are
 *                                     CLEARED; office hours are kept
 *   officialWebsite        CONTACT    cleared: their site, or nothing
 *   disclosure rows        CONTACT    the address, email and phone rows of
 *                                     the CBSE disclosure are removed, so the
 *                                     page reads them from `contact`
 *   dental (part)          CONTACT    each branch's address, phone,
 *                                     WhatsApp, map and landmark, access,
 *                                     parking and transit; the emergency
 *                                     phone and WhatsApp; the whole `reach`
 *                                     block (see clearedDental). Branch
 *                                     names, hours and sessions are kept
 *
 *   EVERY OTHER FIELD      KEEP       deep-copied from the template, then
 *                                     renamed (below): tagline, about,
 *                                     principal and message, courses with
 *                                     fees, timings, batches, syllabus and
 *                                     faculty names; faculty with portraits;
 *                                     results and toppers; stats; reviews and
 *                                     rating; facilities; admissions steps,
 *                                     dates and fees; notices; FAQs;
 *                                     downloads; gallery, photos, hero and
 *                                     section photos with their captions;
 *                                     schedule rows; every section intro;
 *                                     every Hindi twin; the look (theme),
 *                                     market, language settings and pages
 *
 * ── RENAMING ──────────────────────────────────────────────────────────────
 * Every string anywhere in the copy is rewritten, English and Hindi alike.
 * The template's fictional name in all its written forms (TEMPLATE_NAMES
 * below: the full name, the short form the copy uses, and the Devanagari
 * form in the Hindi twins) becomes, in an English string, the new name, and
 * inside a `hi` block, the Hindi name if one was typed, else the new English
 * name. Nothing stores initials or a monogram: the pages derive them from
 * the name. With a city typed, the template's city (and "City, State")
 * becomes it, in both languages, and so does the neighbourhood a dental
 * template names beside its city (TEMPLATE_AREAS: "in Gomti Nagar, Lucknow"
 * reads "in Indore", "Years in Baner" reads "Years in Indore"). After this no
 * string in the copy contains the template's fictional name or, with a city
 * typed, its neighbourhood; scripts/test-from-template.mjs checks both for
 * every template, dental included.
 *
 * `DUPLICATE_POLICY` is typed as a Record over every key of DemoSite, so a
 * field added to DemoSite later is a compile error here until it is
 * classified.
 *
 * ── PURE ──────────────────────────────────────────────────────────────────
 * No store, and no clock or randomness unless the caller passes none: `now`
 * and `newId` are injectable, the inputs are never mutated, nothing is saved
 * and the copy shares no object with the template module. The caller saves.
 */

import type { DemoContactDetails, DemoSite, DentalBranch, DentalContent, PitchPage } from "@/lib/cms/types";
import { uniqueDemoSlug } from "../reservedRoutes";
import { samplePrints } from "../site/sample";
import type { TemplateId } from "./ids";
import type { LoadedTemplate } from "./shape";

/* ── The policy, as data ─────────────────────────────────────────────────── */

export type DuplicateRule = "new" | "identity" | "contact" | "keep";

/** The table above, one entry per DemoSite field. Exhaustive by type. */
export const DUPLICATE_POLICY = {
  id: "new", slug: "new", status: "new", templateId: "new", preparedOn: "new",
  createdAt: "new", updatedAt: "new", isExample: "new", order: "new",
  expiresAt: "new", sample: "new",

  instituteName: "identity", shortName: "identity", city: "identity", state: "identity",

  contact: "contact", officialWebsite: "contact",

  kind: "keep", theme: "keep", palette: "keep", market: "keep", currency: "keep",
  country: "keep", logo: "keep", heroImage: "keep", focusAreas: "keep",
  established: "keep", establishedYear: "keep", boardOrAffiliation: "keep",
  about: "keep", principalName: "keep", principalTitle: "keep",
  principalMessage: "keep", facilities: "keep", admissionsHeadline: "keep",
  admissions: "keep", notices: "keep", gallery: "keep", courses: "keep",
  resultsHeading: "keep", resultsNote: "keep", results: "keep", faculty: "keep",
  method: "keep", faq: "keep", trial: "keep", schedule: "keep",
  scheduleNote: "keep", tagline: "keep",
  sitePages: "keep", defaultLang: "keep", hi: "keep", sessionLabel: "keep",
  admissionsOpenUntil: "keep", vision: "keep", mission: "keep", udiseCode: "keep",
  classSizePromise: "keep", hostel: "keep", founder: "keep", stats: "keep",
  reviews: "keep", rating: "keep", photos: "keep", portalLinks: "keep",
  downloads: "keep", policies: "keep", joining: "keep", academics: "keep",
  facilityDetails: "keep", boardResults: "keep", transport: "keep",
  boarding: "keep", studentLife: "keep", safety: "keep", dayPlan: "keep",
  disclosure: "keep", testSeries: "keep", scholarship: "keep", posts: "keep",
  govExams: "keep", olympiad: "keep", feesPolicy: "keep", sectionPhotos: "keep",
  /* Kept and renamed like everything else, then its contact parts are
     cleared by clearedDental below. */
  dental: "keep",
} as const satisfies Record<keyof DemoSite, DuplicateRule>;

/** Every field under a rule, for the test and for anybody reading the table. */
export function fieldsWithRule(rule: DuplicateRule): (keyof DemoSite)[] {
  return (Object.keys(DUPLICATE_POLICY) as (keyof DemoSite)[]).filter(
    (k) => DUPLICATE_POLICY[k] === rule,
  );
}

/** The contact keys the copy loses. Office hours (and their Hindi) stay. */
export const CLEARED_CONTACT_KEYS = [
  "phone", "whatsapp", "email", "addressLines", "landmark", "mapUrl", "mapQuery",
  "branches", "transportDesk",
] as const satisfies readonly (keyof DemoContactDetails)[];

/** A branch's keys that route a call or a visit: cleared on a duplicate. */
export const CLEARED_BRANCH_KEYS = [
  "addressLines", "phone", "whatsapp", "mapQuery", "mapUrl", "landmark", "access", "parking", "transit",
] as const satisfies readonly (keyof DentalBranch)[];

/** The disclosure rows that are contact details in another table. */
export const CLEARED_DISCLOSURE_ROWS = ["address", "email", "phone"] as const;

/* ── The template's fictional name, in every form the copy writes it ────── */

export interface TemplateNameForms {
  /** Latin forms, the full name first. Short forms are the ones the prose uses. */
  en: string[];
  /** Devanagari forms used in the Hindi twins. */
  hi: string[];
  /** The template city in Devanagari, as the Hindi twins write it. */
  cityHi: string[];
}

/**
 * Written out by hand from the ten content files, because a short form
 * ("Harsingar opened in 2004") or a Devanagari form cannot be derived from
 * the full name. A new template is a compile error here until it is added,
 * and the test fails if any form the copy still carries was missed.
 */
export const TEMPLATE_NAMES: Record<TemplateId, TemplateNameForms> = {
  "s1-urban-cbse": { en: ["Harsingar Senior Secondary School", "Harsingar"], hi: ["हरसिंगार"], cityHi: ["गुरुग्राम"] },
  "s2-rural-state-board": { en: ["Kachnar Vidya Niketan", "Kachnar"], hi: ["कचनार विद्या निकेतन", "कचनार"], cityHi: ["सण्डीला", "संडीला"] },
  "s3-play-school": { en: ["Gilhari House Play School", "Gilhari House"], hi: ["गिलहरी हाउस"], cityHi: ["इंदौर"] },
  "s4-residential": { en: ["Buransh Hill School", "Buransh Hill", "Buransh"], hi: ["बुरांश हिल स्कूल", "बुरांश"], cityHi: ["अल्मोड़ा"] },
  "s5-international": { en: ["Semal International School"], hi: ["सेमल इंटरनेशनल स्कूल"], cityHi: ["बेंगलुरु"] },
  "c1-jee-neet-urban": { en: ["Parallax Academy", "Parallax"], hi: ["पैरेलैक्स अकादमी"], cityHi: ["कोटा"] },
  "c2-rural-tuition": { en: ["Nav Prabhat Coaching Centre", "Nav Prabhat"], hi: ["नव प्रभात कोचिंग सेंटर", "नव प्रभात"], cityHi: ["मुसाफ़िरख़ाना", "मुसाफिरखाना"] },
  "c3-science": { en: ["Meniscus Science Classes", "Meniscus"], hi: ["मेनिस्कस साइंस क्लासेज़", "मेनिस्कस"], cityHi: ["भोपाल"] },
  "c4-foundation": { en: ["Tangram Foundation Classes", "Tangram"], hi: ["टैंग्राम फ़ाउंडेशन क्लासेज़", "टैंग्राम"], cityHi: ["पुणे"] },
  "c5-government-jobs": { en: ["Kasauti Competition Classes", "Kasauti"], hi: ["कसौटी कॉम्पिटिशन क्लासेज़", "कसौटी"], cityHi: ["सासाराम"] },
  /* Dental (28 Sep 2026). Content files must use exactly these forms. */
  "d1-family-dentist": { en: ["Sheesham Family Dental Clinic", "Sheesham Dental", "Sheesham"], hi: ["शीशम फ़ैमिली डेंटल क्लिनिक", "शीशम डेंटल", "शीशम"], cityHi: ["लखनऊ"] },
  "d2-multispeciality": { en: ["Palash Multispeciality Dental Centre", "Palash Dental", "Palash"], hi: ["पलाश मल्टीस्पेशलिटी डेंटल सेंटर", "पलाश डेंटल", "पलाश"], cityHi: ["हैदराबाद"] },
  "d3-smile-studio": { en: ["Mogra Smile Studio", "Mogra"], hi: ["मोगरा स्माइल स्टूडियो", "मोगरा"], cityHi: ["मुंबई"] },
  "d4-implant-centre": { en: ["Deodar Dental Implant Centre", "Deodar Implant Centre", "Deodar"], hi: ["देवदार डेंटल इम्प्लांट सेंटर", "देवदार"], cityHi: ["पुणे"] },
  "d5-ortho-aligners": { en: ["Bakul Orthodontic Clinic", "Bakul Ortho", "Bakul"], hi: ["बकुल ऑर्थोडॉन्टिक क्लिनिक", "बकुल"], cityHi: ["जयपुर"] },
  "d6-kids-dental": { en: ["Tesu Children's Dental Clinic", "Tesu Kids Dental", "Tesu"], hi: ["टेसू चिल्ड्रन्स डेंटल क्लिनिक", "टेसू"], cityHi: ["चंडीगढ़"] },
  "d7-dental-chain": { en: ["Mahua Dental Clinics", "Mahua Dental", "Mahua"], hi: ["महुआ डेंटल क्लिनिक्स", "महुआ डेंटल", "महुआ"], cityHi: ["नई दिल्ली"] },
};

/**
 * THE NEIGHBOURHOOD a single-clinic dental template names beside its city,
 * in the forms its copy writes (30 Sep 2026). It is as much the template's
 * as its city is: a d4 demo made for a clinic in Indore read "Dental implant
 * centre, Baner, Indore" (Baner is in Pune). So when the Duplicate dialog is
 * given a city, "Baner, " before the city goes and every other "Baner"
 * becomes that city ("Years in Baner" reads "Years in Indore"), in both
 * languages. Nothing is guessed about the clinic's own area: a city is the
 * most the dialog knows, and Mehdi types the area in the editor if he wants.
 *
 * d7 (a chain) is left out on purpose: it names five branches, not one area,
 * and a chain's branches are its own. School and coaching templates are not
 * listed yet: their areas also sit in bus routes and stops ("Vijay Nagar
 * square"), where the city's name in their place would read wrongly.
 */
export const TEMPLATE_AREAS: Partial<Record<TemplateId, { en: string[]; hi: string[] }>> = {
  "d1-family-dentist": { en: ["Gomti Nagar"], hi: ["गोमती नगर"] },
  "d2-multispeciality": { en: ["Kondapur"], hi: ["कोंडापुर"] },
  "d3-smile-studio": { en: ["Bandra West"], hi: ["बांद्रा वेस्ट"] },
  "d4-implant-centre": { en: ["Baner"], hi: ["बाणेर"] },
  "d5-ortho-aligners": { en: ["Malviya Nagar"], hi: ["मालवीय नगर"] },
  "d6-kids-dental": { en: ["Sector 35"], hi: ["सेक्टर 35"] },
};

/** What the Duplicate dialog asks. Only the name is required. */
export interface DuplicateIdentity {
  name: string;
  city?: string;
  /** The name in Devanagari, for the Hindi twins. Empty: the English name is used there too. */
  hiName?: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One regex for a set of forms, longest first, matched as whole words in any script. */
function formsRe(forms: string[]): RegExp | null {
  const list = [...new Set(forms.map((f) => f.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!list.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${list.map(esc).join("|")})(?![\\p{L}\\p{M}\\p{N}])`, "gu");
}

/** The name forms for a template: the table's, plus the content's own name. */
export function templateNameForms(template: LoadedTemplate): TemplateNameForms {
  const row = TEMPLATE_NAMES[template.meta.id] || { en: [], hi: [], cityHi: [] };
  const own = [template.content.instituteName, template.content.shortName || ""];
  return { en: [...own, ...row.en].filter(Boolean), hi: row.hi, cityHi: row.cityHi };
}

/**
 * The rewrite applied to every string of the copy. `inHindi` is true inside
 * a `hi` block. Exported so the test computes the expected copy with it.
 */
export function makeRenamer(template: LoadedTemplate, who: DuplicateIdentity) {
  const forms = templateNameForms(template);
  const name = who.name.trim();
  const hiName = (who.hiName || "").trim() || name;
  const city = (who.city || "").trim();
  const oldCity = (template.content.city || "").trim();
  const oldState = (template.content.state || "").trim();
  const moving = Boolean(city) && city.toLowerCase() !== oldCity.toLowerCase();

  const enRe = formsRe(forms.en);
  const hiRe = formsRe(forms.hi);
  const pairRe = moving && oldCity && oldState ? formsRe([`${oldCity}, ${oldState}`]) : null;
  const cityRe = moving && oldCity ? formsRe([oldCity, ...forms.cityHi]) : null;

  /* The neighbourhood, only when a city was typed (moving or not: a clinic
     in the template's own city is not in its area either). "Baner, " right
     before the city goes, so the city rule above then handles the city;
     any other "Baner" becomes the city, the template's own spelling of it
     when the city stays (the Devanagari one inside a Hindi block). */
  const areas = city ? TEMPLATE_AREAS[template.meta.id] : undefined;
  const areaForms = areas ? [...areas.en, ...areas.hi] : [];
  const cityForms = [oldCity, ...forms.cityHi].filter(Boolean);
  const areaList = formsRe(areaForms)?.source;
  const cityList = formsRe(cityForms)?.source;
  const areaPrefixRe = areaList && cityList ? new RegExp(`${areaList}, (?=${cityList})`, "gu") : null;
  const areaRe = formsRe(areaForms);
  const cityHere = (inHindi: boolean) => (moving ? city : (inHindi && forms.cityHi[0]) || oldCity);

  return (s: string, inHindi: boolean): string => {
    const newName = () => (inHindi ? hiName : name);
    let out = s;
    /* The city first, so a new name that happens to hold the old city's
       word ("Kota Classes" moving to Patna) is never rewritten. */
    if (areaPrefixRe) out = out.replace(areaPrefixRe, "");
    if (pairRe) out = out.replace(pairRe, () => city);
    if (cityRe) out = out.replace(cityRe, () => city);
    if (areaRe) out = out.replace(areaRe, () => cityHere(inHindi));
    if (enRe) out = out.replace(enRe, newName);
    if (hiRe) out = out.replace(hiRe, newName);
    return out;
  };
}

/** A deep copy of plain data with every string rewritten. Keys are never touched. */
function renameAll(v: unknown, fn: (s: string, inHindi: boolean) => string, inHindi = false): unknown {
  if (typeof v === "string") return fn(v, inHindi);
  if (Array.isArray(v)) return v.map((x) => renameAll(x, fn, inHindi));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = renameAll(x, fn, inHindi || k === "hi");
    return out;
  }
  return v;
}

/** The template's contact block without anything that routes a call, a mail or a visit. */
export function clearedContact(c: DemoContactDetails | undefined): DemoContactDetails {
  const out: DemoContactDetails = {
    phone: "", whatsapp: "", email: "", addressLines: [], hours: c?.hours || "", mapUrl: "", mapQuery: "",
  };
  if (c?.hi?.hours) out.hi = { hours: c.hi.hours };
  return out;
}

/**
 * The dental block without anything that routes a call or a visit to the
 * template's fictional clinic: branch addresses and numbers, the emergency
 * line, and how to reach the building. Names, hours, sessions, doctors,
 * treatments, fees, cases and every other line are kept (already renamed).
 * Mutates and returns its argument, which is always the copy.
 */
export function clearedDental(d: DentalContent | undefined): DentalContent | undefined {
  if (!d) return d;
  if (d.branches) {
    for (const b of d.branches) {
      for (const k of CLEARED_BRANCH_KEYS) delete b[k];
      if (b.hi) {
        delete b.hi.addressLines;
        delete b.hi.landmark;
        delete b.hi.access;
        delete b.hi.parking;
        delete b.hi.transit;
      }
    }
  }
  if (d.emergency) {
    delete d.emergency.phone;
    delete d.emergency.whatsapp;
  }
  delete d.reach;
  return d;
}

/* ── The provisional link, for demos duplicated before the name dialog ──── */

/** The link base a nameless duplicate used to get: "draft-s1-urban-cbse". */
export function templateDraftSlugBase(templateId: string): string {
  return `draft-${templateId}`;
}

/** True while an older duplicate still wears that provisional link. */
export function hasProvisionalTemplateSlug(site: Pick<DemoSite, "slug" | "templateId">): boolean {
  if (!site.templateId) return false;
  const base = templateDraftSlugBase(site.templateId);
  const s = (site.slug || "").toLowerCase();
  return s === base || new RegExp(`^${base}-\\d+$`).test(s);
}

/* ── The function ────────────────────────────────────────────────────────── */

export interface FromTemplateContext {
  /** Every demo, so the new slug and id are unique. */
  sites: DemoSite[];
  /** Every pitch page, so the new slug does not collide with one. */
  pitchPages: PitchPage[];
  /** Injectable for the test. Defaults to the current time. */
  now?: Date;
  /** Injectable for the test. Defaults to a time-based "ds_…" id. */
  newId?: () => string;
}

function defaultId(now: Date): string {
  return `ds_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A new draft demo for `who`, carrying the whole template by the table above.
 *
 * It is an ordinary `demoSites` document once saved: the edit lock, the slot,
 * Mark sent and every other rule apply to it exactly as to a demo typed in by
 * hand. Nothing links it back to the template except `templateId` and the
 * fingerprints in `sample`; editing the template (in code) never changes a
 * demo already made.
 */
export function fromTemplate(
  template: LoadedTemplate,
  ctx: FromTemplateContext,
  who: DuplicateIdentity,
): DemoSite {
  const name = (who?.name || "").trim();
  if (!name) throw new Error(template.meta.kind === "dental" ? "A clinic name is required." : "An institute name is required.");
  const { meta, content } = template;
  const now = ctx.now || new Date();
  const sites = ctx.sites || [];
  const pitchPages = ctx.pitchPages || [];
  const rename = makeRenamer(template, who);

  /* The template seen as a record: the content file plus the two fields the
     registry owns. */
  const source = { ...content, kind: meta.kind, theme: meta.theme } as Record<string, unknown>;
  const copy = {} as DemoSite;
  const write = copy as unknown as Record<string, unknown>;

  /* KEEP: a renamed deep copy, so nothing is shared with the template module. */
  for (const key of Object.keys(DUPLICATE_POLICY) as (keyof DemoSite)[]) {
    if (DUPLICATE_POLICY[key] === "keep" && source[key] !== undefined) {
      /* The top-level `hi` block is Hindi too, so it starts in Hindi. */
      write[key] = renameAll(source[key], rename, key === "hi");
    }
  }

  /* CONTACT */
  copy.contact = clearedContact(content.contact);
  copy.officialWebsite = "";
  if (copy.disclosure?.rows) {
    for (const k of CLEARED_DISCLOSURE_ROWS) delete copy.disclosure.rows[k];
  }
  if (copy.dental) clearedDental(copy.dental);

  /* IDENTITY */
  const city = (who.city || "").trim();
  const moving = Boolean(city) && city.toLowerCase() !== (content.city || "").trim().toLowerCase();
  copy.instituteName = name;
  copy.shortName = "";
  /* Its Hindi twin goes with it (1 Oct 2026). The pages read the short name
     through bi(), which falls back to the Hindi one when the English is
     empty, so a kept hi.shortName (renamed to the Hindi name) put the
     Devanagari name in the English Contact page's title. Empty in both
     languages: every page uses the full name, in its own language. */
  if (copy.hi) delete copy.hi.shortName;
  copy.city = city || content.city;
  copy.state = moving ? "" : content.state;
  /* Its Hindi twin goes with it: typing a state later must not bring back
     the template's ("उत्तर प्रदेश" beside Indore). */
  if (moving && copy.hi) delete copy.hi.state;
  /* The Hindi name, when typed, is the Hindi page's masthead. Stored in the
     existing hi block; empty leaves the Hindi page on the English name. */
  const hiName = (who.hiName || "").trim();
  if (hiName) copy.hi = { ...(copy.hi || {}), instituteName: hiName };
  else if (copy.hi) delete copy.hi.instituteName;

  /* NEW */
  const taken = new Set(sites.map((s) => s.id));
  let id = ctx.newId ? ctx.newId() : defaultId(now);
  for (let n = 2; taken.has(id); n++) id = `${id}_${n}`;
  copy.id = id;
  copy.status = "draft";
  copy.isExample = false;
  copy.templateId = meta.id;
  copy.preparedOn = now.toISOString().slice(0, 10);
  copy.order = sites.length;
  copy.expiresAt = "";
  copy.slug = uniqueDemoSlug(name, { sites, pitchPages, currentId: id });

  /* Last, so each print is of the block exactly as it landed. */
  copy.sample = { from: meta.id, prints: samplePrints(copy) };

  for (const k of Object.keys(write)) if (write[k] === undefined) delete write[k];
  return copy;
}

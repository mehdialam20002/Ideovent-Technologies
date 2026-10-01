/**
 * WHICH FIELDS THE DEMO-SITE FORM SHOWS FOR ONE RECORD (/admin/c/demoSites).
 * Pure, no React: DemoSitesEditor.tsx draws what this returns, and
 * scripts/test-from-template.mjs checks it against the real schema.
 *
 * A DENTAL RECORD IS A CLINIC (28 Sep 2026). The schema's words are an
 * institute's. On a record of kind "dental" the form asks for the clinic's
 * name, in English and in Hindi, and the dental pages group
 * (./DemoSitesDentalSchema.ts) is shown; a school or coaching record does not
 * render that group, so it is hidden there unless the record already carries
 * a dental block (a record switched from dental keeps it reachable).
 *
 * AND THE OTHER WAY ROUND (30 Sep 2026). The fields only a school's or a
 * coaching institute's pages print. A clinic's pages never read them
 * (DENTAL_PAGES in src/lib/demo/site/pages.ts and src/pages/site/dental), so a
 * dental record's form leaves them out: no Admissions, Courses, Faculty,
 * Timetable, Results, Transport or Test series on a clinic. One that already
 * carries something stays, so a record switched from school or coaching to
 * dental keeps what it had reachable. The FAQ, reviews, trust figures,
 * photographs, blog posts, vision and mission stay: the dental pages print them.
 */

import type { DemoKind, DemoSite } from "@/lib/cms/types";
import type { FieldConfig } from "./fields";

export const NOT_ON_A_CLINIC: ReadonlySet<string> = new Set([
  /* The institute's own fields (./schemas.ts). */
  "boardOrAffiliation", "principalName", "principalTitle", "principalMessage", "facilities",
  "admissionsHeadline", "admissions", "notices", "focusAreas", "courses", "faculty", "method",
  "schedule", "scheduleNote", "trial", "resultsHeading", "resultsNote", "results", "gallery",
  /* School page groups (./DemoSitesPagesSchema.ts). */
  "sessionLabel", "admissionsOpenUntil", "udiseCode", "portalLinks", "downloads", "policies",
  "academics", "facilityDetails", "boardResults", "transport", "boarding", "studentLife",
  "safety", "dayPlan", "disclosure",
  /* Coaching page groups. */
  "joining", "classSizePromise", "hostel", "founder", "testSeries", "scholarship", "govExams",
  "olympiad", "feesPolicy",
]);

/** Their Hindi twins in the page fields' "Hindi (optional)" group. */
export const NOT_ON_A_CLINIC_HI: ReadonlySet<string> = new Set([
  "admissionsHeadline", "principalMessage", "principalTitle", "resultsHeading", "resultsNote",
  "classSizePromise", "hostel", "sessionLabel",
]);

/** A clinic's words for the institute-worded fields its pages do print. */
const CLINIC_LABELS: Record<string, string> = {
  about: "About the clinic",
  faq: "Questions patients ask",
  posts: "Blog posts",
};

/** True when a value holds anything: text, a number, a ticked box, or a list or group with one of those in it. */
export function carriesData(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.some(carriesData);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).some(carriesData);
  return false;
}

const valueOf = (site: DemoSite | undefined, key: string): unknown =>
  site ? (site as unknown as Record<string, unknown>)[key] : undefined;
const hiValueOf = (site: DemoSite | undefined, key: string): unknown =>
  ((site?.hi || {}) as Record<string, unknown>)[key];

/** The name field (the schema's first) in the record's words. */
export function nameFieldFor(field: FieldConfig, kind: DemoKind | undefined): FieldConfig {
  if (kind !== "dental") return field;
  return {
    ...field,
    label: "Clinic name",
    help: "Spell it exactly as the clinic spells it on its signboard or its own site. This is the masthead of what they will believe is their own website, so a wrong spelling is the first and last thing they notice.",
  };
}

/**
 * The form's fields for this record. `saved` is the stored version, if any:
 * a field that carried something when the record was opened stays on screen
 * while its last row is being deleted, instead of vanishing under the cursor.
 */
export function demoFormFields(fields: FieldConfig[], site: DemoSite, saved?: DemoSite): FieldConfig[] {
  const dental = site.kind === "dental";
  const carriesDental = Boolean(site.dental && Object.keys(site.dental).length);
  const kept = (key: string) => carriesData(valueOf(site, key)) || carriesData(valueOf(saved, key));
  const hiKept = (key: string) => carriesData(hiValueOf(site, key)) || carriesData(hiValueOf(saved, key));
  return fields
    .filter((f) => f.name !== "dental" || dental || carriesDental)
    .filter((f) => !dental || !NOT_ON_A_CLINIC.has(f.name) || kept(f.name))
    .map((f) => {
      if (!dental) return f;
      if (f.name === "hi" && f.type === "group") {
        return {
          ...f,
          fields: (f.fields || [])
            .filter((g) => !NOT_ON_A_CLINIC_HI.has(g.name) || hiKept(g.name))
            .map((g) =>
              g.name === "instituteName"
                ? { ...g, label: "Clinic name in Hindi", help: "Exactly as the clinic writes it in Hindi. Empty shows the English name on the Hindi page too." }
                : g,
            ),
        };
      }
      return CLINIC_LABELS[f.name] ? { ...f, label: CLINIC_LABELS[f.name] } : f;
    });
}

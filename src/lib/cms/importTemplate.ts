import type { CollectionKey, DemoSite, DentalContent } from "./types";
import { COLLECTION_KEYS } from "./store";

/**
 * THE CONTENT IMPORT TEMPLATE, offered beside the admin header's Import.
 *
 * Importing this file as downloaded changes nothing: every collection is an
 * empty array, and every key starting with "_" (the readme and the example) is
 * skipped by BOTH stores' importJson. So Mehdi can see the shape, paste real
 * documents into the arrays he needs, delete the rest, and import.
 */

/**
 * Not offered: form submissions, internship applications and demo-open rows
 * are made by visitors, and the live store's Import skips them on purpose
 * (SKIP_ON_IMPORT in supabaseStore.ts).
 */
const NOT_IMPORTED: CollectionKey[] = ["demoSiteOpens", "submissions", "applications"];

export const CONTENT_TEMPLATE_FILE = "ideovent-content-import-template.json";

const README = [
  "How Import works: each document in these arrays is added, or replaces the document with the same id.",
  "Documents not in this file are left as they are, so an empty array changes nothing.",
  "A singleton (settings, contact, navigation, home, internship, eduflow, legal) given as an object replaces that whole section.",
  "Keys starting with an underscore, like this one and _example_demoSite, are ignored by Import.",
  "To add a demo site: copy _example_demoSite into the demoSites array, give it a new unique id and slug, and fill in the institute.",
  "For a dental clinic, copy _example_dentalDemoSite instead, with its own id and slug: kind is dental, and its pages (doctors, treatments, fees, branches) live in the dental block.",
  "Tip: Export gives you the current content in this same shape.",
].join(" ");

const EXAMPLE_DEMO_SITE: DemoSite = {
  id: "ds_example_template_only",
  slug: "example-public-school",
  status: "draft",
  kind: "school",
  market: "india",
  instituteName: "Example Public School",
  shortName: "Example School",
  tagline: "Learning with care since 1998",
  city: "Saket",
  state: "Delhi",
  country: "India",
} as DemoSite;

/**
 * The dental block of the example below, typed on its own so a misspelt key
 * is a compile error (the record around it is cast, like the school's). No
 * price and no phone number: a starting price is only ever the clinic's own
 * published figure, and a number is only ever copied from their own site.
 */
const EXAMPLE_DENTAL: DentalContent = {
  hero: { headline: "Family dental care in *Saket*", lead: "Check-ups, fillings, root canal treatment, cleaning and braces." },
  doctors: [{ name: "Dr. Example Name", qualification: "BDS", specialisation: "General dentist", lead: true }],
  treatments: [
    { slug: "root-canal-treatment", name: "Root canal treatment", summary: "Saves an infected tooth instead of removing it.", priceNote: "Cost after consultation and X-ray" },
  ],
};

/**
 * A dental clinic (28 Sep 2026): the smallest record the dental site renders
 * from. Fictional, like the school above; every price is left to the clinic.
 */
const EXAMPLE_DENTAL_DEMO_SITE: DemoSite = {
  id: "ds_example_dental_template_only",
  slug: "example-dental-clinic",
  status: "draft",
  kind: "dental",
  market: "india",
  theme: "haven",
  instituteName: "Example Dental Clinic",
  shortName: "Example Dental",
  city: "Saket",
  state: "Delhi",
  country: "India",
  dental: EXAMPLE_DENTAL,
} as DemoSite;

/** The template as pretty-printed JSON. */
export function contentImportTemplateJson(): string {
  const doc: Record<string, unknown> = {
    _readme: README,
    _example_demoSite: EXAMPLE_DEMO_SITE,
    _example_dentalDemoSite: EXAMPLE_DENTAL_DEMO_SITE,
  };
  for (const key of COLLECTION_KEYS) if (!NOT_IMPORTED.includes(key)) doc[key] = [];
  return JSON.stringify(doc, null, 2) + "\n";
}

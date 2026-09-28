import type { CollectionKey, DemoSite } from "./types";
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

/** The template as pretty-printed JSON. */
export function contentImportTemplateJson(): string {
  const doc: Record<string, unknown> = { _readme: README, _example_demoSite: EXAMPLE_DEMO_SITE };
  for (const key of COLLECTION_KEYS) if (!NOT_IMPORTED.includes(key)) doc[key] = [];
  return JSON.stringify(doc, null, 2) + "\n";
}

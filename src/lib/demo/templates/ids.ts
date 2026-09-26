/**
 * The ten template ids, and nothing else.
 *
 * WHY THIS IS ITS OWN FILE. Two places outside the admin need to know what a
 * template is called, and neither may pull in the registry:
 *
 *   src/pages/DemoSiteRoute.tsx refuses to serve a template at /site/<id>.
 *   It is the PUBLIC demo route, so anything it imports is in the chunk a
 *   director downloads. This file is a list of strings; the registry next to
 *   it holds labels, descriptions and ten lazy loaders.
 *
 *   src/lib/demo/reservedRoutes.ts refuses a real demo whose slug would be
 *   one of these, so the public 404 above can never hide a real, sent demo.
 *
 * Never rename an id in place. A duplicate records the id it came from
 * (`DemoSite.templateId`), and the admin shows that label next to it.
 */

export const TEMPLATE_IDS = [
  "s1-urban-cbse",
  "s2-rural-state-board",
  "s3-play-school",
  "s4-residential",
  "s5-international",
  "c1-jee-neet-urban",
  "c2-rural-tuition",
  "c3-science",
  "c4-foundation",
  "c5-government-jobs",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * The slug a template wears inside its own admin preview. It never reaches a
 * collection: the preview builds the record in memory. It is reserved anyway,
 * so that no real demo can ever be given an address that looks like one.
 */
export const TEMPLATE_PREVIEW_SLUG_PREFIX = "template-";

export function isTemplateId(value: string | undefined): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes((value || "").trim().toLowerCase());
}

/**
 * True for any address that names a template: its id, or its preview slug.
 * The public route answers every one of these with the ordinary 404.
 */
export function isTemplateSlug(slug: string | undefined): boolean {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return false;
  if (isTemplateId(s)) return true;
  return s.startsWith(TEMPLATE_PREVIEW_SLUG_PREFIX) && isTemplateId(s.slice(TEMPLATE_PREVIEW_SLUG_PREFIX.length));
}

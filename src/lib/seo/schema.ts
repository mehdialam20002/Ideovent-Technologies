import type { ContactInfo, SiteSettings, SocialLink } from "@/lib/cms/types";

/**
 * JSON-LD builders.
 *
 * Every value here has to be traceable to _assets/FACTS.md. Nothing in this
 * file may assert a rating, a review, an award, a headcount, a project count
 * or a founding claim that is not in that file.
 *
 * AggregateRating and Review are deliberately ABSENT and must stay absent:
 * no client has ever reviewed Ideovent, so marking one up would be a
 * fabrication and a Google structured-data policy violation that can get the
 * whole site's rich results suppressed.
 */

export type Json = Record<string, unknown>;

/** Turn a site-relative path or asset path into an absolute URL. */
export function absolute(host: string, value: string): string {
  if (!value) return host;
  if (/^https?:\/\//i.test(value)) return value;
  return `${host.replace(/\/$/, "")}/${value.replace(/^\/+/, "")}`;
}

export const ORG_ID = "#organization";
export const SITE_ID = "#website";

/** Properties whose value must be a resolvable URL for schema.org to be valid. */
const URL_KEYS = new Set(["@id", "url", "image", "logo", "contentUrl", "sameAs"]);

/**
 * Walk a JSON-LD node and make every URL-valued property absolute.
 *
 * Pages hand us CMS values like "/work/gym-map.webp" or "/blog/slug"; a relative
 * URL in structured data is not resolvable by a consumer that only has the JSON,
 * which is the same defect that made the old relative og: image useless to every
 * social scraper.
 */
export function absolutizeUrls<T>(node: T, host: string): T {
  if (Array.isArray(node)) return node.map((v) => absolutizeUrls(v, host)) as unknown as T;
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === "string" && URL_KEYS.has(k) && v.startsWith("/")) out[k] = absolute(host, v);
    else out[k] = absolutizeUrls(v, host);
  }
  return out as T;
}

/**
 * Organization. Legal form is a partnership firm (FACTS.md, 24 Sep 2026), so
 * the generic Organization type is used rather than anything that implies a
 * registered company, and no numberOfEmployees / foundingDate beyond 2024 is
 * claimed. There is NO `founder` property: on 28 Sep 2026 Mehdi asked for
 * every Founder / Co-Founder title to come off every person on the site, and
 * a JSON-LD `founder` is the same claim made to Google instead of a reader.
 * People are listed as `employee` with their job titles only, the same three
 * titles the About page prints. Keep this list and index.html's static copy
 * in step.
 * HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
 * (The previous comment named him as the third partner; he was never in the
 * `founder` value.) A headcount must never be inferable.
 */
export function organizationNode(
  settings: SiteSettings,
  contact: ContactInfo,
  socials: SocialLink[],
): Json {
  const host = settings.defaultSeo.canonicalHost.replace(/\/$/, "");
  const address: Json = {
    "@type": "PostalAddress",
    streetAddress: contact.address.line1,
    addressLocality: contact.address.city,
    addressRegion: contact.address.state,
    addressCountry: "IN",
  };
  // Postal code is an unconfirmed blank in FACTS.md, omit rather than guess.
  if (contact.address.postalCode) address.postalCode = contact.address.postalCode;

  return {
    // Multi-typed on purpose: Organization is the publisher identity every
    // other node points at, ProfessionalService is what earns the local
    // signals for a studio that actually sits in Saket, New Delhi.
    "@type": ["Organization", "ProfessionalService"],
    "@id": `${host}/${ORG_ID}`,
    name: settings.siteName,
    alternateName: "Ideovent",
    url: `${host}/`,
    logo: {
      "@type": "ImageObject",
      url: absolute(host, "icons/icon-512.png"),
      width: 512,
      height: 512,
    },
    image: absolute(host, settings.defaultSeo.ogImage),
    description: settings.defaultSeo.description,
    email: contact.emailDisplay,
    telephone: contact.phoneHref.replace(/^tel:/, ""),
    foundingDate: "2024",
    employee: [
      { "@type": "Person", name: "Mehdi Alam", jobTitle: "Software Developer" },
      { "@type": "Person", name: "Abhishek Tiwari", jobTitle: "Product Manager" },
      { "@type": "Person", name: "Saif Ali", jobTitle: "Senior App Developer" },
    ],
    address,
    geo: { "@type": "GeoCoordinates", latitude: 28.5245, longitude: 77.2066 },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    knowsAbout: [
      "Website development",
      "Custom SaaS development",
      "Mobile app development",
      "UI/UX design",
      "Backend and API development",
      "Website maintenance and support",
    ],
    areaServed: [
      { "@type": "City", name: "New Delhi" },
      { "@type": "AdministrativeArea", name: "Delhi NCR" },
      { "@type": "Country", name: "India" },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: contact.emailDisplay,
        telephone: contact.phoneHref.replace(/^tel:/, ""),
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
    ],
    sameAs: socials.map((s) => s.url).filter(Boolean),
  };
}

/** WebSite. No SearchAction: the site has no search endpoint to point at. */
export function webSiteNode(settings: SiteSettings): Json {
  const host = settings.defaultSeo.canonicalHost.replace(/\/$/, "");
  return {
    "@type": "WebSite",
    "@id": `${host}/${SITE_ID}`,
    url: `${host}/`,
    name: settings.siteName,
    description: settings.defaultSeo.description,
    inLanguage: "en-IN",
    publisher: { "@id": `${host}/${ORG_ID}` },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbNode(host: string, crumbs: Crumb[]): Json {
  const base = host.replace(/\/$/, "");
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" },...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}

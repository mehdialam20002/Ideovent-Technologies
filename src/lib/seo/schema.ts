import type { ContactInfo, SiteSettings, SocialLink } from "@/lib/cms/types";
import { MAILBOX_LIVE } from "@/lib/mailbox";

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
 * registered company, and no numberOfEmployees is claimed. foundingDate is
 * 2019, the year Mehdi Alam started Ideovent (his decision of 1 Oct 2026; it
 * was 2024, the year it became a partnership firm, which the About page also
 * states). There is NO `founder` property: on 28 Sep 2026 Mehdi asked for
 * every Founder / Co-Founder title to come off every person on the site, and
 * a JSON-LD `founder` is the same claim made to Google instead of a reader.
 * People are listed as `employee` with their job titles only, the same three
 * titles the About page prints. Keep this list and index.html's static copy
 * in step.
 * HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
 * (The previous comment named him as the third partner; he was never in the
 * `founder` value.) A headcount must never be inferable.
 */
/**
 * What the firm is, for machines. Deliberately not settings.defaultSeo.description:
 * that is the home page's search snippet and carries prices, which do not belong
 * in a description of the business itself.
 */
export const ORG_DESCRIPTION =
  "Web and software studio in Saket, New Delhi: websites, web apps, custom software, mobile apps and local SEO for businesses in India and abroad.";

/**
 * contact@ideovent.in has no mailbox yet (FACTS.md, CORRECTION 30 Sep 2026, item
 * 6: no MX record on 1 Oct 2026, "never tell a reader that either works today").
 * Structured data is a statement to Google and to every assistant that reads it,
 * so the address stays out of it until a message sent from outside has been
 * received. ONE flag for the whole site since 1 Oct 2026: src/lib/mailbox.ts,
 * which the footer and the contact blocks read too. Flip it there.
 */
export { MAILBOX_LIVE };

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
  const email = MAILBOX_LIVE && contact.emailDisplay ? { email: contact.emailDisplay } : {};

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
    description: ORG_DESCRIPTION,
    ...email,
    telephone: contact.phoneHref.replace(/^tel:/, ""),
    foundingDate: "2019",
    employee: [
      { "@type": "Person", name: "Mehdi Alam", jobTitle: "Software Developer" },
      { "@type": "Person", name: "Abhishek Tiwari", jobTitle: "Product Manager" },
      { "@type": "Person", name: "Saif Ali", jobTitle: "Senior App Developer" },
    ],
    address,
    /* No `geo`. A latitude and longitude claim a precise point, and FACTS.md
       confirms only "Saket, New Delhi": no street, no PIN, no map pin. The
       hours below are the ones the site prints (contact.businessHours). */
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
      "Custom software and SaaS development",
      "Mobile app development",
      "UI/UX design",
      "Backend and API development",
      "Local SEO and Google Business Profile management",
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
        ...email,
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
    description: ORG_DESCRIPTION,
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

/* ───────────── Page nodes shared by the pages and scripts/prerender-heads.mjs ─────────────
 * Site-relative URLs are fine here: <Seo> and the prerender both run the graph
 * through absolutizeUrls(). <Seo> also links each node to the Organization
 * (`provider` on a Service, `publisher` on the rest) unless the node sets it.
 */

const AREA_SERVED: Json[] = [
  { "@type": "City", name: "New Delhi" },
  { "@type": "AdministrativeArea", name: "Delhi NCR" },
  { "@type": "Country", name: "India" },
];

/** FACTS.md, secondary market. The USD offers are for these four. */
const ABROAD_COUNTRIES: Json[] = ["United States", "United Kingdom", "United Arab Emirates", "Australia"].map(
  (name) => ({ "@type": "Country", name }),
);

interface ServiceNodeInput {
  title: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  intro?: string;
  deliverables?: string[];
}

/**
 * One Service per /services/<slug> page, with a stable @id the list page reuses.
 * The deliverables go in as an OfferCatalog of named services with no price, which
 * is what they are: what the scope lists, not something sold separately.
 */
export function serviceNode(s: ServiceNodeInput, offers?: Json[]): Json {
  return {
    "@type": "Service",
    "@id": `/services/${s.slug}#service`,
    name: s.title,
    serviceType: s.title,
    description: s.intro || s.longDescription || s.shortDescription || s.title,
    url: `/services/${s.slug}`,
    areaServed: AREA_SERVED,
    ...(s.deliverables?.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${s.title}: what is included`,
            itemListElement: s.deliverables.map((d) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: d } })),
          },
        }
      : {}),
    ...(offers?.length ? { offers } : {}),
  };
}

/** A monthly "from" price, as schema.org spells it. */
function monthlyFrom(min: number, currency: "INR" | "USD", region: Json | Json[]): Json {
  return {
    "@type": "Offer",
    priceCurrency: currency,
    eligibleRegion: region,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      minPrice: min,
      priceCurrency: currency,
      unitCode: "MON",
      referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
    },
  };
}

/**
 * The SEO add-on's two "from" prices (Mehdi, 1 Oct 2026), read from
 * src/lib/pricing.ts like every other price. Only these are marked up: the
 * one-time bands stay unmarked for the reason in Pricing.tsx (an Offer strips
 * the "from, for a scope that does not exist yet" qualification away).
 */
export function seoOffers(indiaFrom: number, abroadFromUsd: number): Json[] {
  return [
    monthlyFrom(indiaFrom, "INR", { "@type": "Country", name: "India" }),
    monthlyFrom(abroadFromUsd, "USD", ABROAD_COUNTRIES),
  ];
}

/** FAQPage for questions that are VISIBLE on the page. Never for hidden text. */
export function faqPageNode(faqs: { question: string; answer: string }[]): Json | undefined {
  if (!faqs.length) return undefined;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** A list page's Service entries, reusing each service page's @id. Short: no catalog. */
export function serviceListNodes(services: ServiceNodeInput[]): Json[] {
  return services.map((s) => serviceNode({ ...s, deliverables: undefined, intro: undefined, longDescription: undefined }));
}

/** The price offers a service page marks up, by slug. Only the SEO add-on today. */
export function serviceOffers(slug: string, seo: { indiaFrom: number; abroadFromUsd: number }): Json[] | undefined {
  return slug === "seo" ? seoOffers(seo.indiaFrom, seo.abroadFromUsd) : undefined;
}

interface ProjectNodeInput {
  title: string;
  summary?: string;
  coverImage?: string;
  liveUrl?: string;
  technologies?: string[];
  category?: string;
  clientName?: string;
}

/**
 * A case study. Employer work (WTF Go) was built by a partner while employed at
 * Witness The Fitness Pvt. Ltd., so Ideovent is NOT named as its creator: the
 * employer is the publisher, or, with no usable employer name, nothing is said
 * at all (an empty name is a broken record, and a fallback to Ideovent would be
 * the false claim this branch exists to avoid). Moved here unchanged from
 * CaseStudy.tsx so the prerendered head says exactly what the page says.
 */
export function caseStudyNode(p: ProjectNodeInput): Json {
  const employerWork = (p.category || "").toLowerCase() === "employer work";
  const employer = employerWork ? (p.clientName ?? "").split(/,\s/)[0].trim() || (p.clientName ?? "").trim() : "";
  return {
    "@type": "CreativeWork",
    name: p.title,
    description: p.summary,
    ...(p.coverImage ? { image: p.coverImage } : {}),
    inLanguage: "en-IN",
    ...(p.liveUrl ? { url: p.liveUrl } : {}),
    ...(p.technologies?.length ? { keywords: p.technologies.join(", ") } : {}),
    ...(employerWork
      ? employer
        ? { publisher: { "@type": "Organization", name: employer }, creditText: p.clientName }
        : {}
      : { creator: { "@type": "Organization", name: "Ideovent Technologies" } }),
  };
}

interface PostNodeInput {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  publishDate?: string;
  author?: string;
  tags?: string[];
}

/**
 * A blog post. BlogPosting, the narrower type Google documents for articles.
 * The byline is the studio: no post is attributed to a named person in FACTS.md.
 * `datePublished` only when the record carries a real date.
 */
export function blogPostingNode(p: PostNodeInput): Json {
  return {
    "@type": "BlogPosting",
    headline: p.title.slice(0, 110),
    description: p.excerpt,
    ...(p.coverImage ? { image: p.coverImage } : {}),
    ...(p.publishDate ? { datePublished: p.publishDate } : {}),
    inLanguage: "en-IN",
    author: { "@type": "Organization", name: p.author || "Ideovent Technologies" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `/blog/${p.slug}` },
    ...(p.tags?.length ? { keywords: p.tags.join(", ") } : {}),
  };
}

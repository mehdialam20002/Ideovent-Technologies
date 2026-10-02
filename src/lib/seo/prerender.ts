/**
 * BUILD-TIME ONLY. The head, and a no-JavaScript summary, of every public page.
 *
 * scripts/prerender-heads.mjs bundles this file with esbuild after `vite build`
 * and writes dist/<route>/index.html for every URL in the sitemap. The app never
 * imports it (it pulls in the full blog and policy HTML).
 *
 * WHY (SEO audit, 1 Oct 2026, P0-3). The site is a single-page app: every URL
 * used to return the same index.html, with the homepage's title, description,
 * canonical and card, and an empty <div id="root">. WhatsApp, LinkedIn and X
 * read only that HTML, so every link previewed as the homepage; Bing renders
 * JavaScript unevenly and most AI crawlers not at all. Each route's file now
 * carries its own title, description, canonical, Open Graph and Twitter tags and
 * JSON-LD, all marked data-rh so react-helmet-async adopts them on load, plus
 * a <noscript> with the page's h1 and text for anything that runs no script.
 *
 * Every value comes from the helpers the pages themselves call
 * (src/lib/seo/pages.ts, schema.ts, src/lib/pricing.ts), so the HTML a crawler
 * gets and the page React renders say the same thing.
 */
import { seed } from "../cms/seed";
import rawBlogs from "../cms/data/blogs.seed.json";
import rawLegal from "../cms/data/legal.seed.json";
import { SEO as SEO_PRICES } from "../pricing";
// The same Service + Offer nodes /pricing passes to <Seo> (plain data, no React).
import { pricingSchema } from "../../pages/pricing/schema";
// The /websites pages' trail, Service and FAQPage, as the page passes them to <Seo>.
import { websitesSchema } from "../../pages/websites/schema";
import { LEGAL_PAGES, PAGE_SEO, legalSeo, postSeo, projectSeo, serviceSeo, type PageSeo } from "./pages";
import {
  absolute, absolutizeUrls, blogPostingNode, breadcrumbNode, caseStudyNode, faqPageNode,
  organizationNode, serviceListNodes, serviceNode, serviceOffers, webSiteNode, ORG_ID,
  type Crumb, type Json,
} from "./schema";
import { noscriptBlock, type BodyContext } from "./prerenderBody";

export interface HeadSpec {
  path: string;
  title: string;
  description: string;
  /** Null for the SPA shell, which is served for many addresses. */
  canonical: string | null;
  image: string;
  imageIsCard: boolean;
  imageAlt: string;
  type: "website" | "article";
  publishedTime?: string;
  jsonLd: string;
  noscript: string;
}

export const host = seed.settings.defaultSeo.canonicalHost.replace(/\/$/, "");
const siteName = seed.settings.siteName;
const sorted = <T extends { order?: number }>(list: T[]) => [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
export const services = sorted(seed.services);
export const projects = sorted(seed.projects);
export const posts = sorted(seed.posts).filter((p) => p.status === "published");
export const faqs = sorted(seed.faqs);
/** Article HTML by post id, and policy HTML by kind: the deferred bodies. */
export const postBodies = new Map((rawBlogs as { id: number | string; content?: string }[]).map((b, i) => [String(b.id ?? i + 1), b.content || ""]));
export const legalBodies = rawLegal as Record<string, { title: string; body: string; updatedAt?: string }>;

const CTX: BodyContext = {
  services, projects, posts, faqs, postBodies, legalBodies,
  phoneDisplay: seed.contact.phoneDisplay,
  phoneHref: seed.contact.phoneHref,
  whatsappNumber: seed.contact.whatsappNumber,
  businessHours: seed.contact.businessHours,
  responsePromise: seed.contact.responseTimePromise,
};

/** The same graph <Seo> builds: Organization, WebSite, crumbs, then page nodes linked to the Organization. */
function graph(crumbs: Crumb[] | undefined, nodes: (Json | undefined)[]): string {
  const orgRef = { "@id": `${host}/${ORG_ID}` };
  const out: Json[] = [organizationNode(seed.settings, seed.contact, seed.socials), webSiteNode(seed.settings)];
  if (crumbs?.length) out.push(breadcrumbNode(host, crumbs));
  for (const node of nodes) {
    if (!node) continue;
    const t = Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"];
    const key = t === "Service" || t === "Course" ? "provider" : "publisher";
    out.push(absolutizeUrls(key in node ? node : { ...node, [key]: orgRef }, host));
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": out });
}

/**
 * Pages whose h1 is a CMS field: the no-script h1 reads that same field, so the
 * two cannot differ (the home hero's `lines`, EduFlow's and LaunchPad's titles).
 */
function cmsH1(path: string): string | undefined {
  const home = seed.home as { hero?: { lines?: string[] } };
  if (path === "/") return home.hero?.lines?.filter(Boolean).join(" ") || undefined;
  if (path === "/eduflow") return seed.eduflow?.title || undefined;
  if (path === "/internship") return seed.internship?.title || undefined;
  return undefined;
}

function spec(path: string, seo: PageSeo, opts: {
  crumbs?: Crumb[]; nodes?: (Json | undefined)[]; image?: string; type?: "website" | "article"; publishedTime?: string;
} = {}): HeadSpec {
  const image = opts.image || seo.image || seed.settings.defaultSeo.ogImage;
  const card = /(^|\/)og\/[^/]+$/.test(image);
  return {
    path,
    title: seo.title,
    description: seo.description,
    canonical: `${host}${path}`,
    image: absolute(host, image),
    imageIsCard: card,
    imageAlt: card ? `${siteName}, the iV monogram and wordmark on a navy card` : seo.title,
    type: opts.type || "website",
    publishedTime: opts.publishedTime || undefined,
    jsonLd: graph(opts.crumbs, opts.nodes || []),
    noscript: noscriptBlock(path, { ...seo, h1: cmsH1(path) || seo.h1 }, CTX),
  };
}

/** FAQ categories a service page shows and marks up itself (see FAQ.tsx). */
const ownedFaqCategories = new Set(services.map((s) => s.faqCategory).filter(Boolean));

/** The head for one public path, or null for a path this module does not know. */
export function headFor(path: string): HeadSpec | null {
  const reg = PAGE_SEO[path];
  // /websites and its four pages: a two-level trail, so their own builder.
  const site = reg ? websitesSchema(path) : null;
  if (reg && site) return spec(path, reg, { crumbs: site.crumbs, nodes: site.nodes });
  if (reg) {
    const crumbs = reg.crumb ? [{ name: reg.crumb, path }] : undefined;
    const nodes: (Json | undefined)[] = [];
    if (path === "/services") nodes.push(...serviceListNodes(services));
    if (path === "/faq") nodes.push(faqPageNode(faqs.filter((f) => !ownedFaqCategories.has(f.category))));
    if (path === "/contact") nodes.push({ "@type": "ContactPage", name: "Contact Ideovent Technologies" });
    if (path === "/blog") nodes.push({ "@type": "Blog", name: "Ideovent Technologies Blog", inLanguage: "en-IN" });
    // The monthly plans (Subscription + ActivationFee, 12-month billingDuration)
    // and the SEO add-on, exactly as the page's <Seo schema> emits them, so a
    // crawler that runs no script sees the setup fee and the term as well.
    if (path === "/pricing") nodes.push(...pricingSchema());
    return spec(path, reg, { crumbs, nodes });
  }
  const [, section, slug, extra] = path.split("/");
  if (extra !== undefined) return null;
  if (section === "services" && slug) {
    const s = services.find((x) => x.slug === slug);
    if (!s) return null;
    const own = s.faqCategory ? faqs.filter((f) => f.category === s.faqCategory) : [];
    return spec(path, serviceSeo(s), {
      crumbs: [{ name: "Services", path: "/services" }, { name: s.title, path }],
      nodes: [serviceNode(s, serviceOffers(s.slug, SEO_PRICES)), faqPageNode(own)],
    });
  }
  if (section === "work" && slug) {
    const p = projects.find((x) => x.slug === slug);
    if (!p) return null;
    return spec(path, projectSeo(p), {
      crumbs: [{ name: "Work", path: "/work" }, { name: p.title, path }],
      nodes: [caseStudyNode(p)],
      image: p.coverImage || "/og/ideovent-og-work.png",
      type: "article",
    });
  }
  if (section === "blog" && slug) {
    const p = posts.find((x) => x.slug === slug);
    if (!p) return null;
    return spec(path, postSeo(p), {
      crumbs: [{ name: "Blog", path: "/blog" }, { name: p.title, path }],
      nodes: [blogPostingNode(p)],
      image: p.coverImage,
      type: "article",
      publishedTime: p.publishDate,
    });
  }
  const kind = (Object.keys(LEGAL_PAGES) as (keyof typeof LEGAL_PAGES)[]).find((k) => LEGAL_PAGES[k].path === path);
  if (kind) {
    const title = seed.legal[kind]?.title || legalBodies[kind]?.title || kind;
    return spec(path, legalSeo(kind, title), { crumbs: [{ name: title, path }] });
  }
  return null;
}

/**
 * dist/spa-shell.html (since 2 Oct 2026; it used to be dist/index.html, which is
 * now the homepage with headFor("/") and its canonical). The file served for every
 * address that has no file of its own (pitch pages, demos, the admin, a post added
 * in /admin after the build), so it carries NO canonical and no og:url: <Seo> sets
 * those at runtime, which Google accepts when the HTML has none. It keeps the
 * homepage's title, description and no-script summary.
 */
export function shellHead(): HeadSpec {
  const home = headFor("/")!;
  return { ...home, canonical: null, jsonLd: graph(undefined, []) };
}

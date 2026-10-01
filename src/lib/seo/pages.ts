// Relative, not "@/": scripts/prerender-heads.mjs bundles this file with esbuild.
import { inr, ONE_TIME, PLANS, SEO, SETUP_FEE, TERM_MONTHS, usdWord } from "../pricing";

/**
 * SEARCH METADATA FOR EVERY PUBLIC PAGE, IN ONE PLACE (1 Oct 2026).
 *
 * Two readers, and they must agree:
 *   1. <Seo> (src/components/seo/Seo.tsx) at runtime. For a route listed in
 *      PAGE_SEO, the title and description here WIN over whatever the page
 *      passes, so a page cannot drift from item 2 by accident.
 *   2. scripts/prerender-heads.mjs at build time, which writes these same
 *      values into dist/<route>/index.html, so a crawler or a WhatsApp preview
 *      that runs no JavaScript gets this page's title, description, canonical
 *      and card instead of the homepage's.
 *
 * Rules (keyword plan, 1 Oct 2026, and the audit of the same day):
 *   - `title` is the COMPLETE <title>, brand included, 60 characters or fewer.
 *     Service and place first, brand last.
 *   - `description` is 155 characters or fewer, says what is sold and where.
 *   - A monthly website price never appears without its setup fee and its
 *     12-month term (CCPA dark-pattern guidelines, drip pricing). Numbers come
 *     from src/lib/pricing.ts, never typed here.
 *   - No "best", no "No. 1", no ranking or results promise.
 *   - `h1` is the page's one <h1>, in the words people search with.
 * The build prints a warning for any title or description over the limit.
 */
export interface PageSeo {
  /** The complete <title>, brand included. 60 characters or fewer. */
  title: string;
  /** 155 characters or fewer. */
  description: string;
  /** The page's one <h1>. */
  h1: string;
  /** Breadcrumb name for this page (the trail below Home). Absent on "/". */
  crumb?: string;
  /** Site-relative og:image when the page has its own card. */
  image?: string;
}

const starter = PLANS.starter;
/** "₹899/month + ₹2,999 setup on a 12-month plan": price, fee and term together. */
const monthlyFromLine = `${inr(starter.monthly)}/month + ${inr(SETUP_FEE)} setup on a ${TERM_MONTHS}-month plan`;

export const PAGE_SEO: Record<string, PageSeo> = {
  "/": {
    title: "Web Design & Software Company in New Delhi | Ideovent",
    description: `Websites, web apps and software for businesses, built in Saket, New Delhi. Buy outright from ${inr(ONE_TIME.landing.min)}, or ${monthlyFromLine}.`,
    // The home h1 is the hero's own (seed.home.hero.lines, owned by the hero);
    // this line is only a fallback for the prerendered no-script copy.
    h1: "Websites, apps and software for businesses, built in New Delhi",
  },
  "/services": {
    title: "Web, App & Software Development Services | Ideovent",
    description:
      "Websites, web apps, custom software, mobile apps, local SEO and website maintenance, from a studio in Saket, New Delhi, for businesses in India and abroad.",
    h1: "Website, app and software development services",
    crumb: "Services",
  },
  "/pricing": {
    title: "Website Price in India: Monthly Plans & Packages | Ideovent",
    description: `Website from ${inr(starter.monthly)}/month + ${inr(SETUP_FEE)} setup (${TERM_MONTHS}-month plan) or ${inr(ONE_TIME.landing.min)} one-time. Portals from ${inr(ONE_TIME.portal.min)}, software from ${inr(ONE_TIME.software.min)}, local SEO from ${inr(SEO.indiaFrom)}/month.`,
    h1: "Website and software prices, in writing",
    crumb: "Pricing",
  },
  "/work": {
    title: "Our Work: Live Websites, Apps & Software | Ideovent",
    description:
      "Client websites and apps you can open: GYM MAP, WedArt Films, Atelier Co., Tamkuhi Bazaar and more, each with what it does and the stack behind it.",
    h1: "Websites, apps and software we have built",
    crumb: "Work",
    image: "/og/ideovent-og-work.png",
  },
  "/about": {
    title: "About Ideovent Technologies, Saket, New Delhi",
    description:
      "A partnership firm of Mehdi Alam and Abhishek Tiwari, founded in 2024 and working from Saket, New Delhi. Who builds your website and how the studio runs.",
    h1: "A partnership firm in Saket, New Delhi",
    crumb: "About",
  },
  "/contact": {
    title: "Contact Ideovent: Website Quote on WhatsApp | New Delhi",
    description:
      "Send your website address or idea. We reply on WhatsApp within two working days with what we found or a written quote. +91 77619 21786, Saket, New Delhi.",
    h1: "Get a website quote or a free website check",
    crumb: "Contact",
  },
  "/faq": {
    title: "FAQ: Website Cost, Timelines, SEO & Ownership | Ideovent",
    description:
      "Straight answers: what a website costs, how long it takes, who owns the code and the domain, how long SEO takes, and what happens after launch.",
    h1: "Questions about websites, prices and SEO, answered",
    crumb: "FAQ",
  },
  "/blog": {
    title: "Website & SEO Guides for Small Businesses | Ideovent",
    description:
      "Plain notes for business owners on websites, speed, common website mistakes, local SEO and choosing a tech partner, from the people who build the sites.",
    h1: "Guides on websites and local SEO for small businesses",
    crumb: "Blog",
  },
  "/eduflow": {
    title: "EduFlow: School & Coaching Management Software | Ideovent",
    description:
      "School and coaching management software from New Delhi: admissions, fees, attendance and parent updates in one place. In development; early access open.",
    h1: "EduFlow, school and coaching management software, in development",
    crumb: "EduFlow",
  },
  "/internship": {
    title: "Web Development Internship in New Delhi | Ideovent LaunchPad",
    description:
      "A 12-week web development internship in New Delhi, mentored by Ideovent's partners, with a 100-mark rubric and a certificate anyone can verify.",
    h1: "A 12-week web development internship in New Delhi",
    crumb: "Internship",
  },
  "/verify": {
    title: "Verify an Ideovent Internship Certificate",
    description:
      "Check whether an Ideovent Technologies internship certificate is genuine. Enter the certificate ID printed on it, or scan its QR code.",
    h1: "Check an Ideovent certificate",
    crumb: "Verify a certificate",
  },
};

/** The SEO add-on in one phrase, for the service record and the FAQ answers. */
export const seoPriceWords = () =>
  `from ${inr(SEO.indiaFrom)} a month in India and ${usdWord(SEO.abroadFromUsd)} a month outside India`;

/* ───────────── Pages built from records: services, work, blog, policies ───────────── */

/** Longest <title> and description the helpers below will produce. */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

/**
 * Cut text for a meta description: at the last full sentence that fits, else at
 * the last whole word with an ellipsis. Never mid-word.
 */
export function clip(text: string, max = DESCRIPTION_MAX): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (sentence >= 60) return cut.slice(0, sentence + 1);
  const word = cut.slice(0, max - 1).lastIndexOf(" ");
  return `${cut.slice(0, word > 0 ? word : max - 1).replace(/[,;:.\s]+$/, "")}…`;
}

/** "X | Ideovent" when that fits, else X alone (a title over 60 is cut by Google anyway). */
export function withBrand(name: string): string {
  const n = name.trim();
  if (/ideovent/i.test(n)) return n;
  const branded = `${n} | Ideovent`;
  return branded.length <= TITLE_MAX ? branded : n;
}

interface ServiceLike {
  title: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  seoTitle?: string;
  metaDescription?: string;
  h1?: string;
}

export function serviceSeo(s: ServiceLike): PageSeo {
  return {
    title: s.seoTitle?.trim() || withBrand(s.title),
    description: clip(s.metaDescription?.trim() || s.shortDescription || s.longDescription || ""),
    h1: s.h1?.trim() || s.title,
    crumb: s.title,
  };
}

interface ProjectLike {
  title: string;
  slug: string;
  summary?: string;
  clientName?: string;
  category?: string;
}

/**
 * "GYM MAP. Gym Discovery & Joining Platform" → "GYM MAP: Gym Discovery & Joining
 * Platform | Ideovent". Employer work keeps its attribution in the title itself
 * (FACTS.md, ATTRIBUTION RULE): "WTF Go, built by Mehdi Alam at <employer>".
 */
export function projectSeo(p: ProjectLike): PageSeo {
  // "Atelier Co. Clothing E-Commerce Storefront": the client's own name can end
  // in a full stop, so it is matched first and only then the first ". " or ", ".
  const client = (p.clientName || "").trim();
  const name = client && p.title.startsWith(client) ? client : p.title.split(/[.,]\s/)[0].trim();
  const rest = p.title.slice(name.length).replace(/^[.,]?\s*/, "").trim();
  let title: string;
  if ((p.category || "").toLowerCase() === "employer work") {
    const employer = (p.clientName || "").split(/,\s/)[0].trim();
    title = employer ? `${name}, built by Mehdi Alam at ${employer}` : name;
  } else {
    title = withBrand(rest ? `${name}: ${rest}` : name);
  }
  return { title, description: clip(p.summary || ""), h1: p.title, crumb: p.title };
}

interface PostLike {
  title: string;
  excerpt?: string;
  seo?: { title?: string; description?: string };
}

export function postSeo(p: PostLike): PageSeo {
  return {
    title: p.seo?.title?.trim() || withBrand(p.title),
    description: clip(p.seo?.description?.trim() || p.excerpt || ""),
    h1: p.title,
    crumb: p.title,
  };
}

/** Route and meta description for each policy page. Titles come from the document. */
export const LEGAL_PAGES = {
  privacy: {
    path: "/privacy",
    description:
      "How Ideovent Technologies collects, uses and protects personal data under India's DPDP Act and the GDPR, and how to reach our Grievance Officer.",
  },
  terms: {
    path: "/terms",
    description:
      "The terms on which the Ideovent Technologies website is offered: acceptable use, intellectual property, liability and governing law.",
  },
  refund: {
    path: "/refund",
    description:
      "When an advance is refundable, what cancellation costs, how pro-rata is calculated and how long a refund takes at Ideovent Technologies.",
  },
  disclaimer: {
    path: "/disclaimer",
    description:
      "What Ideovent Technologies does not promise: no guaranteed business results, no guaranteed search rankings, and the limits of third-party services.",
  },
} as const;

export function legalSeo(kind: keyof typeof LEGAL_PAGES, docTitle: string): PageSeo {
  return { title: withBrand(docTitle), description: LEGAL_PAGES[kind].description, h1: docTitle, crumb: docTitle };
}

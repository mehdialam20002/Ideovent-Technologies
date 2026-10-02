/**
 * THE /websites PAGES (2 Oct 2026): the shape of one page's content.
 *
 * Five keyword landing pages, one shape: the hub (/websites) and four pages a
 * buyer searches for by name (dental clinic, school, coaching institute, the
 * monthly plan). The content is plain data in ./content/, read three ways that
 * must agree: the page itself (./WebsiteLanding.tsx), its JSON-LD
 * (./schema.ts) and the no-JavaScript copy written into its prerendered HTML
 * (./noscript.ts, called from src/lib/seo/prerenderBody.ts).
 *
 * Title, description and h1 are NOT here: they live in src/lib/seo/pages.ts
 * (PAGE_SEO) with every other public page, so <Seo> and the build agree.
 *
 * Every price comes from src/lib/pricing.ts. A monthly figure is never printed
 * without its setup fee and its 12-month term (monthlyLine() + termLine()).
 */

export type WebsitePageId = "hub" | "dental-clinic" | "school" | "coaching-institute" | "899-per-month";

export interface TextItem {
  title: string;
  body: string;
}

export interface LinkCard extends TextItem {
  href: string;
  /** The link's own words, read out of context by a screen reader. */
  cta: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export interface SampleFrame {
  src: string;
  width: number;
  height: number;
  label: string;
  alt: string;
}

/** A rule the buyer's own regulator sets for their website, with its source. */
export interface RuleBlock {
  heading: string;
  paragraphs: string[];
  sources: { label: string; href: string }[];
}

export interface WebsitePage {
  id: WebsitePageId;
  path: string;
  /** The breadcrumb trail below Home, this page last. */
  crumbs: { name: string; path: string }[];
  /** Under the h1: the problem first, then what we do about it. Two short paragraphs. */
  intro: string[];
  /** What the page's WhatsApp buttons pre-fill. */
  whatsapp: string;
  /** For the Service JSON-LD. */
  service: { name: string; serviceType: string; audience?: string; description: string };
  /** Hub: kinds of business. Monthly page: who the plan suits. */
  cards?: { heading: string; intro?: string; items: LinkCard[] };
  includes?: { heading: string; intro?: string; items: TextItem[]; note?: string };
  samples?: { heading: string; intro: string; frames: SampleFrame[] };
  /** Which price block: both ways to buy, or the monthly plan in full. */
  price: "both" | "monthly";
  /** The monthly plan's terms in plain words (the same sentences /pricing prints). */
  terms?: { heading: string; intro?: string; items: TextItem[]; notIncluded: string[] };
  rules?: RuleBlock;
  steps: { heading: string; items: TextItem[] };
  faqs: { heading: string; items: Faq[] };
  related: { heading: string; links: { label: string; href: string; note?: string }[] };
  closing: { heading: string; body: string };
}

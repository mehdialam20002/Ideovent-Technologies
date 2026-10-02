// Relative imports only: src/lib/seo/prerender.ts bundles this with esbuild.
import { PLANS, PLAN_ORDER, type MonthlyPlan } from "../../lib/pricing";
import { faqPageNode, type Crumb, type Json } from "../../lib/seo/schema";
import { websitePageAt } from "./content";
import type { WebsitePage } from "./types";

/**
 * JSON-LD for the /websites pages: one Service per page, the page's FAQPage
 * (only the questions the page shows), and the breadcrumb trail. <Seo> on the
 * page and scripts/prerender-heads.mjs (through src/lib/seo/prerender.ts) both
 * call websitesSchema(), so the static HTML and the rendered page carry the
 * same graph. <Seo> and the prerender add `provider` (the Organization) and
 * make every URL absolute.
 *
 * PRICES. Only the monthly plans are marked up, and only on the plan page,
 * with the setup fee and the 12-month term inside the same price
 * specification (Subscription + ActivationFee, billingDuration), exactly as
 * /pricing does (src/pages/pricing/schema.ts). The one-time bands stay
 * unmarked for /pricing's reason: an Offer strips the "from, for a scope that
 * does not exist yet" qualifier and a machine would quote the floor as the
 * price of a website.
 *
 * FAQ RICH RESULTS. Google stopped showing them on 7 May 2026 (Search Central
 * documentation, FAQPage). FAQPage stays valid schema.org, other consumers
 * read it, and each question here is marked up on this one page only.
 */

const AREA_SERVED: Json[] = [
  { "@type": "City", name: "New Delhi" },
  { "@type": "AdministrativeArea", name: "Delhi NCR" },
  { "@type": "Country", name: "India" },
];

const qty = (value: number, unitCode: string) => ({ "@type": "QuantitativeValue", value, unitCode });
const INDIA = { "@type": "Country", name: "India" };

function setupFee(p: MonthlyPlan): Json {
  return { "@type": "UnitPriceSpecification", priceComponentType: "https://schema.org/ActivationFee", name: "One-time setup", price: p.setup, priceCurrency: "INR" };
}

function planOffers(url: string): Json[] {
  const out: Json[] = [];
  for (const id of PLAN_ORDER) {
    const p = PLANS[id];
    out.push({
      "@type": "Offer",
      name: `${p.name} website plan, paid monthly`,
      url,
      priceCurrency: "INR",
      eligibleRegion: INDIA,
      priceSpecification: [
        {
          "@type": "UnitPriceSpecification",
          priceComponentType: "https://schema.org/Subscription",
          price: p.monthly,
          priceCurrency: "INR",
          unitCode: "MON",
          referenceQuantity: qty(1, "MON"),
          billingDuration: qty(p.months, "MON"),
        },
        setupFee(p),
      ],
    });
    if (p.yearly) {
      out.push({
        "@type": "Offer",
        name: `${p.name} website plan, paid yearly`,
        url,
        priceCurrency: "INR",
        eligibleRegion: INDIA,
        priceSpecification: [
          { "@type": "UnitPriceSpecification", priceComponentType: "https://schema.org/Subscription", price: p.yearly.price, priceCurrency: "INR", unitCode: "ANN", referenceQuantity: qty(1, "ANN") },
          ...(p.yearly.setupApplies ? [setupFee(p)] : []),
        ],
      });
    }
  }
  return out;
}

function serviceNode(p: WebsitePage): Json {
  const industry = p.id === "dental-clinic" || p.id === "school" || p.id === "coaching-institute";
  return {
    "@type": "Service",
    "@id": `${p.path}#service`,
    name: p.service.name,
    serviceType: p.service.serviceType,
    description: p.service.description,
    url: p.path,
    areaServed: AREA_SERVED,
    ...(p.service.audience ? { audience: { "@type": "BusinessAudience", audienceType: p.service.audience } } : {}),
    ...(industry && p.includes?.items.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${p.service.name}: what is included`,
            itemListElement: p.includes.items.map((i) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: i.title } })),
          },
        }
      : {}),
    ...(p.price === "monthly" ? { offers: planOffers(p.path) } : {}),
  };
}

/** The trail and the page nodes for one /websites path, or null for any other path. */
export function websitesSchema(path: string): { crumbs: Crumb[]; nodes: Json[] } | null {
  const p = websitePageAt(path);
  if (!p) return null;
  const nodes: Json[] = [serviceNode(p)];
  const faq = faqPageNode(p.faqs.items);
  if (faq) nodes.push(faq);
  return { crumbs: p.crumbs, nodes };
}

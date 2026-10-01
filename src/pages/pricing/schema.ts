import type { Json } from "@/lib/seo/schema";
import { PLANS, PLAN_ORDER, SEO, monthlyLine, termLine, type MonthlyPlan } from "@/lib/pricing";

/**
 * JSON-LD for /pricing: one Service per FIXED-PRICE monthly plan, and the SEO
 * add-on with its "from" prices. The one-time bands stay unmarked on purpose:
 * each is the floor of a band for a scope that does not exist yet, and an
 * Offer strips that qualifier away (Google would quote "₹8,000" as the price
 * of a website).
 *
 * The monthly price and the setup fee are two components of ONE price
 * specification (Subscription + ActivationFee), with the 12-month term as
 * billingDuration, so a machine reading the page gets the same no-drip picture
 * a person does (seo-audit, "Monthly plans on /pricing"). Seo.tsx adds the
 * provider link to the Organization and makes the URLs absolute.
 */
const qty = (value: number, unitCode: string) => ({ "@type": "QuantitativeValue", value, unitCode });

function setupFee(p: MonthlyPlan): Json {
  return {
    "@type": "UnitPriceSpecification",
    priceComponentType: "https://schema.org/ActivationFee",
    name: "One-time setup",
    price: p.setup,
    priceCurrency: "INR",
  };
}

function planNode(p: MonthlyPlan): Json {
  const offers: Json[] = [
    {
      "@type": "Offer",
      name: `${p.name} website plan, paid monthly`,
      url: "/pricing#monthly",
      priceCurrency: "INR",
      eligibleRegion: { "@type": "Country", name: "India" },
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
    },
  ];
  if (p.yearly) {
    offers.push({
      "@type": "Offer",
      name: `${p.name} website plan, paid yearly`,
      url: "/pricing#start",
      priceCurrency: "INR",
      eligibleRegion: { "@type": "Country", name: "India" },
      priceSpecification: [
        {
          "@type": "UnitPriceSpecification",
          priceComponentType: "https://schema.org/Subscription",
          price: p.yearly.price,
          priceCurrency: "INR",
          unitCode: "ANN",
          referenceQuantity: qty(1, "ANN"),
        },
        ...(p.yearly.setupApplies ? [setupFee(p)] : []),
      ],
    });
  }
  return {
    "@type": "Service",
    "@id": `/pricing#plan-${p.id}`,
    name: `Website plan: ${p.name}`,
    serviceType: "Website design, hosting and upkeep on a monthly plan",
    description: `${monthlyLine(p)}, ${termLine(p)}. ${p.includes.join("; ")}.`,
    areaServed: { "@type": "Country", name: "India" },
    offers,
  };
}

function seoNode(): Json {
  const monthlyFrom = (minPrice: number, priceCurrency: string) => ({
    "@type": "UnitPriceSpecification",
    minPrice,
    priceCurrency,
    unitCode: "MON",
    referenceQuantity: qty(1, "MON"),
  });
  return {
    "@type": "Service",
    "@id": "/pricing#seo",
    name: "Local SEO add-on",
    serviceType: "Search engine optimisation",
    description: `${SEO.includes.join("; ")}. No ranking is guaranteed.`,
    offers: [
      {
        "@type": "Offer",
        priceCurrency: "INR",
        eligibleRegion: { "@type": "Country", name: "India" },
        priceSpecification: monthlyFrom(SEO.indiaFrom, "INR"),
      },
      {
        "@type": "Offer",
        priceCurrency: "USD",
        eligibleRegion: ["United States", "United Kingdom", "United Arab Emirates", "Australia"].map((name) => ({
          "@type": "Country",
          name,
        })),
        priceSpecification: monthlyFrom(SEO.abroadFromUsd, "USD"),
      },
    ],
  };
}

export function pricingSchema(): Json[] {
  return [...PLAN_ORDER.map((id) => planNode(PLANS[id])), seoNode()];
}

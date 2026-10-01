import { ONE_TIME, bandRange, inr } from "@/lib/pricing";

/**
 * The one-time packages, UNCHANGED IN SUBSTANCE on 1 Oct 2026: Mehdi's rule for
 * the new pricing was "keep the current packages and prices". The words are the
 * ones the old /pricing printed (and the proposal, 05-pricing/PACKAGES-INDIA.html,
 * sends); the figures now come from src/lib/pricing.ts instead of being typed
 * here. Cheapest line first, cheapest tier first (FACTS.md presentation rule).
 *
 * The ids are old anchors that pitch pages link to (/pricing#business-website,
 * #school-website, #portal, #custom-saas). Keep them.
 */

export interface Tier {
  name: string;
  price: string;
  meta: string;
  features: string[];
  excludes?: string;
  recommended?: boolean;
}

export interface ServiceLine {
  id: string;
  title: string;
  range: string;
  intro: string;
  tiers: Tier[];
}

const L = ONE_TIME.landing.tiers;
const W = ONE_TIME.website.tiers;
const P = ONE_TIME.portal.tiers;

export const SERVICE_LINES: ServiceLine[] = [
  {
    id: ONE_TIME.landing.anchor,
    title: ONE_TIME.landing.label,
    range: bandRange(ONE_TIME.landing),
    intro: "2 to 3 weeks from the advance and your content.",
    tiers: [
      {
        name: "Essential",
        price: inr(L[0]),
        meta: "One-time · non-GST · 2 weeks",
        features: [
          "One page, conversion-focused",
          "Design adapted from our layout system",
          "Responsive on phone, tablet and desktop",
          "Enquiry form delivered to e-mail",
          "On-page SEO basics and SSL",
          "Analytics installed",
          "Two revision rounds at the design stage",
          "Handover plus a recorded walkthrough",
        ],
        excludes: "Multi-page structure, editable content areas, fully custom design.",
      },
      {
        name: "Professional",
        price: inr(L[1]),
        meta: "One-time · non-GST · 2 to 3 weeks",
        recommended: true,
        features: [
          "Everything in Essential",
          "4 to 8 pages",
          "Custom design, built to your brand",
          "Editable content areas you control",
          "Forms with validation and routing",
          "Speed and accessibility pass",
          "Staging link throughout the build",
          "One live training session",
        ],
        excludes: "Logins, dashboards, payments, data migration.",
      },
      {
        name: "Premium",
        price: inr(L[2]),
        meta: "One-time · non-GST · 3 weeks",
        features: [
          "Everything in Professional",
          "Up to 12 pages",
          "Blog, news or notices module",
          "Simple admin dashboard for your content",
          "Content migrated from your existing site",
          "Enquiry routing to WhatsApp or e-mail",
          "A second design stage for the admin screens, with its own two revision rounds",
        ],
        excludes:
          "Customer or member records, online payments, logins for each role. That is the portal line below.",
      },
    ],
  },
  {
    id: ONE_TIME.website.anchor,
    title: ONE_TIME.website.label,
    range: bandRange(ONE_TIME.website),
    intro:
      "3 to 5 weeks from the advance and your content. For a business that needs more than one page, and wants to run it itself.",
    tiers: [
      {
        name: "Essential",
        price: inr(W[0]),
        meta: "One-time · non-GST · 3 weeks",
        features: [
          "Up to 8 pages",
          "Enquiry form to e-mail",
          "News, notices or offers area you update",
          "Photo gallery",
          "Team or staff listing",
          "Mobile-first, SSL, analytics",
          "Two revision rounds at the design stage",
        ],
        excludes: "Enquiry tracking, more than one branch, customer logins.",
      },
      {
        name: "Professional",
        price: inr(W[1]),
        meta: "One-time · non-GST · 4 weeks",
        recommended: true,
        features: [
          "Everything in Essential",
          "Up to 15 pages, custom design",
          "You manage news, gallery, prices and offers yourself",
          "Downloadable forms and documents",
          "Every enquiry stored and exportable to a spreadsheet",
          "Speed pass before launch",
          "Training session for two staff members",
        ],
        excludes: "Online payments, staff attendance, customer records.",
      },
      {
        name: "Premium",
        price: inr(W[2]),
        meta: "One-time · non-GST · 5 weeks",
        features: [
          "Everything in Professional",
          "Enquiries with status tracking, so the front desk knows who followed up",
          "Multi-branch structure",
          "SMS or WhatsApp notification hooks, message credits billed at cost",
          "Existing content migrated for you",
          "A second design stage for the admin screens, with its own two revision rounds",
        ],
        excludes: "Records, payments and staff logins. That is the portal line below.",
      },
    ],
  },
  {
    id: ONE_TIME.portal.anchor,
    title: ONE_TIME.portal.label,
    range: bandRange(ONE_TIME.portal),
    intro:
      "6 to 10 weeks from the advance and your content. A system that runs the office, not a website with a login on it.",
    tiers: [
      {
        name: "Essential",
        price: inr(P[0]),
        meta: "One-time · non-GST · 6 weeks",
        features: [
          "Customer, student or member records",
          "Payment records with printable receipts",
          "Daily attendance marking",
          "One admin role",
          "Enquiry capture",
          "Reports exportable to Excel",
        ],
      },
      {
        name: "Professional",
        price: inr(P[1]),
        meta: "One-time · non-GST · 8 weeks",
        recommended: true,
        features: [
          "Everything in Essential",
          "Separate logins for admin, staff and accounts",
          "Online payments via Razorpay, gateway charges are billed to you by them",
          "Automatic payment reminders",
          "Schedules, bookings or timetables",
          "A customer or parent view of payments and updates",
          "Dashboard with collections and dues",
        ],
      },
      {
        name: "Premium",
        price: inr(P[2]),
        meta: "One-time · non-GST · 10 weeks",
        features: [
          "Everything in Professional",
          "Multiple branches under one account",
          "One extra module you choose, such as inventory, transport or bookings",
          "SMS and WhatsApp messaging built in",
          "Your existing spreadsheets or software migrated",
          "Staging environment and priority response during the build",
        ],
      },
    ],
  },
  {
    id: ONE_TIME.software.anchor,
    title: "Custom SaaS platform",
    range: bandRange(ONE_TIME.software),
    intro: "10 weeks or more, priced in three stages. Nobody can honestly quote a platform before the scope exists.",
    tiers: [
      {
        name: "Stage 01. Discovery",
        // [[SAAS_DISCOVERY_FEE]] is undecided, so the price line says what is
        // true about it rather than printing a number nobody has agreed.
        price: "Fixed fee",
        meta: "Agreed before it starts · 1 to 2 weeks",
        features: [
          "Written scope with an exclusions list",
          "Screen map and data model",
          "Delivery plan in phases",
          "A fixed price for Stage 02",
        ],
        excludes:
          "The documents are yours whether or not you build with us, and the fee comes off Stage 02 in full if you start within 30 days.",
      },
      {
        name: "Stage 02. Build",
        price: bandRange(ONE_TIME.software),
        meta: "Fixed price · from 10 weeks",
        recommended: true,
        features: [
          "Priced from the Stage 01 document, not from a guess",
          "Accounts, roles and permissions",
          "Admin tooling and reporting",
          "Payments and third-party integrations",
          "Staging environment throughout",
          "Written technical handover",
        ],
      },
      {
        name: "Stage 03. Run",
        price: "Care plan",
        meta: "Monthly · or a development retainer",
        features: [
          "A live platform needs a named owner, not an on-call favour",
          "A priority care plan, or a monthly development retainer if the roadmap keeps moving",
          "Decided at handover, never assumed",
        ],
      },
    ],
  },
];

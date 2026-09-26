import { Link } from "react-router-dom";
import { motion } from "framer-motion";
/* FileText, Lock and UserRound are no longer imported: they were the three
   icons on the PROMISES cards. See the note above PROMISES. */
import { ArrowRight, Check, Star, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import FaqSection from "@/components/sections/FaqSection";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { unbreakable } from "@/lib/typography";

/**
 * /pricing
 *
 * EVERY FIGURE ON THIS PAGE IS CANONICAL. It comes from _assets/FACTS.md
 * ("CORRECTIONS CONFIRMED BY MEHDI, 24 Sep 2026", which replaced the earlier
 * pricing table entirely) and from 05-pricing/PACKAGES-INDIA.html, which is the
 * document Mehdi actually sends. A pricing page that contradicts the proposal is
 * worse than no pricing page, so if one of these numbers changes it changes in
 * FACTS.md and the packages document FIRST, and here in the same pass.
 *
 * The bands came down by roughly 35% on 24 Sep 2026, because the old figures were
 * ending the conversation before it started. FACTS.md fixes how they are shown as
 * well as what they are: THE LOWEST NUMBER LEADS AND THE SMALLEST PACKAGE COMES
 * FIRST, on every line and in every table. On a phone the first card is often the
 * only one read, so the first card has to be the one a visitor can say yes to.
 * Do not reorder a service line, a tier or a care plan out of that order.
 *
 * Tier prices inside a band are rule R1 of 05-pricing/PRICING-STRATEGY.md §2:
 * low tier is the band floor, high tier is the band ceiling, middle tier is the
 * geometric mean rounded to the nearest ₹500 (nearest $25 in USD). Nothing on
 * this page is a number somebody picked.
 *
 * What this page replaced, and why:
 *   "FROM ₹24,000" (Launch) and "FROM ₹65,000" (Growth) appeared nowhere in
 *   FACTS.md. Only the old Scale tier matched a figure in the table of the day.
 *   "2 weeks of post-launch support" contradicted the 30 days committed in
 *   FACTS.md and in the Maintenance & Support Agreement.
 *   "Dedicated senior team" is a seniority-and-headcount claim, which FACTS.md
 *   forbids outright: no seniority claim, and never a team size as a number.
 *   There was no USD pricing at all, although FACTS.md carries a full USD table
 *   and names US / UK / UAE / Australia as the secondary market.
 *
 * Blanks left visible-by-absence rather than invented: the SaaS discovery fee
 * ([[SAAS_DISCOVERY_FEE]]), the SaaS monthly retainer ([[SAAS_RETAINER_MONTHLY]]),
 * the remobilisation fee ([[REMOBILISATION_FEE]]) and the price validity date
 * ([[VALID_UNTIL]]). Each sentence below is written so it reads correctly
 * without them.
 */

interface Tier {
  name: string;
  price: string;
  meta: string;
  features: string[];
  excludes?: string;
  popular?: boolean;
}

interface ServiceLine {
  id: string;
  eyebrow: string;
  title: string;
  range: string;
  intro: string;
  tiers: Tier[];
}

/* FACTS.md India table, as corrected on 24 Sep 2026: landing / single page
 * 8,000-20,000 · school website 20,000-45,000 · coaching or school portal
 * 40,000-85,000 · custom SaaS from 90,000. Middle tiers are the R1 geometric
 * mean of each band. The lines are ordered cheapest first: that ordering is the
 * FACTS.md presentation rule, not a layout preference. */
const SERVICE_LINES: ServiceLine[] = [
  {
    id: "business-website",
    eyebrow: "Service line 01",
    // Was "Business website". FACTS.md calls the ₹8,000-₹20,000 band "Landing
    // page / single page"; "Business website" is the USD $600-$1,400 tier.
    // The id stays, so existing #business-website links keep working.
    title: "Landing page or single page",
    range: "₹8,000-₹20,000",
    intro: "2-3 weeks from the advance and your content.",
    tiers: [
      {
        name: "Essential",
        price: "₹8,000",
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
        price: "₹12,500",
        meta: "One-time · non-GST · 2-3 weeks",
        popular: true,
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
        price: "₹20,000",
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
          "Student or member records, fee collection, role-based logins. That is the portal line below.",
      },
    ],
  },
  {
    id: "school-website",
    eyebrow: "Service line 02",
    title: "School website",
    range: "₹20,000-₹45,000",
    intro:
      "3-5 weeks from the advance and your content. Built around admission season, because that is the week it has to work.",
    tiers: [
      {
        name: "Essential",
        price: "₹20,000",
        meta: "One-time · non-GST · 3 weeks",
        features: [
          "Up to 8 pages",
          "Admission enquiry form to e-mail",
          "Notices and circulars area you update",
          "Photo gallery",
          "Faculty or staff listing",
          "Mobile-first, SSL, analytics",
          "Two revision rounds at the design stage",
        ],
        excludes: "Enquiry tracking, multi-campus, parent logins.",
      },
      {
        name: "Professional",
        price: "₹30,000",
        meta: "One-time · non-GST · 4 weeks",
        popular: true,
        features: [
          "Everything in Essential",
          "Up to 15 pages, custom design",
          "You manage notices, circulars, gallery and results yourself",
          "Downloadable forms and documents",
          "Every enquiry stored and exportable to a spreadsheet",
          "Speed pass before launch",
          "Training session for two staff members",
        ],
        excludes: "Fee collection, attendance, report cards.",
      },
      {
        name: "Premium",
        price: "₹45,000",
        meta: "One-time · non-GST · 5 weeks",
        features: [
          "Everything in Professional",
          "Admission enquiries with status tracking, so the front desk knows who followed up",
          "Multi-campus or multi-branch structure",
          "SMS or WhatsApp notification hooks, message credits billed at cost",
          "Existing content migrated for you",
          "A second design stage for the admin screens, with its own two revision rounds",
        ],
        excludes: "Fees, attendance and marks. That is the portal line below.",
      },
    ],
  },
  {
    id: "portal",
    eyebrow: "Service line 03",
    title: "Coaching or school portal",
    range: "₹40,000-₹85,000",
    intro:
      "6-10 weeks from the advance and your content. A system that runs the office, not a website with a login on it.",
    tiers: [
      {
        name: "Essential",
        price: "₹40,000",
        meta: "One-time · non-GST · 6 weeks",
        features: [
          "Student and batch records",
          "Fee records with printable receipts",
          "Daily attendance marking",
          "One admin role",
          "Enquiry capture",
          "Reports exportable to Excel",
        ],
      },
      {
        name: "Professional",
        price: "₹58,500",
        meta: "One-time · non-GST · 8 weeks",
        popular: true,
        features: [
          "Everything in Essential",
          "Separate logins for admin, teacher and accounts",
          "Online fee collection via Razorpay, gateway charges are billed to you by them",
          "Automatic fee reminders",
          "Timetable, marks and report cards",
          "Parent view of fees, attendance and notices",
          "Dashboard with collections and dues",
        ],
      },
      {
        name: "Premium",
        price: "₹85,000",
        meta: "One-time · non-GST · 10 weeks",
        features: [
          "Everything in Professional",
          "Multiple branches under one account",
          "Transport, hostel, library or inventory, choose one module",
          "SMS and WhatsApp messaging built in",
          "Your existing spreadsheets or software migrated",
          "Staging environment and priority response during the build",
        ],
      },
    ],
  },
  {
    id: "custom-saas",
    eyebrow: "Service line 04",
    title: "Custom SaaS platform",
    range: "From ₹90,000",
    intro:
      "10+ weeks, priced in three stages. Because nobody can honestly quote a platform before the scope exists.",
    tiers: [
      {
        name: "Stage 01. Discovery",
        // [[SAAS_DISCOVERY_FEE]] is undecided, so the price line says what is
        // true about it rather than printing a number nobody has agreed.
        price: "Fixed fee",
        meta: "Agreed before it starts · 1-2 weeks",
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
        price: "From ₹90,000",
        meta: "Fixed price · from 10 weeks",
        popular: true,
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

/* Care plans, PACKAGES-INDIA.html. The band is ₹1,000-₹3,500 a month
 * (FACTS.md, 24 Sep 2026): Essential is the floor, Priority the ceiling, Growth
 * the R1 geometric mean rounded to the nearest ₹500. The annual figure is R2,
 * ten months for twelve. Plans are listed cheapest first. The three response
 * targets match the Maintenance & Support Agreement exactly, 48 working hours /
 * 24 working hours / same working day. Do not improve them here. */
const CARE_ROWS: { label: string; values: [string, string, string] }[] = [
  { label: "Uptime monitoring, with an alert raised to us", values: ["Yes", "Yes", "Yes"] },
  { label: "Off-site backup of files and database", values: ["Monthly", "Weekly", "Daily"] },
  { label: "Restore from the last verified backup on request", values: ["Yes", "Yes", "Yes"] },
  { label: "Security updates, tested before release", values: ["Yes", "Yes", "Yes"] },
  { label: "SSL, domain and hosting expiry tracking", values: ["Yes", "Yes", "Yes"] },
  { label: "Content-change hours included", values: ["1 hour", "3 hours", "6 hours"] },
  { label: "Unused hours carried into the next month", values: ["No", "No", "No"] },
  { label: "First reply, in working hours", values: ["48 working hours", "24 working hours", "Same working day"] },
  { label: "Monthly report: uptime, backups, updates, hours used", values: ["No", "Yes", "Yes"] },
  { label: "Quarterly SEO health check: a technical report, not a campaign", values: ["No", "Yes", "Yes"] },
  { label: "Staging environment for testing changes", values: ["No", "No", "Yes"] },
  { label: "Monthly 30-minute strategy call", values: ["No", "No", "Yes"] },
  { label: "Per month", values: ["₹1,000", "₹2,000", "₹3,500"] },
  { label: "Per year, paid in advance, pay for ten months, get twelve", values: ["₹10,000", "₹20,000", "₹35,000"] },
];

/* International, _assets/FACTS.md, International (USD), as corrected on
 * 24 Sep 2026. Secondary market: US, UK, UAE, Australia. Cheapest offer first,
 * same presentation rule as the India lines. */
const USD_ROWS: { offer: string; range: string }[] = [
  { offer: "Landing page", range: "$300-$600" },
  { offer: "Business website", range: "$600-$1,400" },
  { offer: "Web application", range: "from $2,200" },
  { offer: "Care plan", range: "$40-$160 / month" },
];

const ALWAYS_INCLUDED = [
  "A written scope with an explicit exclusions list",
  "Two revision rounds at every design stage",
  "A staging link, so you see it before anyone else does",
  "Testing on real phones and browsers",
  "Deployment and a live training session",
  "Handover pack: credentials, documentation, recording",
  "30 days of free defect fixes after launch",
  "The custom source code becomes yours on final payment",
];

const NEVER_INCLUDED = [
  "Domain and hosting, bought in your own name, on your own card",
  "Paid APIs, SMS or WhatsApp message credits",
  "Paid plugins, licences, stock photos and fonts",
  "Content writing, translation, proofreading, data entry",
  "Photography and videography",
  "SEO campaigns, paid advertising, social media management",
  "Anything not on the agreed scope list",
];

const PAYMENT_STAGES = [
  { pct: "50%", when: "On signing", note: "Books your slot in the calendar. Work starts once it clears." },
  { pct: "30%", when: "At the design-and-build milestone", note: "Due when you accept the milestone described in the agreement." },
  { pct: "20%", when: "Before handover", note: "Source code, live deployment and admin credentials are released once this clears." },
];

const RULES: { term: string; detail: string }[] = [
  { term: "Invoice terms", detail: "Payable within 7 days of the invoice date." },
  { term: "Late payment", detail: "Interest at 1.5% per month on overdue amounts. Work pauses if an invoice is more than 7 days overdue." },
  { term: "Extra revision rounds", detail: "Beyond the two included at each design stage: ₹1,000 per hour, rounded to the nearest 30 minutes, approved by you in writing first." },
  { term: "Out-of-scope work", detail: "Quoted before it is started. Never done silently and invoiced afterwards." },
  { term: "Tax", detail: "GST not applicable. Supplier is not registered under GST. The amount quoted is the full amount payable; we add no tax on top." },
  { term: "Timelines", detail: "The weeks shown on each tier are working time. The clock starts when the advance has cleared and your content is with us, and pauses while we are waiting on something only you can give." },
  { term: "Footer credit", detail: "We place a small “Developed by Ideovent Technologies” credit in the footer. Ask us in writing and we remove it: no charge, no discussion." },
  { term: "Jurisdiction", detail: "Indian law, courts at New Delhi." },
];

/*
  THE THREE ICONS ARE GONE, AND THE CARDS WITH THEM.

  The sentences are all true and all stay: they are the scope-and-price
  commitments from _assets/FACTS.md and from the Service Agreement. What was
  wrong was the shape. A padlock beside "The price is fixed before work starts",
  a document beside "These are starting prices for a scope" and a person beside
  "The person you speak to writes the code" are three glyphs restating three
  headings, on three equal bordered cards, which is the unit
  _assets/DESIGN-DIRECTION.md names twice over.

  They are a ledger band under the hero now, with the same gold rule and the
  same three-column shape as the price ledger in the home hero, so the two
  pages open the same way.
*/
const PROMISES = [
  {
    title: "The price is fixed before work starts",
    description:
      "You get a written scope with an exclusions list. The number in it does not move unless you approve a written change note.",
  },
  {
    title: "These are starting prices for a scope",
    description:
      "One discovery call decides which tier fits. Anything larger than the top tier is quoted on its own. We do not stretch a package to fit.",
  },
  {
    title: "The person you speak to writes the code",
    description:
      "Ideovent is a partnership firm founded in 2024. Its partners are Mehdi Alam, Abhishek Tiwari and Animesh Raturi. There is no account manager in between.",
  },
];

/** A "Yes" reads as a tick, a "No" as a cross, anything else as its own text. */
function CareCell({ value }: { value: string }) {
  if (value === "Yes") return <Check className="mx-auto h-4 w-4 text-primary" aria-label="Yes" />;
  if (value === "No") return <X className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label="No" />;
  return <span className="tabular-nums">{unbreakable(value)}</span>;
}

/** Plan column order, used by both the table head and the stacked cards. */
const CARE_PLANS = ["Essential", "Growth", "Priority"] as const;

/**
 * The care plans, stacked, for phones.
 *
 * The comparison table is `min-w-[42rem]` inside an `overflow-x-auto`, which is
 * the right call on a laptop and is unusable on a 375px phone: the label column
 * alone fills the screen, so a visitor saw twelve feature names and NOT ONE
 * value: no response target, and no price. On a pricing page. There is no
 * scrollbar drawn until you drag, so nothing even tells you the columns exist.
 *
 * Below `md` the table is hidden and this renders instead: one card per plan,
 * price first, then every row with its own value. Same `CARE_ROWS` array, so
 * the two views cannot drift apart. Exactly one of the two is in the
 * accessibility tree at any width: the hidden one is `hidden`, not merely
 * off-screen. So a screen reader is never read both.
 */
function CarePlanCards() {
  const priceRows = CARE_ROWS.filter((r) => r.label.startsWith("Per "));
  const featureRows = CARE_ROWS.filter((r) => !r.label.startsWith("Per "));

  return (
    <div className="space-y-5 md:hidden">
      {CARE_PLANS.map((plan, col) => (
        <div key={plan} className="rounded-3xl border border-border bg-card/50 p-5">
          <h3 className="font-display text-lg font-semibold">{plan}</h3>

          <dl className="mt-3 space-y-1">
            {priceRows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground text-pretty">{row.label}</dt>
                <dd className="shrink-0 font-display text-base font-semibold tabular-nums text-foreground">
                  {unbreakable(row.values[col])}
                </dd>
              </div>
))}
          </dl>

          <dl className="mt-4 divide-y divide-border/50 border-t border-border/50 pt-1 text-sm">
            {featureRows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground text-pretty">{row.label}</dt>
                <dd
                  className={cn(
                    "shrink-0 text-right",
                    row.values[col] === "No" ? "text-muted-foreground/60": "text-foreground"
)}
                >
                  {row.values[col] === "Yes" ? (
                    <Check className="h-4 w-4 text-primary" aria-label="Included" />
): row.values[col] === "No" ? (
                    <X className="h-4 w-4" aria-label="Not in this plan" />
): (
                    row.values[col]
)}
                </dd>
              </div>
))}
          </dl>
        </div>
))}
    </div>
);
}

export default function Pricing() {
  const contact = useSingleton("contact");

  return (
    <Layout>
      {/* No Offer / PriceSpecification structured data on this page, on purpose.
          Mehdi confirmed the bands on 24 Sep 2026, so the old reason (drafted,
          unconfirmed) has gone. The reason that remains is that every figure
          here is the FLOOR of an indicative band for a scope that does not exist
          yet, and an Offer node strips that qualification away: Google would
          index "₹8,000" as the price of a website and quote it back at us long
          after the band moves. Adding one is a decision for Mehdi, not a
          tidying-up job, and it needs a price the firm is willing to be held to
          on a page it cannot annotate. */}
      <Seo
        title="Pricing"
        description="What it costs to work with Ideovent Technologies: business websites from ₹8,000, school websites from ₹20,000, coaching and school portals from ₹40,000, custom platforms from ₹90,000, and care plans from ₹1,000 a month. Indicative starting prices, fixed in writing after one call."
        path="/pricing"
        keywords={[
          "website development cost India",
          "web design pricing New Delhi",
          "custom software development cost Delhi NCR",
          "school website price India",
        ]}
        breadcrumbs={[{ name: "Pricing", path: "/pricing" }]}
      />

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        {/* Left-aligned on the .container-page gutter, like the h1 on /work,
            /about, /services and /contact. It was a centred 768px column with
            a full-width ledger band directly under it, so the headline and the
            three figures it introduces did not share an edge. */}
        <div className="container-page relative">
          <Reveal>
            <Eyebrow>Packages & pricing · India</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-hero font-display font-semibold">
              What it <span className="accent-italic text-gradient">costs</span>
            </h1>
          </Reveal>

          <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
            <Reveal delay={0.1}>
              <p className="text-lg text-foreground/85 text-pretty">
                Websites start at ₹8,000, and care after launch at ₹1,000 a month. Three options
                on every service line, smallest first, so the question is which one rather than
                whether.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-base text-muted-foreground text-pretty">
                Every figure below is a real starting price for a real scope, not a headline
                number that grows once work begins. What each tier leaves out is printed next to
                what it includes, on the same card.
              </p>
            </Reveal>
          </div>

          {/* The ledger band. `.rule-gold` is the same 2px gold hairline the
              home hero opens with: gold measures 2.27:1 on the light ground
              and can never carry text, but a rule is decoration and this is
              exactly the role _assets/DESIGN-DIRECTION.md reserves for it. The
              two pages now open the same way, which is the point of having a
              system rather than a set of pages. */}
          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="rule-gold mt-14 grid grid-cols-1 divide-y divide-border/70 pt-8
                       md:grid-cols-3 md:divide-x md:divide-y-0"
          >
            {PROMISES.map((p) => (
              <motion.div
                key={p.title}
                variants={fadeUp}
                className="py-5 first:pt-0 md:px-7 md:py-0 md:first:pl-0 md:last:pr-0"
              >
                <h2 className="font-display text-base font-semibold leading-snug text-pretty">{p.title}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {p.description}
                </p>
              </motion.div>
))}
          </motion.div>
        </div>
      </section>

      {/* ── 2. The four service lines ───────────────────────────────────── */}
      {SERVICE_LINES.map((line) => (
        <section key={line.id} id={line.id} className="section scroll-mt-28 pt-0">
          <div className="container-page">
            <Reveal>
              <div className="flex flex-col gap-3 border-t border-border pt-10 md:flex-row md:items-end md:justify-between">
                <div>
                  <Eyebrow>{line.eyebrow}</Eyebrow>
                  <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
                    {line.title}
                  </h2>
                </div>
                <div className="md:text-right">
                  {/* "Indicative range" is the exact wording PACKAGES-INDIA.html
                      puts above each service line. The figure and the word that
                      qualifies it travel together, so a range can never be
                      screenshotted or quoted back as a fixed quotation. */}
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Indicative range
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold tabular-nums text-primary">{unbreakable(line.range)}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
                    {line.intro}
                  </p>
                </div>
              </div>
            </Reveal>

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch"
            >
              {line.tiers.map((tier) => (
                <motion.div
                  key={tier.name}
                  variants={fadeUp}
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 transition-all duration-200",
                    tier.popular
                      ? "border-primary/60 bg-card ring-1 ring-primary/30"
: "border-border bg-card/60 hover:border-primary/40 hover:bg-card"
)}
                >
                  {tier.popular && (
                    <span className="absolute right-6 top-7 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      Recommended
                    </span>
)}

                  <h3 className="font-display text-xl font-semibold">{tier.name}</h3>
                  <p className="mt-5 font-display text-4xl font-semibold tabular-nums text-foreground">
                    {unbreakable(tier.price)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {tier.meta}
                  </p>

                  <ul className="mt-7 flex-1 space-y-3 border-t border-border/60 pt-7">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-foreground/90">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-pretty">{f}</span>
                      </li>
))}
                  </ul>

                  {tier.excludes && (
                    <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
                      {tier.excludes}
                    </p>
)}
                </motion.div>
))}
            </motion.div>
          </div>
        </section>
))}

      {/* ── 3. EduFlow note ─────────────────────────────────────────────── */}
      {/* `.section-tight`: a single paragraph in a box does not want the same
          room as a four-tier price table. */}
      <section className="section-tight pt-0">
        <div className="container-page">
          <Reveal>
            <div className="rounded-3xl border border-primary/40 bg-primary/5 p-8 md:p-10">
              <Eyebrow>A note on EduFlow</Eyebrow>
              <p className="mt-5 max-w-3xl text-base text-foreground/85 text-pretty">
                EduFlow (our school management platform) is currently in development. It is not
                available to buy, there is no demo, and we will not quote it to you. We mention it
                only so that you hear it from us rather than later: if what you need is a standard
                school or coaching system, we would rather say so than sell you a custom build you
                may not need.
              </p>
              <Link
                to="/eduflow"
                className="group mt-6 inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-foreground active:text-foreground/70"
              >
                Read where EduFlow actually is
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 4. Care plans ───────────────────────────────────────────────── */}
      {/* `.section-loud`: after the four service lines this is the second
             decision a buyer makes, and it used to carry the same `.section
             pt-0` as the five blocks around it. */}
      <section id="care-plans" className="section-loud scroll-mt-28 pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="After launch"
            title={
              <>
                Care <span className="font-loud-display">plans</span>
              </>
            }
            subtitle="Optional, never a condition of the build. The 30-day defect warranty is free either way; a plan begins after it. Each plan includes everything in the plan to its left."
          />

          <Reveal className="mt-12">
            {/* Phones get the stacked cards; md and up gets the comparison
                table. See CarePlanCards for why the table alone was not enough. */}
            <CarePlanCards />

            <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card/50 md:block">
              <table className="w-full min-w-[42rem] border-collapse text-sm">
                <caption className="sr-only">
                  Ideovent care plans compared: Essential, Growth and Priority
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-6 py-4 text-left font-display text-sm font-semibold">
                      Included every month
                    </th>
                    {CARE_PLANS.map((name) => (
                      <th
                        key={name}
                        scope="col"
                        className="px-4 py-4 text-center font-display text-sm font-semibold"
                      >
                        {name}
                      </th>
))}
                  </tr>
                </thead>
                <tbody>
                  {CARE_ROWS.map((row, i) => {
                    const isPrice = row.label.startsWith("Per ");
                    return (
                      <tr
                        key={row.label}
                        className={cn(
                          "border-b border-border/50 last:border-b-0",
                          isPrice && "bg-muted/40 font-medium text-foreground",
                          !isPrice && i % 2 === 1 && "bg-muted/20"
)}
                      >
                        <th
                          scope="row"
                          className={cn(
                            "px-6 py-3 text-left font-normal text-pretty",
                            isPrice ? "text-foreground": "text-muted-foreground"
)}
                        >
                          {row.label}
                        </th>
                        {row.values.map((v, j) => (
                          <td key={j} className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                            <CareCell value={v} />
                          </td>
))}
                      </tr>
);
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="mt-6 max-w-3xl text-sm text-muted-foreground text-pretty">
              A row marked “No” is not a refusal. It is work we will quote separately, or a reason
              to move up a plan. Response targets are counted in our stated working hours, and the
              Priority same-day target applies where the request reaches us at least two hours
              before the working day ends; the exact words are in the Maintenance Agreement you
              sign, not just here. Additional hours, approved in writing first, are ₹1,000 per hour.
              Cancel with 30 days’ notice at any time, once any outstanding invoices are settled
              you keep the code, the accounts, the backups and the documentation, and your domain,
              registrar access and DNS control come back to you immediately.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 5. International ────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="Outside India"
            title={
              <>
                International <span className="font-loud-display">pricing</span>
              </>
            }
            subtitle="For clients in the US, UK, UAE and Australia. Same scope discipline, same written quote, quoted in US dollars."
          />

          <Reveal className="mt-12">
            <div className="overflow-hidden rounded-3xl border border-border bg-card/50">
              <div className="flex items-baseline justify-between gap-2 border-b border-border/60 px-6 py-3 md:px-8">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Offer
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Indicative range
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {USD_ROWS.map((r) => (
                  <li
                    key={r.offer}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-5 md:px-8"
                  >
                    <span className="font-display text-base font-semibold">{r.offer}</span>
                    <span className="font-display text-lg tabular-nums text-primary">{unbreakable(r.range)}</span>
                  </li>
))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            {/* The milestone split differs by market and the site must not quote
                the Indian one at an overseas client: PACKAGES-INTERNATIONAL.html
                and the MSA both use 40 / 30 / 30, against 50 / 30 / 20 in India.
                Said here so the page and the proposal cannot disagree. */}
            <p className="mt-6 max-w-3xl text-sm text-muted-foreground text-pretty">
              International engagements are milestoned <strong className="font-medium text-foreground">40 / 30 / 30</strong>, 
              kickoff, acceptance, delivery, rather than the 50 / 30 / 20 used in India, and the exact
              shares are set in your Statement of Work. Ideovent Technologies is not registered under
              GST, and no export LUT has been filed, so invoices are non-GST and say so on their face.
              Tell us where you are on the first call and we will tell you exactly what your invoice
              will look like before you commit.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 6. Always / never included ──────────────────────────────────── */}
      {/* `.section-tight`, and the page's ONE deliberate break in the grid.
          See the note on the grid below. */}
      <section className="section-tight pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="The same in every package"
            title={
              <>
                What you always get, and what is{" "}
                <span className="accent-italic text-gradient">never in the price</span>
              </>
            }
          />

          {/*
            THE PAGE'S ONE DELIBERATE BREAK IN THE GRID
            (_assets/DESIGN-DIRECTION.md §4, a two-column split at roughly
            60/40). Every other block on /pricing is an even grid or an even
            table, because a price comparison has to be even to be read as one.
            This pair is the exception, and the asymmetry is not decorative:
            the "always included" list is nine items and the "never included"
            list is shorter, so at 50/50 the left card ran long while the right
            one ended halfway up with a hole under it. At 60/40 the two columns
            finish within a line or so of each other.
          */}
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-[1.35fr_0.65fr]">
            <Reveal>
              <div className="card-surface h-full p-8">
                <h3 className="font-display text-lg font-semibold">
                  In every project, at every price
                </h3>
                <ul className="mt-6 space-y-3">
                  {ALWAYS_INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-pretty">{item}</span>
                    </li>
))}
                </ul>
                <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
                  The reusable components we build on stay ours and come to you as a perpetual, free
                  licence inside your site. Which is what lets us start from something that already
                  works rather than from nothing.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="card-surface h-full p-8">
                <h3 className="font-display text-lg font-semibold">Never included, in any tier</h3>
                <ul className="mt-6 space-y-3">
                  {NEVER_INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground/70">
                        <X className="h-3 w-3" />
                      </span>
                      <span className="text-pretty">{item}</span>
                    </li>
))}
                </ul>
                <p className="mt-6 border-t border-border/60 pt-5 text-xs text-muted-foreground text-pretty">
                  Nothing on this list is refused. It is quoted separately so that it is visible,
                  not buried.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 7. Payment + the rules ──────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="How payment works"
            title={
              <>
                Fifty, thirty, <span className="font-loud-display">twenty</span>
              </>
            }
            subtitle="The Indian milestone split. Engagements invoiced in US dollars are milestoned 40 / 30 / 30 instead, see International pricing above."
          />

          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
          >
            {PAYMENT_STAGES.map((s) => (
              <motion.div key={s.pct} variants={fadeUp} className="card-surface p-7">
                <p className="font-display text-4xl font-semibold text-gradient">{s.pct}</p>
                <h3 className="mt-4 font-display text-base font-semibold">{s.when}</h3>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{s.note}</p>
              </motion.div>
))}
          </motion.div>

          <Reveal className="mt-10">
            <div className="rounded-3xl border border-border bg-card/50 p-8 md:p-10">
              <h3 className="font-display text-lg font-semibold">
                The rules that do not change, whichever tier you pick
              </h3>
              <dl className="mt-7 divide-y divide-border/60">
                {RULES.map((r) => (
                  <div key={r.term} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                    <dt className="font-display text-sm font-semibold">{r.term}</dt>
                    <dd className="text-sm text-muted-foreground text-pretty">{r.detail}</dd>
                  </div>
))}
              </dl>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="mt-8 max-w-3xl text-sm text-muted-foreground text-pretty">
              <span className="font-medium text-foreground">
                These are starting prices, not a quotation.
              </span>{" "}
              Your actual figure arrives in a written proposal after one discovery call, and once
              that proposal is signed the number does not move unless you approve a written change
              note. The full terms are in the Service Agreement, which you get to read before you
              pay anything.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 8. FAQ ──────────────────────────────────────────────────────── */}
      <FaqSection category="services" />

      {/* ── 9. Closing CTA ──────────────────────────────────────────────── */}
      {/* The bottom is tighter than `.section-loud` would give it. The
          loudness of a closing section belongs to its TOP padding, which is
          what separates it from the section before; its bottom meets the
          footer, and the footer already opens with `.section` padding of its
          own plus a 40px margin. Stacked, that measured 176 + 40 + 128 =
          344px of empty ground between the last button on the page and the
          first word of the footer.

          IT IS WRAPPED IN BRACES BECAUSE IT IS IN JSX. A bare /* ... *\/ in a
          JSX children position is not a comment, it is TEXT: the first version
          of this note shipped as a visible paragraph of source code between
          the last section and the closing band, on three pages. It was caught
          by looking at a screenshot, which is the only way it could have
          been. */}
      <section className="pb-16 pt-0 md:pb-20 lg:pb-24">
        <div className="container-page">
          {/* A BAND, NOT A SECOND BOX: the footer's CTA panel is a bordered,
              spotlight-lit, centred box with a display heading, and it renders
              directly below this one on every route. */}
          <Reveal>
            <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
              <div>
                {/* Weight contrast. This page's two serif accents are the h1
                    ("What it costs") and the exclusions heading, which is the
                    one thing on a pricing page nobody else prints. */}
                <h2 className="text-display font-display font-thin-display">
                  Fifteen minutes,{" "}
                  <span className="font-loud-display">on a call</span>
                </h2>
                {/* Not the footer CTA's sentence, which renders directly below
                    this panel on every route. This one is about the figures on
                    THIS page: which band a scope lands in is the only thing a
                    call actually settles. */}
                <p className="mt-5 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                  Every number on this page is the floor of a band. One call decides which band
                  your scope is in, and the written proposal that follows fixes the figure inside
                  it.{" "}
                  {contact.responseTimePromise ? contact.responseTimePromise: ""}
                </p>
              </div>
              <div className="md:flex md:flex-col md:items-end md:gap-4 md:pb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <CtaButton cta={{ label: "Get a written quote", href: "/contact" }} />
                  {contact.phoneHref && (
                    <CtaButton
                      cta={{
                        label: unbreakable(contact.phoneDisplay) || "Call us",
                        href: contact.phoneHref,
                        variant: "outline",
                      }}
                    />
)}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 md:mt-0 md:justify-end">
                  <Link
                    to="/work"
                    className="group inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground active:text-foreground/70"
                  >
                    See the work these prices buy
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                  </Link>
                  <Link
                    to="/services"
                    className="group inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground active:text-foreground/70"
                  >
                    What we build
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";

/**
 * WHAT WE SET UP. Replaces `<ServicesGrid homeOnly />` on the home page
 * (ServicesGrid itself stays on /services, untouched).
 *
 * The old section was "What we build, and what is in it": six services and
 * their deliverables, a list about us. This is the same numbered-row markup as
 * ServicesGrid (the `ol`, the 01/02/03 numeral, title, small-caps pill, one
 * line, deliverable chips, the arrow link), fed three rows by the outcome the
 * owner wants: be found and contacted, take busywork off the team, build your
 * own product. Schools and coaching keep one chip in row 1, as one industry
 * among many, and (28 Sep 2026) dental clinics one more, for the same reason:
 * an industry we have ready designs for, never the studio's identity.
 * Copy: _assets/HOMEPAGE-COPY-DECK-V2.md A4.
 *
 * Every chip is something we build or do. Local SEO (Google Business Profile,
 * local pages, reviews plan, monthly report) joined on 1 Oct 2026 when Mehdi
 * priced it; rankings are never promised. WhatsApp automation stays out until
 * Mehdi confirms it is offered (deck V2 decision G2).
 *
 * Strings are inline, as the proof band's are in Index.tsx.
 */
const ROWS = [
  {
    title: "Be found and contacted",
    pill: "Website or online store",
    line: "Your customer finds you on Google and Maps, sees your prices and timings on a phone, and reaches you in one tap. Every enquiry comes to you by email, or on WhatsApp if you want that.",
    chips: [
      "Google Maps location", "Call and WhatsApp buttons", "Enquiry form that reaches you",
      "Prices and timings on a page", "Your real photos", "Pages you update yourself",
      "Online store with Razorpay payments", "Schools and coaching: fees, batch timings, admission form",
      "Dental clinics: treatments, starting prices, appointment requests",
    ],
    link: { label: "Website development", href: "/services/website-development" },
  },
  /* 1 Oct 2026: Mehdi confirmed local SEO as a monthly add-on (his pricing of
     that day), so it has a row. Same honesty as the service page: no position
     is promised. The link text says where it goes. */
  {
    title: "Show up when people nearby search",
    pill: "Local SEO, monthly",
    line: "Your Google Business Profile set up and kept current, pages that answer what people search for in your area, a way to ask every customer for a review, and a plain report every month. Nobody can promise a position on Google, and we do not.",
    chips: ["Google Business Profile", "Local pages on your site", "On-page SEO", "Reviews plan", "Monthly report"],
    link: { label: "Local SEO services", href: "/services/seo" },
  },
  {
    title: "Take busywork off your team",
    pill: "Web app or portal",
    line: "One system in place of the Excel sheets, registers and WhatsApp groups. Your staff enter things once, and you see where everything stands.",
    chips: [
      "Lead tracker", "Staff and attendance", "Orders and stock", "Bookings", "Admin dashboard",
      "Logins for each role", "Reports to Excel",
    ],
    link: { label: "Custom software", href: "/services/custom-software-development" },
  },
  {
    title: "Build your own product",
    pill: "SaaS or mobile app",
    line: "An idea for software you want to sell, or an app your customers open every day. We build the first version, then the next one.",
    chips: [
      "Android and iPhone app", "Accounts and logins", "Razorpay and Stripe payments", "Admin panel",
      "Care after launch",
    ],
    link: { label: "Every service", href: "/services" },
  },
];

export default function WhatWeSetUp() {
  return (
    // Top as the services index had it (py-16 → lg py-24); the bottom is short
    // because the work section below brings its own 128px top and gold rule,
    // opening on the gold rule rather than on padding alone.
    <section id="services" className="relative pt-16 pb-4 md:pt-20 md:pb-6 lg:pt-24 lg:pb-8">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-5 border-t-2 border-secondary/70 pt-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>What we set up</Eyebrow>
              {/* One weight, no accent (1 Oct 2026, see `.font-thin-display` in
                  src/index.css). */}
              <h2 className="mt-3 text-display font-display font-semibold">
                Built around how your customers choose, and how your team works.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground text-pretty md:pb-2">
              Everything below goes into your written scope before any work starts.
            </p>
          </div>
        </Reveal>

        <motion.ol
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.05 }}
          className="mt-10 border-t border-border"
        >
          {ROWS.map((r, i) => (
            <motion.li key={r.title} variants={fadeUp} className="border-b border-border">
              <Link
                to={r.link.href}
                className="group grid gap-x-6 gap-y-3 px-1 py-7 transition-colors duration-200
                           hover:bg-muted/40 active:bg-muted/60
                           sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-baseline md:py-8"
              >
                <span
                  aria-hidden="true"
                  className="hidden font-display text-sm font-light tabular-nums text-muted-foreground sm:block"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-xl font-semibold leading-snug md:text-2xl">
                      {r.title}
                    </h3>
                    <span className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {r.pill}
                    </span>
                  </div>

                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground text-pretty">{r.line}</p>

                  <ul className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {r.chips.map((d) => (
                      <li
                        key={d}
                        className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-foreground/75"
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-primary sm:justify-self-end">
                  {r.link.label}
                  <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" aria-hidden="true" />
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ol>

        <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            to="/services"
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-5 text-sm
                       font-medium transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
          >
            Every service in full
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

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
 * their deliverables, a list about us. A principal does not buy "UI/UX Design".
 * This is the same numbered-row markup as ServicesGrid (the `ol`, the 01/02/03
 * numeral, title, small-caps pill, one line, deliverable chips, the arrow
 * link), fed three rows written around who is reading: schools, coaching
 * institutes, businesses. Copy: _assets/HOMEPAGE-COPY-DECK.md section 4.
 *
 * Every chip is something the site itself does. Google Business Profile setup,
 * SEO rankings and WhatsApp automation are deliberately NOT here until Mehdi
 * confirms they are offered (deck decision 11). "Your address and map on every
 * page" is safe: the site does that.
 *
 * Strings are inline, as the proof band's are in Index.tsx.
 */
const ROWS = [
  {
    title: "For schools",
    pill: "School website",
    line: "A parent finds fees, bus routes and admission dates without calling. Your office posts notices itself. Every enquiry reaches you by email, or on WhatsApp if you want that.",
    chips: [
      "Admission enquiry form", "Fee structure page", "Bus routes", "Admission dates", "Campus photos",
      "Faculty and results you approve", "Mandatory disclosure page", "Notices you post yourself",
    ],
    link: { label: "See what is included", href: "/services/website-development" },
  },
  {
    title: "For coaching institutes",
    pill: "Coaching website or portal",
    line: "A student sees batch timings and fees on a phone, and asks for a demo class in one step. Enquiries from the website are kept in one list, not scattered across chats.",
    chips: [
      "Batch timings", "Fees on a page", "Demo-class request form", "One list of website enquiries",
      "Results you can show", "Named faculty", "A page for a new batch",
    ],
    link: { label: "See what is included", href: "/services/website-development" },
  },
  {
    title: "For businesses, in India and abroad",
    pill: "Business website or software",
    line: "One screen that says what you do. A simple way to enquire or book. And someone to keep it working after launch.",
    chips: ["Enquiry or booking form", "Online store", "Custom software", "Mobile app", "Care plan"],
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
              {/* Weight contrast, no serif: the accent is spent on the hero and
                  the work section. */}
              <h2 className="mt-5 text-display font-display font-light">
                Built around how parents choose,{" "}
                <span className="font-extrabold">and how your office works</span>.
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
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-5 text-sm
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

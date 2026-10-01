import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  CircleDot,
  GraduationCap,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
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
import { unbreakable } from "@/lib/typography";
import { liveEmail } from "@/lib/mailbox";

/**
 * /eduflow. EduFlow, our school & coaching management platform.
 *
 * EduFlow is IN DEVELOPMENT. No paying schools, no public demo, nothing in
 * production (_assets/FACTS.md). Three things on this page are therefore
 * structural rather than decorative, and must not be "tightened away":
 *
 *   1. The honesty line sits directly under the sub-heading in the hero, not in
 *      a footer, and it is visible above the fold on a phone.
 *   2. The "Where EduFlow actually is today" panel (#status) is full-width and
 *      is the target of the hero's secondary button.
 *   3. There is no demo button. When there is no demo, the page prints a plain
 *      line saying so. A button that goes nowhere is worse than no button, and
 *      "demo on request" is the exact phrase FACTS.md forbids.
 *
 * Every undecided value (seat count, pilot price, target date, demo URL) is an
 * empty string in the CMS and the line it belongs to simply does not render.
 * The page never shows a [[TOKEN]] to a visitor, and it never invents a number
 * to fill the gap. Mehdi fills them from /admin → EduFlow and they appear.
 */

/** Renders `value` inside `render` only when the CMS field has been filled. */
function WhenSet({ value, children }: { value: string; children: (v: string) => JSX.Element }) {
  if (!value || !value.trim()) return null;
  return children(value.trim());
}

/**
 * Splits the H1 on its LAST comma so the closing clause can take the site's
 * accent-italic gradient, the way every other page title does. A title with no
 * comma simply renders whole.
 *
 * This used to split on an em/en dash. When the em dashes came out of the repo
 * the dashes in the character class came out with them and it was left reading
 * `[, ]`, which is "a comma OR A SPACE", so it split on the first space:
 * "The fee register, the attendance sheet and six WhatsApp groups, in one
 * place" rendered as "The, fee register, ...". The greedy `(.*)` below takes
 * the last comma, which is where the closing clause actually starts.
 */
function accentAfterDash(title: string) {
  const m = title.match(/^(.*),\s*(.+)$/);
  if (!m) return { lead: title, accent: "" };
  return { lead: m[1], accent: m[2] };
}

const ROLE_ICONS = [Building2, GraduationCap, Users];

export default function EduFlow() {
  const eduflow = useSingleton("eduflow");
  const contact = useSingleton("contact");

  const whatsappDigits = (contact.whatsappNumber || "").replace(/\D/g, "");
  const whatsappLink = whatsappDigits ? `https://wa.me/${whatsappDigits}`: "";
  const email = liveEmail(contact);
  const { lead, accent } = accentAfterDash(eduflow.title);

  return (
    <Layout>
      {/* Title and description: src/lib/seo/pages.ts (PAGE_SEO["/eduflow"]). */}
      <Seo
        path="/eduflow"
        breadcrumbs={[{ name: "EduFlow", path: "/eduflow" }]}
        /* SoftwareApplication, as 08-eduflow/EDUFLOW-LANDING-COPY.md §0 asks
         * for. And deliberately without `aggregateRating`, `review` or
         * `offers`. No school has reviewed EduFlow because no school is using
         * it, and no price has been decided; inventing either would be both a
         * FACTS.md violation and a Google structured-data policy breach that
         * can suppress rich results for the whole domain.
         *
         * `description` repeats the development status inside the markup, so
         * that a consumer reading only the JSON cannot come away believing
         * this is a shipping product. */
        schema={{
          "@type": "SoftwareApplication",
          name: "EduFlow",
          applicationCategory: "BusinessApplication",
          applicationSubCategory: "School and coaching institute management",
          operatingSystem: "Web browser",
          url: "/eduflow",
          description:
            "EduFlow is school and coaching management software for institutions with 300 to 1,500 students, admissions, fees, attendance, marks and parent communication in one system. It is currently in development: there are no paying schools, no public demo and nothing running in production. Early access is open to a first group of institutions in Delhi.",
          inLanguage: "en-IN",
          audience: {
            "@type": "Audience",
            audienceType: "Schools and coaching institutes in Delhi, India",
          },
        }}
      />

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        {/*
          TWO COLUMNS, with the status card as the right one.

          The hero was a single `max-w-3xl` column, so at 1440px everything
          stopped around 768px of a 1328px container and the right half was
          empty. EduFlow has no demo, no users and no screenshot that could
          honestly fill that space (FACTS.md: in development, no shipping
          language), so the right column holds the one thing on this page that
          most deserves the prominence: the in-development status. It is the
          same honesty line, moved, not new copy.
        */}
        <div className="container-page relative">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
            <div>
              <Reveal>
                <Eyebrow>{eduflow.eyebrow}</Eyebrow>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="mt-6 text-balance text-display font-display font-semibold">
                  {lead}
                  {accent && (
                    <>
                      {", "}
                      <span className="accent-italic text-gradient">{accent}</span>
                    </>
)}
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 text-lg text-muted-foreground text-pretty">
                  {eduflow.subtitle}
                </p>
              </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {eduflow.ctas?.map((cta) =>
                  cta.href.startsWith("#") ? (
                    <a
                      key={cta.href}
                      href={cta.href}
                      className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </a>
): (
                    <CtaButton key={cta.href} cta={cta} />
)
)}
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp {unbreakable(contact.phoneDisplay)}
                  </a>
)}
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">{eduflow.microLine}</p>
            </Reveal>
            </div>

            {/* The honesty line, now the right-hand column rather than a
                max-w-2xl note buried under the sub-heading. */}
            <Reveal delay={0.15}>
              <div className="rounded-3xl border border-primary/40 bg-primary/5 p-7 md:p-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  <CircleDot className="h-3.5 w-3.5" />
                  In development
                </span>
                <p className="mt-4 text-sm text-foreground/90 text-pretty">{eduflow.honestyLine}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 2. The problem ──────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="The problem"
            title={eduflow.problemHeading}
            subtitle={eduflow.problemIntro}
          />

          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3"
          >
            {eduflow.problemCards?.map((card) => (
              <motion.div key={card.title} variants={fadeUp} className="card-surface p-7">
                <h3 className="font-display text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground text-pretty">{card.description}</p>
              </motion.div>
))}
          </motion.div>

          <Reveal delay={0.1}>
            <p className="mt-10 max-w-2xl text-base text-foreground/80 text-pretty">
              {eduflow.problemClosing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 3. What EduFlow is ──────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="What it is"
            title={eduflow.whatHeading}
            subtitle={eduflow.whatBody}
          />

          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3"
          >
            {eduflow.roles?.map((role, i) => {
              const Icon = ROLE_ICONS[i % ROLE_ICONS.length];
              return (
                <motion.div key={role.audience} variants={fadeUp} className="card-surface p-7">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold">{role.audience}</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">{role.description}</p>
                </motion.div>
);
            })}
          </motion.div>
        </div>
      </section>

      {/* ── 4. The modules, each with its honest status ─────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="The modules"
            title={eduflow.modulesHeading}
            subtitle={eduflow.modulesIntro}
          />

          <Reveal className="mt-12">
            <div className="overflow-hidden rounded-3xl border border-border bg-card/50">
              <ul className="divide-y divide-border/70">
                {eduflow.modules?.map((m) => (
                  <li
                    key={m.name}
                    className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:gap-6 md:px-8"
                  >
                    <span className="font-display text-base font-semibold sm:w-56 sm:shrink-0">
                      {m.name}
                    </span>
                    <span className="flex-1 text-sm text-muted-foreground text-pretty">{m.benefit}</span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:self-auto">
                      <CircleDot className="h-3 w-3 text-primary" />
                      {m.status}
                    </span>
                  </li>
))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="mt-6 max-w-2xl text-sm text-muted-foreground text-pretty">
              {eduflow.modulesFootnote}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 5. Where EduFlow actually is today ──────────────────────────────
           Full-width panel. Not optional, and it does not get shortened.    */}
      <section id="status" className="section scroll-mt-28 pt-0">
        <div className="container-page">
          <Reveal>
            <div className="rounded-[2rem] border border-primary/40 bg-primary/5 p-8 md:p-12">
              <Eyebrow>Straight answer</Eyebrow>
              <h2 className="mt-4 text-balance font-display text-2xl font-semibold md:text-3xl">
                {eduflow.todayHeading}
              </h2>
              <p className="mt-5 max-w-3xl text-base text-foreground/85 text-pretty md:text-lg">
                {eduflow.todayBody}
              </p>

              {/* Each row appears only once Mehdi has filled that CMS field.
                  Nothing here ever prints a placeholder token at a visitor, and
                  the whole list collapses while none of them is set. */}
              <dl
                className="grid gap-x-10 gap-y-4 empty:hidden sm:grid-cols-2 [&:not(:empty)]:mt-8"
              >
                <WhenSet value={eduflow.workingToday}>
                  {(v) => (
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Working today
                      </dt>
                      <dd className="mt-1.5 text-sm text-foreground">{v}</dd>
                    </div>
)}
                </WhenSet>
                <WhenSet value={eduflow.targetDate}>
                  {(v) => (
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Target availability for early-access institutions
                      </dt>
                      <dd className="mt-1.5 text-sm text-foreground">{v}</dd>
                    </div>
)}
                </WhenSet>
                <WhenSet value={eduflow.roadmapUrl}>
                  {(v) => (
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Public roadmap
                      </dt>
                      <dd className="mt-1.5 text-sm">
                        <a
                          href={v}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline leading-6 text-primary"
                        >
                          {v}
                        </a>
                      </dd>
                    </div>
)}
                </WhenSet>
              </dl>

              {/* The demo. A link when one exists; a plain sentence when one
                  does not. Never a button that goes nowhere, and never the
                  phrase "demo on request". */}
              <div className="mt-8 border-t border-primary/20 pt-6">
                {eduflow.demoUrl && eduflow.demoUrl.trim() ? (
                  <CtaButton
                    cta={{
                      label: "Walk through what is built",
                      href: eduflow.demoUrl.trim(),
                      variant: "primary",
                    }}
                  />
): (
                  <p className="text-sm text-muted-foreground">
                    Demo not yet available. There is nothing to click here, and we would rather say
                    that than show you a recording of software you cannot open.
                  </p>
)}
              </div>

              <div className="mt-8 max-w-3xl rounded-2xl border border-border bg-background/60 p-6">
                <p className="text-sm text-muted-foreground text-pretty">{eduflow.todayAlternative}</p>
                {/*
                  Lifted out of the sentence and given a real box. As an inline <a>
                  this measured 130×20: an inline element takes its height from the
                  font's em square, not from line-height, so there is no class that
                  makes an in-sentence link clear the 24px WCAG 2.5.8 target. It is
                  also the only link on this page to /pricing, which is worth more
                  than a phrase in a paragraph.
                */}
                <Link
                  to="/pricing"
                  className="group mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm
                             font-medium text-foreground transition-colors duration-200 hover:border-primary/60 hover:bg-muted
                             active:bg-muted/70"
                >
                  See what that costs
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 6. How it works ─────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title={eduflow.stepsHeading}
            subtitle={eduflow.stepsIntro}
          />

          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {eduflow.steps?.map((step) => (
              <motion.div key={step.number} variants={fadeUp} className="card-surface p-7">
                <span className="font-display text-sm font-semibold tracking-[0.18em] text-primary">
                  {step.number}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{step.description}</p>
              </motion.div>
))}
          </motion.div>
        </div>
      </section>

      {/* ── 7. Early access ─────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden pt-0">
        <div className="container-page">
          <Reveal>
            <div className="rounded-[2rem] border border-border bg-card/50 bg-spotlight p-8 md:p-12">
              <Eyebrow>{eduflow.earlyAccessEyebrow}</Eyebrow>
              <h2 className="mt-4 text-balance font-display text-2xl font-semibold md:text-3xl">
                {eduflow.earlyAccessHeading}
              </h2>
              <p className="mt-5 max-w-2xl text-muted-foreground text-pretty">
                {eduflow.earlyAccessBody}
              </p>

              {/* Seat count and pilot price are undecided. They print only when
                  set. The body copy above says "a small group and no more"
                  rather than "that number and no more" precisely so that it
                  still reads when this pill is suppressed: the earlier wording
                  pointed at a figure that only existed while a seat count was
                  invented, and went dangling the moment it was blanked. */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                <WhenSet value={eduflow.pilotSeats}>
                  {(v) => (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                      {v} institutions
                    </span>
)}
                </WhenSet>
                <WhenSet value={eduflow.pilotPrice}>
                  {(v) => (
                    <span className="rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
                      Early-access price {v}
                      {eduflow.pilotMonths?.trim() ? ` for ${eduflow.pilotMonths.trim()} months`: ""}
                    </span>
)}
                </WhenSet>
                <WhenSet value={eduflow.parallelRunWeeks}>
                  {(v) => (
                    <span className="rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
                      {v} weeks running alongside your register
                    </span>
)}
                </WhenSet>
              </div>

              <div className="mt-10 grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="font-display text-lg font-semibold">What you get</h3>
                  <ul className="mt-5 space-y-3">
                    {eduflow.youGet?.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-pretty">{item}</span>
                      </li>
))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">What we ask</h3>
                  <ul className="mt-5 space-y-3">
                    {eduflow.weAsk?.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-foreground/70">
                          ·
                        </span>
                        <span className="text-pretty">{item}</span>
                      </li>
))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 8. FAQ (shares the site's FAQ collection, category "eduflow") ── */}
      <FaqSection category="eduflow" />

      {/* ── 9. Closing CTA: a conversation, not a purchase ─────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 px-6 py-16 text-center md:px-12 md:py-20">
              <Aurora className="opacity-70" />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-display font-display font-semibold">{eduflow.ctaHeading}</h2>
                <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                  {eduflow.ctaBody}
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  {whatsappLink && (
                    <CtaButton
                      cta={{ label: `WhatsApp ${unbreakable(contact.phoneDisplay)}`, href: whatsappLink }}
                    />
)}
                  <CtaButton
                    cta={{ label: "Send us a message", href: "/contact", variant: "outline" }}
                  />
                </div>

                <p className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {contact.phoneHref && (
                    <a href={contact.phoneHref} className="inline-flex min-h-6 items-center gap-1.5 hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {unbreakable(contact.phoneDisplay)}
                    </a>
)}
                  {email && (
                    <a href={email.href} className="inline-flex min-h-6 items-center hover:text-foreground">
                      {email.display}
                    </a>
)}
                  <span>
                    {[contact.address.line1, contact.address.city].filter(Boolean).join(", ")}
                  </span>
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground text-pretty">
              {eduflow.footnote}
            </p>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}

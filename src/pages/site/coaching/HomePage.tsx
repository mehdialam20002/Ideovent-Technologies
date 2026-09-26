/**
 * COACHING HOME, in Mehdi's order: Hero (with its data object and the goal
 * picker), Results, Courses, Faculty, Toppers, Testimonials, CTA, with the
 * "How joining works" block before the CTA. Inserts: c2's notice strip under
 * the hero; c5's next-three-exams strip is the hero's data object.
 *
 * Photos: the hero's (CoachingHero sets it per family), the faculty
 * portraits, and one section photo (admissions) beside "How joining works".
 * No more: the results and courses stay type, for rhythm.
 *
 * Every section renders only with data; every link comes from ctx.href;
 * every trust figure carries its basis line. Results (aggregate figures) and
 * Toppers (named, consented people) are separate sections.
 */

import { ArrowRight } from "lucide-react";
import { bi, biList, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { courseSlug, type SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { demoFee } from "@/lib/demo/record";
import { CountCard, FacultyCard, RatingLine, ResultCard, ReviewCard } from "@/lib/demo/ui/coaching/cards";
import { startsWithNumber } from "@/lib/demo/ui/coaching/copy";
import { GoalPicker, hasNextUp, NextUp, NoticeStrip, ResultsBand } from "@/lib/demo/ui/coaching/home";
import { CoachingHero } from "@/lib/demo/ui/coaching/hero";
import { SectionPhoto, sectionPhoto } from "@/lib/demo/ui/coaching/photos";
import { Reveal, SiteLink } from "../kit/motion";
import { SampleNote } from "../kit/SampleNote";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  headline: { en: "{areas} coaching in {city}", hi: "{city} में {areas} की कोचिंग" },
  since: { en: "Since {year}", hi: "{year} से" },
  results: { en: "Results", hi: "रिज़ल्ट" },
  allResults: { en: "All results by year and exam", hi: "साल और एग्ज़ाम के हिसाब से सभी रिज़ल्ट" },
  courses: { en: "Courses", hi: "कोर्स" },
  coursesLead: { en: "Duration, timings and the fee, printed on each course page.", hi: "हर कोर्स पेज पर अवधि, समय और फीस लिखी है।" },
  allCourses: { en: "Compare all courses", hi: "सभी कोर्स देखें" },
  faculty: { en: "The teachers", hi: "टीचर्स" },
  allFaculty: { en: "Meet every teacher", hi: "सभी टीचर्स से मिलें" },
  toppers: { en: "Our students", hi: "हमारे छात्र" },
  recent: { en: "Recent results", hi: "हाल के रिज़ल्ट" },
  reviews: { en: "What parents and students say", hi: "अभिभावक और छात्र क्या कहते हैं" },
  allReviews: { en: "Read every review", hi: "सभी रिव्यू पढ़ें" },
  joining: { en: "How joining works", hi: "जुड़ना कैसे होता है" },
  step1: { en: "Book a free demo class", hi: "फ्री डेमो क्लास बुक करें" },
  step2: { en: "Sit in a real class and meet the teacher", hi: "असली क्लास में बैठें और टीचर से मिलें" },
  step3: { en: "Choose a batch and join", hi: "बैच चुनें और जॉइन करें" },
  ctaTitle: { en: "Try one class before you decide", hi: "फैसला करने से पहले एक क्लास देखें" },
  ctaBody: { en: "The demo class is free, and there is no pressure to join on the day. Bring a notebook.", hi: "डेमो क्लास फ्री है, उसी दिन जॉइन करने का कोई दबाव नहीं। बस एक कॉपी लाएँ।" },
  fee: { en: "Fee", hi: "फीस" },
  feeOnCall: { en: "Fee on call", hi: "फीस फ़ोन पर" },
  starts: { en: "Next batch {date}", hi: "अगला बैच {date}" },
} satisfies Record<string, Bilingual>;

function More({ to, label }: { to: string | null; label: string }) {
  if (!to) return null;
  return (
    <SiteLink to={to} className="mt-8 inline-flex min-h-[44px] items-center gap-2 font-semibold text-[hsl(var(--ds-accent))] underline-offset-4 hover:underline">
      {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </SiteLink>
  );
}

export default function HomePage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const areas = biList(site, "focusAreas", lang).slice(0, 3).join(", ");
  const city = bi(site, "city", lang);
  /* An institute that is not "coaching" in its own words (c4: an after-school class, per the MoE 2024 point) sets its own headline. */
  const title = bi(site, "admissionsHeadline", lang) || (areas && city ? trf(COPY.headline, lang, { areas, city }) : site.instituteName);
  const demo = ctx.href("demo-class") || ctx.href("contact") || ctx.actions.whatsapp || "";
  const coursesHref = ctx.href("courses");
  const courses = withText(site.courses, "name");
  const stats = withText(site.stats, "label").filter((s) => (s.value || "").trim());
  const results = withText(site.results, "achievement");
  const named = results.filter((r) => r.consent && (r.studentName || "").trim());
  const unnamed = results.filter((r) => !r.count).slice(0, 4);
  const counts = (site.results || []).filter((r) => (r.count || "").trim()).slice(0, 4);
  const reviews = withText(site.reviews, "quote").filter((r) => r.consent);
  const faculty = withText(site.faculty, "name");
  const joining = withText(site.joining, "title");
  const steps = joining.length
    ? joining.map((j) => ({ t: bi(j, "title", lang), b: bi(j, "body", lang) }))
    : [COPY.step1, COPY.step2, COPY.step3].map((c) => ({ t: tr(c, lang), b: "" }));
  const year = bi(site, "establishedYear", lang) || bi(site, "established", lang);
  const eyebrowIsCity = site.instituteName === title;
  const facts = [year && trf(COPY.since, lang, { year }), !eyebrowIsCity && city, bi(site, "classSizePromise", lang)].filter(Boolean) as string[];
  /* The one section photo on the home page: "sit in a real class", beside the steps. */
  const joinPhoto = !!sectionPhoto(site, "admissions");
  let n = 0;

  return (
    <>
      <CoachingHero
        eyebrow={site.instituteName !== title ? site.instituteName : city}
        title={title}
        lead={<Bi of={site} k="tagline" />}
        primary={demo ? <Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action> : undefined}
        secondary={coursesHref ? <Action href={coursesHref} tone="ghost">{tr(SHELL_COPY.coursesAndFees, lang)}</Action> : undefined}
        facts={facts}
        aside={hasNextUp(site, courses, ctx.today, lang) ? <NextUp courses={courses} /> : undefined}
        photo={site.heroImage ? { src: site.heroImage, alt: site.instituteName } : undefined}
      />
      <GoalPicker courses={courses} />
      <NoticeStrip />

      {(stats.length > 0 || counts.length > 0) && (
        <ResultsBand n={++n} title={bi(site, "resultsHeading", lang) || tr(COPY.results, lang)} stats={stats}>
          {counts.length > 0 && (
            <div className="grid gap-4 text-[hsl(var(--ds-ink))] sm:grid-cols-2 lg:grid-cols-4">
              {counts.map((r, i) => <Reveal key={i} index={i}><CountCard r={r} /></Reveal>)}
            </div>
          )}
          <More to={ctx.href("results")} label={tr(COPY.allResults, lang)} />
        </ResultsBand>
      )}

      {courses.length > 0 && (
        <Section n={++n} title={tr(COPY.courses, lang)} lead={tr(COPY.coursesLead, lang)}>
          <CardGrid cols={3}>
            {courses.slice(0, 6).map((c, i) => {
              const to = ctx.href("course", courseSlug(c));
              const fee = demoFee(c.fee, site.currency);
              const body = (
                <Card interactive={!!to} className="flex h-full flex-col">
                  {c.category && <Bi of={c} k="category" as="p" className="text-sm font-semibold text-[hsl(var(--ds-accent))]" />}
                  <Bi of={c} k="name" as="p" className="ds-display mt-1 text-xl" />
                  <Bi of={c} k="level" as="p" className="text-[hsl(var(--ds-ink-soft))]" />
                  <p className="mt-3 text-sm">{[bi(c, "duration", lang), bi(c, "mode", lang)].filter(Boolean).join("  ·  ")}</p>
                  {bi(c, "batchStarts", lang) && <p className="mt-1 text-sm">{startsWithNumber(bi(c, "batchStarts", lang)) ? trf(COPY.starts, lang, { date: bi(c, "batchStarts", lang) }) : bi(c, "batchStarts", lang)}</p>}
                  <p className="ds-num mt-auto pt-4 font-semibold">{fee ? `${tr(COPY.fee, lang)}: ${fee}` : tr(COPY.feeOnCall, lang)}</p>
                </Card>
              );
              return <Reveal key={i} index={i}>{to ? <SiteLink to={to} className="block h-full">{body}</SiteLink> : body}</Reveal>;
            })}
          </CardGrid>
          <More to={coursesHref} label={tr(COPY.allCourses, lang)} />
        </Section>
      )}

      {faculty.length > 0 && (
        <Section n={++n} title={tr(COPY.faculty, lang)}>
          <CardGrid cols={4}>
            {faculty.slice(0, 4).map((f, i) => <Reveal key={i} index={i}><FacultyCard f={f} /></Reveal>)}
          </CardGrid>
          <More to={ctx.href("faculty")} label={tr(COPY.allFaculty, lang)} />
        </Section>
      )}

      {(named.length > 0 || unnamed.length > 0) && (
        <Section n={++n} title={tr(named.length ? COPY.toppers : COPY.recent, lang)}>
          <CardGrid cols={named.length ? 4 : 2}>
            {(named.length ? named.slice(0, 8) : unnamed).map((r, i) => <Reveal key={i} index={i}><ResultCard r={r} /></Reveal>)}
          </CardGrid>
          <Bi of={site} k="resultsNote" as="p" className="mt-4 text-[hsl(var(--ds-ink-soft))]" />
          {/* The band above already carries the line when it is shown. */}
          {!(stats.length > 0 || counts.length > 0) && <SampleNote block="results" className="mt-3" />}
        </Section>
      )}

      {reviews.length >= 2 && (
        <Section n={++n} title={tr(COPY.reviews, lang)} lead={<RatingLine />}>
          <SampleNote block="reviews" className="mb-6" />
          <CardGrid cols={3}>
            {reviews.slice(0, 3).map((r, i) => <Reveal key={i} index={i}><ReviewCard r={r} /></Reveal>)}
          </CardGrid>
          <More to={ctx.href("reviews")} label={tr(COPY.allReviews, lang)} />
        </Section>
      )}

      <Section n={++n} title={tr(COPY.joining, lang)} tone="tint">
        <div className={joinPhoto ? "grid gap-8 md:grid-cols-[1fr_1fr] md:items-center lg:gap-12" : ""}>
        <ol className={`grid gap-6 ${joinPhoto ? "" : "md:grid-cols-3"}`}>
          {steps.map((s, i) => (
            <Reveal as="li" key={i} index={i} className="flex gap-4">
              <span className="ds-display ds-num flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ds-brand))] text-lg text-[hsl(var(--ds-on-brand))]">{i + 1}</span>
              <div className="pt-2">
                <p className="font-semibold">{s.t}</p>
                {s.b && <p className="mt-1 text-[hsl(var(--ds-ink-soft))]">{s.b}</p>}
              </div>
            </Reveal>
          ))}
        </ol>
        {joinPhoto && <Reveal><SectionPhoto slot="admissions" /></Reveal>}
        </div>
      </Section>

      {demo && (
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid items-center gap-6 rounded-[var(--ds-radius)] bg-[hsl(var(--ds-brand))] px-6 py-10 text-[hsl(var(--ds-on-brand))] sm:px-10 md:grid-cols-[2fr_1fr]">
            <div>
              <h2 className="ds-display text-3xl sm:text-4xl">{tr(COPY.ctaTitle, lang)}</h2>
              <p className="mt-3 max-w-xl text-lg opacity-90">{bi(site.trial, "body", lang) || tr(COPY.ctaBody, lang)}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

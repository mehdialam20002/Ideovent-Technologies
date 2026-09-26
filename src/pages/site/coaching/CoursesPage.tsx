/**
 * COURSES INDEX. /courses
 *
 *   head      title, lead, then the `courses` section photo as a wide band
 *   filter    goal chips (by category) with the filter transition, when 2+
 *   grid      one card per course: name, band, duration, mode, next batch,
 *             fee (a cleared fee prints "Fee on call"), linking to its page
 *   compare   a comparison table (duration, timings, mode, fee) when 3+
 *             courses; the c1/c5 pattern, useful to every segment
 *   timings   the batch timetable (site.schedule) when there is one
 *
 * When the record shows no per-course pages (c2: one classes-and-fees page),
 * each card carries its own detail, subjects, timings and fee note, so
 * nothing lives behind a missing link.
 */

import { Helmet } from "react-helmet-async";
import { bi, biLabel, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { courseSlug, type SitePageProps } from "@/lib/demo/site/context";
import { timedRows } from "@/lib/demo/site/pages";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { demoFee } from "@/lib/demo/record";
import { Chips } from "@/lib/demo/ui/coaching/Chips";
import { distinct, useFilter } from "@/lib/demo/ui/coaching/filter";
import { DataTable } from "@/lib/demo/ui/coaching/Table";
import { C_COPY, startsWithNumber } from "@/lib/demo/ui/coaching/copy";
import { PageHead } from "../kit/Hero";
import { PhotoBand } from "@/lib/demo/ui/coaching/photos";
import { SiteLink } from "../kit/motion";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Courses and fees", hi: "कोर्स और फीस" },
  lead: { en: "Every course with its duration, timings and fee. Open a course for the syllabus, the teachers and the instalments.", hi: "हर कोर्स की अवधि, समय और फीस। सिलेबस, टीचर्स और किस्तों के लिए कोर्स खोलें।" },
  leadOne: { en: "Every class with its subjects, timings and monthly fee.", hi: "हर क्लास के विषय, समय और महीने की फीस।" },
  goal: { en: "Goal", hi: "लक्ष्य" },
  all: { en: "All courses", hi: "सभी कोर्स" },
  compare: { en: "Compare courses", hi: "कोर्स की तुलना" },
  course: { en: "Course", hi: "कोर्स" },
  duration: { en: "Duration", hi: "अवधि" },
  timings: { en: "Timings", hi: "समय" },
  mode: { en: "Mode", hi: "तरीका" },
  fee: { en: "Fee", hi: "फीस" },
  subjects: { en: "Subjects", hi: "विषय" },
  feeOnCall: { en: "Fee on call, printed on the receipt", hi: "फीस फ़ोन पर, रसीद पर लिखी होगी" },
  starts: { en: "Next batch {date}", hi: "अगला बैच {date}" },
  seats: { en: "{n} seats a batch", hi: "एक बैच में {n} सीटें" },
  view: { en: "Syllabus, teachers and fee", hi: "सिलेबस, टीचर्स और फीस" },
  timetable: { en: "Batch timings", hi: "बैच का समय" },
  batch: { en: "Batch", hi: "बैच" },
  days: { en: "Days", hi: "दिन" },
  time: { en: "Time", hi: "समय" },
  subject: { en: "Subject", hi: "विषय" },
} satisfies Record<string, Bilingual>;

export default function CoursesPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const courses = withText(site.courses, "name");
  const goals = distinct(courses.map((c) => c.category));
  const f = useFilter<string>("all");
  const shown = f.value === "all" ? courses : courses.filter((c) => (c.category || "").trim() === f.value);
  const perCourse = courses.some((c) => ctx.href("course", courseSlug(c)));
  const demo = ctx.href("demo-class") || ctx.href("contact");
  /* No times, no timetable: see timedRows. */
  const schedule = timedRows(site.schedule);
  let n = 0;

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(perCourse ? COPY.lead : COPY.leadOne, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      >
        {demo && <div className="mt-6"><Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action></div>}
      </PageHead>
      <PhotoBand slot="courses" className="pt-8 sm:pt-10" />

      <Section n={++n} title={tr(COPY.all, lang)}>
        <Chips label={tr(COPY.goal, lang)} value={f.value} onChange={f.choose}
          options={[{ value: "all", label: tr(C_COPY.all, lang) }, ...goals.map((g) => ({ value: g, label: biLabel(courses, "category", g, lang) }))]} />
        <p className="sr-only" aria-live="polite">{trf(C_COPY.showing, lang, { n: String(shown.length) })}</p>
        <div ref={f.gridRef}>
          <CardGrid cols={3}>
            {shown.map((c) => {
              const to = ctx.href("course", courseSlug(c));
              const fee = demoFee(c.fee, site.currency);
              const card = (
                <Card interactive={!!to} className="flex h-full flex-col">
                  {c.category && <Bi of={c} k="category" as="p" className="text-sm font-semibold text-[hsl(var(--ds-accent))]" />}
                  <Bi of={c} k="name" as="h3" className="ds-display mt-1 text-xl" />
                  <Bi of={c} k="level" as="p" className="text-[hsl(var(--ds-ink-soft))]" />
                  <ul className="mt-3 space-y-1 text-sm">
                    {bi(c, "duration", lang) && <li>{tr(COPY.duration, lang)}: <Bi of={c} k="duration" /></li>}
                    {bi(c, "mode", lang) && <li>{tr(COPY.mode, lang)}: <Bi of={c} k="mode" /></li>}
                    {!to && bi(c, "subjects", lang) && <li>{tr(COPY.subjects, lang)}: <Bi of={c} k="subjects" /></li>}
                    {!to && bi(c, "timings", lang) && <li>{tr(COPY.timings, lang)}: <Bi of={c} k="timings" /></li>}
                    {bi(c, "batchStarts", lang) && <li>{startsWithNumber(bi(c, "batchStarts", lang)) ? trf(COPY.starts, lang, { date: bi(c, "batchStarts", lang) }) : bi(c, "batchStarts", lang)}</li>}
                    {c.seats && <li>{/^\d+$/.test(c.seats.trim()) ? trf(COPY.seats, lang, { n: c.seats }) : c.seats}</li>}
                  </ul>
                  {!to && <Bi of={c} k="detail" as="p" className="mt-3 text-[hsl(var(--ds-ink-soft))]" />}
                  <div className="mt-auto pt-4">
                    <p className="ds-num text-lg font-semibold">{fee || tr(COPY.feeOnCall, lang)}</p>
                    <Bi of={c} k="feeNote" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
                    {to && <p className="mt-3 text-sm font-semibold text-[hsl(var(--ds-accent))]">{tr(COPY.view, lang)} →</p>}
                  </div>
                </Card>
              );
              return <div key={c.name} data-f="" className="h-full">{to ? <SiteLink to={to} className="block h-full">{card}</SiteLink> : card}</div>;
            })}
          </CardGrid>
        </div>
      </Section>

      {courses.length >= 3 && perCourse && (
        <Section n={++n} title={tr(COPY.compare, lang)}>
          <DataTable
            caption={tr(COPY.compare, lang)}
            head={[tr(COPY.course, lang), tr(COPY.duration, lang), tr(COPY.timings, lang), tr(COPY.mode, lang), tr(COPY.fee, lang)]}
            rows={courses.map((c) => {
              const to = ctx.href("course", courseSlug(c));
              return [
                to ? <SiteLink to={to} className="underline underline-offset-4">{bi(c, "name", lang)}</SiteLink> : bi(c, "name", lang),
                bi(c, "duration", lang), bi(c, "timings", lang), bi(c, "mode", lang),
                demoFee(c.fee, site.currency) || tr(COPY.feeOnCall, lang),
              ];
            })}
          />
        </Section>
      )}

      {schedule.length > 0 && (
        <Section n={++n} title={tr(COPY.timetable, lang)} lead={<Bi of={site} k="scheduleNote" />}>
          <DataTable
            caption={tr(COPY.timetable, lang)}
            head={[tr(COPY.batch, lang), tr(COPY.days, lang), tr(COPY.time, lang), tr(COPY.subject, lang)]}
            rows={schedule.map((r) => [bi(r, "label", lang), bi(r, "days", lang), bi(r, "time", lang), bi(r, "subject", lang)])}
          />
        </Section>
      )}
    </>
  );
}

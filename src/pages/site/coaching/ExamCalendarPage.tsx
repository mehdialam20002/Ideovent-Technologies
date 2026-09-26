/**
 * EXAM CALENDAR. /exam-calendar  (c5: SSC, Banking, Railways)
 *
 *   calendar     exam, notification, exam date, as a table; an exam whose
 *                ISO date has passed is marked, never silently shown as
 *                upcoming. Source and last-updated line under it, at body
 *                size.
 *   eligibility  age and qualification per exam, when given
 * Dates change: the page always prints its source and when it was updated.
 */

import { Helmet } from "react-helmet-async";
import { tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { DataTable } from "@/lib/demo/ui/coaching/Table";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Action } from "../kit/Text";

const COPY = {
  title: { en: "Exam calendar", hi: "परीक्षा कैलेंडर" },
  lead: { en: "When each exam's notification is expected and when the exam is held.", hi: "हर exam का notification कब आएगा और exam कब होगा।" },
  upcoming: { en: "Upcoming exams", hi: "आने वाले exams" },
  exam: { en: "Exam", hi: "Exam" },
  notification: { en: "Notification", hi: "Notification" },
  date: { en: "Exam date", hi: "परीक्षा की तारीख" },
  held: { en: "(held)", hi: "(हो चुका)" },
  eligibility: { en: "Age and eligibility", hi: "उम्र और योग्यता" },
  age: { en: "Age limit", hi: "उम्र सीमा" },
  qualification: { en: "Qualification", hi: "योग्यता" },
  checkOfficial: { en: "Always confirm dates on the official notification before you apply.", hi: "Apply करने से पहले तारीखें official notification में ज़रूर देखें।" },
  prepare: { en: "Start preparing", hi: "तैयारी शुरू करें" },
} satisfies Record<string, Bilingual>;

export default function ExamCalendarPage({ site, ctx }: SitePageProps) {
  const { lang, today } = ctx;
  const g = site.govExams;
  const cal = (g?.calendar || []).filter((e) => e.exam.trim());
  const elig = (g?.eligibility || []).filter((e) => e.exam.trim());
  const past = (d?: string) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") && (d || "") < today;
  const coursesHref = ctx.href("courses");

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />
      <Section n={1} title={tr(COPY.upcoming, lang)}>
        <DataTable
          caption={tr(COPY.upcoming, lang)}
          head={[tr(COPY.exam, lang), tr(COPY.notification, lang), tr(COPY.date, lang)]}
          rows={cal.map((e) => [
            e.exam,
            e.notification || "",
            <span key="d" className={past(e.examDate) ? "text-[hsl(var(--ds-ink-soft))]" : "font-semibold"}>{e.examDate}{past(e.examDate) ? ` ${tr(COPY.held, lang)}` : ""}</span>,
          ])}
        />
        <div className="mt-4 max-w-[68ch] space-y-1">
          {g?.calendarSource && <p>{trf(C_COPY.source, lang, { source: g.calendarSource })}</p>}
          {g?.calendarUpdated && <p>{trf(C_COPY.updated, lang, { date: g.calendarUpdated })}</p>}
          <p className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.checkOfficial, lang)}</p>
        </div>
        {coursesHref && <div className="mt-8"><Action href={coursesHref}>{tr(COPY.prepare, lang)}</Action></div>}
      </Section>
      {elig.length > 0 && (
        <Section n={2} title={tr(COPY.eligibility, lang)}>
          <DataTable
            caption={tr(COPY.eligibility, lang)}
            head={[tr(COPY.exam, lang), tr(COPY.age, lang), tr(COPY.qualification, lang)]}
            rows={elig.map((e) => [e.exam, e.age || "", e.qualification || ""])}
          />
        </Section>
      )}
    </>
  );
}

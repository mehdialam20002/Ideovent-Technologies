/**
 * HOME-PAGE PARTS FOR COACHING, each drawn in the family's language:
 *
 *   GoalPicker   "I am preparing for": ruled text tabs (classic), icon chips
 *                overlapping the hero's bottom edge by 32px (modern), pills
 *                (warm). Each chip routes to the first course of its goal.
 *   NextUp       the hero's data object: the next three exams (c5, from the
 *                exam calendar) or the next batches (everyone else).
 *   NoticeStrip  c2's notice board strip under the hero, expiry-aware.
 *   ResultsBand  the aggregate figures, each with its basis line. Modern gets
 *                the full-bleed dark band of tabular figures.
 */

import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Calculator, FlaskConical, GraduationCap, Landmark, Stethoscope } from "lucide-react";
import type { DemoCourse, DemoNotice, DemoSite, DemoStat } from "@/lib/cms/types";
import { bi, biLabel, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { courseSlug, useSite } from "@/lib/demo/site/context";
import { CountUp, Reveal, SiteLink } from "@/pages/site/kit/motion";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { Figure, Section } from "@/pages/site/kit/Section";
import { Bi } from "@/pages/site/kit/Text";
import { startsWithNumber } from "./copy";
import "./coaching.css";

const COPY = {
  preparing: { en: "I am preparing for", hi: "मैं तैयारी कर रहा हूँ" },
  nextBatches: { en: "Next batches", hi: "अगले बैच" },
  nextExams: { en: "Next exams", hi: "आने वाले एग्ज़ाम" },
  starts: { en: "Starts", hi: "शुरू" },
  examDate: { en: "Exam", hi: "एग्ज़ाम" },
  notification: { en: "Notification", hi: "नोटिफ़िकेशन" },
  notices: { en: "Notice board", hi: "नोटिस बोर्ड" },
  fullCalendar: { en: "Full exam calendar", hi: "पूरा एग्ज़ाम कैलेंडर" },
  allCourses: { en: "All courses", hi: "सभी कोर्स" },
} satisfies Record<string, Bilingual>;

function goalIcon(g: string) {
  const s = g.toLowerCase();
  if (/neet|medical|bio/.test(s)) return Stethoscope;
  if (/jee|engineer|iit/.test(s)) return Calculator;
  if (/ssc|bank|rail|govern|upsc|police/.test(s)) return Landmark;
  if (/science|physics|chem/.test(s)) return FlaskConical;
  if (/olymp|foundation|class/.test(s)) return BookOpen;
  return GraduationCap;
}

export function GoalPicker({ courses }: { courses: DemoCourse[] }) {
  const { family, lang, href } = useSite();
  const goals = Array.from(new Set(courses.map((c) => (c.category || "").trim()).filter(Boolean)));
  const items = goals.map((g) => {
    const first = courses.find((c) => (c.category || "").trim() === g)!;
    return { g, label: biLabel(courses, "category", g, lang), to: href("course", courseSlug(first)) || href("courses") };
  }).filter((x): x is { g: string; label: string; to: string } => !!x.to);
  if (items.length < 2) return null;

  if (family === "classic") {
    return (
      <nav aria-label={tr(COPY.preparing, lang)} className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-[hsl(var(--ds-line))] py-3">
          <span className="ds-smallcaps text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.preparing, lang)}</span>
          {items.map(({ g, label, to }) => (
            <SiteLink key={g} to={to} className="ds-smallcaps inline-flex min-h-[44px] items-center border-b-2 border-transparent text-base font-semibold hover:border-[hsl(var(--ds-accent))]">{label}</SiteLink>
          ))}
        </div>
      </nav>
    );
  }
  if (family === "modern") {
    return (
      <nav aria-label={tr(COPY.preparing, lang)} className="relative z-10 bg-[linear-gradient(hsl(var(--ds-hero-bg))_0_32px,transparent_32px)] pb-2"><div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="sr-only">{tr(COPY.preparing, lang)}</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map(({ g, label, to }, i) => {
            const Icon = goalIcon(g);
            return (
              <Reveal as="li" key={g} index={i}>
                <SiteLink to={to} className="ds-card flex min-h-[64px] items-center gap-3 px-4 py-3 font-semibold shadow-lg" >
                  <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                  <span>{label}</span>
                </SiteLink>
              </Reveal>
            );
          })}
        </ul>
      </div></nav>
    );
  }
  return (
    <nav aria-label={tr(COPY.preparing, lang)} className="mx-auto w-full max-w-6xl px-4 pt-14 text-center sm:px-6">
      <p className="font-semibold text-[hsl(var(--ds-ink-soft))]">{tr(COPY.preparing, lang)}</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {items.map(({ g, label, to }) => (
          <li key={g}><SiteLink to={to} className="inline-flex min-h-[48px] items-center rounded-full bg-[hsl(var(--ds-surface-2))] px-5 font-semibold">{label}</SiteLink></li>
        ))}
      </ul>
    </nav>
  );
}

/** True when NextUp has something to show, so the hero draws no empty card. */
export function hasNextUp(site: DemoSite, courses: DemoCourse[], today: string, lang: "en" | "hi"): boolean {
  return upcomingExams(site, today).length > 0 || courses.some((c) => bi(c, "batchStarts", lang));
}

function upcomingExams(site: DemoSite, today: string) {
  return (site.govExams?.calendar || [])
    .filter((e) => e.exam && (!/^\d{4}-\d{2}-\d{2}$/.test(e.examDate || "") || (e.examDate || "") >= today))
    .slice(0, 3);
}

/** The hero's data object: next three exams (with a calendar) or next batches. */
export function NextUp({ courses }: { courses: DemoCourse[] }) {
  const { site, lang, href, today } = useSite();
  const exams = upcomingExams(site, today);
  if (exams.length) {
    const cal = href("exam-calendar");
    return (
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider opacity-80">{tr(COPY.nextExams, lang)}</p>
        <ul className="mt-2 grid gap-3 sm:grid-cols-3">
          {exams.map((e) => (
            <li key={e.exam} className="border-l-2 border-[hsl(var(--ds-cta))] pl-3">
              <p className="font-semibold">{e.exam}</p>
              {e.examDate && <p className="ds-num text-sm opacity-80">{tr(COPY.examDate, lang)}: {e.examDate}</p>}
              {e.notification && <p className="ds-num text-sm opacity-80">{tr(COPY.notification, lang)}: {e.notification}</p>}
            </li>
          ))}
        </ul>
        {cal && <SiteLink to={cal} className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold underline">{tr(COPY.fullCalendar, lang)} <ArrowRight className="h-4 w-4" aria-hidden="true" /></SiteLink>}
      </div>
    );
  }
  const batches = courses.filter((c) => bi(c, "batchStarts", lang)).slice(0, 4);
  if (!batches.length) return null;
  const all = href("courses");
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{tr(COPY.nextBatches, lang)}</p>
      <ul className="mt-3 divide-y divide-[hsl(var(--ds-line))]">
        {batches.map((c) => {
          const to = href("course", courseSlug(c));
          const inner = (
            <>
              <span className="min-w-0"><Bi of={c} k="name" className="block font-semibold" /><Bi of={c} k="timings" className="block text-sm text-[hsl(var(--ds-ink-soft))]" /></span>
              <span className="ds-num text-sm sm:shrink-0 sm:text-right">{startsWithNumber(bi(c, "batchStarts", lang)) && <span className="block text-[hsl(var(--ds-ink-soft))]">{tr(COPY.starts, lang)}</span>}<Bi of={c} k="batchStarts" className="font-semibold" /></span>
            </>
          );
          return (
            <li key={c.name}>
              {to
                ? <SiteLink to={to} className="grid min-h-[48px] gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">{inner}</SiteLink>
                : <div className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">{inner}</div>}
            </li>
          );
        })}
      </ul>
      {all && <SiteLink to={all} className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[hsl(var(--ds-accent))]">{tr(COPY.allCourses, lang)} <ArrowRight className="h-4 w-4" aria-hidden="true" /></SiteLink>}
    </div>
  );
}

/** Notices not expired and newer than 60 days, pinned first. */
export function liveNotices(site: DemoSite, today: string): DemoNotice[] {
  const cutoff = new Date(Date.parse(today) - 60 * 864e5).toISOString().slice(0, 10);
  return withText(site.notices, "title")
    .filter((x) => !x.expires || x.expires >= today)
    .filter((x) => !x.posted || x.posted >= cutoff)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
}

export function NoticeStrip() {
  const { site, lang, today } = useSite();
  const list = liveNotices(site, today).slice(0, 3);
  if (!list.length) return null;
  return (
    <section aria-label={tr(COPY.notices, lang)} className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <div className="border-y-2 border-[hsl(var(--ds-rule))] py-3">
        <p className="ds-smallcaps text-sm font-semibold text-[hsl(var(--ds-accent))]">{tr(COPY.notices, lang)}</p>
        <ul className="mt-1 divide-y divide-[hsl(var(--ds-line))]">
          {list.map((x, i) => (
            <li key={i} className="grid gap-1 py-2 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <Bi of={x} k="date" className="ds-num text-sm text-[hsl(var(--ds-ink-soft))]" />
              <span><Bi of={x} k="title" className="font-semibold" /> <Bi of={x} k="body" className="text-[hsl(var(--ds-ink-soft))]" /></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Aggregate figures, each with its basis line. Modern: a dark full-bleed band. */
export function ResultsBand({ n, title, stats, children, sample = true }: {
  n: number; title: string; stats: DemoStat[]; children?: ReactNode;
  /** False where the page head already carries the sample line. */
  sample?: boolean;
}) {
  const { family, lang } = useSite();
  if (!stats.length && !children) return null;
  if (family === "modern") {
    return (
      <section className="dsc-band-dark">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="ds-display text-3xl sm:text-4xl">{title}</h2>
          {sample && <SampleNote block="results" className="mt-3" onDark />}
          {stats.length > 0 && (
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s, i) => (
                <Reveal key={i} index={i} className="border-t border-[hsl(var(--ds-hero-soft)/0.35)] pt-4">
                  <p className="ds-display ds-num text-5xl"><CountUp value={s.value} basis={bi(s, "basis", lang)} /></p>
                  <Bi of={s} k="label" as="p" className="mt-2 font-semibold" />
                  <Bi of={s} k="basis" as="p" className="dsc-soft mt-1" />
                </Reveal>
              ))}
            </div>
          )}
          {children && <div className="mt-10 [&>a]:!text-[hsl(var(--ds-hero-accent))]">{children}</div>}
        </div>
      </section>
    );
  }
  return (
    <Section n={n} title={title}>
      {sample && <SampleNote block="results" className="mb-6" />}
      {stats.length > 0 && (
        <div className={`grid gap-8 sm:grid-cols-2 ${family === "classic" ? "" : "lg:grid-cols-4"}`}>
          {stats.map((s, i) => <Figure key={i} value={s.value} label={<Bi of={s} k="label" />} basis={bi(s, "basis", lang)} />)}
        </div>
      )}
      {children && <div className="mt-8">{children}</div>}
    </Section>
  );
}

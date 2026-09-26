/**
 * ONE COACHING COURSE: THE REFERENCE PAGE for coaching. /courses/<course>.
 * The contract it follows is src/lib/demo/pages/README.md.
 *
 * Sections (DEMO-COACHING-IA.md, course page), each only when it has data:
 *   head      breadcrumb, name, band, mode, next batch; one primary action
 *             (Book a free demo) and one secondary (Courses and fees)
 *   1 who     who it is for and the eligibility line
 *   2 grid    duration, timings, mode, batch size as a fact table
 *   3 syll    syllabus accordion, study material, test plan
 *   4 fee     total, instalments, inclusions, refund line. A cleared fee
 *             prints "Fee on call" rather than a hole
 *   5 people  the course's faculty (by name), dropped when none
 *   6 results results that name this course, CCPA fields: course, duration,
 *             paid status; a name only with consent
 *   7 faq     questions about this course
 *   8 more    sibling course links
 * An unknown course slug renders the designed not-published state.
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { courseSlug, type SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { demoFee } from "@/lib/demo/record";
import { PageHead } from "../kit/Hero";
import { PageStub } from "../kit/PageStub";
import { Reveal, SiteLink } from "../kit/motion";
import { SampleNote } from "../kit/SampleNote";
import { Card, CardGrid, FactTable, Section } from "../kit/Section";
import { Accordion, Action, Bi, Monogram } from "../kit/Text";

const COPY = {
  courses: { en: "Courses", hi: "कोर्स" },
  who: { en: "Who this course is for", hi: "यह कोर्स किसके लिए है" },
  eligibility: { en: "Eligibility", hi: "योग्यता" },
  facts: { en: "Duration and timings", hi: "अवधि और समय" },
  /* When the course has no timings (a duplicate before they are typed in). */
  factsNoTime: { en: "Course details", hi: "कोर्स की जानकारी" },
  duration: { en: "Duration", hi: "अवधि" },
  timings: { en: "Timings", hi: "समय" },
  mode: { en: "Mode", hi: "तरीका" },
  subjects: { en: "Subjects", hi: "विषय" },
  batch: { en: "Batch size", hi: "बैच का साइज़" },
  nextBatch: { en: "Next batch: {date}", hi: "अगला बैच: {date}" },
  syllabus: { en: "Syllabus", hi: "सिलेबस" },
  material: { en: "Study material", hi: "स्टडी मटीरियल" },
  tests: { en: "Tests", hi: "टेस्ट" },
  fee: { en: "Fee", hi: "फीस" },
  feeTotal: { en: "Course fee", hi: "कोर्स की फीस" },
  feeOnCall: { en: "Fee on call, printed on the receipt", hi: "फीस फ़ोन पर बताई जाएगी, रसीद पर लिखी होगी" },
  instalments: { en: "Instalments", hi: "किस्तें" },
  includes: { en: "Included in the fee", hi: "फीस में शामिल" },
  refundPolicy: { en: "Full refund policy", hi: "पूरी रिफंड पॉलिसी" },
  faculty: { en: "Who teaches this course", hi: "इस कोर्स के टीचर्स" },
  results: { en: "Results from this course", hi: "इस कोर्स के रिज़ल्ट" },
  paid: { en: "Paid course", hi: "पेड कोर्स" },
  scholarship: { en: "On scholarship", hi: "स्कॉलरशिप पर" },
  free: { en: "Free course", hi: "फ्री कोर्स" },
  faq: { en: "Questions about this course", hi: "इस कोर्स के बारे में सवाल" },
  more: { en: "Other courses", hi: "दूसरे कोर्स" },
  demoMsg: { en: "I would like a free demo class for {course}", hi: "मुझे {course} की फ्री डेमो क्लास चाहिए" },
} satisfies Record<string, Bilingual>;

export default function CoursePage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const course = (site.courses || []).find((c) => c.name && courseSlug(c) === ctx.param);
  if (!course) return <PageStub site={site} ctx={ctx} />;

  let n = 0;
  const name = bi(course, "name", lang);
  const demoHref = ctx.href("demo-class")
    || (ctx.actions.whatsapp ? `${ctx.actions.whatsapp}?text=${encodeURIComponent(trf(COPY.demoMsg, lang, { course: name }))}` : "")
    || ctx.href("contact") || ctx.actions.tel || "";
  const coursesHref = ctx.href("courses");
  const fee = demoFee(course.fee, site.currency);
  const facts = [
    { k: "duration" as const, label: COPY.duration },
    { k: "timings" as const, label: COPY.timings },
    { k: "mode" as const, label: COPY.mode },
    { k: "subjects" as const, label: COPY.subjects },
  ].filter((f) => bi(course, f.k, lang));
  const syllabus = withText(course.syllabus, "title");
  const material = (course.material || []).filter((m) => m.trim());
  const instalments = withText(course.instalments, "label");
  const inclusions = (course.inclusions || []).filter((m) => m.trim());
  const teachers = withText(site.faculty, "name").filter((f) => (course.facultyNames || []).includes(f.name));
  const results = withText(site.results, "achievement").filter((r) => r.courseName && r.courseName.trim() === course.name.trim());
  const faq = withText(course.faq, "title");
  const siblings = (site.courses || []).filter((c) => c !== course && c.name);

  return (
    <>
      <Helmet><title>{`${name} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        eyebrow={[bi(course, "level", lang), course.category].filter(Boolean).join("  ·  ") || undefined}
        title={name}
        lead={<Bi of={course} k="detail" />}
        crumbs={[
          { label: tr(SHELL_COPY.home, lang), href: ctx.href("home") },
          { label: tr(COPY.courses, lang), href: coursesHref },
          { label: name },
        ]}
      >
        {bi(course, "batchStarts", lang) && (
          <p className="mt-4 inline-flex rounded-full border border-current px-3 py-1 text-sm font-semibold">
            {trf(COPY.nextBatch, lang, { date: bi(course, "batchStarts", lang) })}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {demoHref && <Action href={demoHref}>{tr(SHELL_COPY.bookDemo, lang)}</Action>}
          {coursesHref && <Action href={coursesHref} tone="ghost">{tr(SHELL_COPY.coursesAndFees, lang)}</Action>}
        </div>
      </PageHead>

      {(bi(course, "level", lang) || bi(course, "eligibility", lang)) && (
        <Section n={++n} title={tr(COPY.who, lang)}>
          <Bi of={course} k="level" as="p" className="text-lg font-semibold" />
          {bi(course, "eligibility", lang) && (
            <p className="mt-2 max-w-prose"><span className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.eligibility, lang)}: </span><Bi of={course} k="eligibility" /></p>
          )}
        </Section>
      )}

      {(facts.length > 0 || course.seats) && (
        <Section n={++n} title={tr(facts.some((f) => f.k === "timings") ? COPY.facts : COPY.factsNoTime, lang)}>
          <FactTable rows={[
            ...facts.map((f) => ({ label: tr(f.label, lang), value: <Bi of={course} k={f.k} /> })),
            ...(course.seats ? [{ label: tr(COPY.batch, lang), value: course.seats }] : []),
          ]} />
        </Section>
      )}

      {(syllabus.length > 0 || material.length > 0 || bi(course, "testPlan", lang)) && (
        <Section n={++n} title={tr(COPY.syllabus, lang)}>
          {syllabus.length > 0 && (
            <div className="max-w-3xl">
              {syllabus.map((u, i) => <Accordion key={i} title={<Bi of={u} k="title" />}><Bi of={u} k="body" as="p" /></Accordion>)}
            </div>
          )}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {material.length > 0 && (
              <div>
                <p className="font-semibold">{tr(COPY.material, lang)}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">{material.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            {bi(course, "testPlan", lang) && (
              <div>
                <p className="font-semibold">{tr(COPY.tests, lang)}</p>
                <Bi of={course} k="testPlan" as="p" className="mt-2" />
              </div>
            )}
          </div>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.fee, lang)}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.feeTotal, lang)}</p>
            <p className="ds-display ds-num mt-1 text-3xl">{fee || tr(COPY.feeOnCall, lang)}</p>
            <Bi of={course} k="feeNote" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
            {instalments.length > 0 && (
              <>
                <p className="mt-5 font-semibold">{tr(COPY.instalments, lang)}</p>
                <ul className="mt-2 divide-y divide-[hsl(var(--ds-line))]">
                  {instalments.map((r, i) => (
                    <li key={i} className="flex justify-between gap-4 py-2">
                      <span><Bi of={r} k="label" /> <Bi of={r} k="note" className="text-[hsl(var(--ds-ink-soft))]" /></span>
                      <span className="ds-num font-semibold">{demoFee(r.amount, site.currency)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          {(inclusions.length > 0 || bi(course, "refundNote", lang)) && (
            <Card>
              {inclusions.length > 0 && (
                <>
                  <p className="font-semibold">{tr(COPY.includes, lang)}</p>
                  <ul className="mt-2 space-y-1">{inclusions.map((m) => <li key={m} className="flex gap-2"><span aria-hidden="true">✓</span>{m}</li>)}</ul>
                </>
              )}
              <Bi of={course} k="refundNote" as="p" className="mt-4" />
              {ctx.href("fees-and-refunds") && <SiteLink to={ctx.href("fees-and-refunds")!} className="mt-2 inline-block underline">{tr(COPY.refundPolicy, lang)}</SiteLink>}
            </Card>
          )}
        </div>
      </Section>

      {teachers.length > 0 && (
        <Section n={++n} title={tr(COPY.faculty, lang)}>
          <CardGrid cols={3}>
            {teachers.map((f, i) => (
              <Reveal key={f.name} index={i}>
                <Card interactive className="flex h-full gap-4">
                  {f.photo && f.photoConsent
                    ? <img src={f.photo} alt={f.name} loading="lazy" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                    : <Monogram size="sm" name={f.name} className="shrink-0" />}
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <Bi of={f} k="subject" as="p" className="text-sm text-[hsl(var(--ds-accent))]" />
                    <Bi of={f} k="qualification" as="p" className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]" />
                    <Bi of={f} k="experience" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
                  </div>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      {results.length > 0 && (
        <Section n={++n} title={tr(COPY.results, lang)}>
          <SampleNote block="results" className="mb-6" />
          <CardGrid cols={3}>
            {results.map((r, i) => (
              <Reveal key={i} index={i}>
                <Card className="h-full">
                  <Bi of={r} k="achievement" as="p" className="ds-display ds-num text-2xl" />
                  <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{[r.exam, r.year].filter(Boolean).join(" ")}</p>
                  {r.consent && r.studentName && <p className="mt-2 font-semibold">{r.studentName}</p>}
                  {/* CCPA 2024: course taken, its duration, and whether it was paid, at body size. */}
                  <p className="mt-2 text-sm">
                    {[bi(r, "courseName", lang), r.courseDuration,
                      r.paid ? tr(r.paid === "paid" ? COPY.paid : r.paid === "scholarship" ? COPY.scholarship : COPY.free, lang) : ""]
                      .filter(Boolean).join(", ")}
                  </p>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
          <Bi of={site} k="resultsNote" as="p" className="mt-4 text-[hsl(var(--ds-ink-soft))]" />
        </Section>
      )}

      {faq.length > 0 && (
        <Section n={++n} title={tr(COPY.faq, lang)}>
          <div className="max-w-3xl">
            {faq.map((f, i) => <Accordion key={i} title={<Bi of={f} k="title" />}><Bi of={f} k="body" as="p" /></Accordion>)}
          </div>
        </Section>
      )}

      {siblings.length > 0 && (
        <Section n={++n} title={tr(COPY.more, lang)}>
          <ul className="flex flex-wrap gap-3">
            {siblings.map((c) => {
              const to = ctx.href("course", courseSlug(c));
              return to ? (
                <li key={to}><SiteLink to={to} className="ds-btn ds-btn-ghost">{bi(c, "name", lang)}</SiteLink></li>
              ) : null;
            })}
          </ul>
        </Section>
      )}
    </>
  );
}

/**
 * FEES, REFUNDS AND DISCLOSURE. /fees-and-refunds  (a still page)
 * The coaching equivalent of the CBSE Mandatory Disclosure: what the MoE
 * Guidelines 2024 ask a centre's website to carry, and what the Rajasthan
 * Coaching Centres Act 2025 asks of fees in Kota.
 *
 *   fees       every course's fee in one table (a cleared fee prints "Fee
 *              on call"), with duration
 *   pay        instalments, payment modes, receipts, no mid-course increase
 *   refund     the pro-rata refund policy (always present: it is the page's
 *              minimum-data test), hostel and mess refunds when given
 *   counts     students coached and succeeded, with the year
 *   teachers   tutor qualifications, from the faculty list
 */

import { Helmet } from "react-helmet-async";
import { bi, biList, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { demoFee } from "@/lib/demo/record";
import { DataTable } from "@/lib/demo/ui/coaching/Table";
import { PageHead } from "../kit/Hero";
import { FactTable, Section } from "../kit/Section";
import { Bi } from "../kit/Text";

const COPY = {
  title: { en: "Fees, refunds and disclosure", hi: "फीस, रिफंड और जानकारी" },
  lead: { en: "The fee for every course, how to pay it, and how a refund works, in writing before you join.", hi: "हर कोर्स की फीस, भरने का तरीका और रिफंड कैसे मिलता है, जॉइन करने से पहले लिखित में।" },
  fees: { en: "Course fees", hi: "कोर्स की फीस" },
  course: { en: "Course", hi: "कोर्स" },
  duration: { en: "Duration", hi: "अवधि" },
  fee: { en: "Fee", hi: "फीस" },
  note: { en: "Note", hi: "नोट" },
  feeOnCall: { en: "Fee on call, printed on the receipt", hi: "फीस फ़ोन पर, रसीद पर लिखी होगी" },
  pay: { en: "Paying the fee", hi: "फीस भरना" },
  instalments: { en: "Instalments", hi: "किस्तें" },
  modes: { en: "Payment modes", hi: "भुगतान के तरीके" },
  receipts: { en: "Receipts", hi: "रसीद" },
  noIncrease: { en: "During the course", hi: "कोर्स के दौरान" },
  refund: { en: "Refunds", hi: "रिफंड" },
  hostel: { en: "Hostel and mess", hi: "हॉस्टल और मेस" },
  counts: { en: "Students coached and succeeded", hi: "पढ़ाए गए और सफल छात्र" },
  coached: { en: "Students coached", hi: "पढ़ाए गए छात्र" },
  succeeded: { en: "Students who succeeded", hi: "सफल छात्र" },
  year: { en: "Year", hi: "साल" },
  teachers: { en: "Teachers' qualifications", hi: "टीचर्स की योग्यता" },
  name: { en: "Teacher", hi: "टीचर" },
  subject: { en: "Subject", hi: "विषय" },
  qualification: { en: "Qualification", hi: "योग्यता" },
} satisfies Record<string, Bilingual>;

export default function FeesPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const fp = site.feesPolicy;
  const courses = withText(site.courses, "name");
  const faculty = withText(site.faculty, "name").filter((f) => bi(f, "qualification", lang));
  const modes = biList(fp, "paymentModes", lang);
  const payRows = [
    ...(bi(fp, "instalmentNote", lang) ? [{ label: tr(COPY.instalments, lang), value: <Bi of={fp} k="instalmentNote" /> }] : []),
    ...(modes.length ? [{ label: tr(COPY.modes, lang), value: modes.join(", ") }] : []),
    ...(bi(fp, "receipts", lang) ? [{ label: tr(COPY.receipts, lang), value: <Bi of={fp} k="receipts" /> }] : []),
    ...(bi(fp, "noIncrease", lang) ? [{ label: tr(COPY.noIncrease, lang), value: <Bi of={fp} k="noIncrease" /> }] : []),
  ];
  let n = 0;

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={bi(fp, "intro", lang) ? <Bi of={fp} k="intro" /> : tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />

      {courses.length > 0 && (
        <Section n={++n} title={tr(COPY.fees, lang)}>
          <DataTable
            caption={tr(COPY.fees, lang)}
            head={[tr(COPY.course, lang), tr(COPY.duration, lang), tr(COPY.fee, lang), tr(COPY.note, lang)]}
            rows={courses.map((c) => [bi(c, "name", lang), bi(c, "duration", lang), demoFee(c.fee, site.currency) || tr(COPY.feeOnCall, lang), bi(c, "feeNote", lang)])}
          />
        </Section>
      )}

      {payRows.length > 0 && (
        <Section n={++n} title={tr(COPY.pay, lang)}>
          <FactTable rows={payRows} />
        </Section>
      )}

      <Section n={++n} title={tr(COPY.refund, lang)}>
        <Bi of={fp} k="refund" as="p" className="max-w-[68ch] whitespace-pre-line text-lg" />
        {bi(fp, "hostel", lang) && (
          <>
            <p className="mt-6 font-semibold">{tr(COPY.hostel, lang)}</p>
            <Bi of={fp} k="hostel" as="p" className="mt-1 max-w-[68ch] whitespace-pre-line" />
          </>
        )}
      </Section>

      {(fp?.studentsCoached || fp?.studentsSucceeded) && (
        <Section n={++n} title={tr(COPY.counts, lang)}>
          <FactTable rows={[
            ...(fp?.countsYear ? [{ label: tr(COPY.year, lang), value: bi(fp, "countsYear", lang) }] : []),
            ...(fp?.studentsCoached ? [{ label: tr(COPY.coached, lang), value: <span className="ds-num">{fp.studentsCoached}</span> }] : []),
            ...(fp?.studentsSucceeded ? [{ label: tr(COPY.succeeded, lang), value: <span className="ds-num">{fp.studentsSucceeded}</span> }] : []),
          ]} />
        </Section>
      )}

      {faculty.length > 0 && (
        <Section n={++n} title={tr(COPY.teachers, lang)}>
          <DataTable
            caption={tr(COPY.teachers, lang)}
            head={[tr(COPY.name, lang), tr(COPY.subject, lang), tr(COPY.qualification, lang)]}
            rows={faculty.map((f) => [f.name, bi(f, "subject", lang), bi(f, "qualification", lang)])}
          />
        </Section>
      )}
    </>
  );
}

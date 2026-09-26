/**
 * CBSE MANDATORY PUBLIC DISCLOSURE (Appendix IX), a still page: no motion.
 * Exists only for a CBSE school with an affiliation number (pages.ts).
 *
 * The five sections and every row label are ours (lib/demo/site/disclosure.ts);
 * the record holds values. A row's value comes from, in order: the typed
 * disclosure row; a fact already in the record (name, address, principal,
 * email, phone; PGT/TGT/PRT counts from faculty groups); else "To be
 * uploaded". A required row is never hidden: hiding it reads as concealment.
 * Section D is followed by the Class X and XII result tables (three years)
 * from boardResults. A print button prints the tables alone.
 */

import { ExternalLink, Printer } from "lucide-react";
import type { ReactNode } from "react";
import type { DemoSite } from "@/lib/cms/types";
import { tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { APPENDIX_IX, derivedStaffCounts } from "@/lib/demo/site/disclosure";
import { clean, demoDateIn } from "@/lib/demo/ui/school/shared";
import { PageHead } from "../kit/Hero";
import { SampleNote } from "../kit/SampleNote";
import { Section } from "../kit/Section";

const COPY = {
  title: { en: "Mandatory Public Disclosure", hi: "अनिवार्य सार्वजनिक जानकारी" },
  lead: { en: "Published as CBSE requires under Appendix IX of the Affiliation Bye-Laws.", hi: "CBSE Affiliation Bye-Laws के Appendix IX के अनुसार प्रकाशित।" },
  section: { en: "Section {id}", hi: "भाग {id}" },
  item: { en: "Information", hi: "जानकारी" },
  details: { en: "Details", hi: "विवरण" },
  view: { en: "View document", hi: "डॉक्यूमेंट देखें" },
  print: { en: "Print this page", hi: "यह पेज प्रिंट करें" },
  results: { en: "Board results, last three years", hi: "पिछले तीन साल के बोर्ड रिज़ल्ट" },
  classResults: { en: "Class {c}", hi: "क्लास {c}" },
  colYear: { en: "Year", hi: "साल" },
  colReg: { en: "Registered", hi: "रजिस्टर्ड" },
  colPassed: { en: "Passed", hi: "पास" },
  colPct: { en: "Pass %", hi: "पास %" },
  colNote: { en: "Remarks", hi: "टिप्पणी" },
  annual: { en: "Annual report", hi: "सालाना रिपोर्ट" },
  annualBody: { en: "The school's annual report, published by 15 September each year.", hi: "स्कूल की सालाना रिपोर्ट, हर साल 15 सितंबर तक प्रकाशित।" },
} satisfies Record<string, Bilingual>;

/** Values the record already holds, for rows nobody has typed. */
function known(site: DemoSite): Record<string, string> {
  const c = site.contact || {};
  return {
    "school-name": site.instituteName || "",
    address: clean(c.addressLines).join(", "),
    principal: [site.principalName].filter(Boolean).join(""),
    "principal-staff": site.principalName || "",
    email: c.email || "",
    phone: c.phone || "",
    ...derivedStaffCounts(site),
  };
}

const th = "py-3 pr-4 text-left text-sm font-semibold text-[hsl(var(--ds-ink-soft))]";

/** "99.3" or "99.3%" -> "99.3%": the record may type the sign or not. */
const pct = (v?: string) => `${(v || "").trim().replace(/\s*%$/, "")}%`;

export default function DisclosurePage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const rows = site.disclosure?.rows || {};
  const fallback = known(site);
  const board = (site.boardResults || []).filter((b) => (b.year || "").trim());
  const classes = ["X", "XII"].filter((c) => board.some((b) => b.className.trim().toUpperCase() === c));
  const updated = site.disclosure?.lastUpdated;
  const annual = (site.disclosure?.annualReportUrl || "").trim();
  let n = 0;

  const value = (id: string, shape: "text" | "document"): ReactNode => {
    const typed = rows[id];
    const text = (typed?.value || "").trim() || (shape === "text" ? (fallback[id] || "").trim() : "");
    const url = (typed?.url || "").trim();
    if (!text && !url) return <span className="text-[hsl(var(--ds-ink-soft))]">{tr(SHELL_COPY.toBeUploaded, lang)}</span>;
    return (
      <>
        {text && <span className="ds-num">{text}</span>}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 font-semibold underline underline-offset-4 ${text ? "ml-3" : ""}`}>
            {tr(COPY.view, lang)}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </>
    );
  };

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}>
        <div className="mt-5 flex flex-wrap items-center gap-4 print:hidden">
          <button type="button" onClick={() => window.print()} className="ds-btn ds-btn-ghost"><Printer className="h-4 w-4" aria-hidden="true" />{tr(COPY.print, lang)}</button>
          {updated && <span className="ds-num text-sm opacity-80">{trf(SHELL_COPY.lastUpdated, lang, { date: demoDateIn(updated, site.market, lang) })}</span>}
        </div>
      </PageHead>

      {APPENDIX_IX.map((sec) => (
        <Section key={sec.id} n={++n} eyebrow={trf(COPY.section, lang, { id: sec.id })} title={tr(sec.title, lang)}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse sm:min-w-[480px]">
              <thead><tr className="border-b-2 border-[hsl(var(--ds-ink)/0.7)]"><th scope="col" className={`${th} w-8 sm:w-12`}>#</th><th scope="col" className={th}>{tr(COPY.item, lang)}</th><th scope="col" className={th}>{tr(COPY.details, lang)}</th></tr></thead>
              <tbody>
                {sec.rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-[hsl(var(--ds-line))] align-top">
                    <td className="ds-num py-3 pr-4 text-sm text-[hsl(var(--ds-ink-soft))]">{i + 1}</td>
                    <th scope="row" className="py-3 pr-4 text-left font-medium">{tr(r.label, lang)}</th>
                    <td className="py-3 pr-0 [overflow-wrap:anywhere] sm:pr-4">{value(r.id, r.shape)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sec.id === "D" && classes.length > 0 && <SampleNote block="results" className="mt-6" />}
          {sec.id === "D" && classes.length > 0 && (
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              {classes.map((c) => (
                <div key={c} className="min-w-0">
                  <p className="ds-display mb-3 text-lg break-words">{tr(COPY.results, lang)}: {trf(COPY.classResults, lang, { c })}</p>
                  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[440px] border-collapse">
                    <thead><tr className="border-b-2 border-[hsl(var(--ds-ink)/0.7)]">{[COPY.colYear, COPY.colReg, COPY.colPassed, COPY.colPct, COPY.colNote].map((h, i) => <th key={i} scope="col" className={th}>{tr(h, lang)}</th>)}</tr></thead>
                    <tbody>
                      {board.filter((b) => b.className.trim().toUpperCase() === c).sort((a, b) => (a.year < b.year ? 1 : -1)).slice(0, 3).map((b) => (
                        <tr key={b.year} className="ds-num border-b border-[hsl(var(--ds-line))]">
                          <td className="py-3 pr-4">{b.year}</td><td className="py-3 pr-4">{b.registered || tr(SHELL_COPY.toBeUploaded, lang)}</td>
                          <td className="py-3 pr-4">{b.passed || tr(SHELL_COPY.toBeUploaded, lang)}</td><td className="py-3 pr-4 font-semibold">{b.passPercent ? `${pct(b.passPercent)}` : tr(SHELL_COPY.toBeUploaded, lang)}</td>
                          <td className="py-3 pr-4 text-sm">{b.note || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      ))}

      <Section n={++n} title={tr(COPY.annual, lang)} lead={tr(COPY.annualBody, lang)}>
        {annual ? (
          <a href={annual} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-brand">{tr(COPY.view, lang)}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
        ) : <p className="text-[hsl(var(--ds-ink-soft))]">{tr(SHELL_COPY.toBeUploaded, lang)}</p>}
      </Section>
    </>
  );
}

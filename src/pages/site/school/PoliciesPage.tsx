/**
 * SCHOOL POLICIES, a still page: no motion. A short contents list, then each
 * policy printed in full (a policy hidden behind a click reads as something
 * to hide), with a link to the full document when one exists. Child
 * safeguarding is expected here and in the footer; the page shows only the
 * policies the record lists.
 */

import { ExternalLink } from "lucide-react";
import { hasBi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { slugify } from "@/lib/demo/site/context";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Bi } from "../kit/Text";

const COPY = {
  title: { en: "Policies", hi: "नीतियाँ" },
  lead: { en: "The rules the school holds itself to, in plain words.", hi: "School जिन नियमों का पालन करता है, सीधे शब्दों में।" },
  contents: { en: "On this page", hi: "इस पेज पर" },
  email: { en: "Email the office", hi: "Office को email करें" },
  full: { en: "Read the full policy", hi: "पूरी नीति पढ़ें" },
  questions: { en: "Questions about a policy", hi: "किसी नीति पर सवाल" },
  questionsBody: { en: "Write to or call the school office. The office will answer in writing when you ask.", hi: "School office को लिखें या call करें। आप माँगें तो office लिखकर जवाब देगा।" },
} satisfies Record<string, Bilingual>;

export default function PoliciesPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const policies = (site.policies || []).filter((p) => hasBi(p, "title") && (hasBi(p, "body") || (p.url || "").trim()));
  const id = (t: string, i: number) => `policy-${slugify(t) || i}`;
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {policies.length > 2 && (
        <Section n={++n} title={tr(COPY.contents, lang)}>
          <ol className="grid gap-2 sm:grid-cols-2">
            {policies.map((p, i) => (
              <li key={i}><a href={`#${id(p.title, i)}`} className="flex min-h-[44px] items-center gap-3 font-semibold underline-offset-4 hover:underline">
                <span className="ds-num text-sm text-[hsl(var(--ds-accent))]">{String(i + 1).padStart(2, "0")}</span><Bi of={p} k="title" />
              </a></li>
            ))}
          </ol>
        </Section>
      )}

      {policies.map((p, i) => (
        <Section key={i} id={id(p.title, i)} n={++n} title={<Bi of={p} k="title" />}>
          <Bi of={p} k="body" as="p" className="max-w-prose whitespace-pre-line text-lg leading-relaxed" />
          {(p.url || "").trim() && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 font-semibold underline underline-offset-4">
              {tr(COPY.full, lang)}<ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </Section>
      ))}

      <Section n={++n} title={tr(COPY.questions, lang)}>
        <p className="max-w-prose text-lg">{tr(COPY.questionsBody, lang)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {ctx.actions.tel && <a className="ds-btn ds-btn-brand" href={ctx.actions.tel}>{tr(SHELL_COPY.call, lang)}</a>}
          {ctx.actions.email && <a className="ds-btn ds-btn-ghost" href={ctx.actions.email}>{tr(COPY.email, lang)}</a>}
        </div>
      </Section>
    </>
  );
}

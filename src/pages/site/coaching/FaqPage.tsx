/**
 * FAQS. /faq
 *
 *   Questions grouped by their `group` (Fees, Batches, Hostel, Eligibility),
 *   each group an accordion list. Ungrouped questions sit under "General".
 *   A closing line routes the reader who still has a question to WhatsApp
 *   or Call.
 */

import { Helmet } from "react-helmet-async";
import { bi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Accordion, Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Questions parents ask", hi: "अभिभावक जो सवाल पूछते हैं" },
  crumb: { en: "FAQs", hi: "सवाल-जवाब" },
  general: { en: "General", hi: "सामान्य" },
  still: { en: "Still have a question?", hi: "अभी भी कोई सवाल है?" },
} satisfies Record<string, Bilingual>;

export default function FaqPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const faq = withText(site.faq, "title");
  const groups: { name: string; items: typeof faq }[] = [];
  for (const f of faq) {
    const name = bi(f, "group", lang) || tr(COPY.general, lang);
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(f);
    else groups.push({ name, items: [f] });
  }
  const single = groups.length === 1;

  return (
    <>
      <Helmet><title>{`${tr(COPY.crumb, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.crumb, lang) }]}
      />
      {groups.map((g, i) => (
        <Section key={g.name} n={i + 1} title={single ? tr(COPY.crumb, lang) : g.name}>
          <div className="max-w-3xl">
            {g.items.map((f, j) => <Accordion key={j} title={<Bi of={f} k="title" />}><Bi of={f} k="body" as="p" className="whitespace-pre-line" /></Accordion>)}
          </div>
        </Section>
      ))}
      {(ctx.actions.whatsapp || ctx.actions.tel) && (
        <Section n={groups.length + 1} title={tr(COPY.still, lang)} tone="tint">
          <div className="flex flex-wrap gap-3">
            {ctx.actions.whatsapp && <Action href={ctx.actions.whatsapp}>{tr(C_COPY.askWhatsapp, lang)}</Action>}
            {ctx.actions.tel && <Action href={ctx.actions.tel} tone="ghost">{tr(C_COPY.call, lang)}</Action>}
          </div>
        </Section>
      )}
    </>
  );
}

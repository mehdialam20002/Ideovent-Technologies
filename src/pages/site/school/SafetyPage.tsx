/**
 * SAFETY AND CARE (the play school's most-read page after admissions).
 * The record's safety points, grouped by `group` (Arrival and pickup, Staff,
 * Health, Premises...), then the parent-facing links: the CCTV or app access
 * the school offers (portalLinks), and the contact. Our copy states no fact
 * about the school; every claim on this page is the record's own.
 */

import { ArrowUpRight } from "lucide-react";
import { tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { groupPoints, PointCards } from "@/lib/demo/ui/school/points";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Safety and care", hi: "सुरक्षा और देखभाल" },
  lead: { en: "How children are looked after from the gate in the morning to pickup.", hi: "सुबह गेट से लेकर पिकअप तक बच्चों की देखभाल कैसे होती है।" },
  group: { en: "Every day", hi: "रोज़" },
  apps: { en: "Stay in touch during the day", hi: "दिन में जुड़े रहें" },
  ask: { en: "Ask us anything about safety", hi: "सुरक्षा के बारे में कुछ भी पूछें" },
} satisfies Record<string, Bilingual>;

export default function SafetyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const groups = groupPoints(site.safety, lang, tr(COPY.group, lang));
  const apps = withText(site.portalLinks, "label").filter((l) => (l.url || "").trim());
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {groups.map((g) => (
        <Section key={g.name} n={++n} title={g.name}><PointCards items={g.items} /></Section>
      ))}

      {apps.length > 0 && (
        <Section n={++n} title={tr(COPY.apps, lang)}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {apps.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="ds-card flex items-start justify-between gap-4 p-5" data-interactive="">
                  <span><Bi of={l} k="label" className="block font-semibold" /><Bi of={l} k="note" className="mt-1 block text-sm text-[hsl(var(--ds-ink-soft))]" /></span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.ask, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.actions.tel && <Action href={ctx.actions.tel}>{tr(SHELL_COPY.call, lang)}</Action>}
          {ctx.actions.whatsapp && <Action href={ctx.actions.whatsapp} tone="ghost">{tr(SHELL_COPY.whatsapp, lang)}</Action>}
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!} tone="ghost">{tr(SHELL_COPY.applyNow, lang)}</Action>}
        </div>
      </Section>
    </>
  );
}

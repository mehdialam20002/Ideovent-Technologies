/**
 * SCHOOL PARENTS. Links, never a login form: the portal cards open the
 * school's REAL portal or app in a new tab, and there is nothing here that
 * collects a password. Sections, each only with data:
 *   portal     portal and app links (portalLinks with a URL)
 *   calendar   the academic calendar (academics.calendar)
 *   downloads  forms, lists and circulars, grouped (downloads with a URL)
 *   more       links to the notice board and transport, when those pages exist
 */

import { ArrowUpRight, FileDown } from "lucide-react";
import type { DemoDownload } from "@/lib/cms/types";
import { bi, hasBi, tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { Timeline } from "@/lib/demo/ui/school/Timeline";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "For parents", hi: "अभिभावकों के लिए" },
  lead: { en: "The portal, the calendar and the forms, in one place.", hi: "पोर्टल, कैलेंडर और फ़ॉर्म, एक ही जगह।" },
  portal: { en: "Portal and app", hi: "पोर्टल और ऐप" },
  portalNote: { en: "These open the school's own portal in a new tab. This website never asks for your password.", hi: "ये स्कूल का अपना पोर्टल नए टैब में खोलते हैं। यह वेबसाइट कभी आपका पासवर्ड नहीं माँगती।" },
  calendar: { en: "Academic calendar", hi: "एकेडमिक कैलेंडर" },
  downloads: { en: "Forms and downloads", hi: "फ़ॉर्म और डाउनलोड" },
  other: { en: "Other", hi: "अन्य" },
  more: { en: "Also useful", hi: "यह भी काम का" },
} satisfies Record<string, Bilingual>;

export default function ParentsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const portals = withText(site.portalLinks, "label").filter((l) => (l.url || "").trim());
  const calendar = withText(site.academics?.calendar, "title");
  const downloads = withText(site.downloads, "label").filter((d) => (d.url || "").trim());
  const groups = new Map<string, DemoDownload[]>();
  for (const d of downloads) {
    const g = bi(d, "group", lang) || tr(COPY.other, lang);
    groups.set(g, [...(groups.get(g) || []), d]);
  }
  const more = (["news", "transport", "academics", "policies"] as const)
    .map((id) => ({ id, href: ctx.href(id), def: ctx.pages.find((p) => p.id === id) }))
    .filter((m) => m.href && m.def);
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {portals.length > 0 && (
        <Section n={++n} title={tr(COPY.portal, lang)} lead={tr(COPY.portalNote, lang)}>
          <CardGrid cols={portals.length === 2 ? 2 : 3}>
            {portals.map((l, i) => (
              <Reveal key={l.url} index={i}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="ds-card flex h-full items-start justify-between gap-4 p-5" data-interactive="">
                  <span>
                    {l.audience && <Bi of={l} k="audience" as="span" className="block text-sm font-semibold text-[hsl(var(--ds-accent))]" />}
                    <Bi of={l} k="label" className="ds-display block text-lg leading-snug" />
                    <Bi of={l} k="note" as="span" className="mt-1 block text-sm text-[hsl(var(--ds-ink-soft))]" />
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                </a>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      {calendar.length > 0 && (
        <Section n={++n} title={tr(COPY.calendar, lang)}>
          <Timeline steps={calendar.map((d, i) => ({ key: String(i), date: <Bi of={d} k="date" />, title: <Bi of={d} k="title" />, body: hasBi(d, "body") ? <Bi of={d} k="body" /> : undefined }))} />
        </Section>
      )}

      {downloads.length > 0 && (
        <Section n={++n} title={tr(COPY.downloads, lang)}>
          <div className="grid gap-8 md:grid-cols-2">
            {[...groups.entries()].map(([g, list]) => (
              <div key={g}>
                {groups.size > 1 && <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{g}</p>}
                <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
                  {list.map((d) => (
                    <li key={d.url}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[52px] items-center gap-3 py-2 font-semibold underline-offset-4 hover:underline">
                        <FileDown className="h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" /><Bi of={d} k="label" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {more.length > 0 && (
        <Section n={++n} title={tr(COPY.more, lang)}>
          <div className="flex flex-wrap gap-3">
            {more.map((m) => <Action key={m.id} href={m.href!} tone="ghost">{tr(m.def!.label, lang)}</Action>)}
          </div>
        </Section>
      )}
    </>
  );
}

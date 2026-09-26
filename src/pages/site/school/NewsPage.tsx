/**
 * SCHOOL NOTICES AND EVENTS: one expiry-aware board. A notice disappears the
 * day after its `expires` date, so the page can never show a stale
 * "Admissions open 2024-25". Pinned first, then newest. Tabs split Notices
 * and Events when both exist (FLIP on change). A "Last updated" line is set
 * from the newest `posted` date, only when one is typed. No ticker, no
 * marquee, no pop-up.
 */

import { useState } from "react";
import { ExternalLink, Pin } from "lucide-react";
import { demoDate } from "@/lib/demo/record";
import { hasBi, tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { FilterChips, useFlipList } from "@/lib/demo/ui/school/filter";
import { lastPosted, sortedNotices } from "@/lib/demo/ui/school/shared";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Notices and events", hi: "सूचनाएँ और कार्यक्रम" },
  lead: { en: "Everything current, newest first. Old notices come down on their own.", hi: "जो अभी लागू है, नया सबसे ऊपर। पुरानी सूचनाएँ अपने आप हट जाती हैं।" },
  board: { en: "The board", hi: "Notice board" },
  all: { en: "All", hi: "सभी" },
  notices: { en: "Notices", hi: "सूचनाएँ" },
  events: { en: "Events", hi: "कार्यक्रम" },
  filter: { en: "Show notices or events", hi: "सूचनाएँ या कार्यक्रम" },
  pinned: { en: "Pinned", hi: "ज़रूरी" },
  until: { en: "Until {date}", hi: "{date} तक" },
  more: { en: "Read the full notice", hi: "पूरी सूचना पढ़ें" },
  parents: { en: "For parents", hi: "अभिभावकों के लिए" },
} satisfies Record<string, Bilingual>;

export default function NewsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const list = sortedNotices(site, ctx.today).map((x, i) => ({ x, k: `n${i}-${x.title.slice(0, 16)}`, kind: x.kind === "event" ? "event" : "notice" }));
  const hasEvents = list.some((v) => v.kind === "event");
  const hasNotices = list.some((v) => v.kind === "notice");
  const [tab, setTab] = useState("all");
  const flip = useFlipList<HTMLOListElement>();
  const shown = list.filter((v) => tab === "all" || v.kind === tab);
  const updated = lastPosted(list.map((v) => v.x));
  const choose = (t: string) => {
    if (t === tab) return;
    flip.run(() => setTab(t), (k) => list.some((v) => v.k === k && (t === "all" || v.kind === t)));
  };
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}>
        {updated && <p className="ds-num mt-4 text-sm opacity-80">{trf(SHELL_COPY.lastUpdated, lang, { date: demoDate(updated, site.market) })}</p>}
      </PageHead>

      {list.length > 0 && (
        <Section n={++n} title={tr(COPY.board, lang)}>
          {hasEvents && hasNotices && (
            <div className="mb-6">
              <FilterChips label={tr(COPY.filter, lang)} value={tab} onChange={choose} options={[
                { id: "all", label: tr(COPY.all, lang), count: list.length },
                { id: "notice", label: tr(COPY.notices, lang), count: list.filter((v) => v.kind === "notice").length },
                { id: "event", label: tr(COPY.events, lang), count: list.filter((v) => v.kind === "event").length },
              ]} />
            </div>
          )}
          <ol ref={flip.ref} className="grid gap-4">
            {shown.map(({ x, k, kind }) => (
              <li key={k} data-k={k} className="ds-card grid gap-2 p-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <div className="flex flex-wrap items-center gap-2 sm:block">
                  <p className="ds-num font-semibold text-[hsl(var(--ds-accent))]">{hasBi(x, "date") ? <Bi of={x} k="date" /> : x.posted ? demoDate(x.posted, site.market) : ""}</p>
                  <p className="text-sm text-[hsl(var(--ds-ink-soft))] sm:mt-1">{tr(kind === "event" ? COPY.events : COPY.notices, lang)}</p>
                  {x.pinned && <p className="inline-flex items-center gap-1 text-sm font-semibold sm:mt-1"><Pin className="h-3.5 w-3.5" aria-hidden="true" />{tr(COPY.pinned, lang)}</p>}
                </div>
                <div>
                  <Bi of={x} k="title" as="h3" className="ds-display text-xl leading-snug" />
                  <Bi of={x} k="body" as="p" className="mt-2 max-w-prose text-[hsl(var(--ds-ink-soft))]" />
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    {x.expires && <span className="ds-num text-[hsl(var(--ds-ink-soft))]">{trf(COPY.until, lang, { date: demoDate(x.expires, site.market) })}</span>}
                    {(x.url || "").trim() && (
                      <a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
                        {tr(COPY.more, lang)}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.parents, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          {ctx.href("parents") && <Action href={ctx.href("parents")!} tone="ghost">{tr(ctx.pages.find((p) => p.id === "parents")!.label, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}

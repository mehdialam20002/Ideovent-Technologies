/**
 * SCHOOL FACULTY. The people, grouped the way the CBSE disclosure counts them
 * (Leadership, PGT, TGT, PRT, or any group the record types), with filter
 * chips when there is more than one group. The filter FLIPs (motion "full").
 *   head      the head of school, when the record names one
 *   people    every teacher, in the family's composition (ui/school/people)
 *   counts    how many in each group, the same numbers the disclosure uses
 */

import { useState } from "react";
import { biLabel, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { FilterChips, useFlipList } from "@/lib/demo/ui/school/filter";
import { People, personKey } from "@/lib/demo/ui/school/people";
import { PageHead } from "../kit/Hero";
import { Section } from "../kit/Section";
import { Action } from "../kit/Text";

const COPY = {
  title: { en: "Our teachers", hi: "हमारे शिक्षक" },
  lead: { en: "Who teaches here, what they teach and for how long.", hi: "यहाँ कौन पढ़ाता है, क्या पढ़ाता है और कितने समय से।" },
  all: { en: "Everyone", hi: "सभी" },
  filter: { en: "Show teachers by group", hi: "ग्रुप के हिसाब से शिक्षक" },
  people: { en: "The staff", hi: "शिक्षक" },
  countLine: { en: "{n} teachers listed", hi: "{n} शिक्षक" },
  other: { en: "Other staff", hi: "अन्य" },
  admissions: { en: "Meet them at a school visit", hi: "स्कूल विज़िट पर मिलें" },
  groupNames: { en: "PGT: post-graduate teachers, Class XI and XII. TGT: trained graduate teachers, Class VI to X. PRT: primary teachers, Class I to V.", hi: "PGT: क्लास XI-XII के शिक्षक। TGT: क्लास VI-X के शिक्षक। PRT: क्लास I-V के शिक्षक।" },
} satisfies Record<string, Bilingual>;

const ORDER = ["LEADERSHIP", "PGT", "TGT", "PRT"];

export default function FacultyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const people = withText(site.faculty, "name");
  const keyed = people.map((p, i) => ({ p, k: personKey(p, i), g: (p.group || "").trim() }));
  const groups = [...new Set(keyed.map((x) => x.g).filter(Boolean))].sort((a, b) => {
    const ia = ORDER.indexOf(a.toUpperCase());
    const ib = ORDER.indexOf(b.toUpperCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const [group, setGroup] = useState("all");
  const flip = useFlipList<HTMLUListElement>();
  const shown = keyed.filter((x) => group === "all" || x.g === group);
  const cbseGroups = groups.some((g) => /^(PGT|TGT|PRT)$/i.test(g));
  let n = 0;

  const options = [
    { id: "all", label: tr(COPY.all, lang), count: keyed.length },
    ...groups.map((g) => ({ id: g, label: biLabel(people, "group", g, lang), count: keyed.filter((x) => x.g === g).length })),
  ];
  const choose = (id: string) => {
    if (id === group) return;
    flip.run(() => setGroup(id), (k) => keyed.some((x) => x.k === k && (id === "all" || x.g === id)));
  };

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {people.length > 0 && (
        <Section n={++n} title={tr(COPY.people, lang)} lead={trf(COPY.countLine, lang, { n: String(people.length) })}>
          {groups.length > 1 && (
            <div className="mb-6">
              <FilterChips label={tr(COPY.filter, lang)} options={options} value={group} onChange={choose} />
              {cbseGroups && <p className="mt-3 max-w-prose text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.groupNames, lang)}</p>}
            </div>
          )}
          <People people={shown.map((x) => x.p)} keys={shown.map((x) => x.k)} listRef={flip.ref} />
        </Section>
      )}

      <Section n={++n} title={tr(COPY.admissions, lang)}>
        <div className="flex flex-wrap gap-3">
          {ctx.href("admissions") && <Action href={ctx.href("admissions")!}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          <Action href={ctx.href("contact") || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}

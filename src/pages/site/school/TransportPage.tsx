/**
 * SCHOOL TRANSPORT. Routes, stops, timings and safety norms, with the
 * transport desk as the one contact: never a driver's name or phone.
 *   routes    a search box ("type your area") that narrows the route list to
 *             routes with a matching stop; each route shows stops in order,
 *             pickup and drop times
 *   safety    the norms the record lists
 *   fees      the transport fee note
 *   desk      the transport desk
 */

import { useState } from "react";
import { Bus, Search } from "lucide-react";
import { bi, biList, hasBi, tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { clean, Str } from "@/lib/demo/ui/school/shared";
import { slotPhoto, WithPhoto } from "@/lib/demo/ui/school/photos";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "School transport", hi: "स्कूल ट्रांसपोर्ट" },
  routes: { en: "Routes and stops", hi: "रूट और स्टॉप" },
  search: { en: "Type your area or stop", hi: "अपना इलाका या स्टॉप लिखें" },
  found: { en: "{n} of {total} routes stop near \"{q}\"", hi: "\"{q}\" के पास {total} में से {n} रूट रुकते हैं" },
  none: { en: "No route lists \"{q}\" yet. Ask the transport desk: new stops are added each session.", hi: "\"{q}\" अभी किसी रूट में नहीं है। ट्रांसपोर्ट डेस्क से पूछें।" },
  pickup: { en: "Morning pickup", hi: "सुबह पिकअप" },
  drop: { en: "Afternoon drop", hi: "दोपहर ड्रॉप" },
  safety: { en: "Safety on the bus", hi: "बस में सुरक्षा" },
  fees: { en: "Transport fees", hi: "ट्रांसपोर्ट फीस" },
  desk: { en: "Transport desk", hi: "ट्रांसपोर्ट डेस्क" },
  deskLead: { en: "For a seat, a change of stop or a timing question.", hi: "सीट, स्टॉप बदलने या समय के सवाल के लिए।" },
} satisfies Record<string, Bilingual>;

export default function TransportPage({ site, ctx }: SitePageProps) {
  const { lang, actions } = ctx;
  const t = site.transport || {};
  const routes = (t.routes || []).filter((r) => (r.name || "").trim());
  const safety = biList(t, "safety", lang);
  const desk = (site.contact?.transportDesk || "").trim();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? routes.filter((r) => `${r.name} ${bi(r, "name", lang)} ${clean(r.stops).join(" ")} ${biList(r, "stops", lang).join(" ")}`.toLowerCase().includes(needle)) : routes;
  let n = 0;

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={<Bi of={t} k="intro" />}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {routes.length > 0 && (
        <Section n={++n} title={tr(COPY.routes, lang)}>
          {routes.length > 2 && (
            <label className="mb-2 flex max-w-md items-center gap-3 rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-4 focus-within:border-[hsl(var(--ds-accent))]">
              <Search className="h-5 w-5 shrink-0 text-[hsl(var(--ds-ink-soft))]" aria-hidden="true" />
              <span className="sr-only">{tr(COPY.search, lang)}</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(COPY.search, lang)}
                className="min-h-[52px] w-full bg-transparent text-base text-[hsl(var(--ds-ink))] outline-none placeholder:text-[hsl(var(--ds-ink-soft))]" />
            </label>
          )}
          {needle && (
            <p className="mb-4 text-sm text-[hsl(var(--ds-ink-soft))]" aria-live="polite">
              {shown.length ? trf(COPY.found, lang, { n: String(shown.length), total: String(routes.length), q: q.trim() }) : trf(COPY.none, lang, { q: q.trim() })}
            </p>
          )}
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {shown.map((r, i) => (
              <Reveal as="li" key={r.name} index={i} className="ds-card p-5">
                <p className="flex items-center gap-2 font-semibold"><Bus className="h-5 w-5 text-[hsl(var(--ds-accent))]" aria-hidden="true" /><Str text={bi(r, "name", lang)} /></p>
                {biList(r, "stops", lang).length > 0 && (
                  <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-[hsl(var(--ds-ink-soft))]">
                    {biList(r, "stops", lang).map((s, j) => (
                      <li key={s} className="flex items-center gap-1">
                        {j > 0 && <span aria-hidden="true">›</span>}
                        <span className={needle && s.toLowerCase().includes(needle) ? "rounded bg-[hsl(var(--ds-cta))] px-1 text-[hsl(var(--ds-on-cta))]" : ""}><Str text={s} /></span>
                      </li>
                    ))}
                  </ol>
                )}
                {(r.pickup || r.drop) && (
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[hsl(var(--ds-line))] pt-3 text-sm">
                    {r.pickup && <div><dt className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.pickup, lang)}</dt><dd className="ds-num font-semibold">{bi(r, "pickup", lang)}</dd></div>}
                    {r.drop && <div><dt className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.drop, lang)}</dt><dd className="ds-num font-semibold">{bi(r, "drop", lang)}</dd></div>}
                  </dl>
                )}
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {safety.length > 0 && (
        <Section n={++n} title={tr(COPY.safety, lang)}>
          <WithPhoto src={slotPhoto(site, "transport")} ratio="3 / 2">
          <ul className={`grid gap-3 ${slotPhoto(site, "transport") ? "" : "sm:grid-cols-2"}`}>
            {safety.map((s, i) => (
              <Reveal as="li" key={s} index={i} className="ds-card flex items-start gap-3 p-4">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" /><Str text={s} />
              </Reveal>
            ))}
          </ul>
          </WithPhoto>
        </Section>
      )}

      {hasBi(t, "feeNote") && (
        <Section n={++n} title={tr(COPY.fees, lang)}>
          <Bi of={t} k="feeNote" as="p" className="max-w-prose text-lg" />
        </Section>
      )}

      <Section n={++n} title={tr(COPY.desk, lang)} lead={tr(COPY.deskLead, lang)}>
        {desk && <Str as="p" text={desk} className="mb-4 text-lg font-semibold" />}
        <div className="flex flex-wrap gap-3">
          {actions.tel && <Action href={actions.tel}>{tr(SHELL_COPY.call, lang)}</Action>}
          {actions.whatsapp && <Action href={actions.whatsapp} tone="ghost">{tr(SHELL_COPY.whatsapp, lang)}</Action>}
          <Action href={ctx.href("contact") || actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}

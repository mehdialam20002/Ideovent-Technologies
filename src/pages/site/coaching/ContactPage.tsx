/**
 * CONTACT. /contact  (a still page: no motion)
 *
 *   actions   Call, WhatsApp, Email: each only when the record has it
 *   address   address lines, the landmark line, hours
 *   map       a static panel until tapped; only then does the map load. The
 *             query comes from the record's map query, else name and city,
 *             so a name-and-city record still has a working map.
 *   branches  other centres with their own address, phone and hours
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { bi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi, Monogram } from "../kit/Text";

const COPY = {
  title: { en: "Visit or call", hi: "मिलने आएँ या कॉल करें" },
  crumb: { en: "Contact", hi: "संपर्क" },
  lead: { en: "Come to the centre and meet the teachers. Call or send a WhatsApp message first and we will keep a time for you.", hi: "सेंटर आएँ और टीचर्स से मिलें। पहले कॉल या WhatsApp करें, हम आपके लिए समय रखेंगे।" },
  reach: { en: "How to reach us", hi: "हम तक कैसे पहुँचें" },
  address: { en: "Address", hi: "पता" },
  landmark: { en: "Landmark", hi: "पहचान" },
  hours: { en: "Hours", hi: "समय" },
  email: { en: "Email", hi: "ईमेल" },
  loadMap: { en: "Show the map", hi: "मैप दिखाएँ" },
  mapNote: { en: "The map loads only when you tap, to save your data.", hi: "आपका डेटा बचाने के लिए मैप टैप करने पर ही लोड होगा।" },
  openMaps: { en: "Open in Google Maps", hi: "Google Maps में खोलें" },
  branches: { en: "Our centres", hi: "हमारे सेंटर" },
} satisfies Record<string, Bilingual>;

export default function ContactPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const c = site.contact || {};
  const [mapOn, setMapOn] = useState(false);
  const lines = [...(c.addressLines || []).filter((l) => l.trim()), site.city].filter(Boolean) as string[];
  const query = (c.mapQuery || "").trim() || [site.instituteName, ...(c.addressLines || []), site.city].filter(Boolean).join(", ");
  const branches = (site.contact?.branches || []).filter((b) => (b.name || "").trim());
  const a = ctx.actions;

  return (
    <>
      <Helmet><title>{`${tr(COPY.crumb, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.crumb, lang) }]}
      >
        {(a.tel || a.whatsapp) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {a.tel && <Action href={a.tel}><Phone className="h-5 w-5" aria-hidden="true" />{tr(SHELL_COPY.call, lang)} {c.phone}</Action>}
            {a.whatsapp && <Action href={a.whatsapp} tone="ghost"><MessageCircle className="h-5 w-5" aria-hidden="true" />{tr(SHELL_COPY.whatsapp, lang)}</Action>}
          </div>
        )}
      </PageHead>

      <Section n={1} title={tr(COPY.reach, lang)}>
        <div className="grid gap-8 lg:grid-cols-2">
          <dl className="space-y-5">
            <div>
              <dt className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.address, lang)}</dt>
              <dd className="mt-1 text-lg"><p className="font-semibold">{site.instituteName}</p>{lines.map((l) => <p key={l}>{l}</p>)}</dd>
            </div>
            {bi(c, "landmark", lang) && <div><dt className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.landmark, lang)}</dt><dd className="mt-1"><Bi of={c} k="landmark" /></dd></div>}
            {bi(c, "hours", lang) && <div><dt className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.hours, lang)}</dt><dd className="mt-1"><Bi of={c} k="hours" /></dd></div>}
            {a.email && c.email && <div><dt className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.email, lang)}</dt><dd className="mt-1"><a href={a.email} className="inline-flex min-h-[44px] items-center gap-2 underline"><Mail className="h-4 w-4" aria-hidden="true" />{c.email}</a></dd></div>}
          </dl>
          <div>
            {mapOn ? (
              <iframe
                title={tr(SHELL_COPY.findUs, lang)}
                src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
                className="aspect-[4/3] w-full rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <button type="button" onClick={() => setMapOn(true)}
                className="ds-card flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-[hsl(var(--ds-surface-2))] p-6 text-center">
                <Monogram size="sm" />
                <span className="inline-flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5" aria-hidden="true" />{tr(COPY.loadMap, lang)}</span>
                <span className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.mapNote, lang)}</span>
              </button>
            )}
            <a href={a.map} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center gap-2 font-semibold underline">{tr(COPY.openMaps, lang)}</a>
          </div>
        </div>
      </Section>

      {branches.length > 0 && (
        <Section n={2} title={tr(COPY.branches, lang)}>
          <CardGrid cols={3}>
            {branches.map((b) => (
              <Card key={b.name} className="h-full">
                <p className="ds-display text-lg">{b.name}</p>
                {(b.addressLines || []).map((l) => <p key={l}>{l}</p>)}
                {b.hours && <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{b.hours}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4">
                  {b.phone && <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-[44px] items-center gap-1 font-semibold underline"><Phone className="h-4 w-4" aria-hidden="true" />{b.phone}</a>}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.mapQuery || [b.name, ...(b.addressLines || [])].join(", "))}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 underline"><MapPin className="h-4 w-4" aria-hidden="true" />{tr(SHELL_COPY.findUs, lang)}</a>
                </div>
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}
    </>
  );
}

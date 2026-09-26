/**
 * SCHOOL CONTACT (a still page: no reveal motion). Sections, each with data:
 *   ways      Call, WhatsApp, email and office hours as large tap targets
 *   find      address, the landmark line, and a map that loads only on tap
 *   branches  other campuses
 *   travel    routes in brief, when the record has transport but no
 *             Transport page (s2 keeps transport as a block here)
 *   official  the official-channels line
 * A record with only a name and a city renders the map panel built from the
 * name and city, and the official-channels line.
 */

import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { hasBi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { MapTap } from "@/lib/demo/ui/school/MapTap";
import { clean, Str } from "@/lib/demo/ui/school/shared";
import { PageHead } from "../kit/Hero";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Contact the school", hi: "School से संपर्क करें" },
  lead: { en: "The school office answers admissions, fees and transport questions.", hi: "Admission, fees और transport के सवालों के जवाब school office देता है।" },
  ways: { en: "Reach the office", hi: "Office से बात करें" },
  call: { en: "Call the office", hi: "Office को call करें" },
  wa: { en: "Message on WhatsApp", hi: "WhatsApp पर message करें" },
  mail: { en: "Write an email", hi: "Email लिखें" },
  hours: { en: "Office hours", hi: "Office का समय" },
  find: { en: "Find the school", hi: "School कैसे पहुँचें" },
  landmark: { en: "Landmark", hi: "पहचान" },
  showMap: { en: "Show the map here", hi: "Map यहीं दिखाएँ" },
  directions: { en: "Directions", hi: "रास्ता देखें" },
  mapTitle: { en: "Map to the school", hi: "School का map" },
  branches: { en: "Our other campuses", hi: "हमारे दूसरे campus" },
  travel: { en: "School transport", hi: "School transport" },
  desk: { en: "Transport desk", hi: "Transport desk" },
  official: { en: "Official channels only", hi: "सिर्फ़ official तरीके" },
  officialBody: {
    en: "The numbers and addresses on this page are the school's only official channels. Admission is decided by the school office alone, and nobody can promise a seat for a payment.",
    hi: "इस पेज पर दिए नंबर और पते ही school के official तरीके हैं। Admission का फैसला सिर्फ़ school office करता है, और पैसे लेकर seat का वादा कोई नहीं कर सकता।",
  },
  admissions: { en: "Admissions", hi: "Admission" },
} satisfies Record<string, Bilingual>;

function Way({ icon, title, value, href }: { icon: ReactNode; title: string; value: ReactNode; href?: string }) {
  const body = (
    <Card interactive={!!href} className="flex h-full items-start gap-4">
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-brand-ink))]">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="ds-num mt-0.5 block break-words text-[hsl(var(--ds-ink-soft))]">{value}</span>
      </span>
    </Card>
  );
  return href ? <a href={href} className="block h-full" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a> : body;
}

export default function ContactPage({ site, ctx }: SitePageProps) {
  const { lang, actions } = ctx;
  const c = site.contact || {};
  /* The first address line often repeats the name, which is already printed. */
  const address = clean(c.addressLines).filter((l) => l.toLowerCase() !== (site.instituteName || "").trim().toLowerCase());
  const branches = (c.branches || []).filter((b) => (b.name || "").trim());
  const query = (c.mapQuery || "").trim() || [site.instituteName, site.city].filter(Boolean).join(", ");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  const routes = (site.transport?.routes || []).filter((r) => (r.name || "").trim());
  const showTravel = !ctx.href("transport") && (routes.length > 0 || !!(c.transportDesk || "").trim());
  const waDigits = (c.whatsapp || "").replace(/\D/g, "");
  let n = 0;

  const ways = [
    actions.tel && { k: "tel", icon: <Phone className="h-5 w-5" />, title: tr(COPY.call, lang), value: c.phone, href: actions.tel },
    actions.whatsapp && { k: "wa", icon: <MessageCircle className="h-5 w-5" />, title: tr(COPY.wa, lang), value: waDigits.length >= 10 ? `+${waDigits}` : tr(SHELL_COPY.whatsapp, lang), href: actions.whatsapp },
    actions.email && { k: "mail", icon: <Mail className="h-5 w-5" />, title: tr(COPY.mail, lang), value: c.email, href: actions.email },
    hasBi(c, "hours") && { k: "hours", icon: <Clock className="h-5 w-5" />, title: tr(COPY.hours, lang), value: <Bi of={c} k="hours" /> },
  ].filter(Boolean) as { k: string; icon: ReactNode; title: string; value: ReactNode; href?: string }[];

  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />

      {ways.length > 0 && (
        <Section n={++n} title={tr(COPY.ways, lang)}>
          <CardGrid cols={ways.length >= 4 ? 4 : ways.length === 2 ? 2 : 3}>
            {ways.map((w) => <Way key={w.k} icon={w.icon} title={w.title} value={w.value} href={w.href} />)}
          </CardGrid>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.find, lang)}>
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:items-start">
          <div>
            <address className="not-italic">
              <p className="ds-display text-xl">{site.instituteName}</p>
              {address.map((l) => <Str key={l} as="p" text={l} className="text-lg" />)}
              {!address.length && site.city && <p className="text-lg">{[site.city, site.state].filter(Boolean).join(", ")}</p>}
            </address>
            {hasBi(c, "landmark") && (
              <p className="mt-4 border-l-4 border-[hsl(var(--ds-accent))] pl-3"><span className="font-semibold">{tr(COPY.landmark, lang)}: </span><Bi of={c} k="landmark" /></p>
            )}
          </div>
          <MapTap query={query} directionsHref={directions} address={address.length ? undefined : [site.instituteName, site.city || ""].filter(Boolean)}
            labels={{ show: tr(COPY.showMap, lang), directions: tr(COPY.directions, lang), title: tr(COPY.mapTitle, lang) }} />
        </div>
      </Section>

      {branches.length > 0 && (
        <Section n={++n} title={tr(COPY.branches, lang)}>
          <CardGrid cols={3}>
            {branches.map((b) => (
              <Card key={b.name} className="h-full">
                <p className="ds-display text-lg">{b.name}</p>
                {clean(b.addressLines).map((l) => <Str key={l} as="p" text={l} className="text-[hsl(var(--ds-ink-soft))]" />)}
                {b.phone && <a className="ds-num mt-2 block font-semibold underline-offset-4 hover:underline" href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>}
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}

      {showTravel && (
        <Section n={++n} title={tr(COPY.travel, lang)}>
          <Bi of={site.transport} k="intro" as="p" className="mb-4 max-w-prose text-lg" />
          {routes.length > 0 && (
            <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
              {routes.map((r) => (
                <li key={r.name} className="py-3"><Str text={r.name} className="font-semibold" />{clean(r.stops).length > 0 && <Str as="p" text={clean(r.stops).join(", ")} className="text-[hsl(var(--ds-ink-soft))]" />}</li>
              ))}
            </ul>
          )}
          {c.transportDesk && <p className="mt-4"><span className="font-semibold">{tr(COPY.desk, lang)}: </span><Str text={c.transportDesk} /></p>}
        </Section>
      )}

      <Section n={++n} title={tr(COPY.official, lang)}>
        <p className="max-w-prose text-lg">{tr(COPY.officialBody, lang)}</p>
        {ctx.href("admissions") && <div className="mt-6"><Action href={ctx.href("admissions")!}>{tr(COPY.admissions, lang)}</Action></div>}
      </Section>
    </>
  );
}


/**
 * SCHOOL CONTACT (a still page: no reveal motion). Sections, each with data:
 *   ways      Call, WhatsApp, email and office hours as large tap targets
 *   find      address, the landmark line, and a map that loads only on tap
 *   branches  other campuses
 *   travel    routes in brief, when the record has transport but no
 *             Transport page (s2 keeps transport as a block here)
 *   official  the official-channels line, only when the page carries at
 *             least one phone, WhatsApp, email, address or branch: with none
 *             it would vouch for channels that are not there
 *   visit     in its place when there are none: come to the office, with
 *             the Admissions link
 * A record with only a name and a city (a fresh duplicate: contact is
 * cleared) renders office hours if kept, the map panel built from the name
 * and city, and the visit note.
 */

import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { bi, biList, hasBi, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { MapTap } from "@/lib/demo/ui/school/MapTap";
import { Str } from "@/lib/demo/ui/school/shared";
import { slotPhoto, WithPhoto } from "@/lib/demo/ui/school/photos";
import { PageHead } from "../kit/Hero";
import { Card, CardGrid, Section } from "../kit/Section";
import { Action, Bi } from "../kit/Text";

const COPY = {
  title: { en: "Contact the school", hi: "स्कूल से संपर्क करें" },
  lead: { en: "The school office answers admissions, fees and transport questions.", hi: "एडमिशन, फीस और ट्रांसपोर्ट के सवालों के जवाब स्कूल ऑफ़िस देता है।" },
  ways: { en: "Reach the office", hi: "ऑफ़िस से बात करें" },
  call: { en: "Call the office", hi: "ऑफ़िस को कॉल करें" },
  wa: { en: "Message on WhatsApp", hi: "WhatsApp पर मैसेज करें" },
  mail: { en: "Write an email", hi: "ईमेल लिखें" },
  hours: { en: "Office hours", hi: "ऑफ़िस का समय" },
  find: { en: "Find the school", hi: "स्कूल कैसे पहुँचें" },
  landmark: { en: "Landmark", hi: "पहचान" },
  showMap: { en: "Show the map here", hi: "मैप यहीं दिखाएँ" },
  directions: { en: "Directions", hi: "रास्ता देखें" },
  mapTitle: { en: "Map to the school", hi: "स्कूल का मैप" },
  branches: { en: "Our other campuses", hi: "हमारे दूसरे कैंपस" },
  travel: { en: "School transport", hi: "स्कूल ट्रांसपोर्ट" },
  desk: { en: "Transport desk", hi: "ट्रांसपोर्ट डेस्क" },
  official: { en: "Official channels only", hi: "सिर्फ़ आधिकारिक तरीके" },
  officialBody: {
    en: "The numbers and addresses on this page are the school's only official channels. Admission is decided by the school office alone, and nobody can promise a seat for a payment.",
    hi: "इस पेज पर दिए नंबर और पते ही स्कूल के आधिकारिक तरीके हैं। एडमिशन का फैसला सिर्फ़ स्कूल ऑफ़िस करता है, और पैसे लेकर सीट का वादा कोई नहीं कर सकता।",
  },
  admissions: { en: "Admissions", hi: "एडमिशन" },
  visit: { en: "Come to the office", hi: "ऑफ़िस आकर मिलें" },
  visitBody: {
    en: "Come to the school office on any working day, meet the staff and see the classrooms. Questions on admission, fees and transport are answered there in person.",
    hi: "किसी भी कामकाजी दिन स्कूल ऑफ़िस आइए, स्टाफ़ से मिलिए और क्लासरूम देखिए। एडमिशन, फीस और वैन से जुड़े हर सवाल का जवाब वहीं मिलेगा।",
  },
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
  const names = [site.instituteName, site.hi?.instituteName].map((x) => (x || "").trim().toLowerCase()).filter(Boolean);
  const address = biList(c, "addressLines", lang).filter((l) => !names.includes(l.toLowerCase()));
  const branches = (c.branches || []).filter((b) => (b.name || "").trim());
  const query = (c.mapQuery || "").trim() || [site.instituteName, site.city].filter(Boolean).join(", ");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  const routes = (site.transport?.routes || []).filter((r) => (r.name || "").trim());
  const showTravel = !ctx.href("transport") && (routes.length > 0 || !!(c.transportDesk || "").trim());
  const waDigits = (c.whatsapp || "").replace(/\D/g, "");
  /* Something on this page a parent can call, write to or walk to. */
  const hasChannels = Boolean(actions.tel || actions.whatsapp || actions.email || address.length || branches.length);
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
                <p className="ds-display text-lg">{bi(b, "name", lang)}</p>
                {biList(b, "addressLines", lang).map((l) => <Str key={l} as="p" text={l} className="text-[hsl(var(--ds-ink-soft))]" />)}
                {b.phone && <a className="ds-num mt-2 block font-semibold underline-offset-4 hover:underline" href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>}
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}

      {showTravel && (
        <Section n={++n} title={tr(COPY.travel, lang)}>
          <WithPhoto src={slotPhoto(site, "transport")} ratio="3 / 2">
          <Bi of={site.transport} k="intro" as="p" className="mb-4 max-w-prose text-lg" />
          {routes.length > 0 && (
            <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
              {routes.map((r) => (
                <li key={r.name} className="py-3"><Str text={bi(r, "name", lang)} className="font-semibold" />{biList(r, "stops", lang).length > 0 && <Str as="p" text={biList(r, "stops", lang).join(", ")} className="text-[hsl(var(--ds-ink-soft))]" />}</li>
              ))}
            </ul>
          )}
          {c.transportDesk && <p className="mt-4"><span className="font-semibold">{tr(COPY.desk, lang)}: </span><Str text={c.transportDesk} /></p>}
          </WithPhoto>
        </Section>
      )}

      <Section n={++n} title={tr(hasChannels ? COPY.official : COPY.visit, lang)}>
        <p className="max-w-prose text-lg">{tr(hasChannels ? COPY.officialBody : COPY.visitBody, lang)}</p>
        {ctx.href("admissions") && <div className="mt-6"><Action href={ctx.href("admissions")!}>{tr(COPY.admissions, lang)}</Action></div>}
      </Section>
    </>
  );
}


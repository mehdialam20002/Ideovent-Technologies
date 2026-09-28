/**
 * ClinicPage: /clinics/<slug>. One branch of a chain (d7): photo, open status,
 * address, landmark, hours, getting there (transit, parking, access), the
 * branch's own call, WhatsApp and directions, the dentists who sit here, and
 * the other clinics. Every block renders only when the record has its data,
 * so a duplicate with branch contact cleared shows hours and dentists only.
 * Spec: DENTAL-IA.md d7 branch page. Replaced the architecture stub in the
 * visual review, 28 Sep 2026 (the page had shown a title and one address line).
 */

import { Navigate } from "react-router-dom";
import { Accessibility, Bus, Car, Clock, MapPin, Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, biList, tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import { branchSlug } from "@/lib/demo/site/context";
import { Photo } from "@/pages/site/kit/Text";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import {
  BookButton, BookingBand, BranchCard, DENTAL_COPY, DPageHead, DSection, DoctorCard, WhatsAppButton,
  clock12, dentalOf, findDoctor, openLabel, openStatus, telHref,
} from "@/lib/demo/ui/dental";

const L = {
  eyebrow: { en: "Our clinic in {city}", hi: "{city} में हमारा क्लिनिक" },
  eyebrowPlain: { en: "Our clinic", hi: "हमारा क्लिनिक" },
  visit: { en: "Visiting this clinic", hi: "इस क्लिनिक में आना" },
  gettingThere: { en: "Getting there", hi: "कैसे पहुँचें" },
  dentists: { en: "Dentists at this clinic", hi: "इस क्लिनिक के डेंटिस्ट" },
  others: { en: "Our other clinics", hi: "हमारे दूसरे क्लिनिक" },
} as const satisfies Record<string, Bilingual>;

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true">{icon}</span>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

export default function ClinicPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const all = (dentalOf(site).branches || []).filter((x) => x.name);
  const b = all.find((x) => branchSlug(x) === ctx.param);
  if (!b) return <Navigate to={ctx.href("clinics") || ctx.basePath} replace />;

  const name = bi(b, "name", lang);
  const address = biList(b, "addressLines", lang);
  const s = openStatus(b.sessions);
  const state = s ? openLabel(s, lang) : "";
  const map = b.mapUrl || (b.mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.mapQuery)}` : "");
  const tel = telHref(b.phone);
  const doctors = (b.doctors || []).map((d) => findDoctor(site, d)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const others = all.filter((x) => x !== b);
  const listPage = ctx.pages.find((p) => p.id === "clinics");
  const listLabel = listPage ? tr(listPage.label, lang) : "";
  const getting = [
    { v: bi(b, "transit", lang), icon: <Bus className="h-5 w-5" /> },
    { v: bi(b, "parking", lang), icon: <Car className="h-5 w-5" /> },
    { v: bi(b, "access", lang), icon: <Accessibility className="h-5 w-5" /> },
  ].filter((g) => g.v);

  return (
    <>
      <DPageHead
        crumbs={listLabel ? [{ label: listLabel, href: ctx.href("clinics") }, { label: name }] : undefined}
        eyebrow={bi(b, "city", lang) ? trf(L.eyebrow, lang, { city: bi(b, "city", lang) }) : tr(L.eyebrowPlain, lang)}
        title={name}
        lead={state || undefined}
      >
        <div className="flex flex-wrap items-center gap-3">
          <BookButton size="lg" preset={{ branch: branchSlug(b) }} />
          {b.whatsapp && <WhatsAppButton size="lg" variant="outline" />}
        </div>
      </DPageHead>

      <DSection>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {b.photo && (
            <div className="overflow-hidden rounded-[var(--ds-radius)] lg:col-span-7">
              <Photo src={b.photo} alt={name} ratio="4 / 3" sizes="(min-width: 1024px) 700px, 100vw" />
            </div>
          )}
          <div className={b.photo ? "lg:col-span-5" : "lg:col-span-7"}>
            <h2 className="text-2xl [font-family:var(--ds-display)]">{tr(L.visit, lang)}</h2>
            <ul className="mt-3 divide-y divide-[hsl(var(--ds-line))]">
              {address.length > 0 && (
                <Row icon={<MapPin className="h-5 w-5" />}>
                  <p>{address.join(", ")}</p>
                  {bi(b, "landmark", lang) && <p className="mt-0.5 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(b, "landmark", lang)}</p>}
                </Row>
              )}
              {bi(b, "hours", lang) && <Row icon={<Clock className="h-5 w-5" />}><p>{bi(b, "hours", lang)}</p></Row>}
              {tel && <Row icon={<Phone className="h-5 w-5" />}><a href={tel} className="font-semibold underline-offset-4 hover:underline">{b.phone}</a></Row>}
            </ul>
            {map && (
              <a href={map} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 font-semibold text-[hsl(var(--ds-brand))] underline-offset-4 hover:underline">
                <Navigation className="h-4 w-4" aria-hidden="true" />{tr(DENTAL_COPY.directions, lang)}
              </a>
            )}
            {getting.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-semibold">{tr(L.gettingThere, lang)}</h3>
                <ul className="mt-1 divide-y divide-[hsl(var(--ds-line))]">
                  {getting.map((g, i) => <Row key={i} icon={g.icon}><p>{g.v}</p></Row>)}
                </ul>
              </>
            )}
          </div>
        </div>
      </DSection>

      {doctors.length > 0 && (
        <DSection tone="tint" title={tr(L.dentists, lang)}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{doctors.map((d) => <DoctorCard key={d.name} doctor={d} />)}</div>
          <SampleNote block="doctors" className="mt-8" />
        </DSection>
      )}

      {others.length > 0 && (
        <DSection title={tr(L.others, lang)}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{others.map((o) => <BranchCard key={o.slug} branch={o} />)}</div>
        </DSection>
      )}

      <BookingBand />
    </>
  );
}

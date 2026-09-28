/**
 * THE TREATMENT PAGE'S FIRST SCREEN (PAGES-A, 28 Sep 2026). Split: crumbs,
 * category, name, the two-line summary, three fact chips (duration, visits,
 * starting price) and the three actions on the left; the treatment's stock
 * photo in a rounded frame on the right (the only priority image on the
 * page). Ground and ink are the hero tokens, so Calm (d4, d7) gets its deep
 * teal with the sand button and the others their light hero.
 * On a 390px phone the text comes first and the Book button sits well above
 * the fold; the photo follows at 16:10.
 */

import { Clock, IndianRupee } from "lucide-react";
import type { DentalTreatment } from "@/lib/cms/types";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { treatmentSlug, useSite } from "@/lib/demo/site/context";
import { Photo } from "@/pages/site/kit/Text";
import { SiteLink } from "@/pages/site/kit/motion";
import { BookButton, CallLink, DENTAL_COPY, DentalGlyph, DISCLAIMER, WhatsAppButton, money, wrap } from "@/lib/demo/ui/dental";
import { TX_COPY } from "./copy";

export function TreatmentHero({ t }: { t: DentalTreatment }) {
  const { site, lang, family, basePath, href } = useSite();
  const dark = family === "calm";
  const soft = "text-[hsl(var(--ds-hero-soft))]";
  const name = bi(t, "name", lang);
  const list = href("treatments");
  const price = t.fromPrice ? `${tr(DENTAL_COPY.startingFrom, lang)} ${money(t.fromPrice, site.currency)}` : tr(DISCLAIMER.consult, lang);
  const chips = [
    { icon: <Clock className="h-4 w-4" aria-hidden="true" />, text: bi(t, "duration", lang) },
    { icon: <IndianRupee className="h-4 w-4" aria-hidden="true" />, text: price },
  ].filter((c) => c.text);
  const chipCls = dark
    ? "border-[hsl(var(--ds-hero-ink)/0.25)] text-[hsl(var(--ds-hero-ink))]"
    : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-ink))]";

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]" data-dn-tx-hero="">
      {!dark && (
        <span aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[hsl(var(--ds-surface-2))] opacity-80 blur-3xl" />
      )}
      <div className={`${wrap} relative grid items-center gap-8 py-8 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20`}>
        <div className="min-w-0 lg:col-span-7">
          <nav aria-label={lang === "hi" ? "पेज का रास्ता" : "Breadcrumb"} className={`text-sm ${soft}`}>
            <ol className="flex flex-wrap items-center gap-1.5">
              <li className="hidden sm:block"><SiteLink to={basePath} className="underline-offset-4 hover:underline">{site.shortName || site.instituteName}</SiteLink></li>
              {list && <li className="flex items-center gap-1.5"><span aria-hidden="true" className="hidden sm:inline">/</span><SiteLink to={list} className="underline-offset-4 hover:underline">{tr(TX_COPY.allTreatments, lang)}</SiteLink></li>}
              <li className="hidden items-center gap-1.5 sm:flex"><span aria-hidden="true">/</span><span aria-current="page">{name}</span></li>
            </ol>
          </nav>
          {bi(t, "category", lang) && (
            <p className="mt-4 inline-flex items-center gap-2 text-xs sm:mt-6 font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-hero-accent))]">
              <DentalGlyph name={t.icon} className="h-4 w-4" />{bi(t, "category", lang)}
            </p>
          )}
          <h1 className="mt-3 max-w-[18ch] text-[clamp(2.25rem,1.55rem+3vw,3.9rem)] leading-[1.05] tracking-[-0.02em] [font-family:var(--ds-display)]">{name}</h1>
          {bi(t, "summary", lang) && <p className={`mt-4 max-w-[54ch] text-lg leading-relaxed ${soft}`}>{bi(t, "summary", lang)}</p>}
          {chips.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {chips.map((c, i) => (
                <li key={i} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${chipCls}`}>{c.icon}{c.text}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <BookButton size="lg" tone={dark ? "hero" : "cta"} preset={{ treatment: treatmentSlug(t), reason: t.reason }}>{tr(TX_COPY.bookThis, lang)}</BookButton>
            <WhatsAppButton size="lg" variant="outline" text={trf(DENTAL_COPY.waTreatment, lang, { treatment: name, clinic: site.instituteName })}
              className={dark ? "!border-[hsl(var(--ds-hero-ink)/0.5)] !text-[hsl(var(--ds-hero-ink))]" : ""}>
              {tr(TX_COPY.askWhatsapp, lang)}
            </WhatsAppButton>
            <CallLink className="px-1 underline-offset-4 hover:underline" />
          </div>
          {t.fromPrice && <p className={`mt-4 max-w-[60ch] text-xs leading-relaxed ${soft}`}>{tr(DISCLAIMER.fees, lang)}</p>}
        </div>
        <div className="min-w-0 lg:col-span-5">
          <div className="relative">
            {t.image ? (
              <Photo src={t.image} alt="" priority ratio="16 / 10" sizes="(min-width: 1024px) 460px, calc(100vw - 32px)"
                className="overflow-hidden rounded-[calc(var(--ds-radius)+10px)] shadow-[var(--dn-shadow-2)] lg:!aspect-[4/5]" />
            ) : (
              <div className="grid aspect-[16/10] place-items-center rounded-[calc(var(--ds-radius)+10px)] bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))] lg:aspect-[4/5]">
                <DentalGlyph name={t.icon} className="h-24 w-24 opacity-80" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

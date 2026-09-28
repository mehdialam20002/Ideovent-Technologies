/**
 * TechnologyPage: /technology. HOME builder, 28 Sep 2026. Spec: DENTAL-IA.md
 * s3 technology by benefit (diagnosis, comfort, precision, speed, preview),
 * DENTAL-COMPLIANCE.md s3 (benefits, never "most advanced"). Contract:
 * E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * Items grouped by `group` in a fixed order; an item with an image gets an
 * alternating photo row, the rest sit as benefit cards under their group.
 */

import type { SitePageProps } from "@/lib/demo/site/context";
import type { DentalTech } from "@/lib/cms/types";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { DentalGlyph, dentalOf } from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { P } from "./home/copy";
import { BookingBandHome } from "./home/visit";
import { HSection, PageHead } from "./home/ui";

const ORDER = ["diagnosis", "comfort", "precision", "speed", "preview", "hygiene", ""] as const;
const LABEL = {
  diagnosis: P.g_diagnosis, comfort: P.g_comfort, precision: P.g_precision, speed: P.g_speed,
  preview: P.g_preview, hygiene: P.g_hygiene, "": P.g_other,
} as const;

export default function TechnologyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const items = withText(dentalOf(site).technology, "title");
  const groups = ORDER.map((g) => ({ g, list: items.filter((t) => (t.group || "") === g) })).filter((x) => x.list.length);
  const hero = items.find((t) => t.image)?.image;
  let row = 0;

  return (
    <>
      <PageHead
        crumbs={[{ label: tr(P.home, lang), href: ctx.href("home") }, { label: tr(ctx.page.label, lang) }]}
        eyebrow={tr(P.techEyebrow, lang)}
        title={tr(P.techTitle, lang)}
        lead={tr(P.techLead, lang)}
        photo={hero ? <DemoPhoto src={hero} ratio="4 / 3" priority sizes="(min-width: 1024px) 460px, 100vw" className="rounded-[calc(var(--ds-radius)*1.2)] shadow-[var(--dn-shadow-2)]" /> : undefined}
      >
        {groups.length > 1 && (
          <nav aria-label={tr(P.techEyebrow, lang)} className="flex flex-wrap gap-2">
            {groups.map(({ g }) => (
              <a key={g || "other"} href={`#tech-${g || "other"}`} className="inline-flex min-h-11 items-center rounded-full border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-4 text-sm font-semibold hover:border-[hsl(var(--ds-ink)/0.4)]">
                {tr(LABEL[g], lang)}
              </a>
            ))}
          </nav>
        )}
      </PageHead>

      {groups.map(({ g, list }, gi) => {
        const withImg = list.filter((t) => t.image && t.image !== hero);
        const plain = list.filter((t) => !withImg.includes(t));
        return (
          <HSection key={g || "other"} id={`tech-${g || "other"}`} eyebrow={String(gi + 1).padStart(2, "0")} title={LABEL[g]} tone={gi % 2 ? "tint" : "plain"} className="scroll-mt-[var(--dn-header-h)]">
            <div className="space-y-12">
              {withImg.map((t) => {
                const flip = row++ % 2 === 1;
                return (
                  <div key={t.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                    <DemoPhoto src={t.image} ratio="3 / 2" sizes="(min-width: 768px) 540px, 100vw" decorative className={`rounded-[var(--ds-radius)] ${flip ? "md:order-2" : ""}`} />
                    <TechText t={t} lang={lang} big />
                  </div>
                );
              })}
              {plain.length > 0 && (
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {plain.map((t) => <li key={t.title} className="dn-tile p-6"><TechText t={t} lang={lang} /></li>)}
                </ul>
              )}
            </div>
          </HSection>
        );
      })}

      <section className="pb-4">
        <p className="mx-auto w-full max-w-6xl px-4 pt-10 text-sm text-[hsl(var(--ds-ink-soft))] sm:px-6">{tr(P.techNote, lang)}</p>
      </section>
      <BookingBandHome />
    </>
  );
}

function TechText({ t, lang, big = false }: { t: DentalTech; lang: SitePageProps["ctx"]["lang"]; big?: boolean }) {
  return (
    <div>
      <span className={`flex items-center justify-center rounded-full bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-accent))] ${big ? "h-12 w-12" : "h-11 w-11"}`}>
        <DentalGlyph name={t.icon} className="h-5 w-5" />
      </span>
      <h3 className={`dn-h3 mt-4 ${big ? "!text-2xl" : "!text-lg"}`}>{bi(t, "title", lang)}</h3>
      <p className={`mt-2 leading-relaxed text-[hsl(var(--ds-ink-soft))] ${big ? "max-w-[46ch] text-[1.0625rem]" : "text-[15px]"}`}>{bi(t, "benefit", lang)}</p>
    </div>
  );
}

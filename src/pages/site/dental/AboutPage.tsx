/**
 * AboutPage: /about. HOME builder, 28 Sep 2026 (the workflow gave About to the
 * home builder). Spec: DENTAL-IA.md s6 about; the blueprint's "our story,
 * mission, sterilisation promise, technology, why patients trust us".
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * Story (about, split at blank lines) beside the established year and the
 * mission, the trust figures (sample-labelled), why patients trust us (facts),
 * the sterilisation protocol, comfort, technology, the team and photos.
 */

import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { dentalOf } from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { P } from "./home/copy";
import { TeamSection } from "./home/people";
import { ComfortSection } from "./home/special";
import { SterilisationSection, TechSection } from "./home/trust";
import { BookingBandHome } from "./home/visit";
import { Accent, HSection, PageHead } from "./home/ui";

export default function AboutPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const d = dentalOf(site);
  const name = bi(site, "instituteName", lang) || site.instituteName;
  const paras = bi(site, "about", lang).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const est = bi(site, "established", lang) || site.establishedYear || "";
  const stats = withText(site.stats, "label").slice(0, 4);
  const trust = withText(d.trust, "title");
  const photoSrc = site.sectionPhotos?.about || site.photos?.[0]?.src;
  const gallery = (site.photos || []).filter((p) => p.src && p.src !== photoSrc).slice(0, 4);

  return (
    <>
      <PageHead
        crumbs={[{ label: tr(P.home, lang), href: ctx.href("home") }, { label: tr(ctx.page.label, lang) }]}
        eyebrow={tr(P.aboutEyebrow, lang)}
        title={tr(P.aboutTitle, lang)}
        lead={bi(site, "mission", lang) || bi(site, "tagline", lang)}
        photo={photoSrc ? <DemoPhoto src={photoSrc} ratio="4 / 3" priority sizes="(min-width: 1024px) 460px, 100vw" className="rounded-[calc(var(--ds-radius)*1.2)] shadow-[var(--dn-shadow-2)]" /> : undefined}
      />

      {paras.length > 0 && (
        <HSection>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <aside className="lg:col-span-4">
              <p className="dn-eyebrow">{name}</p>
              {est && (
                <div className="mt-6 border-t border-[hsl(var(--ds-rule))] pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-ink-soft))]">{tr(P.established, lang)}</p>
                  <p className="dn-h2 mt-2">{est}</p>
                </div>
              )}
              {bi(site, "vision", lang) && (
                <div className="mt-6 border-t border-[hsl(var(--ds-line))] pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-ink-soft))]">{tr(P.visionLabel, lang)}</p>
                  <p className="mt-2 leading-relaxed">{bi(site, "vision", lang)}</p>
                </div>
              )}
            </aside>
            <div className="lg:col-span-8">
              {paras.map((p, i) => (
                <p key={i} className={i === 0 ? "dn-h3 !text-[1.5rem] !leading-snug" : "mt-6 max-w-[65ch] text-[1.0625rem] leading-relaxed text-[hsl(var(--ds-ink-soft))]"}>
                  {i === 0 ? <Accent text={p} /> : p}
                </p>
              ))}
            </div>
          </div>
        </HSection>
      )}

      {stats.length > 0 && (
        <section className="border-y border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] py-10">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col">
                  <dt className="order-2 mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(s, "label", lang)}</dt>
                  <dd className="order-1 text-4xl leading-none [font-family:var(--ds-display)]">{s.value}</dd>
                  {bi(s, "basis", lang) && <dd className="order-3 mt-1 text-xs text-[hsl(var(--ds-ink-soft))]">{bi(s, "basis", lang)}</dd>}
                </div>
              ))}
            </dl>
            <SampleNote block="stats" className="mt-6" />
          </div>
        </section>
      )}

      {trust.length > 0 && (
        <HSection eyebrow={P.trustEyebrow} title={P.trustTitle}>
          <ul className="grid gap-5 sm:grid-cols-2">
            {trust.map((t, i) => (
              <li key={i} className="dn-tile flex gap-5 p-6">
                <span className="dn-h3 !text-2xl text-[hsl(var(--ds-accent))]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="dn-h3 !text-lg">{bi(t, "title", lang)}</h3>
                  {bi(t, "body", lang) && <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(t, "body", lang)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </HSection>
      )}

      <SterilisationSection />
      <ComfortSection tone="plain" />
      <TechSection />
      <TeamSection tone="tint" />

      {gallery.length >= 2 && (
        <HSection eyebrow={P.galleryEyebrow} title={P.galleryTitle}>
          <div className={`grid gap-4 ${gallery.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : gallery.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {gallery.map((p, i) => (
              <figure key={i}>
                <DemoPhoto src={p.src} alt={bi(p, "alt", lang)} ratio="4 / 5" sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 100vw" className="rounded-[var(--ds-radius)]" />
                {bi(p, "caption", lang) && <figcaption className="mt-3 text-sm font-medium">{bi(p, "caption", lang)}</figcaption>}
              </figure>
            ))}
          </div>
        </HSection>
      )}

      <BookingBandHome />
    </>
  );
}

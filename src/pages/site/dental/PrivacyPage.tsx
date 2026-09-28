/**
 * PrivacyPage: /privacy. The template privacy notice every dental demo
 * carries (DENTAL-COMPLIANCE.md s4 footer link, s5 booking consent). Labelled
 * as a template the clinic replaces with its own reviewed notice. The clinic
 * name, legal name and privacy contact come from the record, so a fresh
 * duplicate with its contact cleared says "The clinic adds its privacy
 * contact here" rather than showing a stale number.
 */

import { FileText, Mail, Phone } from "lucide-react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { DPageHead, dentalContact, dentalOf, wrap } from "@/lib/demo/ui/dental";
import { crumbsFor } from "./parts-b/support/ui";
import { PRIVACY_HEAD as P, PRIVACY_SECTIONS } from "./parts-b/support/privacyCopy";

export default function PrivacyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const c = dentalContact(site);
  const clinic = site.instituteName;
  const legal = bi(dentalOf(site), "legalName", lang) || clinic;
  const contact = [c.email, c.phone].filter(Boolean).join(", ") || tr(P.noContact, lang);
  const fill = (x: Parameters<typeof tr>[0]) => trf(x, lang, { clinic, legal, contact });

  return (
    <>
      <DPageHead eyebrow={tr(ctx.page.label, lang)} title={tr(P.title, lang)} lead={fill(P.lead)}
        crumbs={crumbsFor(ctx, { label: tr(ctx.page.label, lang) })} />

      <section className="py-12 sm:py-16">
        <div className={`${wrap} grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14`}>
          <div className="min-w-0 max-w-[68ch]">
            <div role="note" data-sample="privacy" className="flex gap-3 rounded-[var(--ds-radius)] border border-dashed border-[hsl(var(--ds-rule))] bg-[hsl(var(--ds-surface-2))] p-4 text-sm leading-relaxed">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
              <p>
                <strong className="font-semibold">{tr(P.templateTitle, lang)}.</strong> {fill(P.template)}{" "}
                <span className="text-[hsl(var(--ds-ink-soft))]">{tr(P.demo, lang)}</span>
              </p>
            </div>

            <nav aria-label={tr(P.onThisPage, lang)} className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{tr(P.onThisPage, lang)}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PRIVACY_SECTIONS.map((x) => (
                  <li key={x.id}>
                    <a href={`#pn-${x.id}`} className="inline-flex min-h-11 items-center rounded-full border border-[hsl(var(--ds-line))] px-4 text-sm font-medium hover:border-[hsl(var(--ds-cta))]">
                      {tr(x.title, lang)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-10 grid gap-10">
              {PRIVACY_SECTIONS.map((x, i) => (
                <section key={x.id} id={`pn-${x.id}`} aria-labelledby={`pn-${x.id}-h`} className="scroll-mt-[calc(var(--dn-header-h,72px)+16px)]">
                  <h2 id={`pn-${x.id}-h`} className="flex items-baseline gap-3 text-[clamp(1.3rem,1.1rem+0.8vw,1.65rem)] leading-snug [font-family:var(--ds-display)]">
                    <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-[hsl(var(--ds-accent))]">{String(i + 1).padStart(2, "0")}</span>
                    {tr(x.title, lang)}
                  </h2>
                  {x.body.map((b, k) => <p key={k} className="mt-3 text-[1.0625rem] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{fill(b)}</p>)}
                </section>
              ))}
            </div>
          </div>

          <aside className="dn-card p-6 lg:sticky lg:top-[calc(var(--dn-header-h,72px)+24px)]">
            <p className="font-semibold">{tr(P.contactTitle, lang)}</p>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ds-ink-soft))]">{tr(P.contactBody, lang)}</p>
            <ul className="mt-4 grid gap-2 text-sm font-semibold">
              {c.email && <li><a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center gap-2 break-all hover:underline"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{c.email}</a></li>}
              {c.tel && <li><a href={c.tel} className="inline-flex min-h-11 items-center gap-2 hover:underline"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" />{c.phone}</a></li>}
              {!c.email && !c.tel && <li className="font-normal text-[hsl(var(--ds-ink-soft))]">{tr(P.noContact, lang)}</li>}
            </ul>
            <p className="mt-4 border-t border-[hsl(var(--ds-line))] pt-4 text-xs text-[hsl(var(--ds-ink-soft))]">{legal}</p>
          </aside>
        </div>
      </section>
    </>
  );
}

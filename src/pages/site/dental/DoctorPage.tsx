/**
 * DoctorPage: /doctors/<slug>. HOME builder, 28 Sep 2026. Only a doctor
 * with a `bio` gets this page (pages.ts). Spec: DENTAL-IA.md s6 doctors, the
 * lead doctor's long bio; DENTAL-COMPLIANCE.md s3 (degrees and registration
 * shown; no awards, media or "celebrity"). Contract: DENTAL-ARCHITECTURE.md.
 */

import { Navigate } from "react-router-dom";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, biList, tr, trf } from "@/lib/demo/site/bilingual";
import { branchSlug, doctorSlug } from "@/lib/demo/site/context";
import { BookButton, DENTAL_COPY, WhatsAppButton, dentalOf, findDoctor } from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { Breadcrumb, Photo } from "@/pages/site/kit/Text";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { P } from "./home/copy";
import { DoctorTile, orderedDoctors } from "./home/people";
import { BookingBandHome } from "./home/visit";
import { Accent, HSection, wrap } from "./home/ui";

export default function DoctorPage({ site, ctx }: SitePageProps) {
  const { lang, family, variant } = ctx;
  const d = findDoctor(site, ctx.param);
  if (!d) return <Navigate to={ctx.href("doctors") || ctx.basePath} replace />;
  const name = bi(d, "name", lang);
  const arch = family === "luxury" || variant === "c";
  const bio = bi(d, "bio", lang).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const langs = biList(d, "languages", lang);
  const training = biList(d, "training", lang);
  const memberships = biList(d, "memberships", lang);
  const branches = (dentalOf(site).branches || []).filter((b) => (d.branches || []).includes(branchSlug(b)));
  const others = orderedDoctors(dentalOf(site).doctors).filter((x) => doctorSlug(x) !== doctorSlug(d)).slice(0, 3);
  const facts: [string, string][] = ([
    [tr(DENTAL_COPY.experience, lang), bi(d, "experience", lang)],
    [tr(DENTAL_COPY.languages, lang), langs.join(", ")],
    [tr(P.days, lang), bi(d, "days", lang)],
    [tr(DENTAL_COPY.regNo, lang), bi(d, "regNo", lang).replace(/^(Reg\. no\.|रजि\. नं\.)\s*/i, "")],
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <>
      <header className="dn-tint">
        <div className={`${wrap} grid items-center gap-10 py-10 sm:py-14 md:grid-cols-12 md:gap-14`}>
          <div className="relative mx-auto w-full max-w-[360px] md:order-2 md:col-span-5 md:max-w-none">
            <div className={`overflow-hidden shadow-[var(--dn-shadow-2)] ${arch ? "dn-arch-frame" : "rounded-[calc(var(--ds-radius)*1.2)]"}`}>
              {d.photo ? <DemoPhoto src={d.photo} ratio="4 / 5" priority sizes="(min-width: 768px) 420px, 90vw" /> : <Photo src={d.photo} alt={d.name} ratio="4 / 5" />}
            </div>
          </div>
          <div className="md:order-1 md:col-span-7">
            <Breadcrumb items={[{ label: tr(P.home, lang), href: ctx.href("home") }, { label: tr(P.allDoctors, lang), href: ctx.href("doctors") }, { label: name }]} />
            {d.visiting && <p className="dn-eyebrow mt-6">{tr(DENTAL_COPY.visiting, lang)}</p>}
            <h1 className="dn-h2 mt-3 !text-[clamp(2.1rem,1.4rem+2.8vw,3.6rem)] !leading-[1.08]">{name}</h1>
            <p className="mt-3 text-lg font-semibold text-[hsl(var(--ds-accent))]">{bi(d, "qualification", lang)}</p>
            {bi(d, "specialisation", lang) && <p className="text-lg">{bi(d, "specialisation", lang)}</p>}
            {facts.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-5 border-y border-[hsl(var(--ds-line))] py-5 sm:grid-cols-4">
                {facts.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{k}</dt><dd className="mt-1 text-sm font-medium">{v}</dd></div>)}
              </dl>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BookButton size="lg" preset={{ doctor: doctorSlug(d) }} className="px-7">{trf(DENTAL_COPY.bookWith, lang, { name })}</BookButton>
              <WhatsAppButton size="lg" variant="outline" text={trf(DENTAL_COPY.waTreatment, lang, { treatment: name, clinic: site.instituteName })} />
            </div>
          </div>
        </div>
      </header>

      <HSection>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <article className="lg:col-span-8">
            <h2 className="dn-h3 !text-2xl">{trf(P.aboutDoctor, lang, { name })}</h2>
            {bi(d, "quote", lang) && (
              <blockquote className="mt-8 border-l-2 border-[hsl(var(--ds-rule))] pl-6 text-[1.5rem] leading-snug [font-family:var(--ds-display)]">
                <Accent text={bi(d, "quote", lang)} />
              </blockquote>
            )}
            {bio.map((p, i) => <p key={i} className="mt-6 max-w-[65ch] text-[1.0625rem] leading-relaxed text-[hsl(var(--ds-ink))]">{p}</p>)}
            <SampleNote block="doctors" className="mt-8" />
          </article>
          <aside className="space-y-6 lg:col-span-4">
            {bi(d, "focus", lang) && <Side title={tr(P.focus, lang)} items={[bi(d, "focus", lang)]} />}
            {training.length > 0 && <Side title={tr(P.training, lang)} items={training} />}
            {memberships.length > 0 && <Side title={tr(P.memberships, lang)} items={memberships} />}
            {branches.length > 0 && <Side title={tr(P.clinics, lang)} items={branches.map((b) => bi(b, "name", lang))} />}
          </aside>
        </div>
      </HSection>

      {others.length > 0 && (
        <HSection tone="tint" title={P.otherDoctors} more={{ to: "doctors", label: P.allDoctors }}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{others.map((x) => <DoctorTile key={x.name} doctor={x} />)}</div>
        </HSection>
      )}
      <BookingBandHome />
    </>
  );
}

function Side({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="dn-tile p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{title}</h3>
      <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
        {items.map((x, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--ds-ink-soft))]" />{x}</li>)}
      </ul>
    </div>
  );
}

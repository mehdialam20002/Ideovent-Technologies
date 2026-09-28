/**
 * DOCTORS on the home page and the Doctors pages: the tile (photo 4:5, name,
 * degree, specialisation, focus, years, languages, reg. no., Book with), the
 * team strip (snap scroller on phones) and the lead dentist feature (arch
 * portrait on luxury and kids). Degrees and specialist titles are the
 * record's own fields (DCI 8.3.3); nothing here adds a title.
 */

import type { CSSProperties } from "react";
import { CalendarClock, Languages, Quote } from "lucide-react";
import type { DentalDoctor } from "@/lib/cms/types";
import { bi, biList, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { doctorSlug, useSite } from "@/lib/demo/site/context";
import { BookButton, DENTAL_COPY, dentalOf, leadDoctor } from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { Photo } from "@/pages/site/kit/Text";
import { SiteLink } from "@/pages/site/kit/motion";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { H } from "./copy";
import { Accent, HSection, MoreLink } from "./ui";

/** The doctors in page order: the lead first, then residents, then visiting. */
export function orderedDoctors(list: DentalDoctor[] | undefined): DentalDoctor[] {
  const ds = withText(list, "name");
  return [...ds].sort((a, b) => Number(!!b.lead) - Number(!!a.lead) || Number(!!a.visiting) - Number(!!b.visiting));
}

function DoctorPhoto({ d, className = "", sizes, ratio = "4 / 5" }: { d: DentalDoctor; className?: string; sizes: string; ratio?: string }) {
  return <Photo src={d.photo} alt={d.name} ratio={ratio} sizes={sizes} className={className} />;
}

export function DoctorTile({ doctor: d, showBio = false }: { doctor: DentalDoctor; showBio?: boolean }) {
  const { lang, href } = useSite();
  const page = href("doctor", doctorSlug(d));
  const langs = biList(d, "languages", lang);
  const name = bi(d, "name", lang);
  return (
    <article className="dn-tile dn-lift relative flex h-full flex-col overflow-hidden">
      <div className="relative">
        <DoctorPhoto d={d} sizes="(min-width: 1024px) 270px, (min-width: 640px) 44vw, 78vw" />
        {d.visiting && (
          <span className="absolute left-3 top-3 rounded-full bg-[hsl(var(--ds-surface))]/95 px-3 py-1 text-xs font-semibold text-[hsl(var(--ds-ink))] shadow-sm">{tr(DENTAL_COPY.visiting, lang)}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="dn-h3 !text-lg">{page ? <SiteLink to={page} className="hover:underline">{name}</SiteLink> : name}</h3>
        <p className="mt-1 text-sm font-semibold text-[hsl(var(--ds-accent))]">{bi(d, "qualification", lang)}</p>
        {bi(d, "specialisation", lang) && <p className="text-sm text-[hsl(var(--ds-ink))]">{bi(d, "specialisation", lang)}</p>}
        {bi(d, "focus", lang) && <p className="mt-3 line-clamp-2 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(d, "focus", lang)}</p>}
        {showBio && bi(d, "quote", lang) && <p className="mt-3 text-sm italic text-[hsl(var(--ds-ink-soft))]">"{bi(d, "quote", lang)}"</p>}
        <ul className="mt-4 space-y-1.5 text-[13px] text-[hsl(var(--ds-ink-soft))]">
          {bi(d, "experience", lang) && <li className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{bi(d, "experience", lang)}</li>}
          {langs.length > 0 && <li className="flex items-center gap-2"><Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><span className="sr-only">{tr(DENTAL_COPY.languages, lang)}: </span>{langs.join(", ")}</span></li>}
          {d.visiting && bi(d, "days", lang) && <li className="pl-[22px]">{bi(d, "days", lang)}</li>}
        </ul>
        {d.regNo && <p className="mt-3 border-t border-[hsl(var(--ds-line))] pt-3 text-xs text-[hsl(var(--ds-ink-soft))]">{bi(d, "regNo", lang)}</p>}
        <div className="mt-auto pt-5">
          <BookButton preset={{ doctor: doctorSlug(d) }} tone="ghost" className="w-full">{tr(H.bookThis, lang)}<span className="sr-only">: {name}</span></BookButton>
        </div>
      </div>
    </article>
  );
}

/** Team strip: up to `max` doctors, the lead first; SampleNote doctors; Meet all. */
export function TeamSection({ max = 4, tone = "plain", title = H.teamTitle }: { max?: number; tone?: "plain" | "tint"; title?: Bilingual }) {
  const { site } = useSite();
  const list = orderedDoctors(dentalOf(site).doctors).slice(0, max);
  if (!list.length) return null;
  const cols = Math.min(4, Math.max(list.length, 3));
  return (
    <HSection eyebrow={H.teamEyebrow} title={title} lead={H.teamLead} tone={tone} more={{ to: "doctors", label: H.teamAll }}>
      <div className="dn-snap -mx-4 px-4 sm:mx-0 sm:px-0" style={{ "--cols": cols } as CSSProperties}>
        {list.map((d) => <DoctorTile key={d.name} doctor={d} />)}
      </div>
      <SampleNote block="doctors" className="mt-6" />
    </HSection>
  );
}

/**
 * The lead dentist as a 5/7 split: portrait (arch-top on luxury and kids),
 * pull quote, degree and registration, Book with, the full profile link.
 */
export function DoctorFeature({ doctor, eyebrow, tone = "plain" }: { doctor?: DentalDoctor; eyebrow: Bilingual; tone?: "plain" | "tint" | "surface" }) {
  const { site, lang, family, variant } = useSite();
  const d = doctor || leadDoctor(site);
  if (!d) return null;
  const arch = family === "luxury" || variant === "c";
  const name = bi(d, "name", lang);
  const langs = biList(d, "languages", lang);
  const facts = [
    [tr(DENTAL_COPY.experience, lang), bi(d, "experience", lang)],
    [tr(DENTAL_COPY.languages, lang), langs.join(", ")],
    [tr(DENTAL_COPY.regNo, lang), bi(d, "regNo", lang).replace(/^(Reg\. no\.|रजि\. नं\.)\s*/i, "")],
  ].filter(([, v]) => v);
  return (
    <HSection tone={tone}>
      <div className="grid items-center gap-10 md:grid-cols-12 md:gap-14">
        <div className="relative mx-auto w-full max-w-[420px] md:col-span-5 md:max-w-none">
          {arch && <div aria-hidden="true" className="dn-arch-frame absolute -inset-3 border border-[hsl(var(--ds-rule))] sm:-inset-4" />}
          <div className={`relative overflow-hidden ${arch ? "dn-arch-frame" : "rounded-[var(--ds-radius)]"}`}>
            {d.photo
              ? <DemoPhoto src={d.photo} ratio="4 / 5" sizes="(min-width: 768px) 420px, 90vw" className="w-full" />
              : <DoctorPhoto d={d} sizes="(min-width: 768px) 420px, 90vw" />}
          </div>
        </div>
        <div className="md:col-span-7">
          <p className="dn-eyebrow">{tr(eyebrow, lang)}</p>
          <h2 className="dn-h2 mt-3">{name}</h2>
          <p className="mt-2 text-base font-semibold text-[hsl(var(--ds-accent))]">{[bi(d, "qualification", lang), bi(d, "specialisation", lang)].filter(Boolean).join(", ")}</p>
          {bi(d, "quote", lang) && (
            <blockquote className="relative mt-8 border-l border-[hsl(var(--ds-rule))] pl-6">
              <Quote className="absolute -left-3 -top-1 h-6 w-6 rounded-full bg-[hsl(var(--ds-bg))] p-1 text-[hsl(var(--ds-rule))]" aria-hidden="true" />
              <p className={`text-[1.375rem] leading-snug text-[hsl(var(--ds-ink))] ${family === "luxury" ? "[font-family:var(--ds-display)]" : family === "calm" ? "font-light" : "font-medium"}`}>
                <Accent text={bi(d, "quote", lang)} />
              </p>
            </blockquote>
          )}
          {bi(d, "focus", lang) && <p className="mt-6 max-w-[58ch] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(d, "focus", lang)}</p>}
          {facts.length > 0 && (
            <dl className="mt-6 grid gap-4 border-y border-[hsl(var(--ds-line))] py-5 sm:grid-cols-3">
              {facts.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{k}</dt><dd className="mt-1 text-sm font-medium">{v}</dd></div>)}
            </dl>
          )}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <BookButton size="lg" preset={{ doctor: doctorSlug(d) }} className="px-7">{trf(DENTAL_COPY.bookWith, lang, { name })}</BookButton>
            {d.bio && <MoreLink to="doctor" param={doctorSlug(d)} label={H.profile} />}
          </div>
          <SampleNote block="doctors" className="mt-6" />
        </div>
      </div>
    </HSection>
  );
}

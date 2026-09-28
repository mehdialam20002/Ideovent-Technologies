/**
 * SECTIONS ONLY SOME CLINICS HAVE, shown when the record has the data:
 * options compared (implants, braces vs aligners), the chain's branches,
 * the kids blocks (first visit, age bands, rooms, comfort, first aid) and
 * the guides. Never keyed on a template id.
 */

import { ArrowRight, MapPin } from "lucide-react";
import { bi, tr, withText } from "@/lib/demo/site/bilingual";
import { branchSlug, postSlug, useSite } from "@/lib/demo/site/context";
import {
  BookButton, ComparisonTable, DENTAL_COPY, DISCLAIMER, Disclaimer, FirstAidCard, clock12, dentalOf, openLabel, openStatus,
} from "@/lib/demo/ui/dental";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { SiteLink } from "@/pages/site/kit/motion";
import { H } from "./copy";
import { HSection } from "./ui";

export function ComparisonSection({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  const { site, lang } = useSite();
  const c = dentalOf(site).comparison;
  if (!c?.columns?.length || !c.rows?.length) return null;
  const title = (lang === "hi" && c.hi?.title) || c.title || "";
  const note = (lang === "hi" && c.hi?.note) || c.note;
  return (
    <HSection eyebrow={H.compareEyebrow} title={title} tone={tone}>
      <div className="dn-tile overflow-hidden p-2 sm:p-4 [&_th]:align-top [&_td]:align-top [&_thead_th]:text-[hsl(var(--ds-accent))]">
        <ComparisonTable data={c} />
      </div>
      {note && <p className="mt-4 max-w-[80ch] text-sm text-[hsl(var(--ds-ink-soft))]">{note}</p>}
    </HSection>
  );
}

/** Chains: nearest branches with Open now, hours, Directions and Book at this branch. */
export function BranchesSection({ max = 4 }: { max?: number }) {
  const { site, lang, href } = useSite();
  const list = withText(dentalOf(site).branches, "name").slice(0, max);
  if (list.length < 2) return null;
  return (
    <HSection eyebrow={H.branchesEyebrow} title={H.branchesTitle} more={{ to: "clinics", label: H.branchesAll }}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((b) => {
          const s = openStatus(b.sessions);
          const to = href("clinic", branchSlug(b));
          return (
            <article key={branchSlug(b)} className="dn-tile dn-lift relative flex flex-col p-6">
              {s && (
                <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold">
                  <span aria-hidden="true" className={"h-2 w-2 rounded-full " + (s.state === "open" ? "bg-emerald-600" : "bg-amber-500")} />
                  {openLabel(s, lang)}
                </span>
              )}
              <h3 className="dn-h3 mt-3 !text-lg">{to ? <SiteLink to={to} className="hover:underline">{bi(b, "name", lang)}</SiteLink> : bi(b, "name", lang)}</h3>
              {bi(b, "city", lang) && <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{bi(b, "city", lang)}</p>}
              {bi(b, "hours", lang) && <p className="mt-3 text-sm leading-relaxed">{bi(b, "hours", lang)}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                <BookButton preset={{ branch: branchSlug(b) }} tone="ghost">{tr(DENTAL_COPY.bookShort, lang)}</BookButton>
                {b.mapUrl && <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[hsl(var(--ds-accent))]"><MapPin className="h-4 w-4" aria-hidden="true" />{tr(DENTAL_COPY.directions, lang)}</a>}
              </div>
            </article>
          );
        })}
      </div>
    </HSection>
  );
}

/* ── Kids ──────────────────────────────────────────────────────────────── */

export function FirstVisitSection() {
  const { site, lang } = useSite();
  const steps = withText(dentalOf(site).kids?.firstVisit, "title");
  if (!steps.length) return null;
  return (
    <HSection eyebrow={H.firstVisitEyebrow} title={H.firstVisitTitle}>
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={i} className="dn-tile p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ds-rule))] text-xl font-bold text-[hsl(var(--ds-ink))]">{i + 1}</span>
            <h3 className="dn-h3 mt-4 !text-lg">{bi(s, "title", lang)}</h3>
            {bi(s, "body", lang) && <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(s, "body", lang)}</p>}
          </li>
        ))}
      </ol>
    </HSection>
  );
}

const BAND_TINTS = ["bg-[hsl(var(--ds-surface-2))]", "bg-[hsl(var(--ds-accent)/0.09)]", "bg-[hsl(var(--ds-cta)/0.12)]"];

export function AgeBandsSection() {
  const { site, lang } = useSite();
  const list = withText(dentalOf(site).kids?.ageBands, "title");
  if (!list.length) return null;
  return (
    <HSection eyebrow={H.agesEyebrow} title={H.agesTitle} tone="surface">
      <div className="grid gap-5 md:grid-cols-3">
        {list.map((b, i) => (
          <article key={i} className={"rounded-[var(--ds-radius)] p-7 " + BAND_TINTS[i % 3]}>
            <h3 className="dn-h3">{bi(b, "title", lang)}</h3>
            {bi(b, "body", lang) && <p className="mt-3 leading-relaxed text-[hsl(var(--ds-ink))]">{bi(b, "body", lang)}</p>}
          </article>
        ))}
      </div>
    </HSection>
  );
}

/** Three rounded photos of the rooms (from site.photos), no people close-ups chosen here. */
export function RoomsSection() {
  const { site, lang } = useSite();
  /* Rooms only: a photo filed under "At home" or "Safety" is not a room. */
  const all = (site.photos || []).filter((p) => p.src && p.src !== site.heroImage);
  const room = (p: (typeof all)[number]) => !/home|safety|sterili|team|people|smile|घर|सुरक्षा/i.test(`${p.category || ""} ${p.caption || ""}`);
  const list = [...all.filter(room), ...all.filter((p) => !room(p))].slice(0, 3);
  if (list.length < 3) return null;
  return (
    <HSection eyebrow={H.roomsEyebrow} title={H.roomsTitle}>
      <div className="grid gap-5 sm:grid-cols-3">
        {list.map((p, i) => (
          <figure key={i}>
            <DemoPhoto src={p.src} alt={bi(p, "alt", lang)} ratio="4 / 5" sizes="(min-width: 640px) 360px, 100vw" className="rounded-[var(--ds-radius)]" />
            {bi(p, "caption", lang) && <figcaption className="mt-3 text-sm font-semibold">{bi(p, "caption", lang)}</figcaption>}
          </figure>
        ))}
      </div>
    </HSection>
  );
}

export function ComfortSection({ tone = "tint" }: { tone?: "plain" | "tint" }) {
  const { site, lang, variant } = useSite();
  const d = dentalOf(site);
  const list = withText(variant === "c" && d.kids?.comfort?.length ? d.kids.comfort : d.comfort, "title");
  if (!list.length) return null;
  return (
    <HSection eyebrow={H.comfortEyebrow} title={H.comfortTitle} lead={H.comfortNote} tone={tone}>
      <ul className="grid gap-5 md:grid-cols-3">
        {list.slice(0, 6).map((p, i) => (
          <li key={i} className="dn-tile p-6">
            <h3 className="dn-h3 !text-lg">{bi(p, "title", lang)}</h3>
            {bi(p, "body", lang) && <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(p, "body", lang)}</p>}
          </li>
        ))}
      </ul>
    </HSection>
  );
}

export function FirstAidSection() {
  const { site, lang } = useSite();
  if (!withText(dentalOf(site).emergency?.firstAid, "title").length) return null;
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <FirstAidCard title={tr(H.firstAidTitle, lang).replace(/\*/g, "")} />
        <Disclaimer c={DISCLAIMER.emergency} className="mt-4" />
      </div>
    </section>
  );
}

/** Three guides with the reviewing dentist. */
export function GuidesSection() {
  const { site, lang, href } = useSite();
  const posts = withText(site.posts, "title").slice(0, 3);
  if (!posts.length || !href("blog")) return null;
  return (
    <HSection eyebrow={H.guidesEyebrow} title={H.guidesTitle} more={{ to: "blog", label: H.guidesAll }}>
      <div className="grid gap-5 md:grid-cols-3">
        {posts.map((p) => {
          const to = href("post", postSlug(p));
          return (
            <article key={postSlug(p)} className="dn-tile dn-lift group relative flex flex-col p-6">
              {bi(p, "category", lang) && <p className="dn-eyebrow">{bi(p, "category", lang)}</p>}
              <h3 className="dn-h3 mt-3 !text-lg">{to ? <SiteLink to={to} className="after:absolute after:inset-0">{bi(p, "title", lang)}</SiteLink> : bi(p, "title", lang)}</h3>
              {bi(p, "excerpt", lang) && <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">{bi(p, "excerpt", lang)}</p>}
              <p className="mt-auto flex items-center justify-between gap-3 pt-5 text-[13px] text-[hsl(var(--ds-ink-soft))]">
                <span>{p.reviewedBy ? tr(DENTAL_COPY.reviewedBy, lang) + " " + p.reviewedBy : bi(p, "date", lang)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))] transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </p>
            </article>
          );
        })}
      </div>
    </HSection>
  );
}

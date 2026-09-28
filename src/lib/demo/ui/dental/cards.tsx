/**
 * DENTAL CARDS. Each takes the record's own object and reads its Hindi twin
 * through bi(). STUB LEVEL: working, plain; the kit builder owns the look.
 */

import { ArrowRight, MapPin, Star } from "lucide-react";
import type { DemoReview, DentalBranch, DentalDoctor, DentalTech, DentalTreatment } from "@/lib/cms/types";
import { bi, biList, tr, trf, type Bilingual } from "@/lib/demo/site/bilingual";
import { branchSlug, doctorSlug, treatmentSlug, useSite } from "@/lib/demo/site/context";
import { Photo } from "@/pages/site/kit/Text";
import { SiteLink } from "@/pages/site/kit/motion";
import { BookButton, openLabel } from "./actions";
import { DENTAL_COPY, DISCLAIMER } from "./copy";
import { DentalGlyph } from "./icons";
import { clock12, money, openStatus } from "./logic";

/** Photo 4:5, name, degree, specialisation, years, languages, reg. no., Book with this doctor. */
export function DoctorCard({ doctor, compact = false }: { doctor: DentalDoctor; compact?: boolean }) {
  const { lang, href } = useSite();
  const page = href("doctor", doctorSlug(doctor));
  const langs = biList(doctor, "languages", lang);
  return (
    <article className="dn-card flex h-full flex-col overflow-hidden">
      <Photo src={doctor.photo} alt={doctor.name} ratio="4 / 5" sizes="(min-width: 1024px) 280px, 80vw" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold">{page ? <SiteLink to={page}>{bi(doctor, "name", lang)}</SiteLink> : bi(doctor, "name", lang)}</h3>
        <p className="text-sm font-medium text-[hsl(var(--ds-accent))]">{bi(doctor, "qualification", lang)}</p>
        <p className="text-sm">{bi(doctor, "specialisation", lang)}</p>
        {!compact && <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{[bi(doctor, "experience", lang), langs.join(", ")].filter(Boolean).join(" · ")}</p>}
        {doctor.regNo && <p className="mt-1 text-xs text-[hsl(var(--ds-ink-soft))]">{bi(doctor, "regNo", lang)}</p>}
        <div className="mt-auto pt-4">
          <BookButton preset={{ doctor: doctorSlug(doctor) }} tone="ghost">{trf(DENTAL_COPY.bookWith, lang, { name: bi(doctor, "name", lang) })}</BookButton>
        </div>
      </div>
    </article>
  );
}

/** Icon or image, name, two-line summary, "Starting from*" or "Consultation required", link. */
export function TreatmentCard({ treatment, size = "md" }: { treatment: DentalTreatment; size?: "md" | "lg" }) {
  const { site, lang, href } = useSite();
  const to = href("treatment", treatmentSlug(treatment));
  return (
    <article className="dn-card relative flex h-full flex-col p-5" data-interactive="">
      {size === "lg" && treatment.image ? <Photo src={treatment.image} alt="" ratio="4 / 3" className="-mx-5 -mt-5 mb-4" /> : <DentalGlyph name={treatment.icon} className="h-8 w-8 text-[hsl(var(--ds-accent))]" />}
      <h3 className="mt-3 text-lg font-semibold">{to ? <SiteLink to={to} className="after:absolute after:inset-0">{bi(treatment, "name", lang)}</SiteLink> : bi(treatment, "name", lang)}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(treatment, "summary", lang)}</p>
      <p className="mt-auto pt-4 text-sm font-semibold">
        {treatment.fromPrice ? `${tr(DENTAL_COPY.startingFrom, lang)} ${money(treatment.fromPrice, site.currency)}` : tr(DISCLAIMER.consult, lang)}
        <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
      </p>
    </article>
  );
}

/** Stars, quote, first name or relation, source and date. SampleNote "reviews" goes under the list, not here. */
export function ReviewCard({ review }: { review: DemoReview }) {
  const { lang } = useSite();
  const n = Math.round(Number(review.rating) || 0);
  return (
    <figure className="dn-card flex h-full flex-col p-6">
      {n > 0 && <p className="flex gap-0.5" aria-label={`${n} / 5`}>{Array.from({ length: n }, (_, i) => <Star key={i} className="h-4 w-4 fill-[hsl(var(--ds-rule))] text-[hsl(var(--ds-rule))]" aria-hidden="true" />)}</p>}
      <blockquote className="mt-3 flex-1">{bi(review, "quote", lang)}</blockquote>
      <figcaption className="mt-4 text-sm text-[hsl(var(--ds-ink-soft))]">
        {[review.consent ? review.name : "", bi(review, "relation", lang), bi(review, "source", lang), bi(review, "date", lang)].filter(Boolean).join(" · ")}
      </figcaption>
    </figure>
  );
}

/** Branch: name, area, hours, Open now (by sessions), Directions, Book at this branch. */
const BRANCH_DETAILS: Bilingual = { en: "Clinic details", hi: "क्लिनिक की जानकारी" };

/** One branch: photo, open status, address, landmark, hours, Book here and a
 *  link to its own page. Each part renders only when the record has it, so a
 *  duplicate with its addresses cleared still shows a tidy card. */
export function BranchCard({ branch }: { branch: DentalBranch }) {
  const { lang, href } = useSite();
  const to = href("clinic", branchSlug(branch));
  const name = bi(branch, "name", lang);
  const address = biList(branch, "addressLines", lang);
  const s = openStatus(branch.sessions);
  const state = s ? openLabel(s, lang) : "";
  return (
    <article className="dn-card group relative flex h-full flex-col overflow-hidden">
      {branch.photo && <Photo src={branch.photo} alt={name} ratio="16 / 10" sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" />}
      <div className="flex flex-1 flex-col p-5">
        {state && (
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s!.state === "open" ? "bg-emerald-500" : "bg-amber-500"}`} />{state}
          </p>
        )}
        <h3 className="mt-1.5 flex items-center gap-2 text-lg font-semibold"><MapPin className="h-4 w-4 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />{name}</h3>
        {address.length > 0 && <p className="mt-2 text-sm">{address.join(", ")}</p>}
        {bi(branch, "landmark", lang) && <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(branch, "landmark", lang)}</p>}
        {bi(branch, "hours", lang) && <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(branch, "hours", lang)}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5">
          <BookButton preset={{ branch: branchSlug(branch) }} tone="ghost" />
          {to && <SiteLink to={to} className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">{tr(BRANCH_DETAILS, lang)}<ArrowRight className="h-4 w-4" aria-hidden="true" /></SiteLink>}
        </div>
      </div>
    </article>
  );
}

/** One technology item as a benefit. */
export function TechCard({ item }: { item: DentalTech }) {
  const { lang } = useSite();
  return (
    <article className="flex gap-4">
      <DentalGlyph name={item.icon} className="h-7 w-7 shrink-0 text-[hsl(var(--ds-accent))]" />
      <div>
        <h3 className="font-semibold">{bi(item, "title", lang)}</h3>
        <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{bi(item, "benefit", lang)}</p>
      </div>
    </article>
  );
}

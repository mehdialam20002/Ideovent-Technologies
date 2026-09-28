/**
 * DoctorsPage: /doctors. HOME builder, 28 Sep 2026 (the workflow gave Doctors
 * to the home builder). Spec: DENTAL-IA.md s6 doctors; filters on chains.
 * Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * Head, then filter chips (language, women dentists, clinic) once there are
 * five or more dentists, the resident team, the visiting specialists with
 * their days, the SampleNote "doctors" and the booking band.
 */

import { useState } from "react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, biList, tr, type Bilingual } from "@/lib/demo/site/bilingual";
import { branchSlug } from "@/lib/demo/site/context";
import { dentalOf } from "@/lib/demo/ui/dental";
import { SampleNote } from "@/pages/site/kit/SampleNote";
import { P } from "./home/copy";
import { DoctorTile, orderedDoctors } from "./home/people";
import { BookingBandHome } from "./home/visit";
import { HSection, PageHead } from "./home/ui";

type Filter = { key: string; label: string };

export default function DoctorsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const d = dentalOf(site);
  const all = orderedDoctors(d.doctors);
  const [f, setF] = useState("");

  /* Filters only when a filter can narrow a real choice. */
  const filters: Filter[] = [];
  if (all.length >= 5) {
    const langs = new Map<string, string>();
    all.forEach((x) => (x.languages || []).forEach((l, i) => { if (!langs.has(l)) langs.set(l, biList(x, "languages", lang)[i] || l); }));
    if (langs.size > 1) langs.forEach((label, key) => filters.push({ key: "l:" + key, label }));
    const women = all.filter((x) => x.gender === "female").length;
    if (women > 0 && women < all.length) filters.push({ key: "g:female", label: tr(P.filterFemale, lang) });
    const branches = (d.branches || []).filter((b) => b.name);
    if (branches.length > 1) branches.forEach((b) => filters.push({ key: "b:" + branchSlug(b), label: bi(b, "name", lang) }));
  }
  const match = (x: (typeof all)[number]) => {
    if (!f) return true;
    const [k, v] = [f.slice(0, 1), f.slice(2)];
    if (k === "l") return (x.languages || []).includes(v);
    if (k === "g") return x.gender === v;
    if (k === "b") return (x.branches || []).includes(v);
    return true;
  };
  const list = all.filter(match);
  const resident = list.filter((x) => !x.visiting);
  const visiting = list.filter((x) => x.visiting);
  const grid = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  const Group = ({ title, lead, items }: { title?: Bilingual; lead?: Bilingual; items: typeof all }) => items.length ? (
    <div className="mt-12 first:mt-0">
      {title && <h2 className="dn-h3 !text-2xl">{tr(title, lang)}</h2>}
      {lead && <p className="mt-2 max-w-[60ch] text-[hsl(var(--ds-ink-soft))]">{tr(lead, lang)}</p>}
      <div className={`${grid} ${title ? "mt-6" : ""}`}>{items.map((x) => <DoctorTile key={x.name} doctor={x} />)}</div>
    </div>
  ) : null;

  return (
    <>
      <PageHead
        crumbs={[{ label: tr(P.home, lang), href: ctx.href("home") }, { label: tr(ctx.page.label, lang) }]}
        eyebrow={tr(P.doctorsEyebrow, lang)}
        title={tr(P.doctorsTitle, lang)}
        lead={tr(P.doctorsLead, lang)}
      />
      <HSection>
        {filters.length > 0 && (
          <div className="-mx-4 mb-10 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={tr(P.filterBy, lang)}>
            <div className="flex w-max gap-2">
              {[{ key: "", label: tr(P.filterAll, lang) }, ...filters].map((x) => (
                <button key={x.key || "all"} type="button" aria-pressed={f === x.key} onClick={() => setF(x.key)}
                  className={`min-h-11 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${f === x.key ? "border-[hsl(var(--ds-ink))] bg-[hsl(var(--ds-ink))] text-[hsl(var(--ds-bg))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] hover:border-[hsl(var(--ds-ink)/0.4)]"}`}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {list.length === 0 && <p className="text-[hsl(var(--ds-ink-soft))]" role="status">{tr(P.noMatch, lang)}</p>}
        {visiting.length > 0 && resident.length > 0 ? (
          <>
            <Group title={P.residentTitle} items={resident} />
            <Group title={P.visitingTitle} lead={P.visitingLead} items={visiting} />
          </>
        ) : (
          <Group items={list} />
        )}
        <SampleNote block="doctors" className="mt-8" />
      </HSection>
      <BookingBandHome />
    </>
  );
}

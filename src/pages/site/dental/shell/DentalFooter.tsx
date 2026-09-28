/**
 * The dental footer: the clinic, hours, the address (when typed), each
 * doctor's registration number, the four page groups, the legal name. It pads
 * its foot by the action bar's height under 1024px (dental.css), so nothing
 * is covered. The demo marker below it is SiteShell's.
 */

import { bi, biList, tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import type { FooterGroup } from "@/lib/demo/site/pages";
import { DENTAL_COPY, DENTAL_FOOTER_GROUPS, OpenNowChip, dentalOf } from "@/lib/demo/ui/dental";
import { SiteLink } from "@/pages/site/kit/motion";

const GROUPS: FooterGroup[] = ["institute", "admissions", "resources", "legal"];

export function DentalFooter() {
  const { site, lang, pages, href } = useSite();
  const d = dentalOf(site);
  const c = site.contact || {};
  const address = biList(c, "addressLines", lang);
  const regs = (d.doctors || []).filter((x) => x.name && x.regNo);
  return (
    <footer className="dn-footer border-t border-[hsl(var(--ds-on-brand)/0.16)] bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_2fr]">
        <div className="grid content-start gap-2 text-sm">
          <p className="text-lg font-semibold [font-family:var(--ds-display)]">{site.instituteName}</p>
          <OpenNowChip />
          {bi(c, "hours", lang) && <p className="opacity-85">{bi(c, "hours", lang)}</p>}
          {address.length > 0 && <p className="opacity-85">{address.join(", ")}</p>}
          {regs.length > 0 && (
            <ul className="mt-2 text-xs opacity-75">
              {regs.map((x) => <li key={x.name}>{bi(x, "name", lang)}, {bi(x, "qualification", lang)}. {tr(DENTAL_COPY.regNo, lang)} {bi(x, "regNo", lang).replace(/^(Reg\. no\.|रजि\. नं\.)\s*/i, "")}</li>)}
            </ul>
          )}
        </div>
        <nav className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
          {GROUPS.map((g) => {
            const list = pages.filter((p) => p.footer === g && !p.path.includes(":") && p.id !== "home");
            if (!list.length) return null;
            return (
              <div key={g}>
                <p className="font-semibold">{tr(DENTAL_FOOTER_GROUPS[g], lang)}</p>
                <ul className="mt-3 grid gap-2 opacity-85">
                  {list.map((p) => {
                    const to = href(p.id);
                    return to ? <li key={p.id}><SiteLink to={to} className="hover:underline">{tr(p.label, lang)}</SiteLink></li> : null;
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
      {bi(d, "legalName", lang) && <p className="mx-auto max-w-6xl px-4 pb-8 text-xs opacity-70 sm:px-6">{bi(d, "legalName", lang)}</p>}
    </footer>
  );
}

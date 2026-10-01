/**
 * The sticky header: clinic name, the main nav (pages with nav "main", in the
 * page set's order), the phone written out and Book now. Luxury sits
 * transparent over the hero and turns solid after 24px of scroll. Phone: a
 * full-height menu sheet with big Call / WhatsApp / Book at its foot.
 * The mega menu for Treatments is the kit builder's (DENTAL-DESIGN.md s7).
 *
 * The desktop nav switches on the HEADER's own width (a container query in
 * dental.css, .dn-hdr), not the viewport's: inside the admin preview frame a
 * 1280px window leaves the site about 958px, where the full nav overflowed.
 *
 * The English / Hindi switch is in the bar at every width (1 Oct 2026), as on
 * the school and coaching headers; it was only in the menu sheet below 1180px.
 * Under 768px it takes its compact form (./LangSwitch). The sheet opens under
 * the header, so the bar's switch stays in view and the sheet has none.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { BookButton, CallLink, DENTAL_COPY, WhatsAppButton } from "@/lib/demo/ui/dental";
import { SiteLink } from "@/pages/site/kit/motion";
import { DentalLangSwitch } from "./LangSwitch";

const MORE = { en: "More", hi: "और" };

export function DentalHeader() {
  const { site, lang, pages, page, href, family, langOffered, setLang } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [sheetTop, setSheetTop] = useState(0);
  /* The phone menu sheet starts under the header wherever the header sits
     (under the demo ribbon and top bar at scroll 0), and the page behind it
     does not scroll while it is open. */
  useEffect(() => {
    if (!open) return;
    const place = () => setSheetTop(Math.max(0, Math.round(headerRef.current?.getBoundingClientRect().bottom ?? 0)));
    place();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("resize", place);
    return () => { html.style.overflow = prev; window.removeEventListener("resize", place); };
  }, [open]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  /* Main nav without Home (the name links home): five items, the rest under More. */
  const main = pages.filter((p) => p.nav === "main" && p.id !== "home");
  const shown = main.slice(0, 5);
  const extra = main.slice(5);
  const home = href("home") || "";
  const solid = family !== "luxury" || scrolled || page.id !== "home" || open;
  const toggle = langOffered ? <DentalLangSwitch lang={lang} onChange={setLang} /> : null;

  return (
    <header ref={headerRef} data-solid={solid ? "" : undefined}
      className={`sticky top-0 z-40 transition-colors ${open ? "bg-[hsl(var(--ds-bg))]" : solid ? "bg-[hsl(var(--ds-bg))]/95 shadow-[var(--dn-shadow-1)] backdrop-blur" : "bg-transparent"}`}>
      <div className="dn-hdr">
      <div className="mx-auto flex h-[var(--dn-header-h)] max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 2xl:max-w-[1400px]">
        {/* The name may shrink at every width and wraps to two lines when it has
            to, as on a phone (1 Oct 2026). It was shrink-0 and one line from
            1024px up, so a long clinic name pushed Book appointment off the right
            edge: 3 of the 40 dental demos of 28 Sep at 1440px, 14 at 1280px.
            A name that fits stays on one line, as before. Under 640px it is
            15px and may take three lines, since the language switch now
            shares the row (measured: names to about 37 characters stay whole
            at 360 and 390px, in both languages). The 3px of top padding is
            inside the clamp's overflow box, so the top matras of a Hindi
            name's first line (रि, बें) are no longer shaved off; none at the
            bottom, where it let a clamped name's next line show through. */}
        <SiteLink to={home} className="min-w-0 shrink line-clamp-3 pt-[3px] text-[15px] leading-[1.2] font-semibold sm:line-clamp-2 sm:text-lg sm:leading-tight [font-family:var(--ds-display)]">
          {site.shortName || site.instituteName}
        </SiteLink>
        <nav aria-label={tr(SHELL_COPY.menu, lang)} className="dn-hdr-nav ml-auto">
          <ul className="flex items-center gap-5 whitespace-nowrap text-sm font-medium 2xl:gap-6">
            {shown.map((p) => {
              const to = href(p.id);
              return to ? (
                <li key={p.id}>
                  <SiteLink to={to} aria-current={p.id === page.id ? "page" : undefined}
                    className="border-b-2 border-transparent py-1 aria-[current=page]:border-[hsl(var(--ds-rule))]">
                    {tr(p.label, lang)}
                  </SiteLink>
                </li>
              ) : null;
            })}
            {extra.length > 0 && (
              <li className="relative">
                <details ref={moreRef} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 py-1 [&::-webkit-details-marker]:hidden">
                    {tr(MORE, lang)}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <ul className="absolute right-0 top-full z-50 mt-3 min-w-[220px] rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] p-2 shadow-[var(--dn-shadow-2)]">
                    {extra.map((p) => {
                      const to = href(p.id);
                      return to ? (
                        <li key={p.id}>
                          <SiteLink to={to} aria-current={p.id === page.id ? "page" : undefined} onNavigate={() => moreRef.current?.removeAttribute("open")}
                            className="block rounded-[calc(var(--ds-radius)*0.6)] px-3 py-2.5 hover:bg-[hsl(var(--ds-surface-2))] aria-[current=page]:font-semibold">
                            {tr(p.label, lang)}
                          </SiteLink>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        </nav>
        <div className="dn-hdr-end ml-auto flex items-center gap-2 sm:gap-3">
          {toggle}
          <CallLink className="dn-hdr-call whitespace-nowrap text-sm" />
          <BookButton className="whitespace-nowrap max-sm:px-3.5">
            <span className="sm:hidden">{tr(DENTAL_COPY.bookShort, lang)}</span>
            <span className="max-sm:hidden">{tr(DENTAL_COPY.book, lang)}</span>
          </BookButton>
          <button type="button" className="dn-hdr-burger h-11 w-11 items-center justify-center" aria-expanded={open}
            aria-label={tr(open ? SHELL_COPY.close : SHELL_COPY.menu, lang)} onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>
      </div>
      {open && (
        <div style={{ top: sheetTop }} className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-[hsl(var(--ds-bg))] px-4 pb-8 pt-4">
          <ul className="grid gap-1 text-lg font-medium">
            {pages.filter((p) => !p.path.includes(":") && p.id !== "sitemap").map((p) => {
              const to = href(p.id);
              return to ? <li key={p.id}><SiteLink to={to} onNavigate={() => setOpen(false)} className="block py-3">{tr(p.label, lang)}</SiteLink></li> : null;
            })}
          </ul>
          <div className="mt-6 grid gap-3">
            <BookButton size="lg" />
            <WhatsAppButton size="lg" />
            <CallLink />
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * THE HEADER: utility strip, name and nav, and the phone menu, per family.
 *
 *   classic  a thin ink strip of small-caps actions; the name centred with
 *            the nav under it; condenses to a 56px crest row past 80px
 *   modern   icon pills and a solid Apply/Book button; condenses to a 60px
 *            blurred bar past 80px (16px hysteresis)
 *   warm     no strip on phones (the bottom bar carries the actions); a
 *            header that hides on scroll down and returns on scroll up
 *
 * Every link comes from ctx.pages / ctx.href, so the header never points at
 * a page this record does not show. Portal and Login are LINKS to the
 * institute's real portal and are absent when there is none.
 */

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { DemoLanguageToggle } from "@/pages/site/DemoLanguageToggle";
import { SiteLink } from "../kit/motion";

/**
 * Does the one-row nav fit beside the name and the actions? A school with
 * eleven main pages, or the same school in Hindi, needs more than a 1024px
 * laptop gives it, and a nav that does not fit pushed the Apply button off
 * the screen. The nav's own width (scrollWidth, which is the same whether it
 * is in the row or parked invisibly) is compared with the room left, so the
 * answer cannot flip back and forth. When it does not fit, the nav folds into
 * the menu button, as it does on a phone.
 */
function useNavFits(bar: RefObject<HTMLDivElement>, nav: RefObject<HTMLElement>, name: RefObject<HTMLElement>, side: RefObject<HTMLDivElement>, deps: unknown[]) {
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const b = bar.current;
    if (!b || typeof ResizeObserver === "undefined") return;
    const check = () => {
      const n = nav.current, nm = name.current, s = side.current;
      if (!n || !nm || !s) return;
      const cs = getComputedStyle(b);
      const room = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      // The name's one-line width, even where the phone bar lets it wrap.
      const prev = nm.style.cssText;
      nm.style.setProperty("text-wrap", "nowrap");
      nm.style.setProperty("white-space", "nowrap");
      const nameW = nm.scrollWidth;
      nm.style.cssText = prev;
      const need = nameW + n.scrollWidth + s.offsetWidth + gap * 2;
      setFits(need <= room);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(b);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return fits;
}

/** Condensed past 80px, back under 64px; hidden (warm) while scrolling down. */
function useScrollState() {
  const [s, set] = useState({ condensed: false, hidden: false });
  useEffect(() => {
    let last = window.scrollY;
    let condensed = false;
    const on = () => {
      const y = window.scrollY;
      if (!condensed && y > 80) condensed = true;
      else if (condensed && y < 64) condensed = false;
      const hidden = y > 160 && y > last + 4 ? true : y < last - 4 || y < 160 ? false : undefined;
      last = y;
      set((p) => ({ condensed, hidden: hidden === undefined ? p.hidden : hidden }));
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return s;
}

/** The actions for this kind: primary (Apply / Demo), portal, disclosure. */
export function usePrimaryActions() {
  const ctx = useSite();
  const { kind, lang, actions } = ctx;
  const primaryHref = kind === "school" ? ctx.href("admissions") : ctx.href("demo-class") || ctx.href("contact");
  const primaryLabel = tr(kind === "school" ? SHELL_COPY.applyNow : SHELL_COPY.demoClass, lang);
  const portalLabel = tr(kind === "school" ? SHELL_COPY.parentPortal : SHELL_COPY.login, lang);
  return { primaryHref, primaryLabel, portal: actions.portal, portalLabel, disclosure: ctx.href("disclosure") };
}

export function Header() {
  const ctx = useSite();
  const { site, family, lang, pages, page, langOffered, setLang, actions } = ctx;
  const { condensed, hidden } = useScrollState();
  const [open, setOpen] = useState(false);
  const act = usePrimaryActions();
  const name = site.shortName?.trim() && condensed ? site.shortName : site.instituteName;
  const main = pages.filter((p) => p.nav === "main" && p.id !== "home");
  const all = pages.filter((p) => p.id !== "sitemap" && p.id !== "course" && p.id !== "post");
  const home = ctx.href("home") || ctx.basePath;
  const barRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const navFits = useNavFits(barRef, navRef, nameRef, sideRef, [lang, main.length, condensed, name, family]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const strip = (
    <div className={`${family === "warm" ? "hidden sm:block" : ""} bg-[hsl(var(--ds-ink))] text-[hsl(var(--ds-bg))]`}>
      <div className={`mx-auto flex max-w-6xl items-center justify-end gap-4 px-4 text-sm sm:px-6 ${condensed ? "h-0 overflow-hidden" : "h-9"} ${family === "classic" ? "ds-smallcaps" : ""}`}>
        {actions.tel && <a href={actions.tel} className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{tr(SHELL_COPY.call, lang)}</a>}
        {actions.whatsapp && <a href={actions.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{tr(SHELL_COPY.whatsapp, lang)}</a>}
        {act.disclosure && <SiteLink to={act.disclosure}>{tr(SHELL_COPY.disclosure, lang)}</SiteLink>}
        {act.portal && <a href={act.portal} target="_blank" rel="noopener noreferrer">{act.portalLabel}</a>}
      </div>
    </div>
  );

  const navLinks = (vertical: boolean, parked = false) =>
    (vertical ? all : main).map((p) => {
      const to = ctx.href(p.id);
      if (!to) return null;
      const current = p.id === page.id;
      return (
        <SiteLink key={p.id} to={to} onNavigate={() => setOpen(false)} aria-current={current ? "page" : undefined} tabIndex={parked ? -1 : undefined}
          className={vertical ? "block py-3 text-2xl ds-display" : `whitespace-nowrap py-2 text-sm ${current ? "font-semibold text-[hsl(var(--ds-brand-ink))]" : "text-[hsl(var(--ds-ink-soft))] hover:text-[hsl(var(--ds-ink))]"}`}>
          {tr(p.label, lang)}
        </SiteLink>
      );
    });

  /* The language control sits in the bar itself at every width, never only
     behind the menu: the reader who needs Hindi is the one least likely to
     open a hamburger to look for it (see DemoLanguageToggle). */
  const toggle = langOffered ? <DemoLanguageToggle lang={lang} onChange={setLang} tone="ds" /> : null;

  const bar = family === "classic" ? (
    <div ref={condensed ? barRef : undefined} className={`mx-auto max-w-6xl px-4 text-center sm:px-6 ${condensed ? "flex h-14 items-center justify-between gap-6" : "py-4"}`}>
      {condensed ? (
        <span ref={nameRef} className="ds-display ds-nowrap min-w-0 flex-1 truncate text-left text-lg">
          <SiteLink to={home} className="text-[hsl(var(--ds-ink))]">{name}</SiteLink>
        </span>
      ) : (
        <SiteLink to={home} className="ds-display block px-12 text-2xl text-[hsl(var(--ds-ink))] lg:px-0">{name}</SiteLink>
      )}
      {/* Condensed, the crest row gets the nav only when it fits beside the
          name and the language switch (measured); otherwise the menu button. */}
      <nav ref={condensed ? navRef : undefined} aria-label={tr(SHELL_COPY.menu, lang)} aria-hidden={condensed && !navFits ? true : undefined}
        className={`hidden lg:flex ${condensed ? `gap-6 ${navFits ? "" : "invisible max-w-0 overflow-hidden"}` : "mt-2 flex-wrap justify-center gap-x-6"}`}>{navLinks(false, condensed && !navFits)}</nav>
      {condensed ? (
        <div ref={sideRef} className="flex shrink-0 items-center gap-2">
          {toggle}
          <MenuButton onClick={() => setOpen(true)} className={navFits ? "lg:hidden" : ""} />
        </div>
      ) : (
        <>
          {toggle && <div className="mt-3 flex justify-center">{toggle}</div>}
          <MenuButton onClick={() => setOpen(true)} className="absolute right-4 top-4 lg:hidden" />
        </>
      )}
    </div>
  ) : (
    <div ref={barRef} className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 ${condensed ? "h-[60px]" : "h-16"}`}>
      {/* The institute's full name is the one thing its director must see
          whole: on a phone it may take two lines (clamped), never "Gilhari
          House Play ...". The fit check measures it on one line. */}
      <span ref={nameRef} className={`ds-display line-clamp-2 min-w-0 flex-1 text-lg leading-tight ${navFits ? "lg:flex-none" : ""}`}>
        <SiteLink to={home} className="text-[hsl(var(--ds-ink))]">{name}</SiteLink>
      </span>
      <nav ref={navRef} aria-label={tr(SHELL_COPY.menu, lang)} aria-hidden={navFits ? undefined : true}
        className={`hidden items-center gap-5 lg:flex ${navFits ? "" : "invisible max-w-0 overflow-hidden"}`}>{navLinks(false, !navFits)}</nav>
      <div ref={sideRef} className="flex shrink-0 items-center gap-2">
        {toggle}
        {act.primaryHref && <span className="hidden sm:inline-flex"><SiteLink to={act.primaryHref} className="ds-btn ds-btn-cta !min-h-[40px]">{act.primaryLabel}</SiteLink></span>}
        <MenuButton onClick={() => setOpen(true)} className={navFits || !condensed ? "lg:hidden" : ""} />
      </div>
    </div>
  );

  /* A desktop reader whose nav does not fit beside the name gets it as a
     second row (the two-row header national school and coaching sites use),
     not a hamburger. Condensed, the bar keeps its 60px and the menu button
     carries the pages. */
  const secondRow = family !== "classic" && !navFits && !condensed ? (
    <nav aria-label={tr(SHELL_COPY.menu, lang)} className="mx-auto hidden max-w-6xl flex-wrap items-center gap-x-5 px-6 pb-2 lg:flex">
      {navLinks(false)}
    </nav>
  ) : null;

  return (
    <>
      <div className="ds-header sticky top-0 z-40 bg-[hsl(var(--ds-bg))]" data-condensed={condensed ? "" : undefined}
        data-hidden={family === "warm" && hidden && !open ? "" : undefined}>
        {family !== "warm" || !condensed ? strip : null}
        <div className="relative border-b border-[hsl(var(--ds-line))]">{bar}{secondRow}</div>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={tr(SHELL_COPY.menu, lang)} className="fixed inset-0 z-50 overflow-y-auto bg-[hsl(var(--ds-bg))] px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="ds-display text-lg">{site.shortName || site.instituteName}</span>
            <button type="button" onClick={() => setOpen(false)} className="flex h-12 w-12 items-center justify-center" aria-label={tr(SHELL_COPY.close, lang)}><X className="h-6 w-6" aria-hidden="true" /></button>
          </div>
          {langOffered && <div className="mt-4"><DemoLanguageToggle lang={lang} onChange={setLang} tone="ds" /></div>}
          <nav className="mt-6 divide-y divide-[hsl(var(--ds-line))]">{navLinks(true)}</nav>
          {act.portal && <a href={act.portal} target="_blank" rel="noopener noreferrer" className="mt-6 block text-lg underline">{act.portalLabel}</a>}
        </div>
      )}
    </>
  );
}

function MenuButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { lang } = useSite();
  return (
    <button type="button" onClick={onClick} className={`flex h-12 w-12 items-center justify-center ${className || ""}`} aria-label={tr(SHELL_COPY.menu, lang)}>
      <Menu className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}

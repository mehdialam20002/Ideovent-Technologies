import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE, TRANSITION } from "@/lib/motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSingleton } from "@/lib/cms/context";
import { CtaButton } from "@/components/ui/cta-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useResolvedNav, type ResolvedNavItem } from "./navPanels";

/**
 * Site header.
 *
 * The information architecture, which links are here and which are not, is
 * documented once at `navigation` in src/lib/cms/seed.ts. What this file adds is
 * the behaviour: three of the five header items open a panel, and the panel's
 * rows are read from the CMS collections rather than written down here (see
 * ./navPanels.ts).
 *
 * TWO MENUS, NOT ONE RESPONSIVE MENU
 *
 * A mega menu is a hover surface, and a phone has no hover. Below `lg` the panels
 * are not rendered at all: the same content becomes an accordion inside the
 * mobile sheet, where every row is at least 44px tall. Most of Ideovent's buyers
 * arrive on a phone, so that is the version that was built and measured first.
 *
 * ACCESSIBILITY, which is where mega menus usually fail
 *
 *   - The panel opens on focus as well as hover, so it is not mouse-only.
 *   - Escape closes it and puts focus back on the trigger that opened it.
 *   - Arrow keys move along the triggers and through the links inside a panel.
 *   - The trigger carries aria-haspopup and aria-expanded; the panel is a
 *     `role="group"` labelled by its trigger, and each column is a list labelled
 *     by its own heading.
 *   - The desktop panel has no focus trap, on purpose: it is a non-modal
 *     disclosure, so Tab walks out of it and into the rest of the page and the
 *     panel closes when focus leaves the header. The mobile sheet is the other
 *     case and does trap Tab, because it covers the screen and locks body
 *     scroll, so anything Tab reached behind it was invisible and unscrollable.
 *   - On a touch screen the first tap opens the panel instead of following the
 *     link, and the second tap follows it.
 *   - Under prefers-reduced-motion the panel appears and disappears with no
 *     transform and no duration.
 *
 * The open panel is local state in this component, so hovering a trigger
 * re-renders the header and nothing else on the page.
 */

const CLOSE_DELAY_MS = 120;

export default function Navbar() {
  const nav = useSingleton("navigation");
  const settings = useSingleton("settings");
  const items = useResolvedNav(nav.header.items);
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** The key of the header item whose panel is open, desktop only. */
  const [openKey, setOpenKey] = useState<string | null>(null);
  /** The key of the expanded accordion section in the mobile sheet. */
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  /**
   * Whether this pointer can hover. A mega menu that opens on hover is wrong on a
   * touch screen even at desktop widths (a tablet in landscape), where the first
   * tap would otherwise follow the link before the panel was ever seen.
   */
  const [canHover, setCanHover] = useState(true);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLAnchorElement>());
  const closeTimer = useRef<number | null>(null);
  /** Set while a pointer is producing the focus, so a tap does not also hover-open. */
  const pointerFocus = useRef(false);
  /**
   * The trigger Escape was last pressed on. Escape puts focus back on that trigger,
   * and without this the focus handler would immediately reopen the panel the
   * visitor just dismissed. It holds a key rather than a boolean so that escaping
   * one panel does not also swallow the next trigger's open when Tab moves on.
   */
  const escapedKey = useRef<string | null>(null);
  /**
   * "Move focus into the panel as soon as it exists", set by ArrowDown/ArrowUp on a
   * trigger whose panel is not open yet. It is consumed by the effect below rather
   * than by a requestAnimationFrame, because the frame is not a promise that React
   * has committed the panel and the focus call silently did nothing when it had not.
   */
  const focusIntent = useRef<null | "first" | "last">(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // A route change closes everything. Without this the panel stays open over the
  // page the visitor just asked for.
  useEffect(() => {
    setMobileOpen(false);
    setOpenKey(null);
    setMobileSection(null);
  }, [pathname]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  // Lock the page behind the mobile menu. Without this the body scrolls under the open
  // panel, which on a phone reads as the menu sliding away by itself.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  // Escape closes the mobile sheet and returns focus to the toggle that opened it.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  /**
   * Keep Tab inside the mobile sheet while it is open.
   *
   * The desktop mega menu deliberately has no trap: it is a non-modal disclosure
   * sitting under the bar, and Tab is meant to walk out of it and on into the
   * page. The sheet is the opposite case. It covers the screen and the effect
   * above locks body scroll, so once Tab reached the last row focus moved into
   * the page underneath, which is both hidden behind the sheet and unscrollable
   * while the lock is on. Measured before this was added: the sheet held fifteen
   * focusable rows and the sixteenth Tab landed on a link in the page behind it,
   * with the sheet still open and the body still locked.
   *
   * The cycle includes the toggle in the bar, because while the sheet is open
   * that button is the visible X and it sits outside the panel element. Focus
   * that has somehow left the set is pulled back to whichever end Tab was
   * heading for.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = mobilePanelRef.current;
      if (!panel) return;
      const focusable = [
        toggleRef.current as HTMLElement | null,
        ...Array.from(
          panel.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
          )
        ),
      ].filter((el): el is HTMLElement => !!el && el.getClientRects().length > 0);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const at = active ? focusable.indexOf(active) : -1;

      if (at === -1) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openPanel = useCallback(
    (key: string) => {
      cancelClose();
      setOpenKey(key);
    },
    [cancelClose]
  );

  /*
    A short delay before closing, because the path from a trigger to the row of
    links under it crosses a few pixels of nothing. Closing on the first mouseleave
    makes a panel that cannot be reached with a mouse moving diagonally.
  */
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenKey(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const closeAndFocusTrigger = useCallback((key: string | null) => {
    cancelClose();
    setOpenKey(null);
    escapedKey.current = key;
    if (key) triggerRefs.current.get(key)?.focus();
  }, [cancelClose]);

  const openItem = openKey ? items.find((i) => i.key === openKey) : undefined;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  /** Move focus along the row of header triggers. */
  const focusTriggerAt = (index: number) => {
    const list = items.map((i) => triggerRefs.current.get(i.key)).filter(Boolean) as HTMLAnchorElement[];
    if (!list.length) return;
    const next = list[(index + list.length) % list.length];
    next?.focus();
  };

  /**
   * The links inside the open panel, in DOM order, for arrow-key movement.
   *
   * Looked up by id rather than through panelRef. The panel is mounted by
   * AnimatePresence in the same tick the arrow key is handled, and the ref is not
   * reliably populated by the time the focus call runs; the id is on the element
   * either way.
   */
  const panelLinks = (key: string | null = openKey) => {
    const el = key ? document.getElementById(`nav-panel-${key}`) : panelRef.current;
    return Array.from(el?.querySelectorAll<HTMLAnchorElement>("a[href]") || []);
  };

  const focusInPanel = (key: string, which: "first" | "last") => {
    const links = panelLinks(key);
    if (!links.length) return;
    (which === "first" ? links[0] : links[links.length - 1]).focus();
  };

  // Consumes focusIntent once the panel this render opened is committed.
  useEffect(() => {
    if (!openKey || !focusIntent.current) return;
    const which = focusIntent.current;
    focusIntent.current = null;
    focusInPanel(openKey, which);
  });

  const onTriggerKeyDown = (e: React.KeyboardEvent, entry: ResolvedNavItem, index: number) => {
    const { key } = e;
    if (key === "ArrowRight") {
      e.preventDefault();
      focusTriggerAt(index + 1);
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      focusTriggerAt(index - 1);
    } else if (key === "Escape") {
      if (openKey) {
        e.preventDefault();
        closeAndFocusTrigger(entry.key);
      }
    } else if ((key === "ArrowDown" || key === "ArrowUp") && entry.panel) {
      e.preventDefault();
      escapedKey.current = null;
      const want = key === "ArrowDown" ? "first" : "last";
      if (openKey === entry.key) {
        // Already open, so the links are in the DOM and can be focused now.
        focusInPanel(entry.key, want);
      } else {
        focusIntent.current = want;
        openPanel(entry.key);
      }
    }
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const { key } = e;
    if (key === "Escape") {
      e.preventDefault();
      closeAndFocusTrigger(openKey);
      return;
    }
    const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (key in moves) {
      const links = panelLinks();
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (at === -1) return;
      e.preventDefault();
      links[(at + moves[key] + links.length) % links.length]?.focus();
      return;
    }
    if (key === "Home" || key === "End") {
      const links = panelLinks();
      if (!links.length) return;
      e.preventDefault();
      (key === "Home" ? links[0] : links[links.length - 1])?.focus();
    }
  };

  /*
    Focus leaving the header closes the panel. This is what keeps Tab working
    normally: there is no trap, the visitor simply tabs past the last link in the
    panel and out into the page, and the panel gets out of the way behind them.
  */
  const onDesktopBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && desktopNavRef.current?.contains(next)) return;
    cancelClose();
    setOpenKey(null);
  };

  /*
    The mobile panel's tail. Sourced from the footer columns rather than a second
    hard-coded list, so one CMS edit keeps the phone menu and the footer in step.
    Anything already reachable above, in the header row or inside one of the
    accordion sections, is dropped so nothing appears twice in the same sheet; a
    column that empties out that way disappears with it.
  */
  const secondaryColumns = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of items) {
      seen.add(entry.item.href);
      for (const group of entry.panel?.groups || []) for (const l of group.links) seen.add(l.href);
      for (const l of entry.panel?.footer || []) seen.add(l.href);
    }
    return nav.footer.columns
      .map((col) => ({
        heading: col.heading,
        links: col.links.filter((l) => {
          if (seen.has(l.href)) return false;
          seen.add(l.href);
          return true;
        }),
      }))
      .filter((col) => col.links.length > 0);
  }, [items, nav.footer.columns]);

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.18, ease: EASE },
      };

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "py-2.5" : "py-4")}>
      <div
        ref={desktopNavRef}
        className="container-page relative"
        onBlur={onDesktopBlur}
        onMouseLeave={() => canHover && scheduleClose()}
      >
        <nav
          aria-label="Primary"
          className={cn(
            "flex items-center justify-between gap-4 rounded-full px-4 pl-5 transition-all duration-300",
            // The HEIGHT follows the scroll only. An open panel gives the bar its
            // solid chrome so the two read as one object, but it must not resize
            // it: at the top of the page that moved the trigger out from under the
            // pointer that had just opened it, and the panel flickered shut again.
            scrolled ? "h-16" : "h-20",
            scrolled || openKey
              ? "border border-border/70 bg-background/70 backdrop-blur-xl shadow-lg shadow-black/5"
              : "border border-transparent"
          )}
        >
          <Link
            to="/"
            className="flex items-center rounded-full transition-opacity hover:opacity-80 active:opacity-60"
            aria-label={`${settings.siteName}, home`}
            aria-current={pathname === "/" ? "page" : undefined}
            onFocus={() => setOpenKey(null)}
          >
            {/*
              THE MARK ALONE, AT A SIZE ITS OWN BRAND BOOK ALLOWS.

              This was `settings.logo`, which is the STACKED LOCKUP: the iV mark
              over IDEOVENT over TECHNOLOGIES. 01-brand/logo/LOGO-USAGE.md §4
              gives that file a screen minimum of 180px WIDE, and says that below
              260px wide you use the horizontal lockup, and below that the mark
              alone. It was rendering here at 56px wide, under a third of its own
              floor, so TECHNOLOGIES (a 1.45-unit hairline on a 12-unit cap) was a
              grey smear and IDEOVENT was four pixels tall.

              It was also smaller than it looked. Measured off the PNG's alpha
              channel: public/ideovent.png is 256 x 256 with ink only in rows
              71..189 and columns 62..195, so 54% of the file is transparent
              canvas and the visible lockup inside a 56px box was 26px tall. The
              header reserved 56px and painted 26px of logo into it, which is why
              the brand read as an afterthought beside 14px navigation labels.

              /ideovent-mark.svg is the master mark with the canvas cropped to the
              artwork, so `h-9` paints a 36px mark rather than reserving 36px and
              painting 17px. Vector, so it is sharp at both header sizes and on a
              2x screen, and 2.2 KB against the PNG's 5.2 KB.

              The wordmark is not lost, because at 56px it was never legible. The
              company name is the link's accessible name, the <title> of every
              page, and the footer lockup, which is the one place on the site wide
              enough to set the full stacked lockup honestly.

              `settings.logo` is untouched and still points at the full lockup;
              the footer and the two pitch headers set it beside real text, which
              is the composition the brand book calls the horizontal lockup.

              alt="" because the link already carries the accessible name; a
              repeated alt makes a screen reader announce the company twice on
              every page. width/height are the artwork's own ratio (199 x 149.43),
              so the box is reserved before the file arrives and the header does
              not jump.
            */}
            <img
              src={`${import.meta.env.BASE_URL}ideovent-mark.svg`}
              alt=""
              width={199}
              height={149}
              decoding="async"
              className={cn(
                "w-auto object-contain transition-all duration-200 dark:brightness-0 dark:invert",
                scrolled ? "h-8" : "h-9"
              )}
            />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {items.map((entry, index) => {
              const { item, key, panel } = entry;
              const expanded = openKey === key;
              return (
                <li
                  key={key}
                  onMouseEnter={() => (panel && canHover ? openPanel(key) : scheduleClose())}
                >
                  <Link
                    to={item.href}
                    ref={(el) => {
                      if (el) triggerRefs.current.set(key, el);
                      else triggerRefs.current.delete(key);
                    }}
                    id={`nav-trigger-${key}`}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    aria-haspopup={panel ? true : undefined}
                    aria-expanded={panel ? expanded : undefined}
                    aria-controls={panel ? `nav-panel-${key}` : undefined}
                    onKeyDown={(e) => onTriggerKeyDown(e, entry, index)}
                    onPointerDown={() => {
                      pointerFocus.current = true;
                      window.setTimeout(() => (pointerFocus.current = false), 300);
                    }}
                    onFocus={() => {
                      // A pointer-driven focus is handled by hover (mouse) or by the
                      // click below (touch). Opening here as well would make the first
                      // tap on a touch screen both open and follow the link.
                      if (pointerFocus.current) return;
                      if (escapedKey.current === key) {
                        escapedKey.current = null;
                        return;
                      }
                      escapedKey.current = null;
                      if (panel) openPanel(key);
                      else setOpenKey(null);
                    }}
                    onClick={(e) => {
                      // Touch: the first tap opens the panel, the second follows the link.
                      if (panel && !canHover && openKey !== key) {
                        e.preventDefault();
                        openPanel(key);
                      }
                    }}
                    className={cn(
                      // hover: a real background change, not only a colour shift, so the
                      // target reads as a button-sized thing. active: pressed-down tint,
                      // which a pointer user expects.
                      //
                      // `group` is for the CURRENT page's item. Its own background is
                      // painted UNDER the pill below, which is absolutely positioned at
                      // inset-0, so `hover:bg-*` here is invisible on exactly the one
                      // item that carries a pill. Hovering every interactive element on
                      // /work and /pricing and diffing the computed styles, the
                      // current-page nav link was the only element on either page that
                      // answered the pointer with nothing at all. The pill itself now
                      // takes the hover and the press, through this group.
                      "group relative inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                      "active:bg-muted/80",
                      isActive(item.href) || expanded
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {isActive(item.href) && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-muted transition-colors duration-200
                                   group-hover:bg-muted-foreground/20 group-active:bg-muted-foreground/30"
                        /* Was a spring (stiffness 400, damping 32). A spring is a
                           different curve from the one every other transition on the
                           site uses, and the pill is the most-seen moving thing here,
                           so it was the one element that did not share the site's
                           motion. Same curve as everything else now. */
                        transition={reduce ? { duration: 0 } : TRANSITION}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                    {panel && (
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "relative z-10 h-3.5 w-3.5 transition-transform duration-200",
                          expanded && "rotate-180",
                          reduce && "transition-none"
                        )}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <div className="hidden lg:block">
              <CtaButton cta={nav.header.cta} size="default" />
            </div>
            <button
              ref={toggleRef}
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/60
                         transition-colors duration-200 hover:bg-muted active:bg-muted/70 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {/* ── The desktop panel ──────────────────────────────────────────────
            One panel element for whichever trigger is open, rather than one per
            item, so only the open panel's links are ever in the tab order. It
            spans the full content column under the bar. */}
        <AnimatePresence>
          {openItem?.panel && (
            <motion.div
              key={openItem.key}
              {...panelMotion}
              ref={panelRef}
              id={`nav-panel-${openItem.key}`}
              role="group"
              aria-labelledby={`nav-trigger-${openItem.key}`}
              onKeyDown={onPanelKeyDown}
              onMouseEnter={cancelClose}
              className="absolute inset-x-0 top-full z-40 hidden px-5 pt-2 sm:px-8 lg:block lg:px-10"
            >
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-border bg-background/95 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl">
                <div
                  className={cn(
                    "grid gap-x-8 gap-y-6",
                    openItem.panel.groups.length >= 4 ? "grid-cols-4" : openItem.panel.groups.length === 3 ? "grid-cols-3" : "grid-cols-2"
                  )}
                >
                  {openItem.panel.groups.map((group) => {
                    const headingId = `nav-group-${openItem.key}-${group.heading.replace(/\W+/g, "-").toLowerCase()}`;
                    return (
                      <div key={group.heading} className="min-w-0">
                        <h2 id={headingId} className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.heading}
                        </h2>
                        <ul aria-labelledby={headingId} className="mt-2 flex flex-col">
                          {group.links.map((link) => (
                            <li key={link.href}>
                              <Link
                                to={link.href}
                                aria-current={pathname === link.href ? "page" : undefined}
                                className="group/link block rounded-2xl px-3 py-2.5 transition-colors duration-200 hover:bg-muted/70 focus-visible:bg-muted/70 active:bg-muted"
                              >
                                <span className="block text-sm font-medium text-foreground">{link.label}</span>
                                {/* Deliberately NOT clamped. At 1024px these columns are
                                    about 300px wide and line-clamp-2 cut the end off the
                                    longer lines, including the "Built by our founder at
                                    Witness The Fitness Pvt. Ltd." attribution that
                                    _assets/FACTS.md requires to travel with that card. */}
                                {link.description && (
                                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                    {link.description}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {openItem.panel.footer.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/70 px-3 pt-4">
                    {openItem.panel.footer.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="rounded-full text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:text-primary"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── The mobile sheet ───────────────────────────────────────────────
          The same content as the panels, as an accordion. Every row is at least
          44px tall, which is the reason the link and the expander are separate
          controls rather than one row that does both: a 24px chevron inside a
          link is not a tap target. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            id="mobile-menu"
            ref={mobilePanelRef}
            className="container-page lg:hidden"
          >
            <div className="mt-2 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border border-border bg-background/95 p-4 backdrop-blur-xl shadow-xl">
              <ul className="flex flex-col">
                {items.map(({ item, key, panel }) => {
                  const expanded = mobileSection === key;
                  return (
                    <li key={key} className="border-b border-border/50 last:border-b-0">
                      <div className="flex items-stretch gap-1">
                        <Link
                          to={item.href}
                          aria-current={isActive(item.href) ? "page" : undefined}
                          className={cn(
                            "flex min-h-[44px] flex-1 items-center rounded-2xl px-4 text-base font-medium transition-colors duration-200 active:bg-muted",
                            isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          {item.label}
                        </Link>
                        {panel && (
                          <button
                            type="button"
                            onClick={() => setMobileSection(expanded ? null : key)}
                            aria-expanded={expanded}
                            aria-controls={`mobile-section-${key}`}
                            aria-label={expanded ? `Hide ${item.label} pages` : `Show ${item.label} pages`}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground
                                       transition-colors duration-200 hover:bg-muted/60 hover:text-foreground active:bg-muted"
                          >
                            <ChevronDown
                              aria-hidden="true"
                              className={cn("h-5 w-5 transition-transform duration-200", expanded && "rotate-180", reduce && "transition-none")}
                            />
                          </button>
                        )}
                      </div>

                      {panel && expanded && (
                        <div id={`mobile-section-${key}`} className="pb-2">
                          {panel.groups.map((group) => {
                            const headingId = `mobile-group-${key}-${group.heading.replace(/\W+/g, "-").toLowerCase()}`;
                            return (
                              <div key={group.heading} className="mt-1">
                                <h2 id={headingId} className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  {group.heading}
                                </h2>
                                <ul aria-labelledby={headingId} className="flex flex-col">
                                  {group.links.map((link) => (
                                    <li key={link.href}>
                                      {/* The phone carries the same line the panel does.
                                          Dropping it here would publish WTF Go without the
                                          employer named, which is the one thing the
                                          attribution rule does not allow. */}
                                      <Link
                                        to={link.href}
                                        aria-current={pathname === link.href ? "page" : undefined}
                                        className="flex min-h-[44px] flex-col justify-center rounded-2xl px-4 py-2 pl-6 text-sm font-medium text-muted-foreground
                                                   transition-colors duration-200 hover:bg-muted/60 hover:text-foreground active:bg-muted"
                                      >
                                        <span className="text-foreground">{link.label}</span>
                                        {link.description && (
                                          <span className="mt-0.5 text-xs font-normal leading-relaxed text-muted-foreground">
                                            {link.description}
                                          </span>
                                        )}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                          {panel.footer.map((link) => (
                            <Link
                              key={link.href}
                              to={link.href}
                              className="mt-1 flex min-h-[44px] items-center rounded-2xl px-4 pl-6 text-sm font-medium text-foreground underline-offset-4
                                         transition-colors duration-200 hover:bg-muted/60 active:bg-muted"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/*
                Everything the header and its panels do not carry, grouped exactly
                as the footer groups it, so the policies and anything else that is
                footer-only stays reachable from a phone without typing a URL.
              */}
              {secondaryColumns.map((col) => {
                const headingId = `mobile-col-${col.heading.replace(/\W+/g, "-").toLowerCase()}`;
                return (
                  <div key={col.heading} className="mt-4 border-t border-border/70 pt-3">
                    <h2 id={headingId} className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {col.heading}
                    </h2>
                    <ul aria-labelledby={headingId} className="mt-1 flex flex-col">
                      {col.links.map((item) => (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            aria-current={isActive(item.href) ? "page" : undefined}
                            className={cn(
                              "flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-medium transition-colors duration-200 active:bg-muted",
                              isActive(item.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              <div className="mt-4 flex items-center gap-3 border-t border-border/70 px-1 pt-4">
                <CtaButton cta={nav.header.cta} size="lg" className="flex-1" />
                {/* h-11 rather than the default h-9: inside the sheet this is a tap
                    target on a phone, and 36px is under the 44px minimum. */}
                <ThemeToggle className="h-11 w-11" />
              </div>

              {/* A second, unambiguous way out. The toggle at the top of the screen is
                  off-screen once the sheet has been scrolled, and on a tall menu that
                  leaves a phone visitor with no visible close. */}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  toggleRef.current?.focus();
                }}
                className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-border
                           text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/60
                           hover:text-foreground active:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Close menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

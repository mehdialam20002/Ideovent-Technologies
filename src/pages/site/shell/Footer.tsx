/**
 * THE FOOTER (four groups, generated from the visible pages) AND THE PHONE
 * BOTTOM BAR (Call, WhatsApp, Apply or Demo, 56px targets).
 *
 * The groups follow Mehdi's blueprint: School, Admissions, Resources, Legal
 * (coaching: Institute, Join, Students, Policies). A group with no visible
 * page is not rendered. Coaching lists each course page under Join, because
 * the course pages are the ones a parent is looking for.
 */

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { courseSlug, useSite } from "@/lib/demo/site/context";
import { FOOTER_GROUP_COPY, SHELL_COPY } from "@/lib/demo/site/copy";
import type { FooterGroup } from "@/lib/demo/site/pages";
import { SiteLink } from "../kit/motion";
import { usePrimaryActions } from "./Header";

const GROUPS: FooterGroup[] = ["institute", "admissions", "resources", "legal"];

export function Footer() {
  const ctx = useSite();
  const { site, kind, lang, pages, actions } = ctx;
  const links = (g: FooterGroup) => {
    const out: { key: string; to: string; label: string }[] = [];
    for (const p of pages) {
      if (p.footer !== g || p.id === "home" || p.id === "post") continue;
      if (p.id === "course") {
        for (const c of site.courses || []) {
          const to = ctx.href("course", courseSlug(c));
          if (to && c.name) out.push({ key: `course-${courseSlug(c)}`, to, label: bi(c, "name", lang) });
        }
        continue;
      }
      const to = ctx.href(p.id);
      if (to) out.push({ key: p.id, to, label: tr(p.label, lang) });
    }
    return out;
  };

  return (
    <footer className="ds-footer mt-16 border-t border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface-2))] pb-24 sm:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <p className="ds-display text-lg">{site.instituteName}</p>
          {site.city && <p className="mt-1 text-[hsl(var(--ds-ink-soft))]">{[site.city, site.state].filter(Boolean).join(", ")}</p>}
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {actions.tel && <a href={actions.tel} className="underline-offset-4 hover:underline">{site.contact?.phone}</a>}
            {actions.email && <a href={actions.email} className="underline-offset-4 hover:underline">{site.contact?.email}</a>}
            <a href={actions.map} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{tr(SHELL_COPY.findUs, lang)}</a>
          </div>
        </div>
        {GROUPS.map((g) => {
          const list = links(g);
          if (!list.length) return null;
          return (
            <nav key={g} aria-label={tr(FOOTER_GROUP_COPY[kind][g], lang)}>
              <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{tr(FOOTER_GROUP_COPY[kind][g], lang)}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {list.map((l) => <li key={l.key}><SiteLink to={l.to} className="underline-offset-4 hover:underline">{l.label}</SiteLink></li>)}
              </ul>
            </nav>
          );
        })}
      </div>
      <p className="mx-auto max-w-6xl px-4 text-xs text-[hsl(var(--ds-ink-soft))] sm:px-6">
        {trf(SHELL_COPY.allRights, lang, { name: site.instituteName, city: site.city || "" }).replace(/,\s*$/, "")}
      </p>
    </footer>
  );
}

/** Phones only. Slides up once the reader has scrolled past the first screen. */
export function BottomBar() {
  const { actions, lang } = useSite();
  const act = usePrimaryActions();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const on = () => setShown(window.scrollY > 240);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const items = [
    actions.tel && { key: "call", href: actions.tel, label: tr(SHELL_COPY.call, lang), icon: <Phone className="h-5 w-5" aria-hidden="true" />, ext: true },
    actions.whatsapp && { key: "wa", href: actions.whatsapp, label: tr(SHELL_COPY.whatsapp, lang), icon: <MessageCircle className="h-5 w-5" aria-hidden="true" />, ext: true },
  ].filter(Boolean) as { key: string; href: string; label: string; icon: JSX.Element; ext: boolean }[];
  if (!items.length && !act.primaryHref) return null;
  return (
    <div className="ds-bottombar fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] sm:hidden"
      data-hidden={shown ? undefined : ""} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex">
        {items.map((it) => (
          <a key={it.key} href={it.href} {...(it.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold">
            {it.icon}{it.label}
          </a>
        ))}
        {act.primaryHref && (
          <SiteLink to={act.primaryHref} className="flex min-h-[56px] flex-[1.4] items-center justify-center bg-[hsl(var(--ds-cta))] px-3 text-sm font-bold text-[hsl(var(--ds-on-cta))]">
            {act.primaryLabel}
          </SiteLink>
        )}
      </div>
    </div>
  );
}

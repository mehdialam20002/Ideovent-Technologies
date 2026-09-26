/**
 * THE MULTI-PAGE DEMO SITE SHELL. Lazy: DemoSiteView imports it only for a
 * record on a multi-page theme, so the entry chunk never carries it, and it
 * imports each page through the registry's own dynamic import, so every page
 * is its own chunk.
 *
 * It decides, once per render: the theme and family, the language, the
 * motion level, today's date, the visible pages, the current page and its
 * parameter, and every address. Pages receive all of it as `ctx`
 * (src/lib/demo/site/context.ts) and decide nothing of the sort themselves.
 *
 * The Ideovent ribbon and marker (./DemoMarker) are on every page, outside
 * the institute's palette, exactly as on the single-page templates.
 */

import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import type { DemoSite } from "@/lib/cms/types";
import { DEMO_HINDI_CSS, useDemoLangControl } from "@/lib/demo/language";
import { tr } from "@/lib/demo/site/bilingual";
import { SiteCtx, courseSlug, postSlug, type SiteContext, type SitePageProps } from "@/lib/demo/site/context";
import { matchPage, visiblePages, type SitePageDef } from "@/lib/demo/site/pages";
import type { SitePageId } from "@/lib/demo/site/pageSets";
import { siteThemeFor, siteThemeStyle } from "@/lib/demo/site/themes";
import { DemoMarker, DemoRibbon } from "./DemoMarker";
import { PageStub } from "./kit/PageStub";
import { Header } from "./shell/Header";
import { BottomBar, Footer } from "./shell/Footer";
import "./site.css";

/* One lazy component per page definition, made once. */
const LAZY = new Map<SitePageDef, LazyExoticComponent<ComponentType<SitePageProps>>>();
function pageComponent(def: SitePageDef) {
  let c = LAZY.get(def);
  if (!c) {
    c = lazy(def.load);
    LAZY.set(def, c);
  }
  return c;
}

function useReducedMotion(): boolean {
  const q = "(prefers-reduced-motion: reduce)";
  const [r, set] = useState(() => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const m = window.matchMedia(q);
      const on = () => set(m.matches);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    } catch {
      return undefined;
    }
  }, []);
  return r;
}

const digits = (s?: string) => (s || "").replace(/\D/g, "");

/**
 * The record as the pages read it in this language. On the Hindi page, a
 * Hindi name (`hi.instituteName`, typed in the Duplicate dialog or the
 * editor) replaces the English one everywhere the institute names itself:
 * header, masthead, footer, page titles. The English short name goes too,
 * since it would put Latin letters back in the Hindi nav. No Hindi name: the
 * record as it is. The Ideovent ribbon and marker read this copy too, since
 * their Hindi sentences name the institute (a Latin name there was a leak).
 */
function inLanguage(site: DemoSite, lang: string): DemoSite {
  if (lang !== "hi") return site;
  const hiName = (site.hi?.instituteName || "").trim();
  /* The city and state print in the footer, the contact page and the "since"
     lines; their Hindi twins replace them the same way, English kept when
     there is no twin. Map queries read the record, not this copy. */
  const hiCity = (site.hi?.city || "").trim();
  const hiState = (site.hi?.state || "").trim();
  if (!hiName && !hiCity && !hiState) return site;
  return {
    ...site,
    ...(hiName ? { instituteName: hiName, shortName: "" } : {}),
    ...(hiCity && (site.city || "").trim() ? { city: hiCity } : {}),
    ...(hiState && (site.state || "").trim() ? { state: hiState } : {}),
  };
}

export default function SiteShell({ site: record, basePath, rest, isPreview }: {
  site: DemoSite;
  /** "/site/<slug>" or an admin preview base, no trailing slash. */
  basePath: string;
  /** The path after the base, e.g. "admissions" or "courses/jee-two-year". */
  rest: string;
  isPreview: boolean;
}) {
  const theme = siteThemeFor(record.kind, record.theme)!;
  const { lang, setLang, offered } = useDemoLangControl(record);
  const site = useMemo(() => inLanguage(record, lang), [record, lang]);
  const reduced = useReducedMotion();
  const today = new Date().toLocaleDateString("en-CA");
  const pages = useMemo(() => visiblePages(site, today), [site, today]);
  const match = matchPage(site.kind, rest);

  const ctx: SiteContext | null = useMemo(() => {
    if (!match) return null;
    const href = (id: SitePageId, param?: string): string | null => {
      const def = pages.find((p) => p.id === id);
      if (!def) return null;
      if (def.path.includes(":")) {
        if (!param) return null;
        if (id === "course" && !(site.courses || []).some((c) => c.name && courseSlug(c) === param)) return null;
        if (id === "post" && !(site.posts || []).some((p) => p.title && postSlug(p) === param)) return null;
        return `${basePath}/${def.path.replace(/:[a-z]+/, encodeURIComponent(param))}`;
      }
      return def.path ? `${basePath}/${def.path}` : basePath;
    };
    const c = site.contact || {};
    const mapQuery = c.mapQuery || [record.instituteName, record.city].filter(Boolean).join(", ");
    return {
      site, kind: site.kind, lang, setLang, langOffered: offered,
      theme, family: theme.family, variant: theme.variant,
      motion: reduced || match.def.still ? "none" : theme.motion,
      today, pages, page: match.def, param: match.param, basePath, isPreview, href,
      actions: {
        tel: digits(c.phone) ? `tel:${c.phone!.replace(/[^\d+]/g, "")}` : undefined,
        whatsapp: digits(c.whatsapp) ? `https://wa.me/${digits(c.whatsapp)}` : undefined,
        email: (c.email || "").trim() ? `mailto:${c.email!.trim()}` : undefined,
        portal: (site.portalLinks || []).find((l) => (l.url || "").trim())?.url,
        map: (c.mapUrl || "").trim() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
      },
    };
  }, [match?.def, match?.param, pages, site, record, lang, setLang, offered, theme, reduced, today, basePath, isPreview]);

  if (!match || !ctx) return <Navigate to={basePath} replace />;

  const shown = pages.includes(match.def);
  const Page = shown ? pageComponent(match.def) : null;
  const pageTitle = match.def.id === "home" ? site.instituteName : `${tr(match.def.label, lang)} | ${site.instituteName}`;

  return (
    <SiteCtx.Provider value={ctx}>
      <div className="ds-site" data-family={theme.family} data-variant={theme.variant} data-face={theme.face}
        data-kind={site.kind} lang={lang === "hi" ? "hi-IN" : undefined} style={siteThemeStyle(theme)}>
        {lang === "hi" && <style>{DEMO_HINDI_CSS}</style>}
        <DemoRibbon site={site} />
        <Header />
        <main id="ds-main">
          {/* A full screen, not 70vh: under the ribbon and header, 70vh left the
              footer's top edge on screen at 390x844 and the page chunk then
              pushed it out (CLS 0.053 on /site/<slug>). */}
          <Suspense fallback={<div className="min-h-screen" />}>
            {Page ? <Page site={site} ctx={ctx} /> : <PageStub site={site} ctx={ctx} />}
          </Suspense>
        </main>
        <Footer />
        <BottomBar />
        <DemoMarker site={site} />
      </div>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    </SiteCtx.Provider>
  );
}

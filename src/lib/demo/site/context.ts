/**
 * WHAT EVERY PAGE RECEIVES. The shell builds one SiteContext per render and
 * passes it to the page as `ctx`, and also provides it through React context
 * so the kit components (hero, section, card, empty state) can read it
 * without props being threaded through every layer.
 */

import { createContext, useContext } from "react";
import type { DemoKind, DemoSite } from "@/lib/cms/types";
import type { DemoLang } from "../language";
import type { DesignFamily } from "../templates/families";
import type { HeroVariant, SiteTheme } from "./themes";
import type { SitePageDef } from "./pages";
import type { SitePageId } from "./pageSets";

/**
 * "full": everything. "light": reveals only (aangan, register).
 * "none": prefers-reduced-motion, or a still page (Disclosure, Policies,
 * Contact). Kit components read this; pages never check the media query.
 */
export type MotionLevel = "full" | "light" | "none";

export interface SiteContext {
  site: DemoSite;
  kind: DemoKind;
  lang: DemoLang;
  setLang: (lang: DemoLang) => void;
  /** False on an international record: no language control renders. */
  langOffered: boolean;
  theme: SiteTheme;
  family: DesignFamily;
  variant: HeroVariant;
  motion: MotionLevel;
  /** ISO date of today, for expiry. One clock per render. */
  today: string;
  /** The pages this record shows, in nav order. The ONLY source of links. */
  pages: SitePageDef[];
  /** The page being rendered and its parameter (a course or post slug). */
  page: SitePageDef;
  param?: string;
  /** "/site/<slug>", "/admin/preview/site/<slug>" or "/admin/preview/template/<id>". */
  basePath: string;
  /** True inside the admin: no open is recorded, the page is not public. */
  isPreview: boolean;
  /**
   * The address of a page, or null when this record does not show it. Link
   * only through this, and render nothing when it returns null: that is how
   * the nav never points at a hollow page.
   */
  href: (id: SitePageId, param?: string) => string | null;
  /** Contact actions derived from the record, each absent when there is no number. */
  actions: {
    tel?: string;
    whatsapp?: string;
    email?: string;
    /** The institute's real portal, first portal link with a URL. */
    portal?: string;
    /** Map search or map link. Always present: built from name and city. */
    map: string;
  };
}

export interface SitePageProps {
  site: DemoSite;
  ctx: SiteContext;
}

export const SiteCtx = createContext<SiteContext | null>(null);

/** The current SiteContext. Only valid inside the site shell. */
export function useSite(): SiteContext {
  const v = useContext(SiteCtx);
  if (!v) throw new Error("useSite() outside the demo site shell");
  return v;
}

/** URL slug from a name: "JEE Main, 2 year" -> "jee-main-2-year". */
export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** A course's own slug: its `slug`, else one derived from its English name. */
export function courseSlug(c: { slug?: string; name: string }): string {
  return (c.slug || "").trim() || slugify(c.name);
}

/** A post's own slug. */
export function postSlug(p: { slug?: string; title: string }): string {
  return (p.slug || "").trim() || slugify(p.title);
}

/* ── Dental slugs (28 Sep 2026) ── */

/** A treatment's slug (required on the record; derived only as a fallback). */
export function treatmentSlug(t: { slug?: string; name: string }): string {
  return (t.slug || "").trim() || slugify(t.name);
}

/** A doctor's slug: their `slug`, else one from the name without "Dr.". */
export function doctorSlug(d: { slug?: string; name: string }): string {
  return (d.slug || "").trim() || slugify(d.name.replace(/^\s*dr\.?\s+/i, ""));
}

/** A branch's slug. */
export function branchSlug(b: { slug?: string; name: string }): string {
  return (b.slug || "").trim() || slugify(b.name);
}

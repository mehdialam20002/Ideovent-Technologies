/**
 * WHAT EACH ADDRESS READS FROM THE CMS (2 Oct 2026).
 *
 * Until this date a public page read every public row of the `content` table and a
 * demo read the WHOLE table: on 2 Oct 2026 that was 132 demo sites, 9.0 MB of JSON,
 * 2.85 MB over the wire, to show ONE demo to ONE director on a phone. Now an address
 * names what it reads, and the provider (./loader.ts) fetches only that:
 *
 *   /admin, /crm, the CRM host   everything, with the signed-in session (unchanged)
 *   /site/<slug>/...             that demo's row, plus the three keys <Seo> reads
 *   /pitch/<slug>, /<slug>       that pitch page's row, plus the site chrome (the
 *                                bare /<slug> is also every unknown address, so it
 *                                must be able to draw the 404 page)
 *   a known public page          the site chrome plus what that page itself reads
 *   anything else                every public key: correct first, small second
 *
 * KEEP THE TABLE HONEST. It is a prediction, so the request can start before React
 * has rendered anything. useCollection() and useSingleton() still ask for the key
 * they read, so a page that starts reading a new key still gets it, one request
 * later. In development the console names the route and key when that happens:
 * add the key here and it goes back to one request. useContent() and useCms().data
 * do NOT ask for anything, so a page that reads data.<key> directly must have that
 * key in its row of this table.
 */
import type { ContentData } from "./types";
import { crmMovedOut, isCrmHost } from "@/lib/host";
import { isWellFormedSlug } from "@/lib/slug";

export type ContentKey = keyof ContentData;
/** Collections a public page reads ONE document of, found by its slug. */
export type RowCollection = "demoSites" | "pitchPages";
export const ROW_COLLECTIONS: readonly RowCollection[] = ["demoSites", "pitchPages"];

export interface RowNeed {
  collection: RowCollection;
  /** Lower-cased and trimmed, exactly as resolveDemoSite / resolvePitchPage compare. */
  slug: string;
}

export interface Needs {
  /** Admin and CRM: every row, read with the signed-in session. */
  all: boolean;
  /** Whole singletons and collections. */
  keys: readonly ContentKey[];
  /** One document by slug. */
  row: RowNeed | null;
  /** Stable text form, for effect dependencies and request de-duplication. */
  id: string;
}

/** Read by <Seo>, which every public page and the pitch and school-demo designs render. */
const SEO: ContentKey[] = ["settings", "contact", "socials"];
/** Navbar, its menu panels, Footer and the lead pop-up: every page inside <Layout>. */
const CHROME: ContentKey[] = [...SEO, "navigation", "services", "projects"];

/**
 * Every key a visitor's page may read whole. Not the private collections
 * (submissions, applications, grades, notes, slots, opens), which `anon` cannot
 * read (supabase/migrations/0005), and not the slug-addressed ones (ROW_COLLECTIONS):
 * since 0013 `anon` cannot list those either, and reads one row by its link.
 */
export const PUBLIC_KEYS: readonly ContentKey[] = [
  "settings", "contact", "navigation", "home", "internship", "eduflow", "legal",
  "socials", "services", "testimonials", "projects", "team", "milestones",
  "process", "faqs", "stats", "clients", "posts", "certificates",
];

/** [pattern, keys besides CHROME]. First match wins. Paths have no trailing slash. */
const PUBLIC_ROUTES: Array<[RegExp, ContentKey[]]> = [
  [/^\/$/, ["home", "process", "faqs", "testimonials", "eduflow", "internship"]],
  [/^\/about$/, ["stats", "team", "milestones"]],
  [/^\/services(\/[^/]+)?$/, ["faqs", "process"]],
  [/^\/(work|projects|portfolio)(\/[^/]+)?$/, []],
  [/^\/blogs?(\/[^/]+)?$/, ["posts"]],
  [/^\/contact$/, ["faqs"]],
  [/^\/(internship|ii|launchpad)$/, ["internship", "certificates", "faqs"]],
  [/^\/eduflow$/, ["eduflow", "faqs"]],
  [/^\/(pricing|checkout)(\/.*)?$/, []],
  [/^\/faq$/, ["faqs"]],
  [/^\/(privacy|terms|refund|disclaimer)$/, ["legal"]],
  [/^\/verify(\/[^/]+)?$/, ["certificates"]],
  // The landing pages (/websites, /websites/dental-clinic, /websites/school, ...).
  [/^\/websites(\/[^/]+)?$/, ["faqs", "posts"]],
];

/** The router's basename ("/" in production), stripped before matching. Node-safe for the tests. */
const BASE = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/").replace(/\/$/, "");

/** The current address as the route table sees it: no basename, no trailing slash. */
export function currentPath(): string {
  if (typeof window === "undefined") return "/";
  let p = window.location.pathname || "/";
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || "/";
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** Lower-cased, trimmed, decoded: the comparison resolveDemoSite and resolvePitchPage make. */
function slugOf(segment: string): string {
  let s = segment;
  try {
    s = decodeURIComponent(segment);
  } catch {
    /* a malformed escape stays as typed; it then matches nothing */
  }
  return s.trim().toLowerCase();
}

const make = (all: boolean, keys: readonly ContentKey[], row: RowNeed | null): Needs => {
  const uniq = [...new Set(keys)].sort();
  return { all, keys: uniq, row, id: all ? "all" : `${uniq.join(",")}|${row ? `${row.collection}:${row.slug}` : ""}` };
};

function compute(path: string, crmHost: boolean): Needs {
  // /crm on the main site once the CRM has its own host: the page leaves at once, read nothing.
  if (!crmHost && /^\/crm(\/|$)/.test(path) && crmMovedOut()) return make(false, [], null);
  // The sign-in form shows no content, and a read made before sign-in is thrown away:
  // the admin and the CRM shells read everything again, as the admin, once they mount.
  if ((!crmHost && path === "/admin/login") || (crmHost && path === "/login")) return make(false, SEO, null);
  if (crmHost || /^\/(admin|crm)(\/|$)/.test(path)) return make(true, [], null);
  const demo = /^\/site\/([^/]+)/.exec(path);
  if (demo) return make(false, SEO, { collection: "demoSites", slug: slugOf(demo[1]) });
  for (const [re, extra] of PUBLIC_ROUTES) if (re.test(path)) return make(false, [...CHROME, ...extra], null);
  const pitch = /^\/pitch\/([^/]+)$/.exec(path);
  if (pitch) return make(false, SEO, { collection: "pitchPages", slug: slugOf(pitch[1]) });
  // The bare /<slug>: a pitch page, or (any unknown single segment) the 404 page.
  const bare = /^\/([^/]+)$/.exec(path);
  if (bare) return make(false, CHROME, { collection: "pitchPages", slug: slugOf(bare[1]) });
  return make(false, PUBLIC_KEYS, null);
}

let last: { path: string; crm: boolean; needs: Needs } | null = null;

/**
 * What the address `path` reads. Same object for the same address, so it can sit in
 * an effect's dependency list. `crmHost` is read from the window unless given (tests).
 */
export function needsFor(path: string = currentPath(), crmHost: boolean = isCrmHost()): Needs {
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  if (last && last.path === path && last.crm === crmHost) return last.needs;
  const needs = compute(path, crmHost);
  last = { path, crm: crmHost, needs };
  return needs;
}

/** Whether a slug can go into a PostgREST filter bare (no quoting, no LIKE wildcard). */
export function isPlainSlug(slug: string): boolean {
  return isWellFormedSlug(slug);
}

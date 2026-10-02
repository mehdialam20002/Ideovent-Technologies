import { coaching } from "./coaching";
import { dental } from "./dental";
import { hub } from "./hub";
import { monthly } from "./monthly";
import { school } from "./school";
import type { WebsitePage, WebsitePageId } from "../types";

/**
 * The five /websites pages by id and by path. The paths are fixed (the
 * workflow brief of 2 Oct 2026; other pages and posts link to them) and are
 * the routes in src/App.tsx, the keys in src/lib/seo/pages.ts and the files
 * scripts/prerender-heads.mjs writes. Change one and change all four.
 */
export const WEBSITE_PAGES: Record<WebsitePageId, WebsitePage> = {
  hub,
  "dental-clinic": dental,
  school,
  "coaching-institute": coaching,
  "899-per-month": monthly,
};

const BY_PATH = new Map(Object.values(WEBSITE_PAGES).map((p) => [p.path, p]));

/** The page at this path, or undefined for any other path. */
export const websitePageAt = (path: string): WebsitePage | undefined => BY_PATH.get(path.replace(/\/+$/, "") || "/");

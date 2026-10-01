/**
 * Which slugs a demo site may NOT take.
 *
 * THIS FILE ADDS ONE RULE AND REUSES EVERYTHING ELSE. The route table and the
 * host redirect table are already parsed out of the real configuration by
 * `@/lib/pitch/reservedRoutes`, which reads src/App.tsx and vercel.json as raw
 * text so that a route added tomorrow is reserved tomorrow. That machinery is
 * imported, not copied. The rule this file adds is the collision with a PITCH
 * PAGE, which the pitch guard has no reason to know about.
 *
 * WHY A DEMO SLUG IS CHECKED AGAINST THE ROUTE TABLE AT ALL, GIVEN THAT A DEMO
 * LIVES UNDER /site/ AND CANNOT BE SHADOWED BY ANYTHING.
 * Two reasons, and neither is theoretical.
 *
 *   1. THE TWO LINKS DIFFER BY FOUR CHARACTERS. An institute that has both a
 *      pitch page and a demo has /holy-cross-school and /site/holy-cross-school,
 *      and those are two completely different pages sent in two different
 *      conversations. Pasting the wrong one is a mistake nobody notices until
 *      the reply is strange. Refusing the duplicate slug outright means there
 *      is never a pair to confuse: the admin says which page already owns the
 *      name, and Mehdi picks something else or reuses the existing record.
 *
 *   2. /site/ MAY NOT BE THE LAST WORD. The pitch pages already learned that
 *      the address people actually want is the bare one. If demos are ever
 *      promoted to /<slug>, a slug that was legal under /site/ but collides
 *      with /pricing becomes a live bug on that day, on records that are
 *      already out in people's WhatsApp. Checking now costs nothing.
 *
 * NOT IMPORTED BY ANY TEMPLATE. Only the admin validates a slug, and the admin
 * is behind a lazy route, so the App.tsx source string this reaches never lands
 * in a chunk a prospect downloads. `record.ts` deliberately does not re-export
 * it, and neither does ./index.ts. Keep it that way.
 */

import { isReservedSlug } from "@/lib/pitch/reservedRoutes";
import type { PitchPage } from "@/lib/cms/types";
import { isTemplateSlug } from "./templates/ids";
import {
  DEMO_SLUG_MAX,
  demoSlugify,
  isWellFormedDemoSlug,
  type DemoSite,
} from "./record";

export { isReservedSlug };

export interface DemoSlugContext {
  /** Every demo site, so a second record cannot take a slug already in use. */
  sites?: DemoSite[];
  /** Every pitch page, so the two link families cannot share a name. */
  pitchPages?: PitchPage[];
  /** The record being edited, which is allowed to keep its own slug. */
  currentId?: string;
}

/**
 * Why this slug cannot be used, in a sentence an editor can act on, and WHICH
 * of the four things it collides with. Null when it is fine.
 *
 * Checked in the order a person hits the problems: shape, then length, then a
 * real route, then a pitch page, then another demo.
 */
export function demoSlugIssue(slug: string, ctx: DemoSlugContext = {}): string | null {
  const s = (slug || "").trim();
  if (!s) {
    return "A demo needs a link. It is the part after /site/ that you send to the institute or clinic.";
  }
  if (!isWellFormedDemoSlug(s)) {
    return `"${s}" is not a usable link. Use lower-case letters, numbers and single hyphens only, with no spaces, dots or slashes.`;
  }
  if (s.length > DEMO_SLUG_MAX) {
    return `Keep the link to ${DEMO_SLUG_MAX} characters or fewer.`;
  }
  if (isReservedSlug(s)) {
    return `/${s} is already a real page on this site. A demo at /site/${s} would work today, but the name is spoken for, so pick another one.`;
  }
  /* A TEMPLATE'S NAME IS NEVER A DEMO'S LINK. The public route answers a
     template's id or preview slug with the 404 (src/pages/DemoSiteRoute.tsx),
     so a real demo given one of those links would be sent and never open. */
  if (isTemplateSlug(s)) {
    return `"${s}" is the name of one of the ready-made templates, and the public link refuses template names. Pick the institute's or clinic's own name instead.`;
  }
  const pitch = (ctx.pitchPages || []).find((p) => (p.slug || "").toLowerCase() === s.toLowerCase());
  if (pitch) {
    return `The PITCH PAGE for ${pitch.instituteName || "another institute"} already uses /${s}. Two links four characters apart is how the wrong one gets sent. Pick another name for the demo.`;
  }
  const clash = (ctx.sites || []).find(
    (d) => (d.slug || "").toLowerCase() === s.toLowerCase() && d.id !== ctx.currentId,
  );
  if (clash) {
    return `Another DEMO, for ${clash.instituteName || "an institute with no name yet"}, already uses /site/${s}. Links have to be unique.`;
  }
  return null;
}

/**
 * A link for this institute that is not taken yet.
 *
 * Appends -2, -3… rather than a random suffix, so the address still reads as
 * the institute's own name when it lands in somebody's WhatsApp. That matters
 * more here than on a pitch page: the whole claim is that this is their site.
 */
export function uniqueDemoSlug(instituteName: string, ctx: DemoSlugContext = {}): string {
  const base = demoSlugify(instituteName) || "demo";
  let candidate = base;
  for (let n = 2; n < 200; n++) {
    if (!demoSlugIssue(candidate, ctx)) return candidate;
    candidate = `${base.slice(0, DEMO_SLUG_MAX - 4)}-${n}`;
  }
  return candidate;
}

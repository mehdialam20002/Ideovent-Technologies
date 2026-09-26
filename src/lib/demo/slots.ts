/**
 * SLOT MANAGEMENT. This is the feature, not the scaffolding around it.
 *
 * THE FAILURE IT EXISTS TO PREVENT, as it was reported:
 *
 *   Mehdi pitches a demo to institute A. An hour later he edits the same
 *   record for institute B. A's director opens the link that night, five hours
 *   later, and sees B's name. A's name is gone and the pitch is dead.
 *
 * Nobody sees it happen. A tells nobody; they simply do not reply. So the
 * requirement is not "give him more slots so he stops reusing one". It is that
 * a demo which has been SENT must never be silently overwritten, and the only
 * way to guarantee that is to make the overwrite loud at the one moment it can
 * still be stopped: when he clicks Edit.
 *
 * Three mechanisms, in the order they do their work.
 *
 *   1. THE EDIT LOCK (`editLockReason`). A sent record does not open straight
 *      into the form. It opens a dialog that names the risk in plain words,
 *      with the recipient and the date in it, and whose PRIMARY action is
 *      "Duplicate instead". Duplicating is the habit that prevents the whole
 *      problem, so it is the easy path and editing is the deliberate one. It
 *      is not a toast: a toast is a thing that appears after the decision.
 *
 *   2. THE LIST (`sortSlots`, `matchesFilter`). Thirty rows in, the reason he
 *      reuses a record is that he cannot find the free one. Important first,
 *      then most recently touched, with search and three filters.
 *
 *   3. OPEN TRACKING (`demoOpenStats`). "They opened it twice last night" is
 *      what makes a follow-up worth making, and it is also the evidence that
 *      an edit would be seen. In local mode it can only ever count opens in
 *      one browser, and the admin says so rather than printing a zero.
 *
 * Nothing in this module renders. `relativeTime` returns a string; the admin
 * decides where it goes.
 */

import type { DemoSite, DemoSiteSlot, DemoSiteOpen, DemoKind, DemoMarket, DemoStatus } from "@/lib/cms/types";
import { demoStatus } from "./record";

/* ── The slot beside a demo ──────────────────────────────────────────────── */

/**
 * The slot record for a demo, or an empty one.
 *
 * Never null, so a caller cannot forget the case. A demo with no slot document
 * is completely normal: the slot is only written when something is put in it,
 * and in local mode a record imported from an export has none.
 */
export function slotFor(demoId: string, slots: DemoSiteSlot[] | undefined): DemoSiteSlot {
  return (slots || []).find((s) => s.id === demoId) || { id: demoId };
}

/** Index the slots once, for a list that is about to read thirty of them. */
export function slotIndex(slots: DemoSiteSlot[] | undefined): Map<string, DemoSiteSlot> {
  const m = new Map<string, DemoSiteSlot>();
  for (const s of slots || []) if (s.id) m.set(s.id, s);
  return m;
}

/* ── Relative time ───────────────────────────────────────────────────────── */

/**
 * "3 hours ago", from a real timestamp.
 *
 * NULL WHEN THERE IS NO TIMESTAMP, and the caller must print something that
 * says so. This is the one thing this function must not get wrong: a record
 * whose `updatedAt` is missing has not been edited "just now", it has no
 * recorded edit at all, and those two readings lead to opposite decisions. A
 * missing timestamp shown as "just now" would tell Mehdi he had touched a
 * record minutes ago when he had not touched it in a month.
 *
 * `updatedAt` is stamped by the store on every save (LocalStore.saveDoc and
 * SupabaseStore.saveDoc both do it), so on any record saved from the admin it
 * is real. It is absent on a record typed into seed.ts and on one restored
 * from an old export.
 *
 * A future timestamp reads as "just now" rather than "in 3 hours": clocks
 * disagree by a few seconds all the time, and a demo that claims to have been
 * edited tomorrow is noise, not information.
 */
export function relativeTime(iso: string | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.round(days / 30);
  if (months < 18) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** "edited 3 hours ago", or the honest alternative when nothing was recorded. */
export function editedLabel(site: Pick<DemoSite, "updatedAt">, now: Date = new Date()): string {
  const rel = relativeTime(site.updatedAt, now);
  return rel ? `edited ${rel}` : "no edit recorded";
}

/** A timestamp as a date and time, for the places a relative reading is not enough. */
export function absoluteTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ── Open tracking ───────────────────────────────────────────────────────── */

export interface DemoOpenStats {
  /** Distinct browser sessions that loaded the public page. */
  count: number;
  /** ISO timestamp of the most recent one, or undefined. */
  lastOpenedAt?: string;
  /**
   * FALSE when the number cannot mean what it looks like it means, which is
   * local (non-Supabase) mode: an open is written to the visitor's OWN
   * browser, so an institute opening the link on their phone writes a row
   * Mehdi's laptop will never see. The count is then only ever his own
   * previews. The admin must say this instead of printing a zero, because a
   * zero reads as "nobody opened it" and he makes follow-up decisions on it.
   */
  trustworthy: boolean;
}

/**
 * `openCount` and `lastOpenedAt` for one demo, DERIVED from the open log.
 *
 * They are not stored on the record and they must not be. The increment has to
 * come from the public page, which runs as `anon`, and `anon` cannot update a
 * row in this store (supabase/migrations/0001). A counter field would sit at
 * zero for ever and be indistinguishable from nobody having opened it. So an
 * open is an INSERT into `demoSiteOpens`, which `anon` is allowed to do, and
 * the number is the row count. See `recordDemoOpen` in ./opens.ts.
 */
export function demoOpenStats(
  demoId: string,
  opens: DemoSiteOpen[] | undefined,
  mode: "local" | "supabase" = "supabase",
): DemoOpenStats {
  let count = 0;
  let last: string | undefined;
  for (const o of opens || []) {
    if (o.demoId !== demoId) continue;
    count += 1;
    if (o.at && (!last || o.at > last)) last = o.at;
  }
  return { count, lastOpenedAt: last, trustworthy: mode === "supabase" };
}

/** "opened 3 times, last 2 hours ago" · "not opened yet". Never a bare zero. */
export function openLabel(stats: DemoOpenStats, now: Date = new Date()): string {
  if (!stats.trustworthy) return "opens are not counted in this mode";
  if (!stats.count) return "not opened yet";
  const rel = relativeTime(stats.lastOpenedAt, now);
  const times = stats.count === 1 ? "opened once" : `opened ${stats.count} times`;
  return rel ? `${times}, last ${rel}` : times;
}

/* ── The edit lock ───────────────────────────────────────────────────────── */

export interface EditLock {
  /** Who it went to, as Mehdi typed it, or null if he did not record it. */
  sentTo: string | null;
  /** When, already formatted, or null. */
  sentAt: string | null;
  /** The sentence the dialog leads with. Plain words, no jargon, no scare tone. */
  message: string;
  /** Whether anyone has actually opened it since, which sharpens the warning. */
  opens: DemoOpenStats;
}

/**
 * The reason editing this record needs a deliberate confirmation, or null when
 * it does not.
 *
 * Locked when, and only when, the status is `sent`: that is exactly the set of
 * records somebody may still have the link to and may still open. A draft or a
 * free slot has gone nowhere; a closed one is over and its link no longer
 * works, so an edit to it changes nothing anybody will see.
 *
 * AN EXAMPLE RECORD IS NEVER LOCKED. The two records that ship in seed.ts are
 * marked `sent` so the route can be opened and measured, but they were sent to
 * nobody. Locking them would teach Mehdi that the dialog is noise to be
 * clicked through, which is the one thing that would break the mechanism.
 *
 * THE MESSAGE DEGRADES HONESTLY. A record can be `sent` with no recipient
 * recorded: an import, a record from before this feature, or the status
 * changed by hand. The warning then says it does not know who, rather than
 * inventing a name or quietly not warning at all. Not knowing who received it
 * is a reason to be MORE careful, not less.
 */
export function editLockReason(
  site: Pick<DemoSite, "status" | "isExample" | "instituteName">,
  slot: DemoSiteSlot,
  opens: DemoOpenStats,
): EditLock | null {
  if (site.isExample) return null;
  if (demoStatus(site) !== "sent") return null;

  const sentTo = (slot.sentTo || "").trim() || null;
  const sentAt = slot.sentAt ? absoluteTime(slot.sentAt) : null;

  const who = sentTo ? `to ${sentTo}` : "to somebody whose name was not recorded";
  const when = sentAt ? ` on ${sentAt}` : "";

  const message =
    `This demo was sent ${who}${when}. They still have the link and it still works. ` +
    `Anything you change here replaces what they see the next time they open it, ` +
    `and they will not be told it changed.`;

  return { sentTo, sentAt, message, opens };
}

/* ── Searching, filtering and sorting a list built for 30+ rows ──────────── */

export interface DemoFilters {
  /** Matched against institute name, internal name, city and slug. */
  query?: string;
  kind?: DemoKind | "all";
  market?: DemoMarket | "all";
  status?: DemoStatus | "all";
}

export const EMPTY_FILTERS: DemoFilters = { query: "", kind: "all", market: "all", status: "all" };

/**
 * Does this row survive the filters?
 *
 * The search runs over the INTERNAL name as well as the public one, because
 * "Delhi schools, batch 2" is how Mehdi will look for it and that string
 * exists nowhere on the page itself. The slug is searched too: after he copies
 * a link and wants to find the record it came from, the slug is what he has in
 * his clipboard.
 */
export function matchesFilters(
  site: DemoSite,
  slot: DemoSiteSlot,
  filters: DemoFilters,
): boolean {
  if (filters.kind && filters.kind !== "all" && site.kind !== filters.kind) return false;
  if (filters.market && filters.market !== "all") {
    const market = site.market === "international" ? "international" : "india";
    if (market !== filters.market) return false;
  }
  if (filters.status && filters.status !== "all" && demoStatus(site) !== filters.status) return false;

  const q = (filters.query || "").trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    site.instituteName,
    site.shortName,
    site.slug,
    site.city,
    site.state,
    slot.internalName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Important first, then most recently updated.
 *
 * A record with NO `updatedAt` sorts last rather than first. Treating a
 * missing timestamp as 0 is the arithmetic that is easy to write; treating it
 * as "now" is the one that is easy to write by accident, and it would float
 * every un-timestamped record to the top of the list for ever.
 *
 * Ties break on the institute name so the order is stable between renders.
 */
export function sortDemoSites(
  sites: DemoSite[],
  slots: Map<string, DemoSiteSlot>,
): DemoSite[] {
  const stamp = (d: DemoSite) => {
    const t = d.updatedAt ? new Date(d.updatedAt).getTime() : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...sites].sort((a, b) => {
    const ia = slots.get(a.id)?.important ? 1 : 0;
    const ib = slots.get(b.id)?.important ? 1 : 0;
    if (ia !== ib) return ib - ia;
    const ta = stamp(a);
    const tb = stamp(b);
    if (ta !== tb) return tb - ta;
    return (a.instituteName || "").localeCompare(b.instituteName || "");
  });
}

/* ── Duplicating, which is the habit the whole design is pushing ─────────── */

/**
 * The parts of a slot a duplicate may inherit, and the parts it may not.
 *
 * It keeps the internal name, because a copy made for the next school in
 * "Delhi schools, batch 2" belongs to the same batch. It keeps nothing else:
 * a copy has been sent to nobody, opened by nobody, and the notes on the
 * original are about a conversation the copy is not part of. Carrying `sentTo`
 * across would put another institute's contact into the new record's edit lock
 * and make the warning lie, which is worse than having no warning.
 */
export function duplicatedSlot(source: DemoSiteSlot, newId: string): DemoSiteSlot {
  return {
    id: newId,
    internalName: source.internalName,
    important: false,
  };
}

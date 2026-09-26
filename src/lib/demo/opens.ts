/**
 * Recording that a demo was opened.
 *
 * Called once from the PUBLIC route. Everything about this module is shaped by
 * two constraints that pull in opposite directions.
 *
 * CONSTRAINT ONE: THE WRITER IS A STRANGER'S PHONE. The page is opened by a
 * principal on mobile data who has never heard of us. Nothing here may slow
 * that down, block the first paint, or fail visibly. Every path is fire and
 * forget, every error is swallowed, and the whole thing runs after the render.
 *
 * CONSTRAINT TWO: THE WRITER IS `anon`. supabase/migrations/0001 lets an
 * anonymous visitor INSERT into named collections and nothing else. It cannot
 * UPDATE, so there is no way to increment a counter on the demo record itself.
 * 0004 adds `demoSiteOpens` to the insert list. One row per open, and the
 * admin counts the rows: see `demoOpenStats` in ./slots.ts.
 *
 * WHY THIS DOES NOT GO THROUGH THE STORE. `getStore()` in Supabase mode
 * dynamically imports @supabase/supabase-js, roughly 800 KB of rendered JS,
 * to write one row of three fields. On a demo site that a prospect opens on a
 * phone that is an unacceptable price for a counter, so the Supabase path here
 * is a single `fetch` against PostgREST with the anon key, which is the same
 * request the SDK would have made. The local path writes through the store,
 * which is already loaded.
 *
 * ONE ROW PER BROWSER SESSION. A reader who refreshes three times, or opens
 * the link again from the same WhatsApp thread five minutes later, counts
 * once. The number then answers the question actually being asked, "did they
 * open it, and when last", rather than "how many times did the bundle run".
 * The guard is `sessionStorage`, which is per tab and cleared when the tab
 * closes, so a genuine second visit tomorrow counts again.
 */

import type { DemoSiteOpen } from "@/lib/cms/types";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseEnabled } from "@/lib/cms/config";

/** sessionStorage key prefix. One entry per demo id. */
const SEEN_PREFIX = "ideovent_demo_open_";

/**
 * True the first time this tab sees this demo, false afterwards.
 *
 * Wrapped because `sessionStorage` THROWS rather than returning null in a
 * locked-down browser: Safari in private mode historically did, and an
 * embedded WhatsApp or Instagram webview with storage blocked still does. An
 * uncaught throw here would take down the render of the institute's own
 * website in front of the institute, to protect a counter.
 */
function firstInThisSession(demoId: string): boolean {
  try {
    const key = SEEN_PREFIX + demoId;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    // Storage unavailable. Count the open rather than losing it: an
    // over-count from a refresh is a much smaller lie than a missed open, and
    // it is the direction that never tells Mehdi nobody looked.
    return true;
  }
}

/** A row id that does not need Math.random at module load. */
let counter = 0;
function openId(): string {
  return `dso_${Date.now().toString(36)}_${(counter++).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * PostgREST insert with the anon key. No SDK.
 *
 * `Prefer: return=minimal` so the response carries no body: the row that was
 * just written is not readable by `anon` anyway (0004 keeps `demoSiteOpens`
 * off the public read policy) and asking for it back would be a needless
 * round trip and a needless RLS error in the console of a stranger's phone.
 *
 * `keepalive` so the request survives the reader navigating away half a second
 * after the page paints, which on a link opened from a chat app is common.
 */
async function insertOpenRow(demoId: string): Promise<void> {
  const url = `${(SUPABASE_URL || "").replace(/\/$/, "")}/rest/v1/content`;
  // ONE id, used for both the row key and the document body. Two calls to
  // openId() would disagree, and the admin reads `data.id`, so the row would
  // be findable by one id and identified by another.
  const id = openId();
  await fetch(url, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${SUPABASE_ANON_KEY as string}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      collection: "demoSiteOpens",
      doc_id: id,
      data: { id, demoId, at: new Date().toISOString() },
    }),
  });
}

/**
 * Record that this demo was opened. Safe to call on every render: the session
 * guard makes the second call a no-op.
 *
 * Returns nothing and never throws. A caller that awaits it is doing so to
 * sequence its own work, not to find out whether it worked, because whether it
 * worked is not a question the public page is allowed to care about.
 */
export async function recordDemoOpen(demoId: string): Promise<void> {
  if (!demoId) return;
  if (typeof window === "undefined") return;
  if (!firstInThisSession(demoId)) return;

  try {
    if (supabaseEnabled) {
      await insertOpenRow(demoId);
      return;
    }
    /*
      Local mode. The row goes into THIS browser's localStorage, which means
      it counts opens on this device and nowhere else. That is not a bug that
      can be fixed here, it is what "no database" means, and the admin says so
      in words rather than showing the resulting number as if it were real
      (see `trustworthy` in ./slots.ts).

      The store is imported dynamically so that a public demo page in local
      mode does not pull seed.ts and the store machinery into its own chunk
      before it has painted.
    */
    const { getStore } = await import("@/lib/cms/store");
    const row: DemoSiteOpen = { id: openId(), demoId, at: new Date().toISOString() };
    await getStore().saveDoc("demoSiteOpens", row);
  } catch {
    /*
      Swallowed on purpose, and with no console.warn either. This runs on a
      prospect's phone, on a page whose entire job is to look like a real
      firm's work. A red line in the console of a director who knows how to
      open the console is a worse outcome than a missing tally mark.
    */
  }
}

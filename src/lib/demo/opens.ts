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

import type { DemoSite, DemoSiteOpen } from "@/lib/cms/types";
import type { DemoOpenedAlert } from "@/lib/leads";
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
export async function recordDemoOpen(demoId: string, alert?: DemoOpenAlertContext): Promise<void> {
  if (!demoId) return;
  if (typeof window === "undefined") return;
  // The alert has its own guards (per day, not per tab) and never waits on,
  // or is stopped by, the row below.
  if (alert) void maybeAlertDemoOpen(alert);
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

/* ───────────────────────────── The e-mail alert ───────────────────────────── */

/*
 * "Director ne demo khola toh turant alert." An open row tells Mehdi when he
 * next looks at /admin; this tells him NOW, while the director still has the
 * page in front of them, which is the best moment to follow up.
 *
 * WHEN IT FIRES. All of these, or nothing:
 *   - the CMS setting `settings.demoOpenAlerts` is not false (default on). It
 *     lives in the public settings singleton, not in outreach_settings,
 *     because this page runs as `anon` and cannot read the admin tables. It
 *     is an on/off flag and nothing else, so it is safe to be public;
 *   - the record is `sent`. The route already 404s everything else; this
 *     checks again so a draft can never alert even if that changes;
 *   - the viewer is not Mehdi. See `viewerIsAdmin`;
 *   - this browser has not alerted for this demo today (localStorage, local
 *     date). If localStorage cannot be used there is no way to keep the
 *     "at most once a day" promise, so no alert is sent; the open row is
 *     still recorded and the admin still shows it.
 *
 * HOW. EmailJS through src/lib/leads.ts, imported dynamically AFTER the page
 * has rendered, so the public chunk does not carry it. Fire and forget: every
 * error is swallowed and the page never awaits it.
 */

export interface DemoOpenAlertContext {
  site: Pick<DemoSite, "id" | "slug" | "status" | "instituteName"> & { city?: string };
  /** `settings.demoOpenAlerts` from the CMS. Undefined means on. */
  enabled?: boolean;
}

export type DemoAlertOutcome =
  | "sent"
  | "failed"
  | "off"
  | "not-sent-demo"
  | "admin"
  | "already-today"
  | "no-storage"
  | "no-window";

/** localStorage key prefix; the value is the local date (YYYY-MM-DD) of the last alert. */
export const ALERT_PREFIX = "ideovent_demo_alert_";
/**
 * Optional marker an admin screen may set in localStorage to say "this device
 * is Mehdi's", so opening his own demo from a fresh tab never alerts him.
 */
export const ADMIN_DEVICE_KEY = "ideovent_admin_device";
/** The local-mode admin session flag written by src/admin/auth.tsx. */
const ADMIN_SESSION_KEY = "ideovent_admin_session";

/** In-memory guard, so two calls in the same page load can never both send. */
const inFlight = new Set<string>();

function localDay(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * True when this browser has an admin session. Cheap, no SDK: the local-mode
 * sessionStorage flag, the marker above, or a stored Supabase auth token
 * (supabase-js keeps it in localStorage under `sb-<project>-auth-token` and
 * removes it on sign-out).
 */
export function viewerIsAdmin(): boolean {
  try {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") return true;
  } catch {
    /* unreadable: not evidence either way */
  }
  try {
    if (localStorage.getItem(ADMIN_DEVICE_KEY) === "1") return true;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (/^sb-.+-auth-token$/.test(k) && localStorage.getItem(k)) return true;
    }
  } catch {
    /* unreadable */
  }
  return false;
}

/**
 * Decide and, when every condition holds, send. Resolves with what happened
 * (for the test); never rejects. `send` is injectable for the same reason.
 */
export async function maybeAlertDemoOpen(
  ctx: DemoOpenAlertContext,
  now: Date = new Date(),
  send?: (a: DemoOpenedAlert) => Promise<boolean>,
): Promise<DemoAlertOutcome> {
  try {
    if (typeof window === "undefined") return "no-window";
    const { site } = ctx;
    if (ctx.enabled === false) return "off";
    if (!site || !site.id || site.status !== "sent") return "not-sent-demo";
    if (viewerIsAdmin()) return "admin";

    const key = ALERT_PREFIX + site.id;
    const today = localDay(now);
    const memo = `${key}@${today}`;
    if (inFlight.has(memo)) return "already-today";
    try {
      if (localStorage.getItem(key) === today) return "already-today";
      localStorage.setItem(key, today);
      if (localStorage.getItem(key) !== today) return "no-storage";
    } catch {
      return "no-storage";
    }
    inFlight.add(memo);

    const alert: DemoOpenedAlert = {
      instituteName: site.instituteName || site.slug,
      slug: site.slug,
      demoId: site.id,
      city: site.city,
      page: window.location.pathname || `/site/${site.slug}`,
      link: `${window.location.origin}/site/${site.slug}`,
      at: now.toISOString(),
    };
    const sender = send || (await import("@/lib/leads")).sendDemoOpenedAlert;
    const ok = await sender(alert);
    if (!ok) {
      // A failed send does not use up the day: a later open may try again.
      try {
        localStorage.removeItem(key);
      } catch {
        /* nothing to do */
      }
      inFlight.delete(memo);
    }
    return ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

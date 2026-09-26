/**
 * The timer that decides whether, and when, the enquiry card appears.
 *
 * THIS FILE IS IN THE ENTRY CHUNK (Layout renders it on every public page), so
 * it is deliberately tiny: a one-second interval, three storage reads, and a
 * lazy import. The card itself (LeadPopup.tsx, its form, its CSS) is fetched
 * only when the timer fires. It renders nothing until then, so it cannot move
 * LCP or CLS.
 *
 * ENGAGED TIME, NOT WALL TIME. What counts is time with the tab on screen
 * (document.visibilityState === "visible") on a page where the card may
 * appear. A background tab counts nothing. The total is kept in
 * sessionStorage, so it accumulates across pages within one visit and starts
 * again on the next visit. Each tick adds at most 2 seconds, so a laptop
 * lid closed for an hour is not an hour of reading.
 *
 * NOT WHILE THEY ARE BUSY. When the minute is up the card still waits while
 * focus is in a form field (they are typing), while the contact form is on
 * screen (they are already where the card would send them), and while the
 * mega menu is open.
 *
 * NEVER AGAIN. popupMemory() is "dismissed" or "sent" once the card has been
 * closed or any enquiry has been delivered, from the card or the contact
 * form, and then this component does nothing at all. See ./core.ts.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSingleton } from "@/lib/cms/context";
import {
  LEAD_POPUP_DEFAULTS,
  POPUP_ENGAGED_KEY,
  POPUP_OPEN_KEY,
  isNoindexPage,
  isPopupPath,
  popupMemory,
  rememberPopup,
} from "./core";

// A chunk that fails to load (offline, or a tab left open across a deploy)
// must cost nothing: React.lazy rethrows the rejection into the tree, which
// would take the whole page down to show a pop-up. It renders nothing instead.
const LeadPopup = lazy(() => import("./LeadPopup").catch(() => ({ default: () => null })));

const TICK_MS = 1000;
const MAX_STEP_MS = 2000;

function session(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function setSession(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* no session storage: the count restarts per page, which only delays the card */
  }
}

const engagedMs = () => Number(session(POPUP_ENGAGED_KEY)) || 0;

function visitorIsBusy(): boolean {
  const a = document.activeElement;
  if (a instanceof HTMLElement && a.matches("input, textarea, select, [contenteditable='true']")) return true;
  const form = document.getElementById("contact");
  if (form) {
    const r = form.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return true;
  }
  return Boolean(document.querySelector("header [aria-expanded='true']"));
}

export default function LeadPopupMount() {
  const { pathname } = useLocation();
  const stored = useSingleton("settings").leadPopup;
  const cfg = {
    enabled: stored?.enabled ?? LEAD_POPUP_DEFAULTS.enabled,
    heading: stored?.heading?.trim() || LEAD_POPUP_DEFAULTS.heading,
    subheading: stored?.subheading?.trim() || LEAD_POPUP_DEFAULTS.subheading,
  };
  const delayMs = Math.min(600, Math.max(10, Number(stored?.delaySeconds) || LEAD_POPUP_DEFAULTS.delaySeconds)) * 1000;

  // Read once per page. A card closed on this page sets `open` false below;
  // the stored memory stops it on every page after.
  const [memory] = useState(popupMemory);
  const [open, setOpen] = useState(() => session(POPUP_OPEN_KEY) === "1");
  const onThisPage = cfg.enabled && memory === null && isPopupPath(pathname);

  useEffect(() => {
    if (!onThisPage || open) return;
    let last = Date.now();
    let visible = document.visibilityState === "visible";

    const flush = () => {
      const now = Date.now();
      if (visible && !isNoindexPage()) {
        setSession(POPUP_ENGAGED_KEY, String(engagedMs() + Math.min(Math.max(0, now - last), MAX_STEP_MS)));
      }
      last = now;
    };
    const tick = () => {
      flush();
      if (engagedMs() < delayMs || !visible || visitorIsBusy() || isNoindexPage()) return;
      // Checked again at the last moment: an enquiry sent from the contact
      // form a second ago retires the card before it ever appears.
      if (popupMemory() !== null) return;
      setSession(POPUP_OPEN_KEY, "1");
      setOpen(true);
    };
    const onVisibility = () => {
      flush();
      visible = document.visibilityState === "visible";
    };

    const id = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [onThisPage, open, delayMs]);

  const onDismiss = useCallback(() => {
    rememberPopup("dismissed");
    setSession(POPUP_OPEN_KEY, null);
    setOpen(false);
  }, []);
  const onFinish = useCallback(() => {
    setSession(POPUP_OPEN_KEY, null);
    setOpen(false);
  }, []);

  if (!open || !onThisPage) return null;
  return (
    <Suspense fallback={null}>
      <LeadPopup heading={cfg.heading} subheading={cfg.subheading} onDismiss={onDismiss} onFinish={onFinish} />
    </Suspense>
  );
}

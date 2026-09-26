/**
 * ENGLISH OR HINDI, ON THE DEMO SITES THAT SERVE INDIAN PARENTS.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * A large share of the parents who will read an Indian school's or coaching
 * institute's website read Hindi more comfortably than English, and almost
 * none of their competitors' sites offer it. So a demo that carries both is
 * not a decoration: it is a feature a director notices in the first ten
 * seconds, and it is the easiest thing in the whole demo for Mehdi to point
 * at on a call.
 *
 * ── WHAT IT TRANSLATES, AND WHAT IT NEVER TOUCHES ─────────────────────────
 * ONLY THE STRUCTURAL COPY: section headings, labels, buttons, navigation and
 * the empty states. Those are ours, we wrote them, and we can stand behind
 * both versions.
 *
 * IT NEVER TRANSLATES THE INSTITUTE'S OWN WORDS. Their tagline, their about
 * paragraph, their principal's message, their notices, their course names and
 * every figure on the page are printed exactly as they were typed, in whatever
 * language they were typed in. Machine-translating a principal's message is
 * putting words in a real person's mouth on a page carrying their name, which
 * is the same rule that stops this feature inventing a phone number. Where a
 * record has no Hindi version of a field, the English stands and nothing
 * apologises for it: a half-translated page reads worse than an English one.
 *
 * ── WHO GETS THE TOGGLE ───────────────────────────────────────────────────
 * `market`, and only `market`. A dental practice in Ohio has no use for Hindi
 * and a language switch on its site would be the single clearest sign the page
 * came off a template. `demoOffersHindi` is the one gate and every caller goes
 * through it.
 *
 * ── HOW THE CHOICE IS KEPT ────────────────────────────────────────────────
 * One localStorage key for the whole feature rather than one per institute: a
 * reader who asked for Hindi wants Hindi, not Hindi-on-this-slug. Every read
 * and every write is wrapped, because localStorage THROWS rather than returns
 * null in a private window and in a browser with site data blocked, and a demo
 * that white-screens on a director's locked-down office laptop is worse than
 * one with no toggle at all.
 *
 * The value lives in a module-level store read through `useSyncExternalStore`
 * rather than in a context provider, because three separate subtrees need it:
 * the institute's own page, the Ideovent ribbon above it and the Ideovent
 * marker below it, and the last two sit deliberately OUTSIDE the institute's
 * palette scope. A provider wrapping all three would have to wrap the route,
 * which is the one file this feature is not allowed to complicate.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { DemoSite } from "@/lib/cms/types";
import { demoMarket } from "./record";
import { demoDialect } from "./vocabulary";

/* ── The two languages ───────────────────────────────────────────────────── */

/**
 * "en" is the site as it has always been. "hi" is Hinglish as a Delhi parent
 * actually reads it: Devanagari for the Hindi matrix, Latin script for the
 * English words nobody translates (admission, form, fees, website, batch,
 * result, WhatsApp, email). It is NOT Hindi-from-a-dictionary, which is what
 * "प्रवेश प्रक्रिया" is, and which reads to a real reader as a page that has
 * been run through a machine.
 */
export type DemoLang = "en" | "hi";

/** What goes on `lang`, on the html element and on the demo's own root. */
export const DEMO_LANG_TAG: Record<DemoLang, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

/** What the control calls each option, in the language it switches to. */
export const DEMO_LANG_NAME: Record<DemoLang, string> = {
  en: "English",
  hi: "हिंदी",
};

/**
 * Does this record get a language control?
 *
 * India only. Driven off `market` and nothing else, so a record that is moved
 * between markets in the admin gains or loses the control by itself and no
 * template has to remember.
 */
export function demoOffersHindi(site: Pick<DemoSite, "market">): boolean {
  return demoMarket(site) === "india";
}

/**
 * DEVANAGARI TYPESETTING, applied only while the page reads Hindi.
 *
 * Both templates track their small-caps labels open (0.12 to 0.18em) and set
 * their display headings tight (tracking down to -0.045em, leading down to
 * 0.96). Both are right for Latin capitals and both damage Devanagari:
 *
 *   - Letter-spacing is inserted between every cluster, so the head-line
 *     (shirorekha) that joins the letters of a word is cut into pieces:
 *     "क्या साथ लाना है" prints as "सा थ", "ला ना". A Hindi reader sees that
 *     as broken type, the visual twin of dictionary Hindi.
 *   - At a leading under 1.1 the tall top matras (ि ी ै ौ ं) of one line run
 *     into the descenders and commas of the line above; measured on the
 *     coaching heading "हर batch, उसकी timing और fees" in the heavy, mono and
 *     hairline voices.
 *
 * `:lang(hi)` matches because `useDemoLangControl` sets hi-IN on <html>, so
 * nothing here can touch an English or an international page. The display
 * values are custom properties the theme sets INLINE on the template root, so
 * they are overridden on the root's children, which is where every heading
 * inherits them from. The credit block sits outside the coaching root and is
 * named separately.
 */
export const DEMO_HINDI_CSS = `
.demo-school:lang(hi) [class*="tracking-"],
.demo-coaching:lang(hi) [class*="tracking-"],
#built-by-ideovent:lang(hi) [class*="tracking-"]{letter-spacing:normal!important}
.demo-school:lang(hi)>*{--ds-display-tracking:normal}
.demo-coaching:lang(hi)>*{--dc-display-tracking:normal;--dc-display-leading:1.18}
`;

/* ── The store ───────────────────────────────────────────────────────────── */

const KEY = "ideovent.demo.lang";

/**
 * The current choice, cached in the module.
 *
 * `useSyncExternalStore` compares snapshots by identity and re-reads on every
 * render, so the getter must not touch localStorage each time: a synchronous
 * storage read inside a render path on a mid-range Android phone is a real
 * cost, and returning a fresh value each call is how that hook produces an
 * infinite loop. It is read once, lazily, and then kept here.
 */
/* undefined: not read yet. null: the reader has never chosen, so the
   record's own `defaultLang` decides (a Hindi-first rural site). */
let current: DemoLang | null | undefined = undefined;

const listeners = new Set<() => void>();

function readStored(): DemoLang | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "hi" ? "hi" : v === "en" ? "en" : null;
  } catch {
    /* Private window, blocked site data, or a browser that throws on access.
       English is the safe answer: it is what the page said before anybody
       touched the control. */
    return "en";
  }
}

function snapshot(): DemoLang | null {
  if (current === undefined) current = typeof window === "undefined" ? null : readStored();
  return current;
}

/** The reader's stored choice, else the record's default, else English. */
function resolveLang(stored: DemoLang | null, site: { defaultLang?: DemoLang }): DemoLang {
  return stored || (site.defaultLang === "hi" ? "hi" : "en");
}

/** The build has no server renderer, but the hook wants this and it is free. */
function serverSnapshot(): DemoLang | null {
  return null;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Change the language for every demo component mounted right now.
 *
 * The write is attempted and its failure is ignored on purpose: a reader in a
 * private window still gets the language they asked for on this page view,
 * they just do not get it back after a reload. That is a far better failure
 * than a control that throws when it is pressed.
 */
export function setDemoLang(lang: DemoLang): void {
  if (current === lang) return;
  current = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* Nothing to do and nothing worth saying. */
  }
  listeners.forEach((fn) => fn());
}

/**
 * Another tab changed the language. Kept in sync so a director who opens the
 * school demo and the coaching demo side by side does not find one in each
 * language and conclude the toggle is broken.
 */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const next: DemoLang = e.newValue === "hi" ? "hi" : "en";
    if (next === current) return;
    current = next;
    listeners.forEach((fn) => fn());
  });
}

/* ── The hooks ───────────────────────────────────────────────────────────── */

/**
 * The language this record is being read in. Safe to call from anywhere,
 * including the Ideovent ribbon and marker, which sit outside the institute's
 * palette scope and still have to follow the reader's choice.
 *
 * A record that does not offer Hindi always reports "en", so no caller has to
 * check the market a second time.
 */
export function useDemoLang(site: Pick<DemoSite, "market"> & { defaultLang?: DemoLang }): DemoLang {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return demoOffersHindi(site) ? resolveLang(stored, site) : "en";
}

export interface DemoLangControl {
  lang: DemoLang;
  setLang: (lang: DemoLang) => void;
  /** False on an international record, where the control must not render. */
  offered: boolean;
}

/**
 * The same value, plus the setter, plus ownership of `lang` on the html
 * element.
 *
 * CALL THIS ONCE PER PAGE, from the template root, and `useDemoLang`
 * everywhere else. The html attribute is what makes a screen reader change
 * voice, and two components both writing it would race on unmount and leave
 * the attribute wrong for whatever route the reader goes to next. The original
 * value is captured on mount and put back on the way out, so leaving a demo
 * does not leave the rest of the site declaring itself Hindi.
 */
export function useDemoLangControl(
  site: Pick<DemoSite, "market" | "country"> & { defaultLang?: DemoLang },
): DemoLangControl {
  const offered = demoOffersHindi(site);
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const lang: DemoLang = offered ? resolveLang(stored, site) : "en";
  /* An India record reads en-IN or hi-IN. A record abroad is NOT en-IN: the
     site shell's own `lang` is en-IN, and leaving it on a school in Leeds or
     Austin tells a screen reader to use an Indian English voice there. US
     spelling gets en-US; every other English market gets plain "en", which is
     never wrong. */
  const tag = offered ? DEMO_LANG_TAG[lang] : demoDialect(site) === "us" ? "en-US" : "en";

  const original = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (original.current === null) original.current = el.getAttribute("lang");
    el.setAttribute("lang", tag);
    return () => {
      const was = original.current;
      if (was === null) el.removeAttribute("lang");
      else el.setAttribute("lang", was);
    };
  }, [tag]);

  const setLang = useCallback((next: DemoLang) => {
    setDemoLang(next);
  }, []);

  return { lang, setLang, offered };
}

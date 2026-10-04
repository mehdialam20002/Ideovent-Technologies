import { useEffect, useState, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { MotionConfig, MotionGlobalConfig } from "framer-motion";
import { ContentProvider } from "./lib/cms/context";
import { TRANSITION } from "./lib/motion";

/*
  THE PROVIDERS AROUND THE APP, IN ONE PLACE (3 Oct 2026). They used to be written
  out in main.tsx. They live here so the build's server render of each prerendered
  page (src/entry-server.tsx) wraps the app in exactly the tree the browser
  hydrates (main.tsx): one list, so the two cannot drift apart.
*/

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/*
  MOTION, IN ONE PLACE
  ════════════════════════════════════════════════════════════════════════════
  Two things happen here, and the second one is the reason the first is not
  enough on its own.

  1. <MotionConfig transition={TRANSITION}> makes { duration: 0.22, ease: EASE }
     the default for every framer-motion animation on the site. Combined with
     src/lib/motion.ts no longer declaring a transition inside any variant, this
     is what makes the whole site share one curve and one settle time. A
     component that genuinely needs a different timing still passes its own
     `transition` and wins, which is how an override should work.

  2. MotionGlobalConfig.skipAnimations ACTUALLY TURNS MOTION OFF for a visitor
     who has asked for reduced motion.

     `reducedMotion="user"` alone does not. It is documented to drop TRANSFORM
     and layout animation and to keep opacity, on the reasoning that a crossfade
     is the one safe kind of change. That is a defensible default and it is not
     what this site was asked for: the brief says reduced motion must genuinely
     disable the motion rather than shorten it. Emulating
     prefers-reduced-motion in DevTools with only the MotionConfig in place, the
     home page still faded every section in on scroll, and, worse, a stagger
     container still applied its staggerChildren delay, so nine service cards
     still appeared one after another over half a second. Nothing MOVED, but
     content still arrived late and in sequence, which is the part a
     motion-sensitive visitor actually notices.

     skipAnimations is framer's own instant-complete path
     (framer-motion/dist/es/animation/interfaces/motion-value.mjs): it forces
     duration AND delay to 0 and writes the final keyframe on the next frame, so
     staggers collapse too. It is a module-level global rather than a React
     value, which is why it is set in an effect and kept in sync with the media
     query rather than read once at import time. A visitor who flips the OS
     setting while the tab is open gets the new behaviour without a reload,
     which matters because that is exactly how the setting gets tested.

  The CSS half of this (keyframes, the marquee, and every Tailwind `transition-`
  class) is handled by the prefers-reduced-motion block at the foot of
  index.css. Between the two, nothing on the site animates for that visitor.
*/
function Motion({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCE_QUERY).matches
  );

  useEffect(() => {
    const query = window.matchMedia(REDUCE_QUERY);
    const apply = () => {
      MotionGlobalConfig.skipAnimations = query.matches;
      setReduce(query.matches);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <MotionConfig reducedMotion="user" transition={reduce ? { duration: 0 } : TRANSITION}>
      {children}
    </MotionConfig>
  );
}

/** `helmetContext`: the server render passes one to collect the head (unused: the build writes heads itself). */
export function AppProviders({ children, helmetContext }: { children: ReactNode; helmetContext?: object }) {
  return (
    <HelmetProvider context={helmetContext}>
      <Motion>
        <ContentProvider>{children}</ContentProvider>
      </Motion>
    </HelmetProvider>
  );
}

/*
  THE THEME PROVIDER SITS INSIDE THE ROUTER'S SUSPENSE BOUNDARY (3 Oct 2026, perf),
  around the routes (App.tsx), not up here with the others.

  A prerendered page hydrates inside that boundary at idle priority, in short
  slices. next-themes sets state in its first effect (resolvedTheme), and React
  treats ANY context change above a boundary that has not hydrated yet as an
  update to it: it then hydrates the whole page in one blocking task (measured,
  4x CPU: 335 ms of total blocking time on the home page). Inside the boundary its
  first effect runs after the page has hydrated, and changes nothing anyone sees.
  On the SPA shells (admin, CRM, demos) it mounts with the routed page instead of
  with the spinner before it.
*/
export function SiteTheme({ children }: { children: ReactNode }) {
  return (
    /*
      LIGHT BY DEFAULT, for everyone (Mehdi, 26 Sep 2026: "koi v open kre to light aaye").
      The storage key is new on purpose: next-themes remembers a visitor's toggle under its
      key, and a fresh key means every earlier "dark" choice is forgotten once, so the site
      opens light for all of them. The toggle still works and is remembered from here on.
      index.html starts <html class="light"> so there is no dark flash before React mounts.
    */
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="ideovent-theme-v2" enableSystem={false} disableTransitionOnChange themes={["light", "dark"]}>
      {children}
    </ThemeProvider>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { MotionConfig, MotionGlobalConfig } from "framer-motion";
import App from "./App.tsx";
import { ContentProvider } from "./lib/cms/context";
import { TRANSITION } from "./lib/motion";
import "./index.css";
import "./styles/system.css";
import "./styles/hero.css";
import "./styles/motion.css";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/*
  WHY THERE IS NO GLOBAL `vite:preloadError` LISTENER HERE.

  A tab opened before a deploy asks for chunks that no longer exist, and one
  reload fixes it. The obvious place for that reload is a window listener for
  vite:preloadError, and this file had one. It had to go, because in Vite 5
  that event fires for EVERY failed import() in the build, not only for page
  chunks, and it fires before the caller's own .catch runs:

    - leads.ts imports @emailjs/browser when the visitor presses Send. A
      global reload there wiped the typed enquiry and hid the WhatsApp
      fallback that submitLead exists to show. With Supabase on, the row was
      already saved, so the visitor saw no success and sent it again.
    - LeadPopupMount and ContactForm catch their own failed imports on
      purpose (the popup costs nothing, the form shows FormUnavailable). A
      global reload overrode both, and the popup's scroll trigger reloaded
      the page under a reader who had clicked nothing.

  So the reload lives where the failure is known to be a whole page:
  RouteErrorBoundary.componentDidCatch, which receives a lazy route's
  rejection and calls reloadOnceForNewBuild (guarded there, so it cannot
  loop). Every other import keeps its own handler. Do not preventDefault the
  event anywhere either: that would make the failed import RESOLVE with
  undefined instead of rejecting, and every handler above would be skipped.
*/

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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    {/*
      LIGHT BY DEFAULT, for everyone (Mehdi, 26 Sep 2026: "koi v open kre to light aaye").
      The storage key is new on purpose: next-themes remembers a visitor's toggle under its
      key, and a fresh key means every earlier "dark" choice is forgotten once, so the site
      opens light for all of them. The toggle still works and is remembered from here on.
      index.html starts <html class="light"> so there is no dark flash before React mounts.
    */}
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="ideovent-theme-v2" enableSystem={false} disableTransitionOnChange themes={["light", "dark"]}>
      <Motion>
        <ContentProvider>
          <App />
        </ContentProvider>
      </Motion>
    </ThemeProvider>
  </HelmetProvider>
);

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the top of the page on every route change, or, when the link
 * carries a hash ("/#contact"), to the element with that id.
 *
 * The hash half exists because the home page's main buttons ("Get a free
 * website check", "Check my website") point at "/#contact", and React Router
 * changes the URL for a hash link without scrolling to it. `key` is in the
 * dependencies so a second click on the same "/#contact" still scrolls.
 * The target may not be mounted on the first frame (lazy sections, CMS load),
 * so it retries for about a second before giving up.
 *
 * NOT ON THE PAGE LOAD ITSELF (4 Oct 2026). A page opens at the top on its own.
 * A prerendered page (scripts/prerender-heads.mjs) can be read and scrolled
 * before src/main.tsx hydrates it, and this effect's first run is that
 * hydration: scrolling to the top then threw a visitor who had started reading
 * back to the hero. The first run only goes to a hash, as before.
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const pageLoad = useRef(true);
  useEffect(() => {
    const first = pageLoad.current;
    pageLoad.current = false;
    if (!hash) {
      if (!first) window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer: number | undefined;
    const go = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
      if (tries++ < 20) timer = window.setTimeout(go, 50);
    };
    go();
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key]);
  return null;
}

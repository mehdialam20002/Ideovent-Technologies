import { useEffect } from "react";

/**
 * Load a pitch page's lazy proof images before the browser takes a print
 * snapshot.
 *
 * WHY THIS EXISTS. The proof screenshots are `loading="lazy"`, which is right
 * for the reader both pitch pages were built for: they are three or four
 * screens down, and on a mid-range phone on patchy data they must not compete
 * with the first paint.
 *
 * But a director who opens the page and presses Ctrl+P straight away, or
 * chooses Save as PDF to send to a trustee, never scrolls past them. The images
 * are therefore still unloaded when the snapshot is taken, and the proof
 * section, the part the trustee is actually being shown, prints as a row of
 * empty boxes.
 *
 * `beforeprint` fires before the snapshot, and switching the attribute to
 * "eager" starts the fetch in time. Once loaded they stay loaded, so this runs
 * at most once per image and costs a visitor who never prints nothing at all.
 * `matchMedia("print")` is the Safari path, which has no beforeprint event.
 *
 * WHY IT IS SHARED RATHER THAN COPIED. It was written on the India design and
 * the international design needed exactly the same fix. Two copies of a print
 * repair is how one of them gets mended and the other quietly stops working,
 * and nobody notices, because the only reader who meets the broken one is
 * holding a sheet of paper.
 *
 * Scoped to `.pitch-doc`, which is the class the print block in index.css keys
 * off, so it can never eagerly load an image on an ordinary marketing page.
 */
export function usePrintReadyImages() {
  useEffect(() => {
    const load = () => {
      document.querySelectorAll<HTMLImageElement>('.pitch-doc img[loading="lazy"]').forEach((img) => {
        img.loading = "eager";
      });
    };
    window.addEventListener("beforeprint", load);
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("print") : null;
    const onChange = (e: MediaQueryListEvent) => e.matches && load();
    mq?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("beforeprint", load);
      mq?.removeEventListener?.("change", onChange);
    };
  }, []);
}

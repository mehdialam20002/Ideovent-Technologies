/**
 * THE BOOKING SHEET: one per site, mounted by the dental shell
 * (src/pages/site/dental/shell/DentalShell.tsx). Any button anywhere opens it
 * with `useBooking().open(preset)`; the /book page renders the same
 * <BookingFlow> inline. Desktop: a 560px dialog. Phone: a full-height bottom
 * sheet. Focus is trapped, Esc closes, the mobile action bar hides while open.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { BOOKING_COPY } from "./copy";
import { findDoctor, findTreatment, type BookingPreset } from "./logic";
import { BookingFlow } from "./BookingFlow";

interface BookingApi {
  isOpen: boolean;
  preset: BookingPreset;
  open: (preset?: BookingPreset) => void;
  close: () => void;
}

const Ctx = createContext<BookingApi | null>(null);

/** Open the sheet from any button. Outside the dental shell it does nothing. */
export function useBooking(): BookingApi {
  return useContext(Ctx) || { isOpen: false, preset: {}, open: () => undefined, close: () => undefined };
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [preset, setPreset] = useState<BookingPreset>({});
  /* A Book button with no preset of its own (header, top bar, mobile bar)
     follows the page: on a treatment page it starts on that treatment's
     reason, on a doctor page with that doctor, on a clinic page at that clinic. */
  const { site, page, param } = useSite();
  const pagePreset = useMemo<BookingPreset>(() => {
    if (page.id === "treatment") {
      const t = findTreatment(site, param);
      return t ? { treatment: param, reason: t.reason } : {};
    }
    if (page.id === "doctor" && findDoctor(site, param)) return { doctor: param };
    if (page.id === "clinic" && param) return { branch: param };
    return {};
  }, [site, page.id, param]);
  const open = useCallback((p?: BookingPreset) => {
    setPreset(p || pagePreset);
    setOpen(true);
  }, [pagePreset]);
  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ isOpen, preset, open, close }), [isOpen, preset, open, close]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** The dialog / bottom sheet around <BookingFlow>. */
export function BookingSheet() {
  const { isOpen, preset, close } = useBooking();
  const { lang } = useSite();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    opener.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button, [href], input, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, select, textarea");
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={close}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={tr(BOOKING_COPY.whatTitle, lang)}
        className="dn-sheet relative max-h-[100svh] w-full overflow-y-auto bg-[hsl(var(--ds-surface))] p-5 text-[hsl(var(--ds-ink))] shadow-2xl sm:max-w-[560px] sm:rounded-[var(--ds-radius)] sm:p-7"
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={close} aria-label={tr(BOOKING_COPY.close, lang)}
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-[hsl(var(--ds-surface-2))]">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <BookingFlow preset={preset} />
      </div>
    </div>
  );
}

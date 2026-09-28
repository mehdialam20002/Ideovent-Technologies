/**
 * THE BOOKING FLOW'S PIECES: the 3-segment progress, a choice chip, the
 * 7-day strip, a slot group and a labelled field with its inline error.
 * Presentational only; BookingFlow.tsx holds the state. Every target is at
 * least 44px, every colour a theme token.
 */

import { useRef, type ReactNode, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { BOOKING_MORE } from "./bookingCopy";
import { dayParts, type BookingDay } from "./bookingLogic";

/** "Treatment / Date and time / Your details" with the current one filled. */
export function Progress({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  const { lang } = useSite();
  const names = [BOOKING_MORE.stepWhat, BOOKING_MORE.stepWhen, BOOKING_MORE.stepYou];
  return (
    <nav aria-label={tr(BOOKING_MORE.progress, lang)}>
      <ol className="grid grid-cols-3 gap-2">
        {names.map((n, i) => {
          const k = i + 1;
          const done = k < step;
          const here = k === step;
          const label = (
            <>
              <span className={`dn-bk-seg block h-1 rounded-full ${done || here ? "bg-[hsl(var(--ds-cta))]" : "bg-[hsl(var(--ds-line))]"}`} data-here={here ? "" : undefined} />
              <span className={`mt-2 flex items-center gap-1 text-[12px] font-semibold leading-tight ${here ? "text-[hsl(var(--ds-ink))]" : "text-[hsl(var(--ds-ink-soft))]"}`}>
                {done && <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />}
                {tr(n, lang)}
              </span>
            </>
          );
          return (
            <li key={k} aria-current={here ? "step" : undefined}>
              {done ? (
                <button type="button" onClick={() => onJump(k)} className="block min-h-11 w-full text-left underline-offset-4 hover:underline">{label}</button>
              ) : (
                <span className="block min-h-11">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** A selectable chip: radio semantics inside a radiogroup. */
export function Chip({ selected, onSelect, children, disabled, className = "", urgent, tabbable }: {
  selected: boolean;
  /** Takes the group's tab stop when nothing is selected yet. */
  tabbable?: boolean;
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  urgent?: boolean;
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect} tabIndex={selected || tabbable ? 0 : -1}
      data-urgent={urgent ? "" : undefined}
      className={`dn-bk-chip relative flex min-h-11 items-center gap-2 rounded-[var(--dn-btn-radius,var(--ds-radius))] border px-3.5 py-2 text-left text-sm font-medium transition-colors ${selected ? "border-[hsl(var(--ds-cta))] bg-[hsl(var(--ds-cta)/0.08)] text-[hsl(var(--ds-ink))] shadow-[inset_0_0_0_1px_hsl(var(--ds-cta))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] hover:border-[hsl(var(--ds-ink-soft))]"} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}>
      {children}
    </button>
  );
}

/** Arrow keys move between radios in a group (roving tabindex), as a native radio group does. */
export function onRadioKeys(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  if (!keys.includes(e.key)) return;
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])')];
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const next = items[(i + (keys.indexOf(e.key) < 2 ? 1 : items.length - 1)) % items.length];
  next.focus();
  next.click();
}

/** The 7-day strip: today first, closed days disabled with the reason, scrolls sideways on a phone. */
export function DateStrip({ days, value, onChange, closedNote, labelId }: {
  days: BookingDay[];
  value: string;
  onChange: (iso: string) => void;
  closedNote: string;
  labelId: string;
}) {
  const { lang } = useSite();
  const box = useRef<HTMLDivElement>(null);
  const focusable = value || days.find((d) => !d.closed)?.iso;
  return (
    <div ref={box} role="radiogroup" aria-labelledby={labelId} onKeyDown={onRadioKeys}
      className="dn-bk-strip -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 pt-1">
      {days.map((d) => {
        const p = dayParts(d.date, lang);
        const sel = value === d.iso;
        const top = d.offset === 0 ? tr(BOOKING_MORE.today, lang) : d.offset === 1 ? tr(BOOKING_MORE.tomorrow, lang) : p.weekday;
        return (
          <button key={d.iso} type="button" role="radio" aria-checked={sel} disabled={d.closed}
            tabIndex={d.iso === focusable ? 0 : -1} onClick={() => onChange(d.iso)}
            aria-label={`${p.long}${d.closed ? `, ${closedNote}` : ""}`}
            className={`flex min-h-[76px] w-[76px] shrink-0 snap-start flex-col items-center justify-center rounded-[calc(var(--ds-radius)*0.8)] border text-center transition-colors ${sel ? "border-[hsl(var(--ds-cta))] bg-[hsl(var(--ds-cta))] text-[hsl(var(--ds-on-cta))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] hover:border-[hsl(var(--ds-ink-soft))]"} disabled:cursor-not-allowed disabled:bg-[hsl(var(--ds-surface-2))] disabled:text-[hsl(var(--ds-ink-soft))]`}>
            <span className="text-[11px] font-semibold uppercase tracking-wide">{top}</span>
            <span className="text-xl font-semibold leading-tight">{p.day}</span>
            <span className="text-[11px]">{d.closed ? closedNote : p.month}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Morning or Evening: a heading and its 44px slot chips. */
export function SlotGroup({ title, slots, value, onChange, isPast }: {
  title: string;
  slots: string[];
  value: string;
  onChange: (s: string) => void;
  isPast: (s: string) => boolean;
}) {
  if (!slots.length) return null;
  const open = slots.filter((s) => !isPast(s));
  const focusable = open.includes(value) ? value : open[0];
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{title}</p>
      <div role="radiogroup" aria-label={title} onKeyDown={onRadioKeys} className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((s) => {
          const past = isPast(s);
          return (
            <button key={s} type="button" role="radio" aria-checked={value === s} disabled={past} tabIndex={s === focusable ? 0 : -1} onClick={() => onChange(s)}
              className={`min-h-11 rounded-[var(--dn-btn-radius,var(--ds-radius))] border px-2 text-sm font-medium tabular-nums transition-colors ${value === s ? "border-[hsl(var(--ds-cta))] bg-[hsl(var(--ds-cta))] text-[hsl(var(--ds-on-cta))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] hover:border-[hsl(var(--ds-ink-soft))]"} disabled:cursor-not-allowed disabled:line-through disabled:opacity-45`}>
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The inline error under a field or group. Announced politely. */
export function FieldError({ id, text }: { id: string; text?: string }) {
  return (
    <p id={id} aria-live="polite" className="min-h-0 text-sm font-medium text-[#B42318]">
      {text || ""}
    </p>
  );
}

export const inputCls = "mt-1.5 block min-h-12 w-full rounded-[calc(var(--ds-radius)*0.7)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-3.5 text-base text-[hsl(var(--ds-ink))] outline-none transition-shadow placeholder:text-[hsl(var(--ds-ink-soft))] focus:border-[hsl(var(--ds-cta))] focus:shadow-[0_0_0_3px_hsl(var(--ds-cta)/0.18)] aria-[invalid=true]:border-[#B42318]";

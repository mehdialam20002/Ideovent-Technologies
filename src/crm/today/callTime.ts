import { CALL_WINDOW_END, CALL_WINDOW_START, CALL_WINDOWS } from "@/lib/outreach/engine";
import type { LeadKind } from "@/lib/outreach/types";

/**
 * "GOOD TIME TO CALL NOW" (spec 10.5, My day's queue). Pure, India time.
 *
 * True when, right now in India, the lead's kind is in its good window for a
 * call (engine.ts CALL_WINDOWS: a school after school, a dentist between
 * patients, coaching before the evening batches), on one of the kind's call
 * days (never a Sunday), and inside TRAI's 10:00 to 21:00.
 */
const IST_MS = 5.5 * 3600e3;

/** India-time weekday (0 Sunday to 6 Saturday) and minutes after midnight. */
export function istClock(now: Date): { day: number; minutes: number } {
  const t = new Date(now.getTime() + IST_MS);
  return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export function goodTimeToCall(kind: string | undefined | null, now = new Date()): boolean {
  const w = CALL_WINDOWS[(kind || "other") as LeadKind] ?? CALL_WINDOWS.other;
  const { day, minutes } = istClock(now);
  if (day === 0 || !w.days.includes(day)) return false;
  const from = Math.max(w.window[0], CALL_WINDOW_START);
  const to = Math.min(w.window[1], CALL_WINDOW_END);
  return minutes >= from && minutes < to;
}

/** "2:30 to 4 pm": the kind's window in words, for the mark's tooltip. */
export function callWindowText(kind: string | undefined | null): string {
  const w = CALL_WINDOWS[(kind || "other") as LeadKind] ?? CALL_WINDOWS.other;
  const say = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""}`;
  };
  const [a, b] = w.window;
  const pm = (m: number) => (m >= 12 * 60 ? "pm" : "am");
  return pm(a) === pm(b) ? `${say(a)} to ${say(b)} ${pm(b)}` : `${say(a)} ${pm(a)} to ${say(b)} ${pm(b)}`;
}

/**
 * Working hours for "Waiting on you" (a request older than 2 hours during
 * them turns amber): Monday to Saturday, 10:00 to 20:00 India time, the
 * same day the default quiet hours (20:00 to 10:00) leave.
 */
export function inWorkingHours(now = new Date()): boolean {
  const { day, minutes } = istClock(now);
  return day !== 0 && minutes >= 10 * 60 && minutes < 20 * 60;
}

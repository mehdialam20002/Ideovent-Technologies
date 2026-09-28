/**
 * BOOKING LOGIC: the pure half of the 3-step booking flow (BookingFlow.tsx).
 * No React, no DOM, so a script can test it. The demo stores and sends
 * nothing: these helpers only build the day strip, grey out closed days and
 * past slots, write the WhatsApp message and the calendar file.
 * Spec: DENTAL-DESIGN.md section 7, DENTAL-COMPLIANCE.md section 5.
 */

import type { DentalBooking, DentalSession } from "@/lib/cms/types";

const digits = (s?: string) => (s || "").replace(/\D/g, "");

/**
 * True when a number is the template's fiction pattern (+91 00000 00000,
 * 910000000000) or empty. The flow then shows the demo notice instead of
 * opening WhatsApp to a number that cannot exist.
 */
export function isPlaceholderNumber(n: string | undefined): boolean {
  const d = digits(n);
  if (d.length < 8) return true;
  return /^0+$/.test(d.replace(/^91/, ""));
}

/**
 * Weekdays with no slots, 0 is Sunday: the record's own `closedDays`, else
 * every weekday no session covers, else none.
 */
export function closedDaysOf(booking: DentalBooking | undefined, sessions: DentalSession[] | undefined): number[] {
  if (booking?.closedDays?.length) return booking.closedDays;
  const open = new Set((sessions || []).flatMap((s) => s.days || []));
  if (!open.size) return [];
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !open.has(d));
}

export interface BookingDay {
  /** "2026-09-29", local time. */
  iso: string;
  date: Date;
  closed: boolean;
  /** 0 today, 1 tomorrow. */
  offset: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The 7-day strip: today first. */
export function nextDays(count: number, closed: number[], now: Date = new Date()): BookingDay[] {
  const out: BookingDay[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({ iso: isoDay(date), date, closed: closed.includes(date.getDay()), offset: i });
  }
  return out;
}

/** "10:30 am" or "17:00" to minutes after midnight; null when unreadable. */
export function slotMinutes(label: string): number | null {
  const m = /^\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*$/i.exec(label || "");
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = (m[3] || "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** A slot today that starts within the next 30 minutes, or earlier, is gone. */
export function isPastSlot(day: BookingDay | undefined, label: string, now: Date = new Date()): boolean {
  if (!day || day.iso !== isoDay(now)) return false;
  const m = slotMinutes(label);
  return m !== null && m <= now.getHours() * 60 + now.getMinutes() + 30;
}

/** Day parts for the strip in the reader's language: "Tue", "30", "Sep". */
export function dayParts(date: Date, lang: "en" | "hi") {
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, o).format(date);
  return { weekday: f({ weekday: "short" }), day: f({ day: "numeric" }), month: f({ month: "short" }), long: f({ weekday: "long", day: "numeric", month: "long" }) };
}

/** An .ics file as a data URL, for "Add to calendar". Built in the browser, sent nowhere. */
export function icsHref({ title, date, slot, minutes = 30, location, note }: {
  title: string;
  date: Date;
  slot: string;
  minutes?: number;
  location?: string;
  note?: string;
}): string | undefined {
  const start = slotMinutes(slot);
  if (start === null) return undefined;
  const s = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(start / 60), start % 60);
  const e = new Date(s.getTime() + minutes * 60000);
  const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const esc = (t: string) => t.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ideovent demo//Dental booking//EN", "BEGIN:VEVENT",
    `UID:${stamp(s)}-${Math.abs(hash(title))}@demo.invalid`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(s)}`, `DTEND:${stamp(e)}`, `SUMMARY:${esc(title)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    ...(note ? [`DESCRIPTION:${esc(note)}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** A 10-digit Indian mobile starting 6 to 9. */
export const validMobile = (s: string) => /^[6-9]\d{9}$/.test(s);
export const validEmail = (s: string) => !s.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

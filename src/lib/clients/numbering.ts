/**
 * Dates and numbers of the client file (client-process-spec 5.2, 11.1).
 *
 * Every date here is an India date, "YYYY-MM-DD", the date in Asia/Kolkata
 * (UTC+5:30, no daylight saving). The financial year is India's, 1 April to
 * 31 March, from the India date at the moment of issue: "2026-27". A number is
 * IDV/<series>/<fy>/<serial> (the plain invoice series has no series part:
 * IDV/2026-27/001, 15 characters, inside GST's 16), the serial at least three
 * digits. Working days are Monday to Saturday, as the CRM's nextWorkingDays.
 *
 * The database gives the real number (crm_issue_document, 0014); local mode
 * gives it with the same functions (rules.ts). Pure, no I/O.
 */
import type { DocKind, Series } from "./types";

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** The India date of an instant: "2026-10-05". */
export function indiaDate(at: Date | string | number = new Date()): string {
  const t = typeof at === "number" ? at : typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "HH:MM", India time, of an instant. */
export function indiaTime(at: Date | string | number = new Date()): string {
  const t = typeof at === "number" ? at : typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(t + IST_OFFSET_MS).toISOString().slice(11, 16);
}

/** True for "YYYY-MM-DD" that is a real date. */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** The date part of an ISO date or timestamp, as an India date (a timestamp is converted). */
export function toIndiaDate(v: string | null | undefined): string | null {
  if (!v) return null;
  if (isIsoDate(v)) return v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : indiaDate(t);
}

const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const back = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  return back(utc(iso) + n * DAY_MS);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

/** 0 Sunday ... 6 Saturday. */
export function weekdayOf(iso: string): number {
  return new Date(utc(iso)).getUTCDay();
}

export const isWorkingDay = (iso: string) => weekdayOf(iso) !== 0;

/** n working days (Monday to Saturday) after `iso` (before, for a negative n). 0: the date itself. */
export function addWorkingDays(iso: string, n: number): string {
  let d = iso;
  let left = Math.abs(n);
  const step = n < 0 ? -1 : 1;
  while (left > 0) {
    d = addDays(d, step);
    if (isWorkingDay(d)) left--;
  }
  return d;
}

/** Working days from a to b (b after a), counting b and not a. */
export function workingDaysBetween(a: string, b: string): number {
  if (b <= a) return 0;
  let n = 0;
  for (let d = addDays(a, 1); d <= b; d = addDays(d, 1)) if (isWorkingDay(d)) n++;
  return n;
}

/** The date itself when it is a working day, else the next one (a Sunday moves to Monday). */
export function onOrNextWorkingDay(iso: string): string {
  return isWorkingDay(iso) ? iso : addDays(iso, 1);
}

/** India's financial year of a date: 1 April 2026 to 31 March 2027 is "2026-27". */
export function fyOf(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** "2026-10" of a date: a month in India. */
export const monthOf = (iso: string) => iso.slice(0, 7);

/** The money series of a document kind; null for the welcome pack, handover document and the others. */
export function seriesOf(kind: DocKind): Series | null {
  switch (kind) {
    case "quotation":
      return "Q";
    case "proforma":
      return "PI";
    case "invoice":
      return "INV";
    case "receipt":
      return "RC";
    case "credit_note":
      return "CN";
    default:
      return null;
  }
}

export const MONEY_KINDS: readonly DocKind[] = ["quotation", "proforma", "invoice", "receipt", "credit_note"];
export const isMoneyKind = (k: DocKind) => MONEY_KINDS.includes(k);

/** "IDV/PI/2026-27/001"; the plain invoice series "IDV/2026-27/001". */
export function formatNumber(series: Series, fy: string, serial: number): string {
  const part = series === "INV" ? "" : `${series}/`;
  return `IDV/${part}${fy}/${String(serial).padStart(3, "0")}`;
}

/** A document's file name part: "IDV-PI-2026-27-001". */
export const numberForFile = (n: string) => n.replace(/\//g, "-");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "5 Oct 2026" (spec 7.2). "" for nothing. */
export function fmtDate(iso: string | null | undefined): string {
  const d = toIndiaDate(iso || "");
  if (!d) return "";
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}

/** "5 Oct" (a short date in a sentence this year). */
export function fmtShort(iso: string | null | undefined): string {
  const d = toIndiaDate(iso || "");
  if (!d) return "";
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
}

/** "Monday" of a date. */
export const weekdayName = (iso: string) => WEEKDAYS[weekdayOf(iso)];
export const WEEKDAY_NAMES = WEEKDAYS;

/** A meeting: "Monday 5 Oct, 11:00" (spec 7.2); without a time, "Monday 5 Oct". */
export function fmtMeeting(iso: string | null | undefined, time?: string | null): string {
  const d = toIndiaDate(iso || "");
  if (!d) return "";
  const t = (time || "").trim();
  return `${weekdayName(d)} ${fmtShort(d)}${t ? `, ${t}` : ""}`;
}

/** New ids: "cl_", "pr_", "dc_", "py_" and ten letters or digits (the tables' id checks). */
export function newClientId(prefix: "cl" | "pr" | "dc" | "py"): string {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const rnd = typeof crypto !== "undefined" && "getRandomValues" in crypto ? crypto.getRandomValues(new Uint8Array(12)) : null;
  for (let i = 0; i < 12; i++) s += abc[(rnd ? rnd[i] : Math.floor(Math.random() * 256)) % abc.length];
  return `${prefix}_${s}`;
}

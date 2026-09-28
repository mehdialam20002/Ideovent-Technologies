import { delta } from "../metrics";

/** "just now", "12 min ago", "2 h ago", "3 days ago". */
export function ago(iso: string | undefined, now = new Date()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export interface Change {
  /** "+25%", "-10%", "new" (previous was 0), or "" when both are 0. */
  text: string;
  dir: "up" | "down" | "flat";
}

/** The change of a count against the period before it. */
export function change(cur: number, prev: number): Change {
  if (cur === 0 && prev === 0) return { text: "", dir: "flat" };
  const d = delta(cur, prev);
  if (d == null) return { text: "new", dir: "up" };
  if (Math.abs(d) < 0.005) return { text: "0%", dir: "flat" };
  const p = Math.round(d * 100);
  return { text: `${p > 0 ? "+" : ""}${p}%`, dir: p > 0 ? "up" : "down" };
}

/** "28 Sep" from YYYY-MM-DD. */
export function shortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "Mon 28 Sep" from YYYY-MM-DD. */
export function longDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

import { PLACEHOLDER_RE } from "@/lib/outreach/engine";
import { ONE_TIME, inr } from "@/lib/pricing";

/**
 * BLANKS IN A MESSAGE: "[package and price]", "[date]". The approved after-call
 * summary (APPROVED-MESSAGES-2026-09-30.md) carries them, and Mehdi may type
 * one himself. A message that still has one cannot be sent: the compose screen
 * highlights each blank in the text, offers one box per blank, and keeps the
 * send button disabled until none is left.
 *
 * A blank is what the engine calls a [placeholder] (engine.ts PLACEHOLDER_RE:
 * square brackets, on one line), so this screen offers a box for exactly the
 * blanks checkSend blocks on. Merge fields ({contactName}) are the engine's
 * business and are already filled when the text reaches this screen. Pure
 * functions, no React.
 */

const BLANK = new RegExp(PLACEHOLDER_RE.source, "g");
const nameOf = (match: string) => match.slice(1, -1).trim();

/** The blanks in a text, each once, in order of first appearance, without the brackets. "[ ]" has no name and gets no box. */
export function blanksIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(BLANK)) {
    const name = nameOf(m[0]);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/** One piece of a text: plain, a blank still to fill, or a blank Mehdi filled on this screen. */
export interface Piece {
  text: string;
  kind: "text" | "blank" | "filled";
}

/** The text cut into pieces, with every filled blank replaced by its value. */
export function piecesOf(text: string, fills: Record<string, string>): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const m of text.matchAll(BLANK)) {
    const name = nameOf(m[0]);
    if (!name) continue;
    const start = m.index ?? 0;
    if (start > at) out.push({ text: text.slice(at, start), kind: "text" });
    const value = (fills[name] ?? "").trim();
    out.push(value ? { text: value, kind: "filled" } : { text: m[0], kind: "blank" });
    at = start + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), kind: "text" });
  return out;
}

/** The text with every filled blank replaced by its value; unfilled blanks stay as they are. */
export function fillBlanks(text: string, fills: Record<string, string>): string {
  return piecesOf(text, fills).map((p) => p.text).join("");
}

/** "[date]" / "[package and price] and [date]" / "[a], [b] and [c]". */
export function listBlanks(names: string[]): string {
  const b = names.map((n) => `[${n}]`);
  return b.length < 2 ? b.join("") : `${b.slice(0, -1).join(", ")} and ${b[b.length - 1]}`;
}

/**
 * Website options exactly as /pricing lists them ("Website": Essential,
 * Professional, Premium), read from src/lib/pricing.ts since 2 Oct 2026: Rs
 * 12,000 / 18,000 / 25,000, the middle one still Mehdi's to confirm. Offered as
 * suggestions only.
 */
const WEBSITE_TIER_NAMES = ["Website Essential", "Website Professional", "Website Premium"];
export const WEBSITE_OPTIONS = ONE_TIME.website.tiers.map((n, i) => `${WEBSITE_TIER_NAMES[i] || "Website"}, ${inr(n).replace("₹", "Rs ")}`);

/** The next `n` working days (Monday to Saturday) after `from`, as "Monday 5 Oct". */
export function nextWorkingDays(from: Date, n = 6): string[] {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue;
    out.push(`${d.toLocaleDateString("en-IN", { weekday: "long" })} ${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })}`);
  }
  return out;
}

/** Suggestions for one blank, by what it asks for. Empty when there is nothing honest to suggest. */
export function suggestionsFor(name: string, now = new Date()): string[] {
  if (/price|package|amount|fee|kitna|kharch/i.test(name)) return WEBSITE_OPTIONS;
  if (/date|day|din|tarikh|taareekh/i.test(name)) return nextWorkingDays(now);
  return [];
}

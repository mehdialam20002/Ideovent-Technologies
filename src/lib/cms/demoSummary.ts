import type { DemoSite } from "./types";

/**
 * DEMO SUMMARIES ON THE CRM (4 Oct 2026, crm-fixes-1004 item 8).
 *
 * The live test found every CRM load reading the whole content table twice:
 * 380 rows, about 9 MB of JSON each time, 8.4 MB of it 172 whole demo sites,
 * while every list in the CRM (Demos, the lead's demo card, step 1's picker,
 * the dashboard) reads a handful of fields. On the CRM's own host the
 * Supabase store now reads demoSites as these fields only (PostgREST JSON
 * paths, the same table and the same session, so row security and the 0013
 * rules decide exactly as before), and a demo's whole record is read by its id
 * when it is needed: the lead page that shows it (its message reads what the
 * demo has), and every write (Mark sent, a send that publishes a draft).
 *
 * A summary carries SUMMARY_MARK. It can never be saved: the Supabase store
 * refuses it, so a write can never replace a whole demo with a summary.
 */

/** The fields a demo summary carries: everything a CRM list, a link check or Create lead reads. */
export const DEMO_SUMMARY_FIELDS = [
  "id", "slug", "status", "kind", "instituteName", "shortName", "city", "state", "market",
  "createdAt", "updatedAt", "preparedOn", "templateId", "isExample", "expiresAt", "officialWebsite", "contact", "order",
] as const;

/** Fields read as JSON (an object, a boolean or a number); the rest as text. */
const JSON_FIELDS = new Set<string>(["isExample", "contact", "order"]);

/** The mark on a summary. A record with it is never written (supabaseStore saveDoc refuses it). */
export const SUMMARY_MARK = "__summary";

/** The PostgREST select of a summary row: doc_id and each field as its own column ("slug:data->>slug"). */
export const DEMO_SUMMARY_SELECT = [
  "doc_id",
  ...DEMO_SUMMARY_FIELDS.map((f) => `${f}:data${JSON_FIELDS.has(f) ? "->" : "->>"}${f}`),
].join(",");

/** A summary row (DEMO_SUMMARY_SELECT) as a demo record marked as a summary. Empty fields are left out. */
export function toDemoSummary(row: Record<string, unknown>): DemoSite {
  const out: Record<string, unknown> = {};
  for (const f of DEMO_SUMMARY_FIELDS) {
    const v = row[f];
    if (v !== null && v !== undefined && v !== "") out[f] = v;
  }
  if (!out.id && typeof row.doc_id === "string") out.id = row.doc_id;
  out[SUMMARY_MARK] = true;
  return out as unknown as DemoSite;
}

/** True for a demo read as a summary: its whole record must be read (loadDemo) before it is used in a message or saved. */
export function isDemoSummary(d: unknown): boolean {
  return Boolean(d && typeof d === "object" && (d as Record<string, unknown>)[SUMMARY_MARK] === true);
}

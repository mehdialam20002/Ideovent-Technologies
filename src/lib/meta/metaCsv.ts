/**
 * The CRM import reads Meta's own lead downloads as they are (meta-leads-spec 7).
 *
 *   "forms"         Ads Manager and Business Suite instant-form downloads: id,
 *                   created_time, ad_id, ad_name, adset_id, adset_name,
 *                   campaign_id, campaign_name, form_id, form_name, is_organic,
 *                   platform, then one column per question. Ids carry type
 *                   prefixes (l:, ag:, as:, c:, f:), phones p:.
 *   "leads_center"  Leads Center downloads: only date, name, e-mail, phone,
 *                   stage, source and owner.
 *   null            anything else: the CRM's own mapping, untouched.
 *
 * mapCsvRow (store.ts) asks metaCsvLayout first and hands a Meta row here. The
 * mapping itself is fields.js mapMetaLead, the same one the webhook uses, so an
 * export and the webhook give a lead the same id (ol_meta_<lead id>), title,
 * source, notes and meta* keys, and find each other as duplicates.
 *
 * Imported relatively ("./fields"), not as "@/lib/meta/fields": the Node test
 * harnesses that bundle store.ts resolve "@/" paths to .ts files only.
 */
import { META_LEAD_ID_PREFIX, mapMetaLead, metaId, type MetaLeadInput } from "./fields";
import type { LeadInput } from "../outreach/types";

export type MetaCsvLayout = "forms" | "leads_center";

/** A forms download has created_time and at least two of these. */
const FORM_SIGNS = ["ad_id", "adset_id", "campaign_id", "form_id", "form_name", "is_organic", "platform"];
/** The columns of a forms download that describe the lead, not answers. */
const FORM_COLUMNS = new Set(["id", "leadgen_id", "page_id", "created_time", "ad_name", "adset_name", "campaign_name", ...FORM_SIGNS]);
/** Meta's own extra columns in a forms download: not answers either. */
const META_EXTRAS = new Set(["lead_status", "inbox_url", "partner_name", "retailer_item_id", "home_listing", "vehicle", "post"]);
/** The CRM's own sheets and exports carry one of these, so they are never a Leads Center file. */
const CRM_SIGNS = ["org_name", "institute_name", "institute", "contact_phone"];

const LC = {
  stage: ["stage", "lead_stage"],
  owner: ["owner", "lead_owner"],
  name: ["name", "full_name", "lead_name"],
  email: ["email", "email_address", "e_mail", "work_email"],
  phone: ["phone", "phone_number", "mobile", "mobile_number", "contact_number"],
  date: ["created_time", "created", "created_date", "date_created", "created_at", "time_created", "date"],
  id: ["id", "lead_id", "leadgen_id"],
} as const;

/**
 * Which of Meta's downloads a header is (the row's keys as parseCsv
 * normalised them), or null for every other sheet. A Leads Center file also
 * needs a source column: without it another CRM's export with Name, Email,
 * Stage and Owner (Pipedrive's, say) would read as Meta's (review, 2 Oct).
 */
export function metaCsvLayout(keys: readonly string[]): MetaCsvLayout | null {
  const has = new Set(keys);
  const any = (list: readonly string[]) => list.some((k) => has.has(k));
  if (has.has("created_time") && FORM_SIGNS.filter((k) => has.has(k)).length >= 2) return "forms";
  if (!any(CRM_SIGNS) && any(LC.stage) && any(LC.owner) && has.has("source") && any(LC.name) && (any(LC.email) || any(LC.phone))) {
    return "leads_center";
  }
  return null;
}

/**
 * The CRM's export puts a ' before a cell that a spreadsheet would run as a
 * formula (= + - @, a tab or a carriage return: leadQuery cell()). The import
 * takes one such ' off again, so the CRM's own export imports back unchanged.
 * Returns the same row when nothing changes.
 */
export function unguardCells(row: Record<string, string>): Record<string, string> {
  let out: Record<string, string> | null = null;
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string" && /^'[=+\-@\t\r]/.test(v)) {
      out = out || { ...row };
      out[k] = v.slice(1);
    }
  }
  return out || row;
}

/**
 * One row of a Meta download to a lead input, or why it cannot be one. The
 * lead keeps Meta's id as its own (ol_meta_<id>) when the row has one, its
 * created time, and status New. It gets NO follow-up date: an old export must
 * not flood Today. Meta's own stages are not CRM stages: they stay in the notes.
 */
export function mapMetaCsvRow(row: Record<string, string>, layout: MetaCsvLayout): { lead: LeadInput } | { skip: string } {
  const get = (k: string) => String(row[k] ?? "").trim();
  const first = (list: readonly string[]) => list.map(get).find(Boolean) || "";
  let input: MetaLeadInput;
  if (layout === "forms") {
    const answers: Record<string, string> = {};
    for (const k of Object.keys(row)) {
      if (!k || FORM_COLUMNS.has(k) || META_EXTRAS.has(k)) continue;
      const v = get(k);
      if (v) answers[k] = v;
    }
    input = { answers };
    for (const k of FORM_COLUMNS) if (get(k)) input[k] = get(k);
  } else {
    const answers: Record<string, string> = {};
    for (const list of [LC.name, LC.email, LC.phone]) {
      const k = list.find((x) => get(x));
      if (k) answers[k] = get(k);
    }
    const parts = [["stage", first(LC.stage)], ["source", get("source")], ["owner", first(LC.owner)]].filter(([, v]) => v);
    // Leads Center has no lead id of its own; only a column holding a real Meta id (10 digits or more) counts as one.
    const id = metaId(first(LC.id));
    input = {
      answers,
      created_time: first(LC.date),
      source: "Meta Leads Center",
      leadsCenter: true,
      extra: parts.length ? `Leads Center: ${parts.map(([k, v]) => `${k} ${v}`).join(", ")}` : undefined,
    };
    if (id.length >= 10) input.id = id;
  }
  const { leadgenId, lead } = mapMetaLead(input);
  if (!lead.phone && !lead.whatsapp && !lead.email) return { skip: `${lead.instituteName}: no phone or email` };
  const out: LeadInput = { ...lead, status: "new" };
  if (leadgenId) out.id = META_LEAD_ID_PREFIX + leadgenId;
  if (lead.metaCreatedAt) out.createdAt = lead.metaCreatedAt;
  return { lead: out };
}

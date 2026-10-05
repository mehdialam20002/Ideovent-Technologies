import type { OutreachLead } from "./types";

/**
 * THE TOWN OF A LEAD (4 Oct 2026, crm-fixes-1004 item 10). The City field of
 * the imported leads holds whole street addresses ("100 Feet Road, Sudarshan
 * Nagar, Amritsar, Punjab"), so the City filter offered 171 choices of one lead
 * each and the Dashboard's breakdown by city had 171 rows. cityOf reads the town
 * out of it for the filters, the breakdown and the table; the address itself is
 * kept, unchanged, and shown on the lead (Facts) and searched by the search box.
 *
 * The rule, on the parts between commas: drop a PIN code (six digits), "India",
 * and a part that is a state or union territory (or the lead's own state); the
 * town is the last part left. A one-part value is itself. Pure, no I/O.
 */

/** States and union territories, lower case, with the spellings the directories use. */
const STATES = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "chattisgarh", "goa", "gujarat", "haryana",
  "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya",
  "mizoram", "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
  "uttar pradesh", "uttarakhand", "uttaranchal", "west bengal",
  "andaman and nicobar islands", "andaman & nicobar islands", "chandigarh", "dadra and nagar haveli and daman and diu",
  "dadra and nagar haveli", "daman and diu", "delhi", "nct of delhi", "national capital territory of delhi",
  "jammu and kashmir", "jammu & kashmir", "ladakh", "lakshadweep", "puducherry", "pondicherry",
  "up", "mp", "hp", "uk", "wb", "tn", "ap",
]);

/** A town that shares its name with its state or territory: kept when it is the only part left. */
const CITY_STATES = new Set(["delhi", "chandigarh", "puducherry", "pondicherry", "goa"]);

const clean = (s: string) =>
  s
    .replace(/\b\d{3}\s?\d{3}\b/g, " ") // a PIN code, "110027" or "110 027"
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–,.]+|[\s\-–,.]+$/g, "")
    .trim();

/** The town of a lead, from its City field (an address or a town), for filters and breakdowns. "" when it has none. */
export function cityOf(lead: Pick<OutreachLead, "city" | "state">): string {
  const raw = (lead.city || "").trim();
  if (!raw) return "";
  const own = (lead.state || "").trim().toLowerCase();
  const parts = raw.split(/[,\n;|]+/).map(clean).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  const isState = (p: string) => {
    const k = p.toLowerCase();
    return k === "india" || STATES.has(k) || (own !== "" && k === own);
  };
  const kept = parts.filter((p) => !isState(p));
  if (kept.length) return kept[kept.length - 1];
  // Nothing but states ("New Delhi, Delhi" leaves "New Delhi"; "Delhi, India" leaves "Delhi").
  const town = parts.find((p) => CITY_STATES.has(p.toLowerCase()));
  return town || parts[0];
}

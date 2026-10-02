/**
 * Meta Lead Ads: how a lead from a Facebook or Instagram instant form becomes
 * a CRM lead. ONE copy of these rules, used by:
 *   - the server: api/_lib/metaIntake.js (the webhook, the daily catch-up and
 *     the Make relay) turns a lead read from the Graph API into the object it
 *     hands to public.meta_lead_ingest (migration 0012);
 *   - the browser: the CRM's CSV import of Meta's own exports, and local
 *     mode's "Simulate a Meta lead".
 *
 * Plain JavaScript on purpose (with fields.d.ts beside it): Vercel's functions
 * import it as it is, Vite bundles it, and Node's tests import it directly.
 * Pure: no imports, no environment, no network, no clock but what the caller
 * passes, no node: modules (it ships to the browser).
 *
 * Every value it returns is text, cut to META_MAX. The database cuts and
 * checks again on the way in (private.meta_lead_keys(), private.meta_max() in
 * 0012), and scripts/test-meta-rls.mjs checks the two lists are the same.
 * Fixtures and examples are fictional (example.org, +91 90000 0000x).
 */

/** A Meta lead's CRM id: the prefix and Meta's own lead id, so a lead can only ever be added once. */
export const META_LEAD_ID_PREFIX = "ol_meta_";

/**
 * The `source` a Meta lead carries. Readable on purpose: the lead page and the
 * Source filter print it as it is. Leads Center exports carry no platform.
 */
export const META_SOURCES = Object.freeze(["Facebook Lead Ads", "Instagram Lead Ads", "Meta Lead Ads", "Meta Leads Center"]);

/** The longest each key may be. The keys, in this order, are every key a Meta lead may set (0012 refuses others). */
export const META_MAX = Object.freeze({
  instituteName: 200,
  kind: 16,
  contactName: 120,
  phone: 40,
  whatsapp: 40,
  email: 160,
  city: 80,
  state: 80,
  website: 300,
  source: 40,
  notes: 3000,
  metaLeadId: 40,
  metaPlatform: 16,
  metaFormId: 40,
  metaFormName: 200,
  metaCampaignId: 40,
  metaCampaignName: 200,
  metaAdsetId: 40,
  metaAdsetName: 200,
  metaAdId: 40,
  metaAdName: 200,
  metaCreatedAt: 40,
  metaOrganic: 3,
  metaConsent: 4,
});

export const META_LEAD_KEYS = Object.freeze(Object.keys(META_MAX));

/* ── Text ─────────────────────────────────────────────────────────────────── */

/**
 * Invisible characters and Unicode direction controls (zero-width spaces and
 * joiners, LRM/RLM, the embeddings and overrides U+202A to U+202E, word
 * joiners, the isolates U+2066 to U+2069, the BOM). Every answer is typed by a
 * stranger and shows up as a lead title, a bell and a note; with these, a
 * title could be shown reversed (U+202E) or disguised as another lead's.
 * They become nothing.
 */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** One line: control characters to spaces, invisible characters removed, spaces collapsed, trimmed, cut. */
function oneLine(v, max) {
  return String(v ?? "")
    .replace(INVISIBLE, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Several lines: like oneLine, but newlines stay (at most one blank line in a row). */
function lines(v, max) {
  return String(v ?? "")
    .replace(INVISIBLE, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/* ── Platform and source ──────────────────────────────────────────────────── */

const PLATFORM_LABEL = { fb: "Facebook", ig: "Instagram", msg: "Messenger", an: "Audience Network", wa: "WhatsApp" };

/** Meta's `platform` ("fb", "ig", or a spelled-out name) as its short code; "" when unknown. */
export function platformCode(raw) {
  const p = oneLine(raw, 40).toLowerCase().replace(/[\s-]+/g, "_");
  if (!p) return "";
  if (p === "fb" || p === "facebook") return "fb";
  if (p === "ig" || p === "instagram") return "ig";
  if (p === "msg" || p === "messenger") return "msg";
  if (p === "an" || p === "audience_network") return "an";
  if (p === "wa" || p === "whatsapp") return "wa";
  return /^[a-z_]{1,16}$/.test(p) ? p : "";
}

/** "Instagram" for "ig"; "Meta" when the platform is not known. */
export function platformLabel(code) {
  return PLATFORM_LABEL[code] || "Meta";
}

/** The `source` for a platform code: Facebook Lead Ads, Instagram Lead Ads, else Meta Lead Ads. */
export function sourceFor(code) {
  return code === "fb" ? META_SOURCES[0] : code === "ig" ? META_SOURCES[1] : META_SOURCES[2];
}

/** True for a lead that came from Meta (the webhook, the relay, or an import of Meta's exports). */
export function isMetaLead(lead) {
  return Boolean(lead && (lead.metaLeadId || META_SOURCES.includes(lead.source)));
}

/** What the Campaign filter shows for a lead: its campaign's name, else its id; "" when it has none. */
export function campaignOf(lead) {
  if (!lead) return "";
  return oneLine(lead.metaCampaignName, 200) || (lead.metaCampaignId ? `Campaign ${lead.metaCampaignId}` : "");
}

/* ── Ids, times, flags ────────────────────────────────────────────────────── */

/**
 * A Meta id as digits, or "". Meta's exports write ids with a type prefix
 * ("l:", "ag:", "as:", "c:", "f:"), and a number read as a JS number loses
 * digits above 2^53, so ids are always handled as text.
 */
export function metaId(raw) {
  const s = oneLine(raw, 64).replace(/^[a-z]{1,3}:/i, "");
  return /^\d{1,32}$/.test(s) ? s : "";
}

/**
 * Meta's time as ISO 8601 (UTC), or "". Accepts unix seconds (the webhook's
 * created_time), unix milliseconds, and ISO text with a "+0000" offset (the
 * Graph API's), which JavaScript's Date does not read until it is "+00:00".
 */
export function metaTime(raw) {
  if (raw === null || raw === undefined || raw === "") return "";
  const s = String(raw).trim();
  let d;
  if (/^\d{9,11}$/.test(s)) d = new Date(Number(s) * 1000);
  else if (/^\d{12,14}$/.test(s)) d = new Date(Number(s));
  else d = new Date(s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2 Oct 2026, 14:05 IST" for an ISO time; "" when it is not one. India has no daylight saving. */
export function istLabel(iso) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + 330 * 60000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} IST`;
}

/** Meta's is_organic (true, "TRUE", 1, "1", false, "FALSE", 0, "0") as "yes" or "no"; "" when absent. */
export function yesNo(raw) {
  if (raw === true || raw === 1) return "yes";
  if (raw === false || raw === 0) return "no";
  const s = oneLine(raw, 8).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return "yes";
  if (s === "false" || s === "0" || s === "no") return "no";
  return "";
}
/* ── Contacts (the same rules as src/lib/outreach/store.ts) ──────────────── */

/**
 * The CRM's phone rule (store.ts normalizePhone), after Meta's "p:" prefix
 * (its CSV exports write "p:+919000000001" so a spreadsheet keeps the plus).
 * "+91" and ten digits for an Indian number; other numbers keep their digits
 * after a "+"; fewer than 7 digits is no number (""). test-meta-import.mjs
 * checks the two functions agree.
 */
export function normalizePhone(raw) {
  if (!raw) return "";
  const text = String(raw).trim().replace(/^p:\s*/i, "");
  const first = text.split(/[,;/|]|\s+or\s+/i).map((x) => x.trim()).find((x) => /\d/.test(x)) || "";
  const hasPlus = first.startsWith("+");
  let d = first.replace(/\D/g, "");
  if (!d) return "";
  if (!hasPlus && d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("91")) return "+" + d;
  if (d.length === 11 && d.startsWith("0")) return "+91" + d.slice(1);
  if (d.length === 10 && !hasPlus) return "+91" + d;
  if (d.length < 7) return "";
  return "+" + d;
}

/** Lower-cased and trimmed, or "" when it is not an e-mail address (store.ts normalizeEmail). */
export function normalizeEmail(raw) {
  const e = String(raw ?? "").trim().toLowerCase().replace(/^mailto:/, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= META_MAX.email ? e : "";
}

/* ── The form's answers ───────────────────────────────────────────────────── */

/** A question's key as the matching reads it: "What type of business?" -> "what_type_of_business". */
export function normalizeKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

/**
 * Exact keys first. Meta's standard questions have fixed keys (full_name,
 * phone_number, email, city, company_name ...); a custom question's key is
 * whatever the form's author set, so guessField below reads its words.
 */
const ALIASES = {
  fullName: ["full_name", "name", "your_name", "fullname", "contact_name", "lead_name"],
  firstName: ["first_name", "firstname", "given_name"],
  lastName: ["last_name", "lastname", "surname", "family_name"],
  phone: ["phone_number", "phone", "mobile", "mobile_number", "mobile_no", "phone_no", "contact_number", "contact_no", "number"],
  whatsapp: ["whatsapp", "whatsapp_number", "whatsapp_no", "whats_app_number"],
  email: ["email", "email_address", "e_mail", "work_email", "your_email", "email_id"],
  business: [
    "company_name", "business_name", "company", "business", "organisation", "organization", "organisation_name",
    "organization_name", "institute_name", "institute", "school_name", "clinic_name", "shop_name", "brand_name",
    "firm_name", "store_name",
  ],
  city: ["city", "town", "city_town", "your_city", "location", "area", "locality"],
  state: ["state", "province", "region"],
  website: ["website", "website_url", "current_website", "your_website", "site_url"],
  businessType: ["business_type", "type_of_business", "industry", "category", "business_category", "kind_of_business"],
};

const ALIAS_OF = new Map();
for (const [field, keys] of Object.entries(ALIASES)) for (const k of keys) ALIAS_OF.set(k, field);

/** A custom question's field, from the words in its key; "" when it is none of ours. Order matters. */
function guessField(k) {
  if (/whats_?app/.test(k)) return "whatsapp";
  if (/(^|_)e_?mail/.test(k)) return "email";
  if (/(phone|mobile|contact_number|contact_no)/.test(k)) return "phone";
  if (/(website|web_site|_url$|^url$)/.test(k)) return "website";
  if (/(type|kind|category|industry)/.test(k) && /(business|company|work|firm|organi[sz]ation|you_run|you_do)/.test(k)) return "businessType";
  if (/name/.test(k) && /(business|company|shop|clinic|school|institute|brand|firm|store|organi[sz]ation)/.test(k)) return "business";
  if (/(^|_)(city|town)(_|$)/.test(k)) return "city";
  return "";
}

/** One answer's text: every value of a multiple-choice answer, joined with ", ". */
function answerText(values) {
  const list = Array.isArray(values) ? values : values === null || values === undefined ? [] : [values];
  return oneLine(list.map((v) => (v === null || v === undefined ? "" : String(v).trim())).filter(Boolean).join(", "), 500);
}

/**
 * The answers of one lead, read into the CRM's fields. `fieldData` is the
 * Graph API's field_data ([{ name, values: [...] }]) or a plain object
 * ({ full_name: "...", phone_number: "..." }: the relay, or a CSV row's
 * question columns). Returns the fields it recognised and every answer in
 * order ({ key, label, value }) for the notes; nothing is dropped.
 */
export function readAnswers(fieldData) {
  const entries = Array.isArray(fieldData)
    ? fieldData.filter((e) => e && typeof e === "object").map((e) => [e.name, e.values !== undefined ? e.values : e.value])
    : fieldData && typeof fieldData === "object"
      ? Object.entries(fieldData)
      : [];
  const answers = [];
  for (const [name, values] of entries) {
    const label = oneLine(name, 120);
    const value = answerText(values);
    if (label && value) answers.push({ key: normalizeKey(label), label, value });
  }
  const got = {};
  for (const a of answers) {
    const f = ALIAS_OF.get(a.key);
    if (f && !got[f]) got[f] = a.value;
  }
  for (const a of answers) {
    if (ALIAS_OF.has(a.key)) continue;
    const f = guessField(a.key);
    if (f && !got[f]) got[f] = a.value;
  }
  const fullName = got.fullName || [got.firstName, got.lastName].filter(Boolean).join(" ");
  const fields = {
    fullName: oneLine(fullName, META_MAX.contactName),
    phone: got.phone || "",
    whatsapp: got.whatsapp || "",
    email: got.email || "",
    business: oneLine(got.business, META_MAX.instituteName),
    city: oneLine(got.city, META_MAX.city),
    state: oneLine(got.state, META_MAX.state),
    website: oneLine(got.website, META_MAX.website),
    businessType: oneLine(got.businessType, 200),
  };
  return { fields, answers };
}

/**
 * The form's consent ticks (Graph custom_disclaimer_responses: [{ checkbox_key,
 * is_checked }]; they are NOT in field_data): "yes" when every tick was
 * ticked, "no" when one was not, "none" when the form had no tick.
 */
export function consentFrom(list) {
  if (!Array.isArray(list) || !list.length) return "none";
  const ticked = list.map((d) => d && (d.is_checked === true || d.is_checked === 1 || /^(1|true|yes)$/i.test(String(d.is_checked ?? "").trim())));
  return ticked.every(Boolean) ? "yes" : "no";
}

function kindIn(text) {
  const s = oneLine(text, 300).toLowerCase();
  if (!s) return "";
  if (/(dental|dentist|orthodont|teeth|tooth)/.test(s)) return "dental";
  if (/(school|vidyalaya|convent|cbse|icse|kindergarten|play ?school|pre ?school)/.test(s)) return "school";
  if (/(coaching|tuition|tutorial|classes|institute|academy|\bias\b|\bjee\b|\bneet\b)/.test(s)) return "coaching";
  return "";
}

/**
 * The lead kind (school, coaching, dental, other). The business-type answer
 * decides when the form asked it, even when it says "other"; without one,
 * the business name, then the form's name, may say it. Most businesses are
 * "other": the site speaks to every kind of business.
 */
export function kindFromText(businessType, ...hints) {
  if (oneLine(businessType, 300)) return kindIn(businessType) || "other";
  for (const h of hints) {
    const k = kindIn(h);
    if (k) return k;
  }
  return "other";
}
/* ── The lead ─────────────────────────────────────────────────────────────── */

/**
 * The lead's title (the CRM's "institute" name): the business name the form
 * asked for. Without one, "Lead from Instagram, Patna", never the person's
 * own name: a See-all member reads titles in the overview, which carries no
 * contacts (spec 3, DPDP minimum access). The name is in contactName.
 */
export function leadTitle(fields, code) {
  const business = oneLine(fields && fields.business, META_MAX.instituteName);
  if (business) return business;
  const city = oneLine(fields && fields.city, 60);
  return oneLine(`Lead from ${platformLabel(code)}${city ? `, ${city}` : ""}`, META_MAX.instituteName);
}

/**
 * The notes of a new Meta lead: where it came from, the consent tick, and
 * every answer as the person gave it (the raw record, kept as a note).
 *
 *   Meta lead form, Instagram, 2 Oct 2026, 14:05 IST
 *   Form: Website enquiry · Campaign: Diwali offer · Ad set: Delhi · Ad: Video 1
 *   Consent tick: ticked
 *   Answers:
 *   full_name: Test Lead One
 *   ...
 */
export function metaNotes(m, answers) {
  const out = [];
  const when = istLabel(m.createdAt);
  out.push(m.leadsCenter ? `Meta Leads Center export${when ? `, ${when}` : ""}` : `Meta lead form, ${platformLabel(m.platform)}${when ? `, ${when}` : ""}`);
  const where = [
    m.formName && `Form: ${m.formName}`,
    m.campaignName && `Campaign: ${m.campaignName}`,
    m.adsetName && `Ad set: ${m.adsetName}`,
    m.adName && `Ad: ${m.adName}`,
  ].filter(Boolean);
  if (m.organic === "yes" && !m.campaignName) where.push("No ad (organic, or a test lead)");
  if (where.length) out.push(where.join(" · "));
  if (m.consent === "yes") out.push("Consent tick: ticked");
  else if (m.consent === "no") out.push("Consent tick: NOT ticked");
  else if (m.consent === "none") out.push("Consent tick: the form had none");
  if (m.extra) out.push(oneLine(m.extra, 500));
  if (answers && answers.length) {
    out.push("Answers:");
    for (const a of answers) out.push(`${a.label}: ${a.value}`);
  }
  return lines(out.join("\n"), META_MAX.notes);
}

/**
 * One Meta lead as the CRM stores it. `input` takes the Graph API's lead
 * (snake_case: id, created_time, field_data, custom_disclaimer_responses,
 * form_id, platform, is_organic, ad_id, ad_name, adset_id, adset_name,
 * campaign_id, campaign_name) or the same in camelCase (leadgenId, createdTime,
 * fieldData, disclaimers, formId, formName ...), plus pageId and, for the
 * imports, `source` (one of META_SOURCES), `leadsCenter` and `extra` (a line
 * for the notes). The webhook's adgroup_id is the ad's id under its old name.
 *
 * Returns { leadgenId, pageId, lead }. `lead` holds only META_LEAD_KEYS, every
 * value text, empty ones left out; the database adds id, createdAt,
 * updatedAt, status and nextActionAt (0012 meta_lead_ingest), the CSV import
 * adds id, createdAt and status.
 */
export function mapMetaLead(input) {
  const i = input && typeof input === "object" ? input : {};
  const pick = (...keys) => {
    for (const k of keys) if (i[k] !== undefined && i[k] !== null && i[k] !== "") return i[k];
    return undefined;
  };
  const leadgenId = metaId(pick("leadgenId", "leadgen_id", "id"));
  const code = platformCode(pick("platform"));
  const { fields, answers } = readAnswers(pick("fieldData", "field_data", "answers"));
  const createdAt = metaTime(pick("createdTime", "created_time"));
  const organic = yesNo(pick("isOrganic", "is_organic"));
  const given = pick("consent");
  const disclaimers = pick("disclaimers", "custom_disclaimer_responses");
  const consent = given === "yes" || given === "no" || given === "none" ? given : disclaimers !== undefined ? consentFrom(disclaimers) : "";
  const formName = oneLine(pick("formName", "form_name"), META_MAX.metaFormName);
  const campaignName = oneLine(pick("campaignName", "campaign_name"), META_MAX.metaCampaignName);
  const adsetName = oneLine(pick("adsetName", "adset_name"), META_MAX.metaAdsetName);
  const adName = oneLine(pick("adName", "ad_name"), META_MAX.metaAdName);
  const phone = normalizePhone(fields.phone);
  const whatsappRaw = normalizePhone(fields.whatsapp);
  const source = META_SOURCES.includes(i.source) ? i.source : sourceFor(code);
  const lead = {
    instituteName: leadTitle(fields, code),
    kind: kindFromText(fields.businessType, fields.business, formName),
    contactName: fields.fullName,
    phone,
    whatsapp: whatsappRaw && whatsappRaw !== phone ? whatsappRaw : "",
    email: normalizeEmail(fields.email),
    city: fields.city,
    state: fields.state,
    website: fields.website,
    source,
    notes: metaNotes(
      { platform: code, createdAt, formName, campaignName, adsetName, adName, organic, consent, leadsCenter: Boolean(i.leadsCenter), extra: i.extra },
      answers,
    ),
    metaLeadId: leadgenId,
    metaPlatform: code,
    metaFormId: metaId(pick("formId", "form_id")),
    metaFormName: formName,
    metaCampaignId: metaId(pick("campaignId", "campaign_id")),
    metaCampaignName: campaignName,
    metaAdsetId: metaId(pick("adsetId", "adset_id")),
    metaAdsetName: adsetName,
    metaAdId: metaId(pick("adId", "ad_id", "adgroup_id")),
    metaAdName: adName,
    metaCreatedAt: createdAt,
    metaOrganic: organic,
    metaConsent: consent,
  };
  for (const k of Object.keys(lead)) {
    lead[k] = typeof lead[k] === "string" ? lead[k].slice(0, META_MAX[k]) : "";
    if (!lead[k]) delete lead[k];
  }
  return { leadgenId, pageId: metaId(pick("pageId", "page_id")), lead };
}

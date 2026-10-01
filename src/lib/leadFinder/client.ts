/**
 * The Lead Finder's only door to the server: POST /api/leads-search.
 *
 * The function (api/leads-search.js) checks the caller is a signed-in admin
 * with the caller's own Supabase token, reads the Google Maps key under RLS,
 * and answers three actions:
 *
 *   search  { query?, type?, city?, preset?, pageToken? } -> { source, places[], nextPageToken }
 *   details { placeId }                                   -> { place }   (Google results only)
 *   audit   { urls: [..10], kind? }                       -> { audits[] }
 *
 * TWO SOURCES (28 Sep 2026). With a working Google key the list is Google
 * Maps; with none, or when every key fails, it is OpenStreetMap: free, fewer
 * businesses and fewer phones, and always shown with "© OpenStreetMap
 * contributors".
 *
 * GOOGLE'S TERMS. What comes back from Google (phone, address, rating) is
 * shown LIVE and never written to our database by this module. Only the place
 * ID may be kept. OpenStreetMap's data is ODbL: it may be kept with the
 * attribution. The audit reads the business's own website, and the phones and
 * emails found there are theirs, published by them.
 */
import { getAdminAccessToken } from "@/lib/ai/keys";
import { supabaseEnabled } from "@/lib/cms/config";

/** Where a result came from. */
export type FinderSource = "google" | "osm";

export interface FinderPlace {
  /** Google's place ID, or osm:node/123 for an OpenStreetMap result. */
  placeId: string;
  name: string;
  address: string | null;
  /** Google's number (live only: not stored unless Mehdi saves it), or the one on OpenStreetMap. */
  phone: string | null;
  phoneIntl: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  /** Google Maps link, or the openstreetmap.org page of an OSM result. */
  mapsUrl: string | null;
  businessStatus: string | null;
  /** Google's primary type, or the OSM tag it came from, e.g. "dentist (orthodontics)". */
  primaryType: string | null;
  source: FinderSource;
  lat: number | null;
  lon: number | null;
}

/** OpenStreetMap's credit, shown beside every OSM result list (ODbL). */
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
export const OSM_NOTE = "OpenStreetMap is free, but it lists fewer businesses and fewer phone numbers than Google Maps.";

/** "unchecked": the page is drawn by scripts and nothing that could be checked was wrong (30 Sep 2026). */
export type AuditVerdict = "none" | "broken" | "poor" | "ok" | "unchecked";

export interface AuditEvidence {
  /** Machine code, e.g. no_viewport, no_https, http_404, free_builder. */
  code: string;
  /** One plain sentence, e.g. "No HTTPS: browsers mark it 'Not secure'". */
  text: string;
}

export interface SiteAudit {
  verdict: AuditVerdict;
  url: string | null;
  finalUrl: string | null;
  status: number | null;
  ms: number | null;
  title: string | null;
  evidence: AuditEvidence[];
  /** Found on their OWN website: may be stored on the lead. */
  phones: string[];
  emails: string[];
}

export interface SearchResult {
  places: FinderPlace[];
  nextPageToken: string | null;
  textQuery: string;
  source: FinderSource;
  /** "Google Maps" or "© OpenStreetMap contributors". */
  attribution: string;
  attributionUrl: string | null;
  /** OSM only: the honest line about fewer businesses and phones. */
  note: string | null;
  /** OSM only: why Google was not used, e.g. "No Google Maps key is saved." Null when Google was not tried. */
  fallbackReason: string | null;
  /** OSM only: a speciality found nobody, so the broader list is shown (said in a sentence). */
  broadened: string | null;
  /** OSM only: what OpenStreetMap cannot tell apart for this preset, e.g. a school's board. */
  caveat: string | null;
  /** OSM only: how many results in all (Google does not say). */
  total: number | null;
}

/** Raised for every failure, with a sentence Mehdi can act on. */
export class FinderError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

const ENDPOINT = "/api/leads-search";

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getAdminAccessToken();
  /* Live (Supabase) admin: no token means the sign-in lapsed. Local mode has no
     token at all; the request still goes out and the server answers 401 or
     "not configured", said below in plain words. The e2e test mocks it there. */
  if (!token && supabaseEnabled) throw new FinderError("Your sign-in has expired. Sign in again and retry.", "signed_out", 401);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new FinderError(
      "Could not reach the Lead Finder service. Check the internet connection. It runs on the Vercel deploy, not on the local dev server.",
      "offline", 0,
    );
  }
  const json = (await res.json().catch(() => null)) as ({ ok?: boolean; code?: string; error?: string } & Record<string, unknown>) | null;
  if (res.ok && json?.ok !== false && json) return json as T;
  throw new FinderError(plainError(res.status, json?.code, json?.error), json?.code || "http", res.status);
}

/** The server's code and status, said in plain words. */
export function plainError(status: number, code?: string, detail?: string): string {
  if (code === "not_configured") return "The Lead Finder runs on the live site (it needs Supabase). Open the admin there.";
  /* OpenStreetMap's own sentences are already plain: unknown city, busy servers, out of time. */
  if (code?.startsWith("osm_")) return detail || "OpenStreetMap did not answer. Try again in a minute.";
  if (status === 401 || code === "unauthorized") {
    return supabaseEnabled ? "Your sign-in has expired. Sign in again and retry." : "The Lead Finder runs on the live admin only. Open the admin on the live site and sign in.";
  }
  if (status === 403 || code === "forbidden") return "This account is not on the admin list.";
  if (status === 422 || code === "no_keys") {
    return detail || "No Google Maps key is saved and switched on. Add one in AI keys under Google Maps (Places).";
  }
  if (code === "all_failed") return "No Google Maps key worked. Open AI keys to see each key's error (often billing not enabled, or the Places API (New) not switched on).";
  if (code === "not_found") return "Google has no place with this ID any more.";
  if (status === 404) return "The Lead Finder service is not deployed here. It runs on the Vercel deploy.";
  if (status === 413) return "That request was too large.";
  if (code === "bad_body") return detail ? `${detail.replace(/\.$/, "")}.` : "Type a type and a city, then search.";
  if (status === 400) return detail ? `Google did not accept the search: ${detail}` : "Type a type and a city, then search.";
  if (status === 504 || status === 408) return "The search took too long (Google Maps or OpenStreetMap). Try again.";
  return detail ? `The search failed: ${detail}` : `The search failed (HTTP ${status}). Try again.`;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Tolerant of the raw Google shape too, in case the function ever passes it through. */
export function toPlace(p: unknown): FinderPlace | null {
  if (!p || typeof p !== "object") return null;
  const r = p as Record<string, unknown>;
  const placeId = str(r.placeId) || str(r.id);
  if (!placeId) return null;
  const display = r.displayName as { text?: unknown } | undefined;
  return {
    placeId,
    name: str(r.name) || str(display?.text) || "",
    address: str(r.address) ?? str(r.formattedAddress),
    phone: str(r.phone) ?? str(r.nationalPhoneNumber),
    phoneIntl: str(r.phoneIntl) ?? str(r.internationalPhoneNumber),
    website: str(r.website) ?? str(r.websiteUri),
    rating: num(r.rating),
    ratingCount: num(r.ratingCount) ?? num(r.userRatingCount),
    mapsUrl: str(r.mapsUrl) ?? str(r.googleMapsUri),
    businessStatus: str(r.businessStatus),
    primaryType: str(r.primaryType),
    source: r.source === "osm" || placeId.startsWith("osm:") ? "osm" : "google",
    lat: num(r.lat),
    lon: num(r.lon),
  };
}

/** True for a result that came from OpenStreetMap. */
export const isOsm = (p: Pick<FinderPlace, "source">) => p.source === "osm";

const VERDICTS: AuditVerdict[] = ["none", "broken", "poor", "ok", "unchecked"];

export function toAudit(a: unknown): SiteAudit {
  const r = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
  const verdict = VERDICTS.includes(r.verdict as AuditVerdict) ? (r.verdict as AuditVerdict) : "broken";
  const evidence = (Array.isArray(r.evidence) ? r.evidence : [])
    .map((e): AuditEvidence | null => {
      if (typeof e === "string") return { code: "note", text: e };
      const o = e as Record<string, unknown> | null;
      const text = str(o?.text) || str(o?.message);
      return text ? { code: str(o?.code) || "note", text } : null;
    })
    .filter((e): e is AuditEvidence => e !== null);
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
  return {
    verdict, evidence,
    url: str(r.url), finalUrl: str(r.finalUrl), status: num(r.status), ms: num(r.ms), title: str(r.title),
    phones: list(r.phones), emails: list(r.emails),
  };
}

/**
 * One page of results for "<type> in <city>" (or a free query): Google Maps
 * when a key works, else OpenStreetMap. `preset` (a TYPE_PRESETS id) tells
 * OpenStreetMap which tags to look for.
 */
export async function searchPlaces(q: { type?: string; city?: string; query?: string; preset?: string; pageToken?: string | null }): Promise<SearchResult> {
  const body: Record<string, unknown> = { action: "search" };
  if (q.type?.trim()) body.type = q.type.trim();
  if (q.city?.trim()) body.city = q.city.trim();
  if (q.query?.trim()) body.query = q.query.trim();
  if (q.preset) body.preset = q.preset;
  if (q.pageToken) body.pageToken = q.pageToken;
  const json = await post<{
    places?: unknown[]; nextPageToken?: string | null; textQuery?: string; source?: string; attribution?: string;
    attributionUrl?: string; note?: string; broadened?: string; caveat?: string; total?: number; fallback?: { reason?: string };
  }>(body);
  const source: FinderSource = json.source === "osm" ? "osm" : "google";
  return {
    places: (json.places || []).map(toPlace).filter((p): p is FinderPlace => p !== null),
    nextPageToken: str(json.nextPageToken),
    textQuery: str(json.textQuery) || "",
    source,
    attribution: str(json.attribution) || (source === "osm" ? OSM_ATTRIBUTION : "Google Maps"),
    attributionUrl: str(json.attributionUrl) ?? (source === "osm" ? OSM_COPYRIGHT_URL : null),
    note: str(json.note) ?? (source === "osm" ? OSM_NOTE : null),
    fallbackReason: str(json.fallback?.reason),
    broadened: str(json.broadened),
    caveat: str(json.caveat),
    total: num(json.total),
  };
}

/** Place Details, live: Google's current phone, website and address. Never stored by this call. */
export async function placeDetails(placeId: string): Promise<FinderPlace> {
  const json = await post<{ place?: unknown }>({ action: "details", placeId });
  const place = toPlace(json.place);
  if (!place) throw new FinderError("Google returned no details for this place.", "empty", 200);
  return place;
}

/** The server takes up to 10 URLs per call; the finder sends smaller batches so rows fill in steadily. */
export const AUDIT_BATCH = 4;

/**
 * Audit up to 10 websites in one call. An empty URL comes back as "none".
 * kind "dental" adds the dental checks: online booking, WhatsApp, treatment pages.
 */
export async function auditSites(urls: (string | null)[], kind?: "dental" | null): Promise<SiteAudit[]> {
  const json = await post<{ audits?: unknown[] }>({ action: "audit", urls: urls.map((u) => u || ""), ...(kind ? { kind } : {}) });
  const audits = json.audits || [];
  return urls.map((_, i) => toAudit(audits[i]));
}

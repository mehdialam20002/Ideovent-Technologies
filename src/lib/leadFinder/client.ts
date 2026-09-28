/**
 * The Lead Finder's only door to the server: POST /api/leads-search.
 *
 * The function (api/leads-search.js) checks the caller is a signed-in admin
 * with the caller's own Supabase token, reads the Google Maps key under RLS,
 * and answers three actions:
 *
 *   search  { query?, type?, city?, pageToken? } -> { places[], nextPageToken }
 *   details { placeId }                          -> { place }
 *   audit   { urls: [..10] }                     -> { audits[] }
 *
 * GOOGLE'S TERMS. What comes back from search and details (phone, address,
 * rating) is shown LIVE and never written to our database by this module.
 * Only the place ID may be kept. The audit reads the business's own website,
 * and the phones and emails found there are theirs, published by them.
 */
import { getAdminAccessToken } from "@/lib/ai/keys";
import { supabaseEnabled } from "@/lib/cms/config";

export interface FinderPlace {
  placeId: string;
  name: string;
  address: string | null;
  /** Google's number, national format. Live only: not stored unless Mehdi saves it. */
  phone: string | null;
  phoneIntl: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
  businessStatus: string | null;
  primaryType: string | null;
}

export type AuditVerdict = "none" | "broken" | "poor" | "ok";

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
  if (code === "not_configured") return "The Lead Finder runs on the live site (it needs Supabase and a Google Maps key). Open the admin there.";
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
  if (status === 400) return detail ? `Google did not accept the search: ${detail}` : "Type a type and a city, then search.";
  if (status === 504 || status === 408) return "Google took too long to answer. Try again.";
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
  };
}

const VERDICTS: AuditVerdict[] = ["none", "broken", "poor", "ok"];

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

/** One page of Google Maps results for "<type> in <city>" (or a free query). */
export async function searchPlaces(q: { type?: string; city?: string; query?: string; pageToken?: string | null }): Promise<SearchResult> {
  const body: Record<string, unknown> = { action: "search" };
  if (q.type?.trim()) body.type = q.type.trim();
  if (q.city?.trim()) body.city = q.city.trim();
  if (q.query?.trim()) body.query = q.query.trim();
  if (q.pageToken) body.pageToken = q.pageToken;
  const json = await post<{ places?: unknown[]; nextPageToken?: string | null; textQuery?: string }>(body);
  return {
    places: (json.places || []).map(toPlace).filter((p): p is FinderPlace => p !== null),
    nextPageToken: str(json.nextPageToken),
    textQuery: str(json.textQuery) || "",
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

/** Audit up to 10 websites in one call. An empty URL comes back as "none". */
export async function auditSites(urls: (string | null)[]): Promise<SiteAudit[]> {
  const json = await post<{ audits?: unknown[] }>({ action: "audit", urls: urls.map((u) => u || "") });
  const audits = json.audits || [];
  return urls.map((_, i) => toAudit(audits[i]));
}

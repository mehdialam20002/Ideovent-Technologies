/**
 * Google Places API (New), the two calls the Lead Finder makes.
 *
 * Checked against the official docs on 28 September 2026:
 *   Text Search  POST https://places.googleapis.com/v1/places:searchText
 *                body { textQuery, pageSize (1-20), pageToken, languageCode, regionCode }
 *                at most 60 results over 3 pages; a pageToken needs the SAME other params.
 *   Details      GET  https://places.googleapis.com/v1/places/{placeId}
 *   Both take X-Goog-Api-Key and X-Goog-FieldMask. The field mask decides the
 *   price: phone, website and rating make it the Enterprise SKU.
 *   https://developers.google.com/maps/documentation/places/web-service/text-search
 *   https://developers.google.com/maps/documentation/places/web-service/data-fields
 *
 * STORAGE (Google Maps Platform terms). A place ID may be stored forever. Other
 * Places content (phone, address, rating) may not be stored in our database,
 * so this module only ever returns it to the admin's browser, live.
 */
import { redact } from "./providers.js";

export const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
export const DETAILS_URL = "https://places.googleapis.com/v1/places/";

const PLACE_FIELDS = ["id", "displayName", "formattedAddress", "nationalPhoneNumber", "internationalPhoneNumber",
  "websiteUri", "rating", "userRatingCount", "googleMapsUri", "businessStatus", "primaryType"];
export const SEARCH_MASK = [...PLACE_FIELDS.map((f) => `places.${f}`), "nextPageToken"].join(",");
export const DETAILS_MASK = PLACE_FIELDS.join(",");

/** A place id as Google issues them: URL-safe base64-ish, never a path. */
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,400}$/;

/**
 * A Places error. `limit`: a quota or rate limit (park this key for today).
 * `request`: the request itself is wrong (an unknown place id, a stale page
 * token), so another key would get the same answer and is not tried.
 */
export class PlacesError extends Error {
  constructor(message, { status = 0, limit = false, request = false } = {}) {
    super(message);
    this.status = status;
    this.limit = limit;
    this.request = request;
  }
}

/** Google's place in the shape the admin page reads. Nothing else leaks through. */
export function mapPlace(p) {
  if (!p || typeof p !== "object" || !p.id) return null;
  const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    placeId: p.id,
    name: str(p.displayName?.text) || "",
    address: str(p.formattedAddress),
    phone: str(p.nationalPhoneNumber),
    phoneIntl: str(p.internationalPhoneNumber),
    website: str(p.websiteUri),
    rating: num(p.rating),
    ratingCount: num(p.userRatingCount),
    mapsUrl: str(p.googleMapsUri),
    businessStatus: str(p.businessStatus),
    primaryType: str(p.primaryType),
  };
}

async function placesError(res, apiKey) {
  let body = "";
  try { body = await res.text(); } catch { /* ignore */ }
  let msg = body;
  let status = "";
  try {
    const j = JSON.parse(body);
    msg = j?.error?.message || body;
    status = j?.error?.status || "";
  } catch { /* not JSON */ }
  const limit = res.status === 429 || status === "RESOURCE_EXHAUSTED" || /quota|rate limit/i.test(msg);
  const request = !limit && (res.status === 404 || (res.status === 400 && !/api.?key/i.test(msg)));
  const text = `HTTP ${res.status}${status ? ` ${status}` : ""}: ${String(msg).trim() || res.statusText || "error"}`;
  return new PlacesError(redact(text, apiKey), { status: res.status, limit, request });
}

async function send(url, init, apiKey, timeoutMs) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const t = e?.name === "TimeoutError" ? "Google did not answer in time" : `Could not reach Google: ${e?.message || e}`;
    throw new PlacesError(redact(t, apiKey));
  }
  if (!res.ok) throw await placesError(res, apiKey);
  return res.json().catch(() => { throw new PlacesError("Google sent a reply that is not JSON"); });
}

/** One Text Search page. Returns { places, nextPageToken }. */
export async function textSearch({ apiKey, textQuery, pageToken, timeoutMs = 10_000 }) {
  const body = { textQuery, pageSize: 20, languageCode: "en", regionCode: "in", ...(pageToken ? { pageToken } : {}) };
  const j = await send(SEARCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey, "x-goog-fieldmask": SEARCH_MASK },
    body: JSON.stringify(body),
  }, apiKey, timeoutMs);
  const places = (Array.isArray(j?.places) ? j.places : []).map(mapPlace).filter(Boolean);
  return { places, nextPageToken: typeof j?.nextPageToken === "string" && j.nextPageToken ? j.nextPageToken : null };
}

/** Place Details for one place id. Returns the mapped place. */
export async function placeDetails({ apiKey, placeId, timeoutMs = 10_000 }) {
  const url = `${DETAILS_URL}${encodeURIComponent(placeId)}?languageCode=en&regionCode=in`;
  const j = await send(url, {
    method: "GET",
    headers: { "x-goog-api-key": apiKey, "x-goog-fieldmask": DETAILS_MASK },
  }, apiKey, timeoutMs);
  const place = mapPlace(j);
  if (!place) throw new PlacesError("Google returned no place for this id");
  return place;
}

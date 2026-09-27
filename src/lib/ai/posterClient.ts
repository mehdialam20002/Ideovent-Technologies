/**
 * THE BROWSER HALF OF THE POSTER READER.
 *
 * Two jobs: make the photo small enough to send, and call /api/poster with the
 * signed-in admin's token, turning every way that can fail into one plain
 * sentence and a flag that says "offer manual filling".
 *
 * WHY THE IMAGE IS SHRUNK HERE. A phone photo of a poster is 3 to 8 MB and
 * 4000 px wide. The function refuses more than 3 MB (a Vercel body is capped
 * near 4.5 MB, and base64 adds a third), and no model reads a poster better
 * at 4000 px than at 1600. So the browser redraws it at 1600 px on the long
 * side as a JPEG, which lands well under 1 MB, before anything is uploaded.
 *
 * THE KEYS NEVER PASS THROUGH HERE. The function reads them from Supabase
 * with this token, under the admin-only row-level security policy. The only
 * thing this module sends is the image and the token.
 */

import type { TemplateId } from "@/lib/demo/templates/ids";
import { supabaseEnabled } from "@/lib/cms/config";
import { getAdminAccessToken, listKeys } from "./keys";
import { normalizeExtract, type PosterAttempt, type PosterExtract, type PosterKind } from "./posterSchema";

export const MAX_SIDE = 1600;
export const TARGET_BYTES = 1_000_000;
/** What the function accepts, decoded. Checked here too, so the error is ours and early. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export interface PreparedImage {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  /** Base64, no data: prefix. */
  data: string;
  /** For the review screen: the same picture as an object URL. */
  previewUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export class PosterError extends Error {
  /** The contract's code, or one of ours for the browser-side failures. */
  code: string;
  attempts: PosterAttempt[];
  constructor(code: string, message: string, attempts: PosterAttempt[] = []) {
    super(message);
    this.code = code;
    this.attempts = attempts;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error || new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

async function decode(file: Blob): Promise<{ draw: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      /* "from-image" honours the EXIF rotation a phone camera writes, so a
         portrait poster is not read sideways. */
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { draw: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* Some browsers refuse the options bag; fall through to <img>. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { draw: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The chosen file, redrawn at most 1600 px on the long side as a JPEG. The
 * quality steps down from 0.85 until it is under 1 MB (it nearly always is at
 * the first try). A file the browser cannot decode (HEIC on a desktop, a PDF)
 * is refused with a sentence that says what to do instead.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new PosterError("bad_file", "That file is not a picture. Choose a JPG, PNG or WebP photo of the poster.");
  }
  let src;
  try {
    src = await decode(file);
  } catch {
    throw new PosterError(
      "bad_file",
      "This browser could not open that picture. HEIC photos from an iPhone often do this: share it as a JPG, or take a screenshot of it, and try again.",
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(src.width, src.height));
  const width = Math.max(1, Math.round(src.width * scale));
  const height = Math.max(1, Math.round(src.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PosterError("bad_file", "This browser cannot resize pictures. Try Chrome, or fill the demo by hand.");
  /* White under a transparent PNG, or JPEG turns it black. */
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(src.draw, 0, 0, width, height);
  src.close?.();

  let blob: Blob | null = null;
  for (const q of [0.85, 0.75, 0.65, 0.55]) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  if (!blob) throw new PosterError("bad_file", "The picture could not be prepared for upload.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new PosterError("too_large", "The picture is still over 3 MB after shrinking. Crop it to the poster and try again.");
  return {
    mimeType: "image/jpeg",
    data: await blobToBase64(blob),
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    bytes: blob.size,
  };
}

export { ACCEPTED as ACCEPTED_IMAGE_TYPES };

/* ── Calling the reader ──────────────────────────────────────────────────── */

export interface PosterReadResult {
  provider: string;
  model: string;
  extracted: PosterExtract;
  suggestedTemplate?: TemplateId;
  attempts: PosterAttempt[];
}

/** The providers' own names, for sentences. */
export const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  xai: "Grok",
  anthropic: "Claude",
};
export const providerLabel = (id: string) => PROVIDER_LABEL[id] || id;

/** One attempt as a short line: "Gemini: limit or quota reached". */
export function attemptLine(a: PosterAttempt): string {
  const what =
    a.status === "ok" ? "read the poster"
    : a.status === "limit" ? "limit or quota reached"
    : a.status === "skipped" ? "not tried"
    : "failed";
  return `${providerLabel(a.provider)}: ${what}${a.error && a.status !== "ok" ? ` (${a.error})` : ""}`;
}

/**
 * Every failure, as the sentence the dialog prints. The dialog always offers
 * "Fill manually instead" beside it, so none of these reads as a dead end.
 */
export function posterErrorMessage(code: string, status?: number, attempts: PosterAttempt[] = []): string {
  switch (code) {
    case "no_token":
      return "You are signed out, so the poster reader cannot check that you are the admin. Sign in again, or fill the demo by hand.";
    case "local":
      return "Reading a poster needs the live admin: this copy of the site has no Supabase sign-in, so there are no saved keys to use. Fill the demo by hand instead.";
    case "unauthorized":
      return "Your sign-in has expired. Sign in again and retry, or fill the demo by hand.";
    case "forbidden":
      return "This account is not on the admin list, so it cannot use the saved keys.";
    case "bad_request":
      return "The poster reader did not accept the upload. Try a different photo, or fill the demo by hand.";
    case "too_large":
      return "The picture is too large to send, even after shrinking. Crop it to the poster and try again.";
    case "no_keys":
      return "No AI key is switched on. Add one under AI keys (a free Gemini key is enough), or fill the demo by hand.";
    case "all_failed": {
      const tried = attempts.filter((a) => a.status !== "skipped");
      const limits = tried.filter((a) => a.status === "limit").length;
      return limits && limits === tried.length
        ? "Every provider has reached its limit for now. Fill the demo by hand, or try again tomorrow when the free limit resets."
        : "No provider could read this poster. Fill the demo by hand, or try a clearer photo.";
    }
    case "unreachable":
      return "The poster reader could not be reached. It runs on the Vercel deploy, not on the local dev server. Check the connection, or fill the demo by hand.";
    case "bad_response":
      return "The poster reader answered with something that is not a reading of the poster. Fill the demo by hand, or try again.";
    default:
      return `The poster could not be read${status ? ` (HTTP ${status})` : ""}. Fill the demo by hand, or try again.`;
  }
}

async function tokenOrThrow(): Promise<string> {
  let token: string | null = null;
  try {
    token = await getAdminAccessToken();
  } catch {
    token = null;
  }
  if (token) return token;
  /* LOCAL MODE has no Supabase session at all. In the dev server the call is
     still made with a stand-in token, so a test can answer it with a mocked
     route; the real function would refuse it with 401, which is the truth. */
  const local = !supabaseEnabled;
  if (local && import.meta.env.DEV) return "local-dev";
  const code = local ? "local" : "no_token";
  throw new PosterError(code, posterErrorMessage(code));
}

const STATUS_CODE: Record<number, string> = {
  400: "bad_request", 401: "unauthorized", 403: "forbidden", 413: "too_large", 422: "no_keys", 502: "all_failed",
};

/**
 * Send the prepared image to /api/poster. Resolves with the extract (already
 * normalised) or throws a PosterError whose message is ready to print.
 */
export async function readPoster(
  image: Pick<PreparedImage, "mimeType" | "data">,
  opts: { kind?: PosterKind | "auto"; templateHint?: TemplateId | "auto"; signal?: AbortSignal } = {},
): Promise<PosterReadResult> {
  const token = await tokenOrThrow();
  let res: Response;
  try {
    res = await fetch("/api/poster", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        image: { mimeType: image.mimeType, data: image.data },
        kind: opts.kind || "auto",
        templateHint: opts.templateHint || "auto",
      }),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new PosterError("unreachable", posterErrorMessage("unreachable"));
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const attempts = (Array.isArray(body?.attempts) ? body?.attempts : []) as PosterAttempt[];
  if (!body) {
    /* The dev server answers an unknown POST with HTML or a bare 404. */
    const code = res.status === 404 || res.ok ? "unreachable" : STATUS_CODE[res.status] || "http";
    throw new PosterError(code, posterErrorMessage(code, res.status));
  }
  if (!res.ok || body.ok !== true) {
    const code = (typeof body.code === "string" && body.code) || STATUS_CODE[res.status] || "http";
    throw new PosterError(code, posterErrorMessage(code, res.status, attempts), attempts);
  }
  if (!body.extracted || typeof body.extracted !== "object") {
    throw new PosterError("bad_response", posterErrorMessage("bad_response"), attempts);
  }
  const fallbackKind: PosterKind = opts.kind === "school" || opts.kind === "coaching" ? opts.kind : "coaching";
  return {
    provider: String(body.provider || ""),
    model: String(body.model || ""),
    extracted: normalizeExtract(body.extracted, fallbackKind),
    suggestedTemplate: typeof body.suggestedTemplate === "string" ? (body.suggestedTemplate as TemplateId) : undefined,
    attempts,
  };
}

/**
 * The enabled providers in the order the function will try them, for the
 * progress line ("Reading the poster with Gemini..."). Empty when the list
 * cannot be read (local mode, signed out): the line then names nobody.
 */
export async function providerOrder(): Promise<string[]> {
  if (!supabaseEnabled) return [];
  try {
    return (await listKeys()).filter((k) => k.enabled).map((k) => k.provider);
  } catch {
    return [];
  }
}

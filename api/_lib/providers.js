/**
 * One adapter per AI provider, all with the same shape:
 *
 *   read({ apiKey, model, image, prompt, timeoutMs }) -> the model's reply text
 *   ping({ apiKey, model, timeoutMs })                -> resolves when the key works
 *
 * and every failure thrown as a ProviderError whose `limit` flag says "this key
 * is out of quota or rate limited", which is what moves /api/poster on to the
 * next provider AND parks this one until tomorrow.
 *
 * Request shapes checked against each provider's docs on 27 September 2026:
 *   Gemini     POST v1beta/models/{model}:generateContent, inline_data image,
 *              generationConfig.responseMimeType + responseJsonSchema.
 *   OpenAI     POST /v1/responses, input_image data URL, text.format json_schema.
 *   xAI        the same Responses API at api.x.ai (OpenAI compatible).
 *   Anthropic  the official SDK, base64 image block, output_config.format.
 * If a provider changes a shape, the admin sees the error on "Test keys" and
 * the other providers still work.
 *
 * NEVER put a key into an error message, a log line or a response. Every error
 * text passes through redact() with the key in hand, in case a provider ever
 * echoes it back.
 */
import { POSTER_SCHEMA } from "./posterExtract.js";

export const PROVIDERS = ["gemini", "openai", "xai", "anthropic"];

// Defaults when the admin has not chosen a model. Gemini's is on the free tier.
export const DEFAULT_MODELS = {
  gemini: "gemini-3.8-flash",
  openai: "gpt-6-luna",
  xai: "grok-4.7",
  anthropic: "claude-opus-5",
};

export class ProviderError extends Error {
  constructor(message, { limit = false, status } = {}) {
    super(message);
    this.limit = limit;
    this.status = status;
  }
}

const LIMIT_RE = /RESOURCE_EXHAUSTED|insufficient_quota|rate[_ ]?limit|quota|credit balance|out of credits|spending limit|billing/i;

export function redact(text, apiKey) {
  let t = String(text ?? "");
  if (apiKey && apiKey.length >= 6) t = t.split(apiKey).join("[key]");
  // Anything that looks like a key, from any provider, whoever's it is.
  t = t.replace(/\b(sk-[A-Za-z0-9_-]{8,}|xai-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,})/g, "[key]");
  return t.length > 300 ? t.slice(0, 300) + "..." : t;
}

/** Turn a non-2xx HTTP reply into a ProviderError. */
async function httpError(res, apiKey) {
  let body = "";
  try { body = await res.text(); } catch { /* ignore */ }
  let msg = body;
  try {
    const j = JSON.parse(body);
    const e = j.error ?? j;
    msg = [typeof e === "string" ? e : e.message, e.status, e.type, e.code, j.code]
      .filter((x) => typeof x === "string" && x).join(" ") || body;
  } catch { /* not JSON */ }
  const limit = res.status === 429 || LIMIT_RE.test(msg);
  const hint = res.status === 401 || res.status === 403 ? " (key rejected)" : "";
  return new ProviderError(redact(`HTTP ${res.status}${hint}: ${msg || res.statusText || "no detail"}`, apiKey),
    { limit, status: res.status });
}

async function post(url, headers, body, apiKey, timeoutMs) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    throw new ProviderError(timedOut ? `No reply within ${Math.round(timeoutMs / 1000)} s` : redact(`Network: ${e?.message || e}`, apiKey));
  }
  if (!res.ok) throw await httpError(res, apiKey);
  try {
    return await res.json();
  } catch {
    throw new ProviderError("Provider reply was not JSON");
  }
}

// ── Google Gemini ───────────────────────────────────────────────────────────
// The key goes in the x-goog-api-key header, not ?key= in the URL, so it can
// never end up in a URL that a proxy or an error message prints.
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";

function geminiText(j) {
  const block = j?.promptFeedback?.blockReason;
  if (block) throw new ProviderError(`Gemini blocked the poster: ${block}`);
  const c = j?.candidates?.[0];
  const text = (c?.content?.parts || []).map((p) => (p.thought ? "" : p.text || "")).join("");
  if (!text && c?.finishReason) throw new ProviderError(`Gemini returned no text (${c.finishReason})`);
  return text;
}

const gemini = {
  async read({ apiKey, model, image, prompt, timeoutMs }) {
    const started = Date.now();
    const url = `${GEMINI}${encodeURIComponent(model)}:generateContent`;
    const body = (withSchema) => ({
      contents: [{ role: "user", parts: [
        { inline_data: { mime_type: image.mimeType, data: image.data } },
        { text: prompt },
      ] }],
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        ...(withSchema ? { responseJsonSchema: POSTER_SCHEMA } : {}),
      },
    });
    try {
      return geminiText(await post(url, { "x-goog-api-key": apiKey }, body(true), apiKey, timeoutMs));
    } catch (e) {
      // An older model id the admin typed may not take a JSON Schema. The
      // prompt still asks for JSON, and normalise() checks it, so retry once
      // without the schema rather than give up on the free provider.
      const left = timeoutMs - (Date.now() - started);
      if (e instanceof ProviderError && e.status === 400 && /schema/i.test(e.message) && left > 5000) {
        return geminiText(await post(url, { "x-goog-api-key": apiKey }, body(false), apiKey, left));
      }
      throw e;
    }
  },
  async ping({ apiKey, model, timeoutMs }) {
    await post(`${GEMINI}${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": apiKey },
      { contents: [{ role: "user", parts: [{ text: "Reply with the word OK." }] }] }, apiKey, timeoutMs);
  },
};

// ── OpenAI and xAI: the Responses API ───────────────────────────────────────
// xAI serves the same API shape at its own host, so one adapter covers both.
function responsesText(j) {
  if (j?.status === "incomplete") {
    throw new ProviderError(`Reply cut short (${j?.incomplete_details?.reason || "incomplete"})`);
  }
  if (typeof j?.output_text === "string" && j.output_text) return j.output_text;
  let text = "";
  for (const item of j?.output || []) {
    for (const c of item?.content || []) {
      if (c?.type === "refusal") throw new ProviderError(`Model refused: ${String(c.refusal || "").slice(0, 200)}`);
      if (c?.type === "output_text" && typeof c.text === "string") text += c.text;
    }
  }
  return text;
}

function responsesAdapter(base, extra = {}) {
  return {
    async read({ apiKey, model, image, prompt, timeoutMs }) {
      const j = await post(`${base}/v1/responses`, { authorization: `Bearer ${apiKey}` }, {
        model,
        input: [{ role: "user", content: [
          { type: "input_image", image_url: `data:${image.mimeType};base64,${image.data}`, detail: "high" },
          { type: "input_text", text: prompt },
        ] }],
        // strict:false because strict mode demands every field be required,
        // and "leave it out when it is not on the poster" is the whole point.
        text: { format: { type: "json_schema", name: "poster_extract", schema: POSTER_SCHEMA, strict: false } },
        max_output_tokens: 8000,
        ...extra,
      }, apiKey, timeoutMs);
      return responsesText(j);
    },
    async ping({ apiKey, model, timeoutMs }) {
      await post(`${base}/v1/responses`, { authorization: `Bearer ${apiKey}` },
        { model, input: "Reply with the word OK.", max_output_tokens: 64, ...extra }, apiKey, timeoutMs);
    },
  };
}

// ── Anthropic Claude ────────────────────────────────────────────────────────
// The official SDK. It is imported lazily so a cold start that only needs
// Gemini does not load it. `fetch` is passed through explicitly so the SDK
// uses the runtime's fetch (and the test's mock); retries are off because the
// fallback to the next provider IS the retry.
async function anthropicClient(apiKey, timeoutMs) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return { Anthropic, client: new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0,
    fetch: (...args) => globalThis.fetch(...args) }) };
}

function anthropicError(e, Anthropic, apiKey, timeoutMs) {
  if (e instanceof ProviderError) return e;
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new ProviderError(`No reply within ${Math.round(timeoutMs / 1000)} s`);
  if (e instanceof Anthropic.RateLimitError) return new ProviderError(redact(`HTTP 429: ${e.message}`, apiKey), { limit: true, status: 429 });
  if (e instanceof Anthropic.APIError && e.status) {
    const hint = e.status === 401 || e.status === 403 ? " (key rejected)" : "";
    return new ProviderError(redact(`HTTP ${e.status}${hint}: ${e.message}`, apiKey),
      { limit: e.status === 429 || LIMIT_RE.test(e.message || ""), status: e.status });
  }
  return new ProviderError(redact(`Network: ${e?.message || e}`, apiKey));
}

// Effort is only accepted by the newer models; an older id the admin types
// (Haiku 4.5, say) would 400 on it. Low effort: reading a poster is not a
// reasoning problem, and a slow reply eats the 25 second window.
const takesEffort = (model) => /^claude-(opus-5|opus-4-[5-8]|sonnet-5|fable)/.test(model);

const anthropic = {
  async read({ apiKey, model, image, prompt, timeoutMs }) {
    const { Anthropic, client } = await anthropicClient(apiKey, timeoutMs);
    let msg;
    try {
      msg = await client.messages.create({
        model,
        max_tokens: 8000,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data } },
          { type: "text", text: prompt },
        ] }],
        output_config: {
          format: { type: "json_schema", schema: POSTER_SCHEMA },
          ...(takesEffort(model) ? { effort: "low" } : {}),
        },
      });
    } catch (e) {
      throw anthropicError(e, Anthropic, apiKey, timeoutMs);
    }
    if (msg.stop_reason === "refusal") throw new ProviderError("Claude declined to read this poster");
    if (msg.stop_reason === "max_tokens") throw new ProviderError("Reply cut short (max_tokens)");
    return (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  },
  async ping({ apiKey, model, timeoutMs }) {
    const { Anthropic, client } = await anthropicClient(apiKey, timeoutMs);
    try {
      await client.messages.create({ model, max_tokens: 64,
        messages: [{ role: "user", content: "Reply with the word OK." }] });
    } catch (e) {
      throw anthropicError(e, Anthropic, apiKey, timeoutMs);
    }
  },
};

export const ADAPTERS = {
  gemini,
  openai: responsesAdapter("https://api.openai.com", { store: false }),
  xai: responsesAdapter("https://api.x.ai"),
  anthropic,
};

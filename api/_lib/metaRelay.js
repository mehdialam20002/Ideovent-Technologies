/**
 * POST /api/meta/relay   ONLY if Meta blocks the app: Make.com's "Facebook
 * Lead Ads > New Lead" scenario posts one lead here (runbook, step 21).
 *
 * Served by the function api/meta/webhook.js: vercel.json rewrites
 * /api/meta/relay to /api/meta/webhook?route=relay (the Hobby plan's limit of
 * 12 functions).
 *
 * Make reads the lead with Mehdi's own Meta connection, so this function makes
 * no Graph call: it takes the lead's content from its caller, which is why it
 * sits behind its own secret. Header X-Ideovent-Relay must equal
 * META_RELAY_SECRET (24 characters or more, set in Vercel and in Make, nowhere
 * else); the database checks the relay's own token (from that secret,
 * fingerprint stored by Connect), separate from every Meta secret.
 *
 * BODY: one JSON object, at most 64 KB. Accepted shapes: the Graph lead
 * (id or leadgen_id, created_time, field_data ...); meta keys plus
 * "answers": {question: answer}; or meta keys plus the answers as top-level
 * keys. A lead id is required: it is what stops a lead coming twice.
 *
 *   200 { ok, result: created | duplicate | already }
 *   400 not JSON, or no lead id      401 wrong or missing header      413 too large
 *   429 { result: "over_cap" }: today's cap; nothing stored, the lead stays at
 *       Meta, and Make shows the run as failed
 *   503 not set up, or the database refused or is unreachable (Make retries
 *       per its own settings)
 */
import { json, metaConfig, quoteBigIds, readBytes, relayToken, sameText } from "./meta.js";
import { supabaseEnv } from "./metaDb.js";
import { emptyTally, ingestGraphLead } from "./metaIntake.js";
import { metaId } from "../../src/lib/meta/fields.js";

const MAX_BODY = 64 * 1024;

/** Keys that describe the lead rather than answer a question. */
const META_KEYS = new Set(["leadgen_id", "id", "created_time", "platform", "form_id", "form_name", "ad_id", "ad_name",
  "adset_id", "adset_name", "campaign_id", "campaign_name", "is_organic", "page_id", "custom_disclaimer_responses", "consent"]);

/** The relay's body as mapMetaLead's input, whichever of the three shapes Make sent. */
function relayInput(body) {
  if (Array.isArray(body.field_data)) return { ...body };
  const meta = {};
  const answers = {};
  for (const [k, v] of Object.entries(body)) {
    if (META_KEYS.has(k)) meta[k] = v;
    else if (k !== "answers") answers[k] = v;
  }
  const given = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : null;
  return { ...meta, answers: given || answers };
}

export async function POST(request) {
  const cfg = metaConfig();
  if (!cfg.relaySecret) return json(503, { ok: false, error: "not configured" });
  if (!sameText(request.headers.get("x-ideovent-relay") || "", cfg.relaySecret)) return json(401, { ok: false });

  const got = await readBytes(request, MAX_BODY);
  if (got.status === 413) return json(413, { ok: false, error: "too large" });
  if (!got.bytes) return json(400, { ok: false, error: "empty" });
  let body;
  try {
    body = JSON.parse(quoteBigIds(got.bytes.toString("utf8")));
  } catch {
    return json(400, { ok: false, error: "not JSON" });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, { ok: false, error: "not a lead" });
  const leadgenId = metaId(body.leadgen_id ?? body.id);
  if (!leadgenId) return json(400, { ok: false, error: "no lead id" });

  const env = supabaseEnv();
  if (!env) return json(503, { ok: false, error: "not stored" });
  const input = relayInput(body);
  input.leadgen_id = leadgenId;
  const pageId = metaId(body.page_id) || cfg.pageId || "";
  const ctx = { cfg, env, token: relayToken(cfg.relaySecret), channel: "relay", deadline: 0, pageId };
  const tally = emptyTally();
  const result = await ingestGraphLead(input, ctx, { keepConsent: true }, tally);
  console.log(`meta relay: lead ${leadgenId} ${result || "not stored"}`);
  if (result === "over_cap") return json(429, { ok: false, result: "over_cap" });
  if (!result) return json(tally.failed.invalid ? 400 : 503, { ok: false, error: "not stored" });
  return json(200, { ok: true, result });
}

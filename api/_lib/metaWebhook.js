/**
 * GET  /api/meta/webhook   Meta's verification handshake (once, when the
 *                          callback URL is saved in the app's Webhooks settings)
 * POST /api/meta/webhook   a lead was sent on one of the Page's instant forms
 *
 * The handler. The Vercel function is api/meta/webhook.js, which hands every
 * request on that path to this module (and Connect and the relay to theirs).
 *
 * Set up in the Meta app (09-crm/META-LEADS-RUNBOOK.md, step 8): object Page,
 * callback https://www.ideovent.in/api/meta/webhook, verify token = the value
 * of META_VERIFY_TOKEN in Vercel, field "leadgen".
 *
 * THE POST, IN ORDER (spec section 4.3)
 * 1. META_APP_SECRET unset: 503 (nothing can be verified; Meta retries).
 * 2. The raw bytes, at most 1 MiB (1,000 updates are about 300 KB): 413 above,
 *    400 empty. A Web-standard handler on purpose: the Node (req, res) helpers
 *    parse a JSON body and leave no raw bytes to check the signature against.
 * 3. X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(raw bytes, App Secret),
 *    compared in constant time: else 401, and nothing is called.
 * 4. The ids are quoted before JSON.parse (they exceed 2^53).
 * 5. Only object "page" and field "leadgen" count; nothing else is stored.
 * 6. Every lead id is STORED FIRST (meta_lead_receive), so nothing is lost if
 *    what follows fails. Then each is read from the Graph API with our own
 *    token (the body is never trusted for content), mapped, and ingested,
 *    within an 8-second budget.
 *
 * ANSWERS
 *   200  handled; nothing to do; or failures only a person can fix (the token,
 *        Leads access: the ids are kept as failed and Mehdi's bell says so;
 *        retrying them before he fixes it only makes a failure streak)
 *   400  empty or not JSON      401  bad or missing signature      413  too large
 *   503  not configured, the database refused or is unreachable, a passing
 *        Graph fault, the time budget, an id over today's cap, or the Page id
 *        changed: Meta sends it again for up to 36 hours
 *
 * Logs carry ids and counts only: never a body, a token, a name or a number.
 */
import { collectLeadgenItems, hubSignatureOk, ingestToken, json, metaConfig, quoteBigIds, readBytes, sameText } from "./meta.js";
import { metaLogVerified, metaReceive, supabaseEnv } from "./metaDb.js";
import { finalFailures, processLeads } from "./metaIntake.js";

/** Meta's notifications are a few KB; 1,000 batched updates are about 300 KB. */
const MAX_BODY = 1024 * 1024;
/** Reading and storing the leads: Meta wants an answer within about 20 seconds. */
const BUDGET_MS = 8000;
const CHALLENGE_RE = /^[0-9A-Za-z_-]{1,128}$/;

export async function GET(request) {
  const cfg = metaConfig();
  if (!cfg.verifyToken) return json(503, { ok: false });
  const q = new URL(request.url).searchParams;
  if (q.get("hub.mode") !== "subscribe" || !sameText(q.get("hub.verify_token") || "", cfg.verifyToken)) {
    return json(403, { ok: false });
  }
  const challenge = q.get("hub.challenge") || "";
  if (!CHALLENGE_RE.test(challenge)) return json(400, { ok: false });
  // Best effort, at most 1.5 s: the checklist's "Meta verified the webhook". Never changes the 200.
  const env = supabaseEnv();
  if (cfg.appSecret && env) {
    await metaLogVerified(env, ingestToken(cfg.appSecret), 1500).catch((e) =>
      console.log(`meta webhook: verified by Meta; not logged (${e && e.message ? e.message : "error"})`));
  }
  console.log("meta webhook: verified by Meta");
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(request) {
  const started = Date.now();
  const cfg = metaConfig();
  if (!cfg.appSecret) return json(503, { ok: false, error: "not configured" });

  const got = await readBytes(request, MAX_BODY);
  if (got.status === 413) return json(413, { ok: false, error: "too large" });
  if (!got.bytes) return json(400, { ok: false, error: "empty" });
  if (!hubSignatureOk(got.bytes, request.headers.get("x-hub-signature-256"), cfg.appSecret)) {
    return json(401, { ok: false, error: "bad signature" });
  }

  let body;
  try {
    body = JSON.parse(quoteBigIds(got.bytes.toString("utf8")));
  } catch {
    return json(400, { ok: false, error: "not JSON" });
  }
  if (!body || typeof body !== "object" || body.object !== "page") return json(200, { ok: true, ignored: true });

  const { items, invalid, total } = collectLeadgenItems(body);
  if (invalid) console.log(`meta webhook: ${invalid} leadgen changes without a valid lead id, skipped`);
  if (!items.length) return json(200, { ok: true, leads: 0 });
  if (total > items.length + invalid) console.log(`meta webhook: ${total - items.length - invalid} changes over 1,000 in one notification, not handled`);

  const env = supabaseEnv();
  if (!env) {
    console.error(`meta webhook: ${items.length} lead ids NOT stored: no Supabase URL or anon key on the server`);
    return json(503, { ok: false, error: "not stored" });
  }
  const token = ingestToken(cfg.appSecret);
  let rec;
  try {
    rec = await metaReceive(env, token, items, "webhook", cfg.pageId || null);
  } catch (e) {
    // The message names the cause ("not connected yet", "does not match": press
    // Connect; 0012 not run). Never the token.
    console.error(`meta webhook: ${items.length} lead ids NOT stored: ${e && e.message ? e.message : "error"}`);
    return json(503, { ok: false, error: "not stored" });
  }
  if (rec.pageMismatch) {
    console.error(`meta webhook: ${items.length} lead ids NOT stored: META_PAGE_ID is not the Page connected in the CRM (press Connect)`);
    return json(503, { ok: false, error: "page mismatch" });
  }

  const t = await processLeads(rec.fetch, { cfg, env, token, channel: "webhook", deadline: started + BUDGET_MS, pageId: cfg.pageId });
  const pending = t.failed.transient + t.leftPending + rec.overCap + t.overCap;
  console.log(`meta webhook: ${items.length} ids (${rec.new} new, ${rec.known} known, ${rec.otherPage} other Page, ${rec.overCap} over the cap); `
    + `read ${rec.fetch.length}: created ${t.created}, duplicates ${t.duplicates}, already ${t.already}, `
    + `failed token ${t.failed.token} permission ${t.failed.permission} invalid ${t.failed.invalid}, pending ${pending}`);
  if (pending > 0) return json(503, { ok: false, pending });
  return json(200, { ok: true, created: t.created, duplicates: t.duplicates, already: t.already, failed: finalFailures(t) });
}

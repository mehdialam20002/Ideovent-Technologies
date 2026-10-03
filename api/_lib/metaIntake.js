/**
 * One loop for the webhook, the daily catch-up and the relay: read stored lead
 * ids from the Graph API, map them with src/lib/meta/fields.js, and hand them
 * to public.meta_lead_ingest (0012). Spec section 4.5.
 *
 * Every id given here is ALREADY STORED (meta_lead_receive, or
 * meta_retry_due's own list), so whatever fails leaves it waiting, never lost:
 * a passing fault stays "pending" (the webhook answers 503 and Meta sends it
 * again), a token or permission problem becomes "failed" (retried after Mehdi
 * fixes it, and his bell says so), and an id the time budget did not reach
 * stays pending for the next delivery or the catch-up.
 *
 * Logs carry ids and counts only, never what a lead says.
 */
import { mapMetaLead } from "../../src/lib/meta/fields.js";
import { clearPageToken, fetchAdInfo, fetchLead, formName, pageToken } from "./metaGraph.js";
import { metaFailed, metaIngest } from "./metaDb.js";

/** Leads read at once. */
const CONCURRENCY = 3;
/** Below this much budget, an id is left pending instead of started. */
const MIN_LEFT_MS = 2500;

export const emptyTally = () => ({
  created: 0, duplicates: 0, already: 0, overCap: 0, leftPending: 0,
  failed: { token: 0, permission: 0, transient: 0, not_found: 0, invalid: 0 },
});

/** The failures a person must fix (token, permission) or that will never work (invalid, not_found). */
export const finalFailures = (t) => t.failed.token + t.failed.permission + t.failed.invalid + t.failed.not_found;

/**
 * Record a Graph failure for a stored id. A failed write leaves the id pending
 * (it was stored), which the caller counts as left pending.
 */
async function recordFailure(ctx, tally, id, err) {
  try {
    await metaFailed(ctx.env, ctx.token, id, err.kind, err.text);
    tally.failed[err.kind] = (tally.failed[err.kind] || 0) + 1;
  } catch (e) {
    tally.leftPending++;
    console.error(`meta ${ctx.channel}: lead ${id} ${err.kind}; could not record it: ${e && e.message ? e.message : "error"}`);
  }
}

/**
 * Step 3 for a lead already read (the poll's results, the relay's body, or
 * fetchLead's): map it and ingest it. `extra.formName` names the form;
 * `extra.core` says the consent ticks were not asked for (unknown, not
 * "none"). Adds the outcome to `tally` and resolves it ("created",
 * "duplicate", "already", "over_cap"), or null when the database did not take
 * it (the id stays pending).
 */
export async function ingestGraphLead(graphLead, ctx, extra = {}, tally = emptyTally()) {
  const input = { ...graphLead, formName: extra.formName || graphLead.form_name || "", pageId: ctx.pageId || "" };
  if (!extra.core && !extra.keepConsent) input.disclaimers = Array.isArray(graphLead.custom_disclaimer_responses) ? graphLead.custom_disclaimer_responses : [];
  const { leadgenId, lead } = mapMetaLead(input);
  if (!leadgenId) {
    tally.failed.invalid++;
    return null;
  }
  try {
    const r = await metaIngest(ctx.env, ctx.token, leadgenId, lead, ctx.channel, ctx.pageId || null);
    if (r.result === "created") tally.created++;
    else if (r.result === "duplicate") tally.duplicates++;
    else if (r.result === "already") tally.already++;
    else if (r.result === "over_cap") tally.overCap++;
    return r.result;
  } catch (e) {
    tally.leftPending++;
    console.error(`meta ${ctx.channel}: lead ${leadgenId} read but NOT stored: ${e && e.message ? e.message : "error"}`);
    return null;
  }
}

/**
 * Read and ingest stored ids. ctx = { cfg, env, token, channel, deadline,
 * pageId }. Resolves the tally: { created, duplicates, already, overCap,
 * leftPending, failed: { token, permission, transient, not_found, invalid } }.
 */
export async function processLeads(ids, ctx) {
  const tally = emptyTally();
  const queue = [...new Set((ids || []).filter((x) => typeof x === "string" && /^\d{1,32}$/.test(x)))];
  if (!queue.length) return tally;

  const pt = await pageToken(ctx.cfg, ctx.deadline);
  if (pt.err) {
    if (pt.err.kind === "token") clearPageToken();
    // One database call per id, within the budget: a notification of 1,000 ids
    // must not run past the function's own time limit. An id not reached stays
    // pending (it is stored) for the next delivery or the catch-up.
    for (const id of queue) {
      if (ctx.deadline && ctx.deadline - Date.now() < MIN_LEFT_MS) tally.leftPending++;
      else await recordFailure(ctx, tally, id, pt.err);
    }
    return tally;
  }

  const one = async (id) => {
    const got = await fetchLead(ctx.cfg, pt.token, id, ctx.deadline);
    if (got.err) {
      if (got.err.kind === "token") clearPageToken();
      await recordFailure(ctx, tally, id, got.err);
      return;
    }
    const ad = await fetchAdInfo(ctx.cfg, pt.token, id, ctx.deadline);
    const name = await formName(ctx.cfg, pt.token, got.lead.form_id, ctx.deadline);
    await ingestGraphLead({ ...got.lead, ...ad }, ctx, { formName: name, core: got.core }, tally);
  };

  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      if (ctx.deadline && ctx.deadline - Date.now() < MIN_LEFT_MS) {
        tally.leftPending++;
        continue;
      }
      await one(id);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return tally;
}

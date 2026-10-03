/**
 * GET  /api/meta/catchup   the daily Vercel cron (vercel.json "crons", 09:15 IST)
 * POST /api/meta/catchup   the owner's "Fetch missed leads now" (Settings > Meta Lead Ads)
 *
 * Retries the stored ids that failed or are still waiting, then asks Meta for
 * every lead each form received since the last complete poll, so a lead whose
 * notification never came (the webhook switched off, a dead token for weeks)
 * still arrives. Meta keeps leads 90 days. Spec section 4.7.
 *
 * WHO MAY START IT
 *   GET  needs CRON_SECRET: Vercel sends it by itself as "Authorization:
 *        Bearer <CRON_SECRET>". Without it set the GET answers 503 and calls
 *        nothing, so nobody on the internet can start a token-bearing sweep of
 *        Meta. Another value: 401.
 *   POST the owner's own session (as /api/meta/connect) and our own page as
 *        the Origin; no CRON_SECRET. Once a minute at most (the database's
 *        throttle; the cron's is 30 minutes).
 *
 * BEFORE IT IS SET UP (the cron runs daily from the day this deploys, long
 * before the Meta app exists): no META_APP_SECRET or META_PAGE_ID, 0012 not
 * run, or Connect not pressed: 200 { skipped }, no Graph call, no bell, one
 * short log line.
 *
 * THE WINDOW moves only when every form was read to its end, without a Graph
 * error, with no lead over today's cap and the right Page; otherwise the same
 * window is read again next time, so nothing is lost to a backlog or a fault.
 *
 *   200 { ok, retried, polled, created, duplicates, failed, complete }
 *   409 the Page id in Vercel is not the connected Page (nothing polled)
 *   429 too soon (nextAt)      503 the database refused or is unreachable
 */
import { ingestToken, json, metaConfig, sameOrigin, sameText } from "../_lib/meta.js";
import { listForms, pageToken, pollForm } from "../_lib/metaGraph.js";
import { metaCatchupBegin, metaCatchupEnd, metaReceive, ownerSession, supabaseEnv } from "../_lib/metaDb.js";
import { emptyTally, finalFailures, ingestGraphLead, processLeads } from "../_lib/metaIntake.js";
import { metaId, metaTime } from "../../src/lib/meta/fields.js";

/** The whole run, Graph and database together (maxDuration is 60 in vercel.json). */
const BUDGET_MS = 25000;
const MAX_FORMS = 100;

export async function GET(request) {
  const cfg = metaConfig();
  if (!cfg.cronSecret) {
    console.log("meta catchup: CRON_SECRET is not set; nothing done");
    return json(503, { ok: false, error: "CRON_SECRET is not set" });
  }
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "");
  if (!m || !sameText(m[1].trim(), cfg.cronSecret)) return json(401, { ok: false });
  return run(cfg, false);
}

export async function POST(request) {
  if (!sameOrigin(request)) return json(403, { ok: false, error: "Use the button in CRM > Settings > Meta Lead Ads." });
  const a = await ownerSession(request);
  if (a.res) return a.res;
  return run(metaConfig(), true);
}

const skipped = (why) => {
  console.log(`meta catchup: skipped (${why})`);
  return json(200, { ok: true, skipped: why });
};

async function run(cfg, force) {
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  const env = supabaseEnv();
  if (!cfg.appSecret || !cfg.pageId || !env) return skipped("not configured");
  const token = ingestToken(cfg.appSecret);

  let begin;
  try {
    begin = await metaCatchupBegin(env, token, force, cfg.pageId);
  } catch (e) {
    if (e && e.missing) return skipped("0012 not run");
    if (e && e.code === "28000" && /not connected/.test(e.message)) return skipped("not connected");
    console.error(`meta catchup: the database refused: ${e && e.message ? e.message : "error"}`);
    return json(503, { ok: false, error: "the database refused" });
  }
  if (!begin || begin.ok !== true) {
    if (begin && begin.reason === "too_soon") return json(429, { ok: false, reason: "too_soon", nextAt: begin.nextAt || null });
    console.error("meta catchup: META_PAGE_ID is not the Page connected in the CRM (press Connect); nothing polled");
    return json(409, { ok: false, reason: "page_mismatch" });
  }

  const ctx = { cfg, env, token, channel: "catchup", deadline, pageId: cfg.pageId };
  // 1. The stored ids that failed or still wait (oldest first, at most 25).
  const retry = Array.isArray(begin.retry) ? begin.retry.filter((x) => typeof x === "string") : [];
  const t = retry.length ? await processLeads(retry, ctx) : emptyTally();

  // 2. The poll: every form, every page, by cursor.
  let complete = true;
  let polled = 0;
  let pages = 0;
  let formsSeen = null;
  const sinceUnix = Math.floor((Date.parse(begin.since) || started - 3 * 86400000) / 1000) - 3600;
  const pt = await pageToken(cfg, deadline);
  if (pt.err) {
    complete = false;
    console.log(`meta catchup: no Page token (${pt.err.kind}: ${pt.err.text}); poll skipped`);
  } else {
    const lf = await listForms(cfg, pt.token, deadline);
    if (lf.err) {
      complete = false;
      console.log(`meta catchup: forms not listed (${lf.err.kind}: ${lf.err.text})`);
    } else {
      formsSeen = lf.forms;
      const live = lf.forms.filter((f) => f.status !== "DELETED");
      // A form left unread would have its leads skipped for good once the window moved.
      if (lf.more || live.length > MAX_FORMS) complete = false;
      for (const form of live.slice(0, MAX_FORMS)) {
        if (deadline - Date.now() < 2500) {
          complete = false;
          break;
        }
        const p = await pollForm(cfg, pt.token, form.id, sinceUnix, async (leads, { core }) => {
          const items = leads.map((l) => ({ leadgen_id: metaId(l.id), page_id: cfg.pageId, form_id: metaId(l.form_id) || form.id,
            ad_id: metaId(l.ad_id) || null, created_time: metaTime(l.created_time) || null })).filter((i) => i.leadgen_id);
          let rec;
          try {
            rec = await metaReceive(env, token, items, "catchup", cfg.pageId);
          } catch (e) {
            console.error(`meta catchup: ${items.length} polled ids NOT stored: ${e && e.message ? e.message : "error"}`);
            complete = false;
            return { stop: true };
          }
          if (rec.pageMismatch) {
            complete = false;
            return { stop: true };
          }
          const want = new Set(rec.fetch);
          for (const l of leads) {
            if (!want.has(metaId(l.id))) continue;
            if (deadline - Date.now() < 1500) break; // stored: the next run reads it
            await ingestGraphLead(l, ctx, { formName: form.name, core }, t);
          }
          // Over today's cap: the rest stay at Meta, and this window is read again tomorrow.
          if (rec.overCap > 0) {
            complete = false;
            return { stop: true };
          }
          return null;
        }, deadline);
        polled += p.read;
        pages += p.pages;
        if (!p.complete) complete = false;
        if (p.err) console.log(`meta catchup: form ${form.id} not read to its end (${p.err.kind}: ${p.err.text})`);
      }
    }
  }

  const completeUntil = complete && t.overCap === 0 ? new Date(started).toISOString() : null;
  const stats = { retried: retry.length, polled, pages, created: t.created, duplicates: t.duplicates, already: t.already,
    failed: finalFailures(t) + t.failed.transient, waiting: t.leftPending, overCap: t.overCap };
  try {
    await metaCatchupEnd(env, token, completeUntil, formsSeen, stats);
  } catch (e) {
    console.error(`meta catchup: the end was not recorded: ${e && e.message ? e.message : "error"}`);
  }
  console.log(`meta catchup: retried ${retry.length}, polled ${polled} in ${pages} pages, created ${t.created}, duplicates ${t.duplicates}, `
    + `failed ${stats.failed}, waiting ${t.leftPending}, window ${completeUntil ? "moved" : "kept"}`);
  return json(200, { ok: true, retried: retry.length, polled, created: t.created, duplicates: t.duplicates,
    failed: stats.failed, complete: Boolean(completeUntil) });
}

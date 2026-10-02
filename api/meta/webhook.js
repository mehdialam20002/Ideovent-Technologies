/**
 * The Vercel function behind three of the four Meta Lead Ads addresses:
 *
 *   /api/meta/webhook   Meta's notifications and its handshake   api/_lib/metaWebhook.js
 *   /api/meta/connect   the owner's Connect and status            api/_lib/metaConnect.js
 *   /api/meta/relay     the Make.com fallback                     api/_lib/metaRelay.js
 *
 * (/api/meta/catchup, the daily cron, is its own function: api/meta/catchup.js.)
 *
 * WHY ONE FUNCTION: Vercel's Hobby plan refuses a deployment with more than 12
 * functions, and the site had 9. vercel.json rewrites /api/meta/connect and
 * /api/meta/relay to /api/meta/webhook?route=connect and ?route=relay; Meta's
 * own address, /api/meta/webhook, needs no rewrite at all. Each handler checks
 * its own caller (Meta's signature, the owner's session, the relay's secret),
 * so `route` only chooses which checks apply, never skips one.
 *
 * Web-standard handlers on purpose: the webhook needs the raw bytes of the
 * body to check Meta's signature.
 */
import { json } from "../_lib/meta.js";
import * as connect from "../_lib/metaConnect.js";
import * as relay from "../_lib/metaRelay.js";
import * as webhook from "../_lib/metaWebhook.js";

const ROUTES = { webhook, connect, relay };

/** The handler for this request: by its own path when Vercel keeps it, else by the rewrite's `route`. */
function handlerFor(request) {
  const url = new URL(request.url);
  const last = url.pathname.replace(/\/+$/, "").split("/").pop();
  if (last === "connect" || last === "relay") return ROUTES[last];
  const route = url.searchParams.get("route");
  return route && Object.prototype.hasOwnProperty.call(ROUTES, route) ? ROUTES[route] : webhook;
}

export async function GET(request) {
  const h = handlerFor(request);
  return h.GET ? h.GET(request) : json(405, { ok: false, error: "use POST" });
}

export async function POST(request) {
  const h = handlerFor(request);
  return h.POST ? h.POST(request) : json(405, { ok: false, error: "use GET" });
}

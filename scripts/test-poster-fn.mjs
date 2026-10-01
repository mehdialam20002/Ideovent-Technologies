/**
 * Test the poster reader, api/poster.js, with every network call mocked.
 *
 *   node scripts/test-poster-fn.mjs
 *
 * Nothing here reaches Supabase or an AI provider: globalThis.fetch is replaced
 * by a router that plays both, so the test is free, offline, and can make a
 * provider fail in exactly the way it fails in real life (429, quota, a bad
 * key, a reply that is not JSON). It runs the REAL handler, like
 * test-share-fn.mjs does for the link preview.
 *
 * The one property checked on every single response, log line and database
 * write, not just in its own case: an API key never appears in any of them.
 * The negative control at the end proves that check can fail, so a pass means
 * something.
 *
 * A DENTAL CLINIC (28 Sep 2026): a fictional clinic's card read with kind
 * "dental" and with "auto", through Gemini, OpenAI and Claude. Only clinic
 * fields come back (doctors with degrees and printed registration,
 * treatments, timings, printed fees, contact); school fields and unknown keys
 * are dropped; offers are read for the admin's eyes; the clinic prompt and
 * the schema with the dental fields reach each provider; the admin's kind is
 * never overruled, and a model that writes "school" over a clinic's facts is
 * read as a clinic when the admin left the kind to it.
 */
process.env.VITE_SUPABASE_URL = "https://sb.test";
process.env.VITE_SUPABASE_ANON_KEY = "anon-public-key";

const KEYS = {
  gemini: "AIzaFAKEgeminiKEY000000000000000000001",
  openai: "sk-proj-FAKEopenaiKEY0000000000002",
  xai: "xai-FAKExaiKEY00000000000000003",
  anthropic: "sk-ant-api03-FAKEanthropicKEY000000004",
};
// A second and third Gemini key, for the several-keys-per-provider cases (0008).
const GEMINI2 = "AIzaFAKEgeminiSECONDkey0000000000000005";
const GEMINI3 = "AIzaFAKEgeminiTHIRDkey00000000000000006";
const ALL_KEYS = [...Object.values(KEYS), GEMINI2, GEMINI3];
const IMG = { mimeType: "image/png", data: Buffer.from("fake poster bytes").toString("base64") };

// ── The world the handler talks to ─────────────────────────────────────────
let state;
function reset(over = {}) {
  state = {
    keys: [],              // rows of ai_provider_keys
    missingTable: false,
    providers: {},         // provider -> (body) => Response
    calls: [],             // every fetch: { url, method, headers, body }
    runs: [],              // rows inserted into ai_poster_runs
    patches: [],           // { id, provider, body } written to ai_provider_keys
    legacy: false,         // true: the table is still 0006's shape (0008 not run)
    ...over,
  };
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
// A key row as 0008 stores it. `priority` in the older cases below was the
// provider's place, which is now provider_priority; each provider's single
// key is its "Key 1". keyRow() makes a second, third... key of a provider.
let nextId = 0;
const row = (provider, { priority = 100, ...extra } = {}) => ({ id: `id-${provider}-${++nextId}`, provider,
  label: "Key 1", api_key: KEYS[provider], model: "", provider_priority: priority, priority: 10,
  enabled: true, last_error: null, last_error_at: null, ...extra });
const keyRow = (provider, n, apiKey, { providerPriority = 100, ...extra } = {}) => ({
  ...row(provider, { priority: providerPriority }), label: `Key ${n}`, api_key: apiKey, priority: n * 10, ...extra });

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
  let body = init.body;
  if (body === undefined && typeof input === "object" && input.text) body = await input.clone().text();
  const headers = Object.fromEntries(new Headers(init.headers || (typeof input === "object" ? input.headers : {})).entries());
  state.calls.push({ url, method, headers, body: typeof body === "string" ? body : "" });
  const u = new URL(url);

  if (u.host === "sb.test") {
    const token = (headers.authorization || "").replace(/^Bearer /, "");
    if (u.pathname === "/auth/v1/user") {
      if (token === "admin-token") return json(200, { id: "u1", email: "mehdialam2002@gmail.com" });
      if (token === "user-token") return json(200, { id: "u2", email: "stranger@example.com" });
      return json(401, { msg: "invalid JWT" });
    }
    if (u.pathname === "/rest/v1/rpc/is_admin") return json(200, token === "admin-token");
    if (u.pathname === "/rest/v1/ai_provider_keys" && method === "GET") {
      if (state.missingTable) return json(404, { code: "PGRST205", message: "Could not find the table 'public.ai_provider_keys'" });
      const cols = (u.searchParams.get("select") || "").split(",");
      // Before 0008 the new columns do not exist, and PostgREST says so.
      if (state.legacy && cols.some((c) => ["id", "label", "provider_priority"].includes(c))) {
        return json(400, { code: "42703", message: "column ai_provider_keys.id does not exist" });
      }
      if (token !== "admin-token") return json(200, []); // what RLS does for a non-admin
      // Rows come back in NO particular order, on purpose: the handler must
      // sort them itself (providers first, then keys), not trust the database.
      const enabled = state.keys.filter((k) => k.enabled).reverse();
      return json(200, enabled.map((k) => Object.fromEntries(cols.filter((c) => c in k).map((c) => [c, k[c]]))));
    }
    if (u.pathname === "/rest/v1/ai_provider_keys" && method === "PATCH") {
      const id = u.searchParams.get("id")?.replace(/^eq\./, "");
      const byProvider = u.searchParams.get("provider")?.replace(/^eq\./, "");
      state.patches.push({ id, provider: byProvider ?? state.keys.find((k) => k.id === id)?.provider, body: JSON.parse(body) });
      return new Response(null, { status: 204 });
    }
    if (u.pathname === "/rest/v1/ai_poster_runs" && method === "POST") {
      const rows = JSON.parse(body);
      if (state.legacy && rows.some((r) => "key_id" in r)) return json(400, { code: "PGRST204", message: "Could not find the 'key_id' column" });
      state.runs.push(...rows);
      return new Response(null, { status: 201 });
    }
    return json(404, { message: "unmocked " + u.pathname });
  }
  const provider = u.host.includes("generativelanguage") ? "gemini" : u.host === "api.openai.com" ? "openai"
    : u.host === "api.x.ai" ? "xai" : u.host === "api.anthropic.com" ? "anthropic" : null;
  const fn = provider && state.providers[provider];
  if (!fn) throw new Error(`unexpected fetch ${url}`);
  return fn(body ? JSON.parse(body) : {}, { url, headers });
};

// ── Provider replies, in each provider's own shape ─────────────────────────
const POSTER = { kind: "coaching", instituteName: "Vidya Classes", instituteNameHi: "विद्या क्लासेस",
  city: "Patna", exams: ["JEE Main", "NEET"], contact: { phones: ["98765 43210"] },
  inventedField: "must be dropped", suggestedTemplate: "c1-jee-neet-urban" };
const ok = {
  gemini: (obj = POSTER) => () => json(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: "STOP" }] }),
  responses: (obj = POSTER) => () => json(200, { status: "completed", output: [{ type: "message",
    content: [{ type: "output_text", text: JSON.stringify(obj) }] }] }),
  anthropic: (obj = POSTER) => () => json(200, { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5",
    content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 10 } }),
};
const geminiQuota = () => json(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED",
  message: "You exceeded your current quota. Free tier requests per day limit reached." } });

// ── Running the handler ─────────────────────────────────────────────────────
const { default: handler } = await import("../api/poster.js");

const seen = [];          // every response body and log line, for the leak check
const origError = console.error;
console.error = (...a) => { seen.push(a.join(" ")); };

async function call({ token = "admin-token", body = {}, method = "POST", headers = {} } = {}) {
  const req = { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body };
  const out = { status: 0, headers: {}, text: "" };
  const res = {
    set statusCode(v) { out.status = v; }, get statusCode() { return out.status; },
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    end(t) { out.text = t || ""; },
  };
  await handler(req, res);
  seen.push(out.text);
  out.json = out.text ? JSON.parse(out.text) : null;
  return out;
}

const fails = [];
const check = (label, got, test) => {
  let pass = false;
  try { pass = !!test(got); } catch { pass = false; }
  origError(`${pass ? "ok   " : "FAIL "} ${label}${pass ? "" : `\n         ${JSON.stringify(got)?.slice(0, 400)}`}`);
  if (!pass) fails.push(label);
};
const leaks = (texts) => ALL_KEYS.filter((k) => texts.some((t) => String(t).includes(k)));
const log = (s) => origError(`\n${s}\n`);

// ── Who may call it ─────────────────────────────────────────────────────────
log("Access");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini() } });
check("no token -> 401", (await call({ token: null, body: { image: IMG } })).status, (s) => s === 401);
check("an invalid token -> 401", (await call({ token: "forged", body: { image: IMG } })).status, (s) => s === 401);
check("a signed-in non-admin -> 403", (await call({ token: "user-token", body: { image: IMG } })).status, (s) => s === 403);
check("no provider was called for any of them", state.calls.filter((c) => !c.url.startsWith("https://sb.test")).length, (n) => n === 0);
check("GET -> 405", (await call({ method: "GET" })).status, (s) => s === 405);

// ── The request body ────────────────────────────────────────────────────────
log("Body");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini() } });
const big = { mimeType: "image/jpeg", data: "A".repeat(Math.ceil((3 * 1024 * 1024 + 10) / 3) * 4) };
check("a poster over 3 MB -> 413", (await call({ body: { image: big } })).status, (s) => s === 413);
check("a gif -> 400", (await call({ body: { image: { mimeType: "image/gif", data: IMG.data } } })).status, (s) => s === 400);
check("no image -> 400", (await call({ body: { kind: "school" } })).status, (s) => s === 400);
check("not base64 -> 400", (await call({ body: { image: { mimeType: "image/png", data: "@@@###" } } })).status, (s) => s === 400);
check("unknown templateHint -> 400", (await call({ body: { image: IMG, templateHint: "s9-nope" } })).status, (s) => s === 400);
check("a JSON string body is accepted", (await call({ body: JSON.stringify({ image: IMG }) })).status, (s) => s === 200);
check("a data: URL prefix is tolerated",
  (await call({ body: { image: { ...IMG, data: `data:image/png;base64,${IMG.data}` } } })).status, (s) => s === 200);

// ── No keys ─────────────────────────────────────────────────────────────────
log("No keys");
reset();
let r = await call({ body: { image: IMG } });
check("no keys -> 422 no_keys", [r.status, r.json.code], ([s, c]) => s === 422 && c === "no_keys");
reset({ keys: [row("gemini", { enabled: false })] });
r = await call({ body: { image: IMG } });
check("only a switched-off key -> 422 no_keys", [r.status, r.json.code], ([s, c]) => s === 422 && c === "no_keys");
reset({ missingTable: true });
r = await call({ body: { image: IMG } });
check("0006 not run -> 422 no_keys, pointing at the migration", [r.status, r.json.code, r.json.error],
  ([s, c, e]) => s === 422 && c === "no_keys" && /0006/.test(e));

// ── Reading a poster ────────────────────────────────────────────────────────
log("One provider reads it");
reset({ keys: [row("gemini", { priority: 1 })], providers: { gemini: ok.gemini() } });
r = await call({ body: { image: IMG, kind: "auto" } });
check("200 from gemini", [r.status, r.json.provider], ([s, p]) => s === 200 && p === "gemini");
check("default model is the free-tier Gemini", r.json.model, (m) => /^gemini-.*flash/.test(m));
check("Devanagari kept exactly", r.json.extracted.instituteNameHi, (v) => v === "विद्या क्लासेस");
check("an unknown key from the model is dropped", r.json.extracted, (e) => !("inventedField" in e) && !("suggestedTemplate" in e));
check("nothing is invented: no fees, results or faculty appear", r.json.extracted,
  (e) => !e.courses && !e.results && !e.faculty && !e.contact.email);
check("suggestedTemplate for a JEE/NEET coaching", r.json.suggestedTemplate, (t) => t === "c1-jee-neet-urban");
const gCall = state.calls.find((c) => c.url.includes("generativelanguage"));
check("Gemini key travels in a header, never in the URL", gCall,
  (c) => c.headers["x-goog-api-key"] === KEYS.gemini && !c.url.includes(KEYS.gemini));
check("Gemini got the image inline and a JSON schema", JSON.parse(gCall.body),
  (b) => b.contents[0].parts[0].inline_data.data === IMG.data && b.generationConfig.responseMimeType === "application/json"
    && b.generationConfig.responseJsonSchema.properties.instituteName);
check("the attempt is logged as ok and the key's last error cleared",
  [state.runs, state.patches], ([runs, p]) => runs.length === 1 && runs[0].status === "ok" && p[0].body.last_error === null);

log("The admin's own template pick and kind win");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini() } });
r = await call({ body: { image: IMG, kind: "school", templateHint: "s4-residential" } });
check("kind: school overrides the model's 'coaching'", r.json.extracted.kind, (k) => k === "school");
check("templateHint is returned as the suggestion", r.json.suggestedTemplate, (t) => t === "s4-residential");

log("Fallback: Gemini out of quota, OpenAI reads it");
reset({ keys: [row("gemini", { priority: 1 }), row("openai", { priority: 2, model: "gpt-6-luna" }), row("xai", { priority: 3 })],
  providers: { gemini: geminiQuota, openai: ok.responses(), xai: () => { throw new Error("xai must not be called"); } } });
r = await call({ body: { image: IMG } });
check("200 from openai", [r.status, r.json.provider, r.json.model], ([s, p, m]) => s === 200 && p === "openai" && m === "gpt-6-luna");
check("attempts: gemini limit, then openai ok; xai never tried", r.json.attempts.map((a) => `${a.provider}:${a.status}`),
  (a) => a.join() === "gemini:limit,openai:ok");
check("the 429 detail says quota", r.json.attempts[0].error, (e) => /quota|RESOURCE_EXHAUSTED/i.test(e));
check("both attempts are in ai_poster_runs", state.runs.map((x) => `${x.provider}:${x.status}`), (a) => a.join() === "gemini:limit,openai:ok");
check("gemini's key row is parked with a 'limit:' error and a time", state.patches.find((p) => p.provider === "gemini")?.body,
  (b) => /^limit:/.test(b.last_error) && !!b.last_error_at);
const oCall = state.calls.find((c) => c.url === "https://api.openai.com/v1/responses");
check("OpenAI got a data URL image, a json_schema format and a Bearer key", [oCall.headers.authorization, JSON.parse(oCall.body)],
  ([h, b]) => h === `Bearer ${KEYS.openai}` && b.input[0].content[0].image_url.startsWith("data:image/png;base64,")
    && b.text.format.type === "json_schema" && b.store === false);

log("A 'limit' from earlier today is skipped; one from yesterday is not");
const now = new Date();
reset({ keys: [row("gemini", { priority: 1, last_error: "limit: HTTP 429", last_error_at: now.toISOString() }),
  row("openai", { priority: 2 })], providers: { gemini: () => { throw new Error("gemini must be skipped"); }, openai: ok.responses() } });
r = await call({ body: { image: IMG } });
check("gemini skipped, openai used", r.json.attempts.map((a) => `${a.provider}:${a.status}`), (a) => a.join() === "gemini:skipped,openai:ok");
check("a skip is not logged as a run", state.runs.map((x) => x.provider), (a) => a.join() === "openai");
const yesterday = new Date(now.getTime() - 36 * 3600_000).toISOString();
reset({ keys: [row("gemini", { last_error: "limit: HTTP 429", last_error_at: yesterday })], providers: { gemini: ok.gemini() } });
r = await call({ body: { image: IMG } });
check("yesterday's limit is tried again", [r.status, r.json.provider], ([s, p]) => s === 200 && p === "gemini");
reset({ keys: [row("gemini", { last_error: "error: HTTP 500", last_error_at: now.toISOString() })], providers: { gemini: ok.gemini() } });
r = await call({ body: { image: IMG } });
check("today's plain error (not a limit) does not park the key", r.status, (s) => s === 200);

log("Every provider fails -> 502 all_failed, the admin fills by hand");
reset({ keys: [row("gemini", { priority: 1 }), row("openai", { priority: 2 }), row("xai", { priority: 3 }), row("anthropic", { priority: 4 })],
  providers: {
    gemini: () => json(500, { error: { code: 500, message: "Internal error" } }),
    openai: () => json(429, { error: { type: "insufficient_quota", code: "insufficient_quota", message: "You exceeded your current quota" } }),
    // A provider that echoes the key back in its error: redact() must catch it.
    xai: () => json(401, { code: "unauthorized", error: `Incorrect API key provided: ${KEYS.xai}` }),
    anthropic: () => json(429, { type: "error", error: { type: "rate_limit_error", message: "Rate limited" } }),
  } });
r = await call({ body: { image: IMG } });
check("502 all_failed", [r.status, r.json.code], ([s, c]) => s === 502 && c === "all_failed");
check("attempts list every provider with the right status", r.json.attempts.map((a) => `${a.provider}:${a.status}`),
  (a) => a.join() === "gemini:error,openai:limit,xai:error,anthropic:limit");
check("the bad xAI key is reported as rejected", r.json.attempts[2].error, (e) => /401/.test(e) && /key rejected/.test(e));
check("the echoed key really was in the provider's reply, so redaction was exercised",
  leaks([`Incorrect API key provided: ${KEYS.xai}`]).length, (n) => n === 1);
check("four runs logged", state.runs.length, (n) => n === 4);

log("A reply that is not JSON is that provider's failure, not the admin's");
reset({ keys: [row("gemini", { priority: 1 }), row("openai", { priority: 2 })], providers: {
  gemini: () => json(200, { candidates: [{ content: { parts: [{ text: "Sorry, I cannot see { a poster" }] }, finishReason: "STOP" }] }),
  openai: ok.responses() } });
r = await call({ body: { image: IMG } });
check("falls through to openai", [r.status, r.json.provider], ([s, p]) => s === 200 && p === "openai");
check("gemini's attempt says the JSON was bad", r.json.attempts[0], (a) => a.status === "error" && /JSON/.test(a.error));
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini(["not", "an", "object"]) } });
r = await call({ body: { image: IMG } });
check("a JSON array (nothing readable) -> 502, not a blank demo", [r.status, r.json.attempts?.[0]?.error],
  ([s, e]) => s === 502 && /Nothing readable/.test(e));
reset({ keys: [row("gemini")], providers: { gemini: () => new Response("<html>502 Bad Gateway</html>", { status: 200 }) } });
r = await call({ body: { image: IMG } });
check("a non-JSON HTTP body -> 502 with an error, no crash", [r.status, r.json.attempts?.[0]?.status],
  ([s, st]) => s === 502 && st === "error");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini({ ...POSTER, city: "  Patna\n\n", exams: "JEE",
  results: Array.from({ length: 80 }, (_, i) => ({ student: `S${i}`, rank: String(i + 1), junk: "x" })), notes: "n".repeat(5000) }) } });
r = await call({ body: { image: IMG } });
check("normalised: trimmed, wrong types dropped, lists and text capped", r.json.extracted,
  (e) => e.city === "Patna" && !("exams" in e) && e.results.length === 40 && !("junk" in e.results[0]) && e.notes.length <= 1000);

log("Anthropic through the official SDK");
reset({ keys: [row("anthropic")], providers: { anthropic: ok.anthropic() } });
r = await call({ body: { image: IMG } });
check("200 from anthropic, default model claude-opus-5", [r.status, r.json.provider, r.json.model],
  ([s, p, m]) => s === 200 && p === "anthropic" && m === "claude-opus-5");
const aCall = state.calls.find((c) => c.url.startsWith("https://api.anthropic.com"));
check("the SDK sent a base64 image block and a JSON schema format", JSON.parse(aCall.body),
  (b) => b.messages[0].content[0].source.type === "base64" && b.output_config.format.type === "json_schema");
check("with the key in x-api-key", aCall.headers["x-api-key"], (k) => k === KEYS.anthropic);

log("test: true pings every enabled key, no image needed");
reset({ keys: [row("gemini", { priority: 1, last_error: "limit: HTTP 429", last_error_at: now.toISOString() }),
  row("openai", { priority: 2 }), row("anthropic", { priority: 3 })],
  providers: { gemini: () => json(200, { candidates: [{ content: { parts: [{ text: "OK" }] } }] }),
    openai: () => json(401, { error: { message: `Incorrect API key provided: ${KEYS.openai}`, type: "invalid_request_error" } }),
    anthropic: ok.anthropic() } });
r = await call({ body: { test: true } });
check("200 with a test list", [r.status, r.json.ok, r.json.test?.length], ([s, o, n]) => s === 200 && o === true && n === 3);
check("gemini ok (a parked key is still pinged), openai fails, anthropic ok",
  r.json.test.map((t) => `${t.provider}:${t.ok}`), (a) => a.join() === "gemini:true,openai:false,anthropic:true");
check("each entry names its model", r.json.test.every((t) => typeof t.model === "string" && t.model), (v) => v);
check("a passing ping un-parks gemini", state.patches.find((p) => p.provider === "gemini")?.body, (b) => b.last_error === null);
check("the ping sent no image", state.calls.filter((c) => c.body.includes(IMG.data)).length, (n) => n === 0);

// ── Several keys per provider (0008) ────────────────────────────────────────
// A Gemini mock that answers per key: the key arrives in x-goog-api-key.
const geminiByKey = (map) => (body, { headers }) => {
  const fn = map[headers["x-goog-api-key"]];
  if (!fn) throw new Error("a Gemini key that must not be used was used");
  return fn(body);
};
const geminiKeysUsed = () => state.calls.filter((c) => c.url.includes("generativelanguage")).map((c) => c.headers["x-goog-api-key"]);
const patchUrls = () => state.calls.filter((c) => c.method === "PATCH").map((c) => c.url);

log("Two Gemini keys: the first is out of quota, the second reads it");
reset({ keys: [keyRow("gemini", 1, KEYS.gemini, { providerPriority: 1 }), keyRow("gemini", 2, GEMINI2, { providerPriority: 1 }),
  row("openai", { priority: 2 })],
  providers: { gemini: geminiByKey({ [KEYS.gemini]: geminiQuota, [GEMINI2]: ok.gemini() }),
    openai: () => { throw new Error("openai must not be called while a Gemini key works"); } } });
const [g1, g2] = state.keys;
r = await call({ body: { image: IMG } });
check("200 from gemini", [r.status, r.json.provider], ([s, p]) => s === 200 && p === "gemini");
check("Key 1 then Key 2, in that order", geminiKeysUsed(), (k) => k.join() === `${KEYS.gemini},${GEMINI2}`);
check("attempts name each key by its label", r.json.attempts.map((a) => `${a.provider}/${a.label}:${a.status}`),
  (a) => a.join() === "gemini/Key 1:limit,gemini/Key 2:ok");
check("attempts carry no key id and no model", r.json.attempts, (a) => a.every((x) => !("keyId" in x) && !("model" in x)));
check("ONLY Key 1 is parked, by its own id", state.patches.map((p) => [p.id, /^limit:/.test(p.body.last_error || "")]),
  (p) => p.length === 2 && p.some(([id, lim]) => id === g1.id && lim) && p.some(([id, lim]) => id === g2.id && !lim));
check("no patch touches the whole provider", patchUrls(), (u) => u.every((x) => /[?&]id=eq\./.test(x) && !/provider=/.test(x)));
check("each run row records its key_id", state.runs.map((x) => `${x.key_id}:${x.status}`),
  (a) => a.join() === `${g1.id}:limit,${g2.id}:ok`);

log("Key 1 parked earlier today: skipped, Key 2 used straight away");
reset({ keys: [keyRow("gemini", 1, KEYS.gemini, { providerPriority: 1, last_error: "limit: HTTP 429", last_error_at: now.toISOString() }),
  keyRow("gemini", 2, GEMINI2, { providerPriority: 1 })],
  providers: { gemini: geminiByKey({ [GEMINI2]: ok.gemini() }) } });
r = await call({ body: { image: IMG } });
check("Key 1 skipped, Key 2 read it", r.json.attempts.map((a) => `${a.label}:${a.status}`), (a) => a.join() === "Key 1:skipped,Key 2:ok");
check("Key 1 was never called", geminiKeysUsed(), (k) => k.join() === GEMINI2);

log("Both Gemini keys parked today: the next provider takes over");
reset({ keys: [
  keyRow("gemini", 1, KEYS.gemini, { providerPriority: 1, last_error: "limit: HTTP 429", last_error_at: now.toISOString() }),
  keyRow("gemini", 2, GEMINI2, { providerPriority: 1, last_error: "limit: quota", last_error_at: now.toISOString() }),
  row("openai", { priority: 2 })],
  providers: { gemini: () => { throw new Error("parked Gemini keys must not be called"); }, openai: ok.responses() } });
r = await call({ body: { image: IMG } });
check("200 from openai", [r.status, r.json.provider], ([s, p]) => s === 200 && p === "openai");
check("gemini Key 1 and Key 2 skipped, then openai", r.json.attempts.map((a) => `${a.provider}:${a.status}`),
  (a) => a.join() === "gemini:skipped,gemini:skipped,openai:ok");

log("Order: providers first, then keys inside each provider");
reset({ keys: [
  keyRow("gemini", 2, GEMINI2, { providerPriority: 20 }),
  keyRow("openai", 1, KEYS.openai, { providerPriority: 10 }),
  // A stale provider_priority on one Gemini key must not split Gemini in two.
  keyRow("gemini", 1, KEYS.gemini, { providerPriority: 30 }),
  keyRow("gemini", 3, GEMINI3, { providerPriority: 20 })],
  providers: { openai: () => json(500, { error: { message: "down" } }), gemini: () => json(500, { error: { message: "down" } }) } });
r = await call({ body: { image: IMG } });
check("openai first, then Gemini Key 1, Key 2, Key 3", r.json.attempts.map((a) => `${a.provider}/${a.label}`),
  (a) => a.join() === "openai/Key 1,gemini/Key 1,gemini/Key 2,gemini/Key 3");
check("a plain error moves on to the provider's next key", geminiKeysUsed(), (k) => k.join() === [KEYS.gemini, GEMINI2, GEMINI3].join());
check("502 all_failed once every key has failed", [r.status, r.json.code], ([s, c]) => s === 502 && c === "all_failed");

log("test: true pings EVERY key, each named by id and label");
reset({ keys: [keyRow("gemini", 1, KEYS.gemini, { providerPriority: 1, last_error: "limit: HTTP 429", last_error_at: now.toISOString() }),
  keyRow("gemini", 2, GEMINI2, { providerPriority: 1 }), row("openai", { priority: 2 })],
  providers: { gemini: geminiByKey({ [KEYS.gemini]: ok.gemini(), [GEMINI2]: geminiQuota }), openai: ok.responses() } });
r = await call({ body: { test: true } });
check("three results, in order", r.json.test?.map((t) => `${t.provider}/${t.label}:${t.ok}`),
  (a) => a.join() === "gemini/Key 1:true,gemini/Key 2:false,openai/Key 1:true");
check("each result has its key id", r.json.test.map((t) => t.keyId), (ids) => ids.join() === state.keys.map((k) => k.id).join());
check("the ping un-parks Key 1 and parks Key 2, each by id", state.patches.map((p) => `${p.id}:${p.body.last_error === null ? "clear" : "err"}`),
  (a) => a.includes(`${state.keys[0].id}:clear`) && a.includes(`${state.keys[1].id}:err`));

log("Before 0008 is run: the old table shape still works");
reset({ legacy: true, keys: [row("gemini", { priority: 1 }), row("openai", { priority: 2 })],
  providers: { gemini: geminiQuota, openai: ok.responses() } });
r = await call({ body: { image: IMG } });
check("200 from openai after gemini's limit", [r.status, r.json.provider], ([s, p]) => s === 200 && p === "openai");
check("errors are written by provider, as 0006 expects", patchUrls(), (u) => u.length === 2 && u.every((x) => /provider=eq\./.test(x)));
check("runs are logged without key_id (the column does not exist yet)", state.runs.map((x) => "key_id" in x),
  (a) => a.length === 2 && a.every((v) => !v));

// ── A dental clinic (28 Sep 2026) ──────────────────────────────────────────
// A visiting card, fictional. The model also fills school fields and an
// unknown key, and repeats a treatment: normalise() must keep only clinic facts.
const CLINIC = { kind: "dental", instituteName: "Example Dental Clinic", city: "Patna", locality: "Boring Road",
  doctors: [{ name: "Dr. Asha Verma", degrees: "BDS, MDS (Orthodontics)", registration: "Reg. No. A-99999",
    specialisation: "Orthodontist", days: "Mon to Sat", invented: "must be dropped" }, { degrees: "" }],
  treatments: ["Root canal", "Braces", "Root canal"], timings: "Mon to Sat 10 am to 8 pm",
  fees: [{ treatment: "Consultation", fee: "₹200" }], offers: ["Free check-up camp every Sunday"],
  board: "CBSE", courses: [{ name: "a school field on a clinic" }], faculty: [{ name: "Dr. Asha Verma" }],
  contact: { phones: ["98765 43210"] }, suggestedTemplate: "d5-ortho-aligners" };
const promptOf = (c) => JSON.parse(c.body).contents[0].parts[1].text;
const geminiCall = () => state.calls.find((c) => c.url.includes("generativelanguage"));

log("A dental clinic's card, kind: dental");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini(CLINIC) } });
r = await call({ body: { image: IMG, kind: "dental" } });
check("200, read as a dental clinic", [r.status, r.json.extracted?.kind], ([s, k]) => s === 200 && k === "dental");
check("the doctor comes back with degrees, registration, specialisation and days; the empty doctor and the unknown key go",
  r.json.extracted.doctors, (d) => d.length === 1 && d[0].degrees === "BDS, MDS (Orthodontics)" && d[0].registration === "Reg. No. A-99999"
    && d[0].specialisation === "Orthodontist" && d[0].days === "Mon to Sat" && !("invented" in d[0]));
check("treatments deduplicated, timings and the printed fee kept", r.json.extracted,
  (e) => e.treatments.join() === "Root canal,Braces" && e.timings === "Mon to Sat 10 am to 8 pm" && e.fees[0].fee === "₹200");
check("school fields never ride along on a clinic", r.json.extracted, (e) => !e.board && !e.courses && !e.faculty && !e.results && !e.admissions);
check("offers are read, so the admin sees them (the page never prints them)", r.json.extracted.offers, (o) => o[0] === "Free check-up camp every Sunday");
check("the model's dental template is the suggestion", r.json.suggestedTemplate, (t) => t === "d5-ortho-aligners");
check("the prompt is the clinic prompt, with the Dental Council rule on offers", promptOf(geminiCall()),
  (p) => /dental clinic/.test(p) && /Dental Council/.test(p) && !/s1-urban-cbse/.test(p));
check("the schema sent has the dental fields", JSON.parse(geminiCall().body).generationConfig.responseJsonSchema.properties,
  (p) => p.doctors && p.treatments && p.timings && p.fees && p.kind.enum.includes("dental"));

log("kind: auto, the model says dental; and a reply with doctors but no kind");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini(CLINIC) } });
r = await call({ body: { image: IMG, kind: "auto" } });
check("auto: the model's 'dental' is taken", [r.status, r.json.extracted?.kind], ([s, k]) => s === 200 && k === "dental");
check("the auto prompt offers all three kinds and both template lists", promptOf(geminiCall()),
  (p) => /school, coaching or dental/.test(p) && /d1-family-dentist/.test(p) && /s1-urban-cbse/.test(p));
const { kind: _k, ...noKind } = CLINIC;
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini(noKind) } });
r = await call({ body: { image: IMG } });
check("no kind but doctors and treatments -> dental", r.json.extracted?.kind, (k) => k === "dental");
/* The model's slip: "school" written over a clinic's facts, with no school facts at all. */
const { board: _b, courses: _c, faculty: _f, ...clinicOnly } = CLINIC;
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini({ ...clinicOnly, kind: "school" }) } });
r = await call({ body: { image: IMG, kind: "auto" } });
check("auto: 'school' over doctors and treatments alone is read as dental, the facts kept",
  [r.json.extracted?.kind, r.json.extracted?.doctors?.length, r.json.extracted?.treatments?.length], ([k, d, t]) => k === "dental" && d === 1 && t === 2);
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini({ ...POSTER, treatments: ["a stray list"] }) } });
r = await call({ body: { image: IMG, kind: "auto" } });
check("auto: a coaching reply with its own exams stays coaching, and the stray list is dropped",
  r.json.extracted, (e) => e.kind === "coaching" && !e.treatments && e.exams?.length === 2);
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini({ ...clinicOnly, kind: "school" }) } });
r = await call({ body: { image: IMG, kind: "school" } });
check("the admin's 'school' is never overruled, even over a clinic's facts", r.json.extracted, (e) => e.kind === "school" && !e.doctors);

log("The admin's pick still wins for a clinic");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini({ ...CLINIC, kind: "school" }) } });
r = await call({ body: { image: IMG, kind: "dental", templateHint: "d6-kids-dental" } });
check("kind: dental overrides the model's 'school'", r.json.extracted?.kind, (k) => k === "dental");
check("a dental templateHint is accepted and returned", r.json.suggestedTemplate, (t) => t === "d6-kids-dental");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini({ ...CLINIC, suggestedTemplate: undefined }) } });
r = await call({ body: { image: IMG, kind: "dental" } });
check("no model pick: the family practice", r.json.suggestedTemplate, (t) => t === "d1-family-dentist");
reset({ keys: [row("gemini")], providers: { gemini: ok.gemini(POSTER) } });
r = await call({ body: { image: IMG, kind: "school" } });
check("a school request keeps the old prompt, with no dental rules", promptOf(geminiCall()), (p) => !/dental/i.test(p));
check("kind: hospital -> 400", (await call({ body: { image: IMG, kind: "hospital" } })).status, (s) => s === 400);

log("A clinic through OpenAI and through Claude");
reset({ keys: [row("gemini", { priority: 1 }), row("openai", { priority: 2 })], providers: { gemini: geminiQuota, openai: ok.responses(CLINIC) } });
r = await call({ body: { image: IMG, kind: "dental" } });
check("Gemini out of quota, OpenAI reads the clinic", [r.status, r.json.provider, r.json.extracted?.doctors?.length], ([s, p, n]) => s === 200 && p === "openai" && n === 1);
check("OpenAI got the schema with the dental fields", JSON.parse(state.calls.find((c) => c.url === "https://api.openai.com/v1/responses").body),
  (b) => b.text.format.schema.properties.doctors && b.text.format.schema.properties.fees);
reset({ keys: [row("anthropic")], providers: { anthropic: ok.anthropic(CLINIC) } });
r = await call({ body: { image: IMG, kind: "dental" } });
check("Claude reads the clinic", [r.status, r.json.extracted?.kind, r.json.extracted?.treatments?.length], ([s, k, n]) => s === 200 && k === "dental" && n === 2);
check("Claude got the schema with the dental fields", JSON.parse(state.calls.find((c) => c.url.startsWith("https://api.anthropic.com")).body),
  (b) => b.output_config.format.schema.properties.doctors && b.output_config.format.schema.properties.timings);

// ── The property that matters most ─────────────────────────────────────────
log("Keys never leave");
const written = state.calls.filter((c) => c.url.startsWith("https://sb.test")).map((c) => c.body);
check("no key in any response body, log line, run row or key patch in this whole run",
  leaks([...seen, ...written]), (l) => l.length === 0);

log("Negative control: the leak check can fail");
check("a body carrying a key IS flagged", leaks([JSON.stringify({ ok: true, key: KEYS.gemini })]), (l) => l.length === 1);
{
  // And the handler's redaction is what keeps it out: bypass it and the
  // same xAI reply would leak.
  const { redact } = await import("../api/_lib/providers.js");
  const raw = `HTTP 401: Incorrect API key provided: ${KEYS.xai}`;
  check("unredacted provider text leaks; redacted does not",
    [leaks([raw]).length, leaks([redact(raw, KEYS.xai)]).length], ([a, b]) => a === 1 && b === 0);
}

console.error = origError;
console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join("\n  ")}` : "\nall poster function checks pass.");
process.exit(fails.length ? 1 : 0);

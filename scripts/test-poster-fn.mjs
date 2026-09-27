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
 */
process.env.VITE_SUPABASE_URL = "https://sb.test";
process.env.VITE_SUPABASE_ANON_KEY = "anon-public-key";

const KEYS = {
  gemini: "AIzaFAKEgeminiKEY000000000000000000001",
  openai: "sk-proj-FAKEopenaiKEY0000000000002",
  xai: "xai-FAKExaiKEY00000000000000003",
  anthropic: "sk-ant-api03-FAKEanthropicKEY000000004",
};
const ALL_KEYS = Object.values(KEYS);
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
    patches: [],           // { provider, body } written to ai_provider_keys
    ...over,
  };
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const row = (provider, extra = {}) => ({ provider, api_key: KEYS[provider], model: "", priority: 100,
  enabled: true, last_error: null, last_error_at: null, ...extra });

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
      if (token !== "admin-token") return json(200, []); // what RLS does for a non-admin
      return json(200, state.keys.filter((k) => k.enabled).sort((a, b) => a.priority - b.priority));
    }
    if (u.pathname === "/rest/v1/ai_provider_keys" && method === "PATCH") {
      state.patches.push({ provider: u.searchParams.get("provider")?.replace(/^eq\./, ""), body: JSON.parse(body) });
      return new Response(null, { status: 204 });
    }
    if (u.pathname === "/rest/v1/ai_poster_runs" && method === "POST") {
      state.runs.push(...JSON.parse(body));
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

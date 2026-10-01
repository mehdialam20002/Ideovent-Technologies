/**
 * Look at one business's website and say, in one word, whether it could use
 * a better one: none, broken, poor or ok, or "unchecked" when the page is
 * drawn by scripts and nothing that can be checked was wrong. Every verdict
 * carries its evidence (plain sentences the admin can read aloud to the
 * owner), plus the phone numbers and emails the site itself publishes.
 *
 * STORAGE. The phones and emails found here are the business's OWN published
 * details, so the admin may keep them on a lead. That is not true of Google's
 * phone and address, which stay live in the finder (see places.js).
 *
 * SAFETY. The server fetches a URL that came from Google or from the admin.
 * Only http and https on ports 80/443, only public addresses (every redirect
 * hop is checked again), at most 5 redirects, 10 s in all, and at most 1.5 MB
 * of the page is read. Nothing is executed: the HTML is read as text.
 */
import dns from "node:dns";
import net from "node:net";

export const TOTAL_MS = 10_000;
const MAX_BYTES = 1_500_000;
const MAX_HOPS = 5;
const SLOW_MS = 6_000;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";

/** Swappable in tests, so no test ever touches real DNS or the network. */
export const deps = {
  lookup: (host) => dns.promises.lookup(host, { all: true, verbatim: true }),
  fetch: (...a) => globalThis.fetch(...a),
  now: () => Date.now(),
};

// A free-builder subdomain: the business does not own its address.
const FREE_HOSTS = ["wixsite.com", "wix.com", "blogspot.com", "blogspot.in", "business.site", "sites.google.com",
  "weebly.com", "godaddysites.com", "wordpress.com", "webnode.com", "webnode.page", "jimdosite.com", "yolasite.com",
  "site123.me", "strikingly.com", "mystrikingly.com", "carrd.co", "000webhostapp.com", "netlify.app", "vercel.app",
  "github.io", "web.app", "firebaseapp.com", "tiiny.site", "dukaan.app", "mydukaan.io", "zohosites.com", "zohosites.in"];
// Not a website at all: a social profile, a chat link, a directory listing.
const NOT_A_SITE = ["facebook.com", "fb.com", "fb.me", "instagram.com", "wa.me", "api.whatsapp.com", "whatsapp.com",
  "youtube.com", "youtu.be", "linkedin.com", "twitter.com", "x.com", "linktr.ee", "t.me", "justdial.com",
  "indiamart.com", "sulekha.com", "google.com", "g.page", "goo.gl", "maps.app.goo.gl"];

const hostIs = (host, list) => list.find((d) => host === d || host.endsWith(`.${d}`)) || null;

/** Is this IP one the server must never be made to call? */
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && ip.split(".")[2] === "0") || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const w = ipv6Words(ip);
    if (!w) return true;
    const v4 = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
    const zeros = (n) => w.slice(0, n).every((x) => x === 0);
    // IPv4 inside IPv6, in any spelling: mapped ::ffff:a.b.c.d (also written
    // as hex, ::ffff:7f00:1), compatible ::a.b.c.d, NAT64 64:ff9b::/96 and
    // 6to4 2002:AABB:CCDD::. Judged by the IPv4 address they carry.
    if (zeros(5) && w[5] === 0xffff) return isPrivateIp(v4(w[6], w[7]));
    if (zeros(6)) return (w[6] === 0 && w[7] <= 1) || isPrivateIp(v4(w[6], w[7]));
    if (w[0] === 0x64 && w[1] === 0xff9b && w.slice(2, 6).every((x) => x === 0)) return isPrivateIp(v4(w[6], w[7]));
    if (w[0] === 0x2002) return isPrivateIp(v4(w[1], w[2]));
    const top = w[0];
    return (top & 0xfe00) === 0xfc00 // unique local fc00::/7
      || (top & 0xffc0) === 0xfe80 // link-local fe80::/10
      || (top & 0xffc0) === 0xfec0 // old site-local fec0::/10
      || (top & 0xff00) === 0xff00 // multicast
      || (top === 0x2001 && w[1] === 0x0db8); // documentation
  }
  return true;
}

/** An IPv6 address as its 8 16-bit words, or null. Handles "::" and a dotted IPv4 tail. */
function ipv6Words(ip) {
  let s = String(ip).toLowerCase().replace(/%.*$/, "");
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) {
    const [a, b, c, d] = tail[1].split(".").map(Number);
    s = s.slice(0, -tail[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const part = (h) => (h ? h.split(":").map((x) => parseInt(x, 16)) : []);
  const head = part(halves[0]);
  const rest = halves.length === 2 ? part(halves[1]) : [];
  const fill = 8 - head.length - rest.length;
  if (fill < 0 || (halves.length === 1 && fill !== 0)) return null;
  const words = [...head, ...Array(halves.length === 2 ? fill : 0).fill(0), ...rest];
  return words.length === 8 && words.every((x) => Number.isInteger(x) && x >= 0 && x <= 0xffff) ? words : null;
}

/** Turn what the admin or Google gave into a URL, or null. */
export function normaliseUrl(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  if (!u.hostname.includes(".")) return null;
  u.hash = "";
  return u;
}

/** Check a host resolves, and only to public addresses. Throws a coded error. */
async function checkHost(hostname, signal) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw coded("blocked", "That address is not a public website");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw coded("blocked", "That address is not a public website");
    return;
  }
  let addrs;
  try {
    // The resolver has its own retries; the audit's 10 s budget still wins.
    addrs = await Promise.race([deps.lookup(host), new Promise((_, reject) => {
      if (signal?.aborted) reject(coded("timeout", "The site did not answer within 10 seconds"));
      signal?.addEventListener("abort", () => reject(coded("timeout", "The site did not answer within 10 seconds")), { once: true });
    })]);
  } catch (e) {
    if (e?.code === "timeout") throw e;
    throw coded("dns", `The domain ${host} does not resolve (${e?.code || "DNS error"}): it may have expired`);
  }
  const list = (Array.isArray(addrs) ? addrs : [addrs]).map((a) => (typeof a === "string" ? a : a?.address)).filter(Boolean);
  if (!list.length) throw coded("dns", `The domain ${host} does not resolve: it may have expired`);
  if (list.some(isPrivateIp)) throw coded("blocked", "That address is not a public website");
}

function coded(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

/** Read at most MAX_BYTES of a body as text. */
async function readCapped(res) {
  if (!res.body || typeof res.body.getReader !== "function") return (await res.text()).slice(0, MAX_BYTES);
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, MAX_BYTES));
}

/**
 * Fetch a page, following redirects by hand so every hop is checked.
 * Returns { finalUrl, status, html, ms, redirected } or throws a coded error.
 */
async function fetchPage(start, signal) {
  const t0 = deps.now();
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    await checkHost(url.hostname, signal);
    let res;
    try {
      res = await deps.fetch(url.href, { method: "GET", redirect: "manual", signal,
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "en-IN,en;q=0.8" } });
    } catch (e) {
      if (signal.aborted || e?.name === "TimeoutError" || e?.name === "AbortError") throw coded("timeout", "The site did not answer within 10 seconds");
      const why = e?.cause?.code || e?.code || "";
      if (/ENOTFOUND|EAI_AGAIN/.test(why)) throw coded("dns", `The domain ${url.hostname} does not resolve: it may have expired`);
      if (/CERT|SSL|TLS|self.signed/i.test(`${why} ${e?.cause?.message || e?.message || ""}`)) {
        throw coded("tls", "The site's security certificate is invalid, so browsers show a warning");
      }
      throw coded("unreachable", `The site could not be reached${why ? ` (${why})` : ""}`);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = normaliseUrl(new URL(res.headers.get("location"), url).href);
      if (!next) throw coded("blocked", "The site redirects to an address that is not a public website");
      try { await res.body?.cancel?.(); } catch { /* ignore */ }
      url = next;
      continue;
    }
    const type = res.headers.get("content-type") || "";
    const html = /html|text\/plain|^$/i.test(type) ? await readCapped(res).catch(() => "") : "";
    return { finalUrl: url, status: res.status, html, ms: deps.now() - t0, redirected: hop > 0 };
  }
  throw coded("unreachable", "The site redirects in a loop");
}

/** The words a visitor reads, without tags, scripts or styles. */
export function visibleText(html) {
  return String(html || "")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&copy;|&#169;/gi, "©")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pages that mean "there is no real site here": expired, parked, for sale,
// suspended by the host, or a web server's default page.
const DEAD_PAGE = [
  [/domain (has|is) expired|this domain expired|renew (this|your) domain|expired domain/i, "The page says the domain has expired"],
  [/(domain|website) (is|may be) for sale|buy this domain|this domain is available|make an offer on this domain|hugedomains|sedoparking|parkingcrew|bodis\.com|afternic/i, "The domain is parked or up for sale"],
  [/is parked free|parked (domain|by|courtesy)|domain parking|future home of something quite cool/i, "The domain is parked: no site was ever put on it"],
  [/account (has been )?suspended|suspendedpage|this (website|site) (has been|is) suspended|bandwidth limit exceeded/i, "The hosting account is suspended"],
  [/welcome to nginx|apache2? (ubuntu |debian )?default page|default web site page|iis windows server|index of \/|test page for the apache/i, "Only the web server's default page is showing"],
];
const PARKING_HOSTS = ["sedo.com", "dan.com", "afternic.com", "hugedomains.com", "bodis.com", "parkingcrew.net", "above.com", "sedoparking.com"];
const CONTACT_WORDS = /contact|call us|call now|phone|mobile|whats ?app|enquir|inquir|admission|fee|email|e-mail|address|book (a|an|now|your)|appointment|reach us|get in touch|visit us/i;

/** Phones and emails the page publishes. Phones in the +91XXXXXXXXXX shape store.ts uses. */
export function extractContacts(html) {
  const src = String(html || "");
  const text = visibleText(src);
  const phones = new Set();
  const addPhone = (raw) => {
    let d = String(raw).replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (d.length === 10 && /^[1-9]/.test(d)) phones.add(`+91${d}`);
  };
  const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  for (const m of src.matchAll(/href\s*=\s*["']tel:([^"']+)["']/gi)) addPhone(safeDecode(m[1]));
  for (const m of src.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/gi)) addPhone(m[1]);
  for (const m of text.matchAll(/(?<!\d)(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g)) addPhone(m[0]);
  for (const m of text.matchAll(/(?<!\d)0\d{2,4}[\s-]\d{6,8}(?!\d)/g)) addPhone(m[0]);

  const emails = new Set();
  const addEmail = (raw) => {
    const e = String(raw).trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) return;
    if (/\.(png|jpe?g|gif|webp|svg|css|js)$/.test(e)) return;
    if (/@(example\.|sentry|wixpress\.com|domain\.com|email\.com|yourdomain|test\.)/.test(e)) return;
    emails.add(e);
  };
  for (const m of src.matchAll(/href\s*=\s*["']mailto:([^"']+)["']/gi)) addEmail(safeDecode(m[1]));
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) addEmail(m[0]);
  return { phones: [...phones].slice(0, 5), emails: [...emails].slice(0, 5) };
}

/** The latest copyright year printed on the page, or null. */
export function copyrightYear(text) {
  let best = null;
  for (const m of String(text).matchAll(/(?:©|\(c\)|copyright)[^0-9]{0,30}((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi)) {
    const y = Math.max(Number(m[1]), Number(m[2] || 0));
    if (!best || y > best) best = y;
  }
  return best;
}

/* Dental checks (28 Sep 2026), run only for a dental clinic's site. Each is
   generous on purpose: any sign of the thing counts as having it, so the
   finder never tells a clinic it lacks something it has. */
const BOOKING_HOSTS = ["practo.com", "calendly.com", "setmore.com", "simplybook.me", "zocdoc.com", "lybrate.com", "clinicspots.com",
  "appointy.com", "youcanbook.me", "bookings.zoho.com", "zohobookings.in", "square.site", "picktime.com", "docpulse.com"];
const BOOKING_WORDS = /\b(book (an |a |your )?(appointment|consultation|visit|slot|now)|request (an |a )?(appointment|call ?back)|schedule (an |a |your )?(appointment|visit|consultation)|appointment (form|booking)|online appointment|make an appointment)\b/i;
const WHATSAPP_LINK = /wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com\/send|chat\.whatsapp\.com|whatsapp:\/\//i;
const TREATMENT_WORDS = /(treatments?|services|root[- ]?canal|\brct\b|implants?|braces|aligners?|orthodont|whitening|veneers?|crowns?|bridges?|dentures?|extraction|scaling|fillings?|smile[- ]?design|cosmetic|paediatric|pediatric|gum)/i;

/**
 * A page drawn by scripts: its HTML carries almost no text, so what it SHOWS a
 * visitor (a phone number, a booking button, treatment pages) cannot be read
 * here. Such a page is never told it lacks them (30 Sep 2026).
 */
export const drawnByScripts = (html, text) => text.length < 300 && /<script/i.test(String(html));

/** What a dental clinic's home page is missing. Skipped for a page drawn by scripts, where the HTML says little. */
export function dentalFindings(html, text) {
  const out = [];
  if (drawnByScripts(html, text)) return out;
  const links = [...String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)].map((m) => ({
    href: /href\s*=\s*["']([^"']*)["']/i.exec(m[1])?.[1] || "",
    text: visibleText(m[2]),
  }));
  const booked = BOOKING_WORDS.test(text) || links.some((l) => BOOKING_WORDS.test(l.text) || /appointment|booking|book-now/i.test(l.href)
    || BOOKING_HOSTS.some((h) => l.href.toLowerCase().includes(h)));
  if (!booked) out.push({ code: "no_booking", text: "No online booking: no 'Book appointment' link or booking form on the home page" });
  if (!WHATSAPP_LINK.test(html)) out.push({ code: "no_whatsapp", text: "No WhatsApp button: patients cannot message the clinic in one tap" });
  const pages = links.some((l) => !/^(tel:|mailto:|#|javascript:)/i.test(l.href) && (TREATMENT_WORDS.test(l.href) || TREATMENT_WORDS.test(l.text)));
  /* No treatment names in this sentence: it is saved in the lead's notes, and the lead page's demo picker reads the
     notes with dentalTemplateFor, so "implants, braces" here preselected d5 (orthodontic) for every such clinic (30 Sep 2026). */
  if (!pages) out.push({ code: "no_treatments", text: "No treatment pages: no link to a page that explains a treatment" });
  return out;
}

/**
 * Judge a fetched page. Pure: no network, so the fixtures in the test drive it.
 * page: { finalUrl (URL), status, html, ms, redirected }. start: the URL asked for.
 * opts.kind "dental" adds the dental checks.
 *
 * A page drawn by scripts gets only the checks that do not read its text
 * (free builder, phone viewport, HTTPS, speed). When none of them finds
 * anything, the verdict is "unchecked", shown as "Could not check": not
 * "ok", which would say it opens fine with contact details (30 Sep 2026).
 */
export function classify(page, start, nowMs = deps.now(), opts = {}) {
  const evidence = [];
  const add = (code, text) => evidence.push({ code, text });
  const host = page.finalUrl.hostname.toLowerCase();
  const text = visibleText(page.html);

  if (page.status >= 400) {
    add(`http_${page.status}`, page.status === 404 ? "The page is missing (404 Not Found)"
      : page.status >= 500 ? `The site shows a server error (HTTP ${page.status})` : `The site refuses visitors (HTTP ${page.status})`);
    return { verdict: "broken", evidence };
  }
  if (hostIs(host, PARKING_HOSTS)) add("parked", "The domain redirects to a domain-parking or domain-sale page");
  for (const [re, why] of DEAD_PAGE) if (re.test(text.slice(0, 5000)) && text.length < 4000) add("parked", why);
  if (/under construction|website (is )?coming soon|site (is )?coming soon/i.test(text) && text.length < 1500) {
    add("placeholder", "Only an 'under construction' or 'coming soon' page is showing");
  }
  if (!text && !/<script/i.test(page.html)) add("empty", "The home page is blank");
  if (evidence.length) return { verdict: "broken", evidence };

  const free = hostIs(host, FREE_HOSTS) || hostIs(start.hostname.toLowerCase(), FREE_HOSTS);
  if (free) add("free_builder", `It is on a free builder address (${free}), not the business's own domain`);
  if (!/<meta[^>]+name\s*=\s*["']?viewport/i.test(page.html)) add("no_viewport", "It is not built for phones: no mobile viewport, so it opens tiny and zoomed out");
  if (page.finalUrl.protocol === "http:") add("no_https", "No HTTPS: browsers mark it 'Not secure'");
  const year = copyrightYear(text);
  const thisYear = new Date(nowMs).getUTCFullYear();
  if (year && year < thisYear - 3) add("stale", `The copyright says ${year}: it looks untouched for ${thisYear - year} years`);
  const hasContactLink = /href\s*=\s*["'](tel:|mailto:|https?:\/\/(wa\.me|api\.whatsapp\.com))/i.test(page.html);
  /* The finder tells a clinic "your home page does not show a phone number", so that is never said when the
     page shows a number or an e-mail in its text (30 Sep 2026), nor, for any kind, when the page is drawn by
     scripts and this check cannot see what it shows. */
  const scripted = drawnByScripts(page.html, text);
  const shown = opts.kind === "dental" ? extractContacts(page.html) : null;
  const clinicContact = Boolean(shown) && (shown.phones.length > 0 || shown.emails.length > 0);
  if (!scripted && !CONTACT_WORDS.test(text) && !hasContactLink && !clinicContact) add("no_contact", "The home page shows no way to get in touch: no phone, email, WhatsApp, fees or contact details");
  if (page.ms > SLOW_MS) add("slow", `Very slow: the page took ${(page.ms / 1000).toFixed(1)} s to load`);
  if (opts.kind === "dental") evidence.push(...dentalFindings(page.html, text));
  if (evidence.length) return { verdict: "poor", evidence };
  if (scripted) {
    add("scripted", "Could not check what the page shows: it is drawn by scripts, so open it and look");
    return { verdict: "unchecked", evidence };
  }
  return { verdict: "ok", evidence };
}

/**
 * The whole audit for one URL. Never throws.
 * Returns { verdict, url, finalUrl, status, ms, https, title, evidence[], phones[], emails[] }.
 */
export async function auditSite(raw, { totalMs = TOTAL_MS, kind = null } = {}) {
  const base = { url: raw ? String(raw).slice(0, 500) : null, finalUrl: null, status: null, ms: null, https: null,
    title: null, evidence: [], phones: [], emails: [] };
  if (!raw || !String(raw).trim()) {
    // The listing may be Google's or OpenStreetMap's: the sentence names neither.
    return { ...base, verdict: "none", evidence: [{ code: "no_website", text: "No website listed for it on the map" }] };
  }
  const start = normaliseUrl(raw);
  if (!start) return { ...base, verdict: "broken", evidence: [{ code: "bad_url", text: "The website address is not a valid web address" }] };
  base.url = start.href;

  const social = hostIs(start.hostname.toLowerCase(), NOT_A_SITE);
  if (social) {
    return { ...base, verdict: "none", evidence: [{ code: "not_a_site",
      text: `The listed "website" is a ${social} page, not a website of their own` }] };
  }

  const signal = AbortSignal.timeout(totalMs);
  const hadScheme = /^[a-z][a-z0-9+.-]*:/i.test(String(raw).trim());
  let page;
  try {
    page = await fetchPage(start, signal);
  } catch (e) {
    // Typed without a scheme and HTTPS did not answer: the site may be HTTP only.
    if (!hadScheme && start.protocol === "https:" && ["unreachable", "tls"].includes(e.code) && !signal.aborted) {
      const plain = new URL(start.href);
      plain.protocol = "http:";
      try { page = await fetchPage(plain, signal); } catch (e2) { e = e2; }
    }
    if (!page) {
      if (e.code === "blocked") return { ...base, verdict: "broken", evidence: [{ code: "blocked", text: e.message }] };
      return { ...base, verdict: "broken", evidence: [{ code: e.code || "unreachable", text: e.message || "The site could not be reached" }] };
    }
  }

  const { verdict, evidence } = classify(page, start, deps.now(), { kind });
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(page.html)?.[1];
  const found = page.status < 400 ? extractContacts(page.html) : { phones: [], emails: [] };
  return {
    ...base,
    verdict,
    finalUrl: page.finalUrl.href,
    status: page.status,
    ms: page.ms,
    https: page.finalUrl.protocol === "https:",
    title: title ? visibleText(title).slice(0, 160) || null : null,
    evidence,
    phones: found.phones,
    emails: found.emails,
  };
}


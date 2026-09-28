/**
 * build-legal.mjs. Regenerate src/lib/cms/data/legal.seed.json from the
 * canonical policy documents in 03-legal-docs/policies/.
 *
 * Run:  node scripts/build-legal.mjs
 *
 * WHY THIS EXISTS
 * The policies are authored once, in Markdown, in 03-legal-docs/policies/.
 * POLICIES-README.md says "Change one, change the other". This script makes the
 * website the *derived* copy so the two can never drift by hand. Re-run it after
 * editing any .md and commit the regenerated JSON.
 *
 * TOKENS
 * The source documents carry visible blanks of the form [[LIKE_THIS]]. Only the
 * blanks that _assets/FACTS.md or this codebase can actually evidence are filled
 * here (see RESOLVED below). Every other blank is left in place and wrapped in
 * <mark> so it renders as a visible "needs confirmation" chip, and Legal.tsx
 * shows a draft banner for as long as any remain. Never invent a value here.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const SRC = resolve(REPO, "../../03-legal-docs/policies");
const OUT = resolve(REPO, "src/lib/cms/data/legal.seed.json");

/* ── Blanks we can evidence ──────────────────────────────────────────────────
   Source for every one of these is named. If it is not named, it is not here. */
const RESOLVED = {
  // _assets/FACTS.md → Contact → Email (marked CONFIRMED, found live in the site source)
  EMAIL: "contact@ideovent.in",

  // src/lib/cms/seed.ts settings.analytics is {} and no analytics script exists
  // anywhere in index.html or src/. This is a statement of fact about the build.
  ANALYTICS_PROVIDER: "None. The site loads no analytics or tracking script",
  ANALYTICS_REGION: "n/a",
  ANALYTICS_RETENTION_MONTHS: "0 (no analytics data is collected)",

  // src/pages/Internship.tsx links to pages.razorpay.com/ideovent (HTTP 200,
  // checked 24 Sep 2026). Razorpay Software Pvt. Ltd. is an Indian entity.
  PAYMENT_GATEWAY: "Razorpay (Razorpay Software Private Limited)",
  PAYMENT_GATEWAY_REGION: "India",

  // src/components/sections/ContactForm.tsx posts through EmailJS; leads are also
  // written to the CMS store (Supabase when VITE_SUPABASE_URL is set, otherwise
  // the visitor's own browser). The region depends on the Supabase project region,
  // which is not yet chosen, so FORM_BACKEND_REGION stays a blank.
  FORM_BACKEND: "EmailJS (email delivery of the form) and Supabase (lead storage)",
};

/* ── Corrections applied to the published copy ───────────────────────────────
   Each entry removes a statement that is NOT TRUE of the site as it is built, or
   that contradicts _assets/FACTS.md. Publishing a policy that describes a control
   the site does not have is worse than publishing nothing. Every one of these is
   listed in DEPLOY-GUIDE.md so the source .md can be corrected to match. */
const CORRECTIONS = {
  // Refund-and-Cancellation-Policy.md needed two corrections here, both of the
  // stale "Ideovent is one person" / "a studio of one" claim that FACTS.md
  // replaced with a partnership firm of named partners. Both have now been made in
  // the source .md and in the printable .html, so overriding them here would be
  // a second copy of the same edit and would throw the moment the source moved
  // again. A correction belongs here only while the source still disagrees.
  "Privacy-Policy.md": [
    {
      // There is no Cookie Policy page and no consent banner on this site. The
      // original sentence promised both. Replaced with what the site really stores.
      from: "Cookies and similar technologies are covered in the separate **Cookie Policy**: the categories we\nuse, why, and how to switch them off. Non-essential cookies are not set for visitors in the EEA and\nthe UK until consent is given through the banner.",
      to: "**This site sets no advertising, marketing or analytics cookies.** What it stores on your device is limited to what the site needs to work: your light/dark theme choice, a cached copy of the site's own content so pages load quickly, and, only if you log in to the admin area, a session marker that is discarded when you close the tab. None of it identifies you and none of it is shared with anyone. Because nothing non-essential is set, no consent banner is shown. If analytics or any other non-essential technology is ever added, a full Cookie Policy and a consent banner will be published **before** it goes live, not after.",
    },
    {
      from: "- **Cookies and similar technologies**, see the separate **Cookie Policy**.",
      to: "- **Cookies and similar technologies**, see section 13. The site sets no advertising or analytics cookies.",
    },
  ],
  "Terms-of-Service.md": [
    {
      // The Cookie Policy is not published, so it cannot form part of the terms.
      from: "- **Entire agreement for the site.** These terms, with the Privacy Policy, Cookie Policy, Refund and\n  Cancellation Policy and Disclaimer, are the whole of the terms on which the site is offered.",
      to: "- **Entire agreement for the site.** These terms, with the Privacy Policy, the Refund and\n  Cancellation Policy and the Disclaimer, are the whole of the terms on which the site is offered.",
    },
    {
      from: "cookies as described in our **Cookie Policy**. Both form part of these terms.",
      to: "cookies as described in section 13 of that policy. Both form part of these terms.",
    },
  ],
};

/* ── Markdown → HTML (the subset these documents actually use) ─────────────── */
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*]+)\*(?=[^*\w]|$)/g, "$1<em>$2</em>");
  return out;
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const html = [];
  let i = 0;

  const flushTable = () => {
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      rows.push(lines[i].trim());
      i++;
    }
    if (rows.length < 2) return;
    const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells); // rows[1] is the |---|---| separator
    // Wrapped so a wide table scrolls inside its own box instead of forcing the
    // whole page to scroll sideways on a phone.
    html.push('<div class="legal-table">');
    html.push("<table>");
    html.push("<thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead>");
    html.push("<tbody>");
    for (const r of body) {
      html.push("<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
    }
    html.push("</tbody></table>");
    html.push("</div>");
  };

  const flushList = (ordered) => {
    const tag = ordered ? "ol" : "ul";
    const re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
    const items = [];
    while (i < lines.length) {
      if (re.test(lines[i])) {
        items.push(lines[i].replace(re, ""));
        i++;
        // fold hanging-indent continuation lines into the same <li>
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !re.test(lines[i])) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        }
      } else break;
    }
    html.push(`<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join("") + `</${tag}>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }
    if (/^---+\s*$/.test(line)) { i++; continue; } // horizontal rules: drop
    if (/^\s*\|/.test(line)) { flushTable(); continue; }
    if (/^\s*[-*]\s+/.test(line)) { flushList(false); continue; }
    if (/^\s*\d+\.\s+/.test(line)) { flushList(true); continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      // The source "# Title" is stripped (Legal.tsx renders it as the page <h1>),
      // so "## 1. …" is already the right level for an <h2>. Clamp at 2 so nothing
      // can ever emit a second <h1>.
      const lvl = Math.min(Math.max(h[1].length, 2), 6);
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote><p>${inline(buf.join(" ").trim())}</p></blockquote>`);
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*\|/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^>/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) html.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  return html.join("\n");
}

/* ── Per-document build ─────────────────────────────────────────────────────── */
function build(file, title) {
  // Normalise line endings first: the source docs are edited on Windows, and the
  // CORRECTIONS below match on multi-line strings.
  let md = readFileSync(resolve(SRC, file), "utf8").replace(/\r\n/g, "\n");

  // 0. HTML comments are editorial notes in the source (for example the
  //    "HIDDEN 27 Sep 2026" notes that keep removed text restorable). They are
  //    never published: a comment on its own line goes with its line, so a
  //    table around it stays one table, and an inline one is simply removed.
  //    Without this, esc() below would print them as visible text.
  md = md.replace(/^[ \t]*<!--[\s\S]*?-->[ \t]*\n/gm, "").replace(/<!--[\s\S]*?-->/g, "");

  // 1. Accuracy corrections, before anything else touches the text.
  for (const c of CORRECTIONS[file] || []) {
    if (!md.includes(c.from)) {
      throw new Error(
        `build-legal: correction target not found in ${file}. The source document ` +
          `changed. Re-check the correction and update it.\n---\n${c.from}\n---`
      );
    }
    md = md.replace(c.from, c.to);
  }

  // 2. Strip the parts that belong to the print/PDF version, not to a web page:
  //    the H1 (Legal.tsx renders the title), the identity strapline, the
  //    effective/updated lines, the internal EDITOR NOTE block, and the
  //    "Template … have an advocate review this" footer. That last caveat is not
  //    dropped. It is surfaced by the draft banner in Legal.tsx instead.
  md = md.replace(/^#\s+.*$/m, "");
  md = md.replace(/^\*\*Ideovent Technologies\*\*[\s\S]*?\n\n/m, "\n");
  md = md.replace(/^\*\*Effective date:\*\*.*$/m, "");
  md = md.replace(/^\*\*Last updated:\*\*.*$/m, "");
  md = md.replace(/^>\s*\*\*EDITOR NOTE[\s\S]*?(?=\n\n)/m, "");
  md = md.replace(/\n\*Template for Ideovent Technologies\.[\s\S]*$/, "\n");

  // 3. Fill only the blanks we can evidence. "[[FULL_ADDRESS]], Saket, New Delhi,
  //    India" collapses to the address FACTS.md confirms; no PIN is invented.
  md = md.replace(/\[\[FULL_ADDRESS\]\], Saket, New Delhi, India/g, "Saket, New Delhi, India");
  md = md.replace(/\[\[FULL_ADDRESS\]\]/g, "Saket, New Delhi, India");
  for (const [k, v] of Object.entries(RESOLVED)) {
    md = md.replace(new RegExp(`\\[\\[${k}\\]\\]`, "g"), v);
  }

  let body = mdToHtml(md.trim());

  /*
    3b. TYPOGRAPHIC APOSTROPHES.

    The Markdown in 03-legal-docs/policies/ is written with the typewriter
    apostrophe, U+0027, because that is what a keyboard produces. On a page set
    in Inter at 16px the straight quote is a visibly vertical tick where every
    other mark on the line is drawn: "India's DPDP Act" and "the client's
    instructions" were the only two characters on four whole pages that did not
    belong to the typeface's own design. It is a small tell and it is exactly the
    kind a reader registers without being able to name.

    Fixed HERE rather than in the Markdown, for two reasons. The .md files are
    the source for the printed PDFs and the Word versions as well, and they are
    read as plain text in a terminal, where U+2019 is at the mercy of the code
    page. And a policy document is edited by whoever next changes a clause: a
    presentation transform that runs on every build cannot be forgotten, whereas
    "remember to type the curly one" can.

    Only the possessive and contraction positions are converted. An apostrophe
    that is doing anything else (a quoted string inside a `code` span, the
    prime in a measurement) is left alone, and the conversion runs AFTER
    mdToHtml so it cannot disturb the emphasis or link syntax above.
  */
  body = body
    .replace(/(?<=[A-Za-z])'(?=(?:s|t|re|ve|ll|d|m)\b)/g, "’")
    .replace(/(?<=\b(?:days|weeks|months|years|hours|parents|students|clients|others))'(?=[\s<,.])/g, "’");

  /*
    3c. AND THE VALUES THAT MUST NOT BREAK IN THE MIDDLE.

    The contact table in the privacy policy prints the business telephone number,
    and in a narrow table cell at 375px an ordinary space is a line-break
    opportunity, so "+91 77619 21786" can arrive as "+91 77619" over "21786".
    Measured with Range.getClientRects() over every text node on the four legal
    routes: that number was the only value on any of them sitting in a box tight
    enough to do it.

    Same rule as src/lib/typography.ts applies at render time on the React pages:
    a space between two digit groups, and a space before a currency amount,
    becomes U+00A0 NO-BREAK SPACE. Word spaces are untouched, so a long sentence
    in the same cell still wraps normally.
  */
  body = body
    .replace(/(?<=\d) (?=\d)/g, " ")
    .replace(/ (?=[₹$]\d)/g, " ");

  // 4. Anything still unresolved becomes a visible chip, never a silent gap.
  const remaining = [...new Set(body.match(/\[\[[A-Z_0-9]+\]\]/g) || [])];
  body = body.replace(/\[\[([A-Z_0-9]+)\]\]/g, (_m, t) => `<mark data-blank="${t}">[[${t}]]</mark>`);

  return { title, updatedAt: "", body, blanks: remaining };
}

const docs = {
  privacy: build("Privacy-Policy.md", "Privacy Policy"),
  terms: build("Terms-of-Service.md", "Terms of Service"),
  refund: build("Refund-and-Cancellation-Policy.md", "Refund and Cancellation Policy"),
  disclaimer: build("Disclaimer.md", "Disclaimer"),
};

const out = {};
for (const [k, d] of Object.entries(docs)) {
  out[k] = { title: d.title, updatedAt: d.updatedAt, body: d.body };
  console.log(
    `${k.padEnd(11)} ${String(d.body.length).padStart(6)} bytes  ` +
      `${d.blanks.length} unresolved blank(s)` +
      (d.blanks.length ? `: ${d.blanks.join(" ")}` : "")
  );
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\nwrote ${OUT}`);

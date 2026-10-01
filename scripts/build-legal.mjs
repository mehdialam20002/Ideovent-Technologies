/**
 * build-legal.mjs. Regenerate src/lib/cms/data/legal.seed.json from the
 * canonical policy documents in 03-legal-docs/policies/.
 *
 * Run:  node scripts/build-legal.mjs [privacy|terms|refund|disclaimer ...] [--force]
 *       (no names: every document; see "Which documents to rebuild" at the end)
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
 * here (see RESOLVED below). Since 1 Oct 2026 every other blank gets honest
 * neutral wording in the published copy (NEUTRAL below), so no visitor sees a
 * [[TOKEN]]; a page stays a draft (noindex, with Legal.tsx's draft notice)
 * until it has an effective date (PUBLISHED below). A blank nothing covers
 * still renders as a <mark> chip and the run names it. Never invent a value.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const SRC = resolve(REPO, "../../03-legal-docs/policies");
const OUT = resolve(REPO, "src/lib/cms/data/legal.seed.json");

/* ── The business mailbox ─────────────────────────────────────────────────────
   contact@ideovent.in has NO MAILBOX yet: _assets/FACTS.md, CORRECTION 30 Sep
   2026, item 6 ("legal and billing templates keep the [[EMAIL]] blank until a
   message sent from an outside address is received and answered"), and the
   domain had no MX record on 1 Oct 2026. Until that day [[EMAIL]] stays a
   visible blank on every page this script builds, and the policies name
   WhatsApp as the written channel. Flip this together with MAILBOX_LIVE in
   src/lib/mailbox.ts, then rebuild. */
const MAILBOX_LIVE = false;

/* ── Blanks we can evidence ──────────────────────────────────────────────────
   Source for every one of these is named. If it is not named, it is not here. */
const RESOLVED = {
  // _assets/FACTS.md → Contact → Email: the PLANNED address. Filled only while
  // MAILBOX_LIVE is true (deleted just below otherwise).
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
if (!MAILBOX_LIVE) delete RESOLVED.EMAIL;

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

/* ── No visible blank on a public page (1 Oct 2026) ──────────────────────────
   Until today every undecided value reached the site as a highlighted
   [[TOKEN]] chip. The rule now: a visitor never sees one. Each blank that is
   still undecided is replaced IN ITS OWN SENTENCE with honest wording that
   promises nothing new and invents no number:

     - a monthly-plan term: "as written in your plan agreement, agreed before
       you pay the setup fee" (_assets/FACTS.md, CORRECTION 1 Oct 2026: the
       plan is put in writing before the setup fee is paid);
     - a project term: the value in "your signed agreement", which is where
       Service-Agreement-India.md carries the hourly rate, the restart fee,
       the kill fee and the 7-day invoice term for each client; "any" or "if
       it sets one" where the agreement has no such clause, and no pointer
       at all where it sets nothing (project file retention);
     - the e-mail address: left out while MAILBOX_LIVE is false. WhatsApp and
       the phone number are already beside it on every page;
     - the effective date: see PUBLISHED below.

   PUBLISHED COPY ONLY. The .md in 03-legal-docs/policies/ keeps its
   [[TOKEN]], so the decision still shows as open where the documents are
   written, and the printable .html is untouched. When Mehdi decides a value,
   put it in the .md (or in RESOLVED above) and rebuild: the entry here is
   then skipped, because its token is gone. An entry whose token is still in
   the .md but whose sentence has changed throws, like CORRECTIONS. A blank
   no entry covers still becomes a chip, and the run names it as STILL
   VISIBLE. Every token handled here is listed for Mehdi in the run output.

   `from` is matched with any run of whitespace standing for any other (the
   .md wraps its lines), or is a RegExp when a whole table row goes. */
const NEUTRAL = {
  "Terms-of-Service.md": [
    {
      // Whether the firm is registered is UNKNOWN (FACTS.md). The published
      // privacy policy already says only "a partnership firm under the Act".
      token: "PARTNERSHIP_REGISTRATION_STATUS",
      from: "Indian Partnership Act, 1932 (registration status: [[PARTNERSHIP_REGISTRATION_STATUS]]),",
      to: "Indian Partnership Act, 1932,",
    },
    {
      // No figure has been chosen for the free website. No number is invented.
      token: "SITE_LIABILITY_CAP",
      from: "will not exceed **Rs. [[SITE_LIABILITY_CAP]]** in aggregate. That cap applies to the website,",
      to: "is limited to the fullest extent Indian law allows. That limit applies to the website,",
    },
    { token: "EMAIL", from: /^\|\s*Email\s*\|\s*\[\[EMAIL\]\]\s*\|[ \t]*\n/m, to: "" },
  ],
  "Disclaimer.md": [
    { token: "EMAIL", from: /^\|\s*Email\s*\|\s*\[\[EMAIL\]\]\s*\|[ \t]*\n/m, to: "" },
  ],
  "Refund-and-Cancellation-Policy.md": [
    /* Section 2, the short version. */
    {
      token: "PRE_KICKOFF_RETENTION_PERCENT",
      from: "less third-party costs already incurred and a [[PRE_KICKOFF_RETENTION_PERCENT]]% reservation retention",
      to: "less third-party costs already incurred and any reservation retention your signed agreement sets",
    },
    {
      token: "PLAN_EARLY_EXIT_FEE",
      from: "Stopping early costs [[PLAN_EARLY_EXIT_FEE]], as your written plan states.",
      to: "Any cost of stopping early is as written in your plan agreement, agreed before you pay the setup fee.",
    },
    {
      token: "PLAN_SUSPENSION_DAYS",
      from: "then the website may go offline after [[PLAN_SUSPENSION_DAYS]] days.",
      to: "then the website may go offline after the number of days written in your plan agreement, agreed before you pay the setup fee.",
    },
    /* Section 3, what "commenced" means. */
    {
      token: "COMMENCEMENT_GRACE_DAYS",
      from: "5. **[[COMMENCEMENT_GRACE_DAYS]] calendar days** have passed since your advance cleared,",
      to: "5. **the period set in your signed agreement, if it sets one,** has passed since your advance cleared,",
    },
    {
      token: "COMMENCEMENT_GRACE_DAYS",
      from: "Event 5 is the backstop: once [[COMMENCEMENT_GRACE_DAYS]] days have passed,",
      to: "Event 5 is the backstop: once that period has passed,",
    },
    /* Section 4, cancelling before work has commenced. */
    { token: "EMAIL", from: "**+91 77619 21786** is enough, or an email to [[EMAIL]].", to: "**+91 77619 21786** is enough." },
    {
      token: "PRE_KICKOFF_RETENTION_PERCENT",
      from: "a **reservation retention of [[PRE_KICKOFF_RETENTION_PERCENT]]%** of the advance, covering",
      to: "any **reservation retention your signed agreement sets**, covering",
    },
    /* Section 5, cancelling after work has commenced. */
    {
      token: "HOURLY_RATE",
      from: "charged by the hour at Rs. [[HOURLY_RATE]] per hour",
      to: "charged by the hour at the hourly rate in your signed agreement",
    },
    {
      token: "CANCELLATION_INVOICE_DAYS",
      from: "invoice the difference, payable within [[CANCELLATION_INVOICE_DAYS]] days.",
      to: "invoice the difference, payable within the time your signed agreement allows for invoices.",
    },
    {
      token: "KILL_FEE_PERCENT",
      from: "on cancellation for convenience, currently [[KILL_FEE_PERCENT]]% of the remaining unbilled value. That fee is charged as well,",
      to: "on cancellation for convenience (the percentage of the remaining unbilled value that it states), that fee is charged as well,",
    },
    /* Section 7, what happens to the work. */
    {
      // Service-Agreement-India.md sets no retention period, so this one does
      // not point at it.
      token: "POST_CANCELLATION_FILE_RETENTION_MONTHS",
      from: "Project files are kept for **[[POST_CANCELLATION_FILE_RETENTION_MONTHS]] months** after cancellation",
      to: "Project files are kept for **a limited period** after cancellation",
    },
    {
      token: "REMOBILISATION_FEE",
      from: "charge a restart fee of Rs. [[REMOBILISATION_FEE]] before resuming,",
      to: "charge the restart fee set in your signed agreement before resuming,",
    },
    /* Section 9, refund timeline. No day count is promised until one is chosen. */
    {
      token: "REFUND_STATEMENT_DAYS",
      from: "sent within **[[REFUND_STATEMENT_DAYS]] working days** of acknowledgement.",
      to: "sent to you in writing after the acknowledgement.",
    },
    {
      token: "REFUND_PROCESSING_DAYS",
      from: "any refund due is paid within **[[REFUND_PROCESSING_DAYS]] working days of the amount being agreed**, by the",
      to: "any refund due is paid **after the amount is agreed**, by the",
    },
    /* Section 10, what is not refundable. */
    {
      token: "HOURLY_RATE",
      from: "a change request, charged at Rs. [[HOURLY_RATE]] per hour, not a refund.",
      to: "a change request, charged at the hourly rate in your signed agreement, not a refund.",
    },
    /* Section 11, care plans and other subscriptions. */
    {
      token: "SUBSCRIPTION_NOTICE_DAYS",
      from: "Cancel at any time with **[[SUBSCRIPTION_NOTICE_DAYS]] days' written notice**, counted",
      to: "Cancel at any time with **the written notice your plan states**, counted",
    },
    /* Section 12, monthly website plans. */
    {
      token: "PLAN_EARLY_EXIT_FEE",
      from: "so stopping early costs **[[PLAN_EARLY_EXIT_FEE]]**, as stated in your written plan before you paid the setup fee.",
      to: "so any cost of stopping early is **as written in your plan agreement, agreed before you pay the setup fee**.",
    },
    {
      token: "SUBSCRIPTION_NOTICE_DAYS",
      from: "as in section 11: with [[SUBSCRIPTION_NOTICE_DAYS]] days' written notice, the paid month runs out,",
      to: "as in section 11, with the notice period written in your plan agreement, agreed before you pay the setup fee: the paid month runs out,",
    },
    {
      token: "PLAN_SUSPENSION_DAYS",
      from: "If it is still unpaid **[[PLAN_SUSPENSION_DAYS]] days** after its due date, we",
      to: "If it is still unpaid after the number of days written in your plan agreement, agreed before you pay the setup fee, we",
    },
    {
      token: "PLAN_TERMINATION_DAYS",
      from: "If it is still unpaid **[[PLAN_TERMINATION_DAYS]] days** after its due date, we may end",
      to: "If it is still unpaid after the longer period written in the same agreement, we may end",
    },
    {
      token: "POST_CANCELLATION_FILE_RETENTION_MONTHS",
      from: "The plan's files are kept for **[[POST_CANCELLATION_FILE_RETENTION_MONTHS]] months** and then deleted.",
      to: "The plan's files are kept for the period written in your plan agreement, agreed before you pay the setup fee, and then deleted.",
    },
    /* Section 13, if something has gone wrong. */
    {
      token: "EMAIL",
      from: "call **+91 77619 21786**, or write to [[EMAIL]], with what is wrong",
      to: "call **+91 77619 21786** with what is wrong",
    },
  ],
};

/* ── The effective date ──────────────────────────────────────────────────────
   A document listed here is FINAL on that date: its "Effective date" and
   "Last updated" lines carry the date, `updatedAt` is set, and Legal.tsx
   drops the draft notice, lets the page be indexed and the sitemap lists it.
   Only for a page with nothing else still open (1 Oct 2026 rule: "today's
   publication date only if the page is otherwise final, else keep the page
   noindex as it is").

   On 1 Oct 2026 only the privacy policy is here, with the date it went live.
   Its .md still has blanks, so a rebuild keeps the hand-finished live copy
   (see "Which documents to rebuild" below); listing it records the date.
   Terms (liability cap) and Refund (most of its figures) still have undecided
   values behind their neutral wording, so they stay drafts. The Disclaimer
   has none of its own, but it "forms part of the Terms of Service" and sends
   website liability to section 9 of the Terms, which is still a draft, so it
   waits for the Terms. Publishing one is a line here, e.g.
   disclaimer: "1 October 2026", then: node scripts/build-legal.mjs disclaimer

   A document NOT listed here keeps an empty `updatedAt` (draft, noindex,
   out of the sitemap), and its date lines read "Effective date: not set yet
   (draft)" instead of showing two blanks. */
const PUBLISHED = {
  privacy: "26 September 2026",
};

/** `from` as a pattern in which any run of whitespace stands for any other. */
function loose(from) {
  if (from instanceof RegExp) return from;
  const words = from.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(words.join("\\s+"));
}

/** The effective-date lines: filled for a PUBLISHED document, else one draft line. */
function applyDates(md, file, date) {
  if (date) {
    return md.replace(/\[\[POLICY_EFFECTIVE_DATE\]\]/g, date).replace(/\[\[POLICY_LAST_UPDATED\]\]/g, date);
  }
  const lines = /^\*\*Effective date\*\*\s*\[\[POLICY_EFFECTIVE_DATE\]\][ \t]*\n\*\*Last updated\*\*\s*\[\[POLICY_LAST_UPDATED\]\][ \t]*$/m;
  if (!lines.test(md)) {
    if (/\[\[POLICY_(EFFECTIVE_DATE|LAST_UPDATED)\]\]/.test(md)) {
      throw new Error(`build-legal: the effective-date lines in ${file} changed shape. Update applyDates().`);
    }
    return md;
  }
  return md.replace(lines, "**Effective date** not set yet (draft)");
}

/** NEUTRAL wording for each still-open blank in this file. Returns the text and the tokens it covered. */
function applyNeutral(md, file) {
  const done = [];
  for (const n of NEUTRAL[file] || []) {
    if (!md.includes(`[[${n.token}]]`)) continue; // decided since, or already covered
    const re = loose(n.from);
    if (!re.test(md)) {
      throw new Error(
        `build-legal: the sentence holding [[${n.token}]] in ${file} changed. ` +
          `Re-check its NEUTRAL wording and update it.\n---\n${n.from}\n---`
      );
    }
    md = md.replace(re, () => n.to); // a function, so a "$" in the wording stays literal
    done.push(n.token);
  }
  return { md, done };
}

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
function build(file, title, date = "") {
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

  // 3a. The effective date (PUBLISHED), then neutral wording for every blank
  //     that is still undecided (NEUTRAL). Published copy only: see both above.
  const undated = !date && /\[\[POLICY_EFFECTIVE_DATE\]\]/.test(md);
  md = applyDates(md, file, date);
  const neutral = applyNeutral(md, file);
  md = neutral.md;
  if (undated) neutral.done.unshift("POLICY_EFFECTIVE_DATE", "POLICY_LAST_UPDATED");

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

  return { title, updatedAt: date || "", body, blanks: remaining, neutralised: neutral.done };
}

/* ── Which documents to rebuild (1 Oct 2026) ─────────────────────────────────
     node scripts/build-legal.mjs                 every document
     node scripts/build-legal.mjs terms refund    only those; every other one is
                                                  kept exactly as it is in the JSON
     --force                                      also replace a published page

   A PUBLISHED page (one with an updatedAt date) is never replaced by a rebuild
   that has MORE blanks than the copy already on the site. The live privacy
   policy was finished by hand on 26 Sep 2026 with values the .md does not carry
   yet (retention periods, hosting, the email provider), so rebuilding it from
   the .md puts 13 blanks back and turns /privacy into a noindexed draft. Such a
   page is kept and the run says so. Carry the values into the .md first. */
const SOURCES = {
  privacy: ["Privacy-Policy.md", "Privacy Policy"],
  terms: ["Terms-of-Service.md", "Terms of Service"],
  refund: ["Refund-and-Cancellation-Policy.md", "Refund and Cancellation Policy"],
  disclaimer: ["Disclaimer.md", "Disclaimer"],
};
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
for (const k of only) {
  if (!SOURCES[k]) throw new Error(`build-legal: unknown document "${k}". Use: ${Object.keys(SOURCES).join(", ")}`);
}
let current = {};
try {
  current = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
  current = {};
}
const countBlanks = (body) => new Set(String(body || "").match(/\[\[[A-Z_0-9]+\]\]/g) || []).size;

const out = {};
for (const [k, [file, title]] of Object.entries(SOURCES)) {
  const have = current[k];
  if (only.length && !only.includes(k)) {
    if (!have) throw new Error(`build-legal: "${k}" is not in ${OUT}; rebuild it by name`);
    out[k] = have;
    console.log(`${k.padEnd(11)} kept as published (not named on the command line)`);
    continue;
  }
  const d = build(file, title, PUBLISHED[k] || "");
  if (have?.updatedAt && !force && d.blanks.length > countBlanks(have.body)) {
    out[k] = have;
    console.log(
      `${k.padEnd(11)} KEPT AS PUBLISHED: the rebuild has ${d.blanks.length} blank(s) against ` +
        `${countBlanks(have.body)} on the live page. Fill the .md, or pass --force.`
    );
    continue;
  }
  // Nor does a rebuild quietly take the date off a published page, which
  // would turn it back into a noindexed draft. List it in PUBLISHED instead.
  if (have?.updatedAt && !d.updatedAt && !force) {
    out[k] = have;
    console.log(`${k.padEnd(11)} KEPT AS PUBLISHED: it is dated ${have.updatedAt} on the site and not in PUBLISHED.`);
    continue;
  }
  out[k] = { title: d.title, updatedAt: d.updatedAt, body: d.body };
  console.log(
    `${k.padEnd(11)} ${String(d.body.length).padStart(6)} bytes  ` +
      (d.updatedAt ? `effective ${d.updatedAt}  ` : "draft (no effective date)  ") +
      (d.blanks.length ? `STILL VISIBLE: ${d.blanks.join(" ")}` : "no visible blank")
  );
  if (d.neutralised.length) {
    const n = d.neutralised.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());
    console.log(`${"".padEnd(11)} neutral wording for: ${[...n].map(([t, c]) => (c > 1 ? `${t} x${c}` : t)).join(", ")}`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\nwrote ${OUT}`);

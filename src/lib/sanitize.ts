import DOMPurify from "dompurify";

/** Sanitize hand-authored / CMS HTML before dangerouslySetInnerHTML. */
export function sanitize(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/**
 * Sanitize, then put every table in its own horizontally scrollable box.
 *
 * The legal documents are authored as Markdown and converted to raw HTML, so
 * their tables arrive with no wrapper. A policy table is typically five or six
 * columns wide, which is far wider than a phone: without a wrapper the TABLE
 * widens the document itself and the whole page scrolls sideways.
 *
 * index.css already styles `.legal-prose .legal-table`, but nothing was ever
 * emitting that class, so the rule matched nothing. This adds the element the
 * stylesheet has been waiting for.
 *
 * Runs after DOMPurify, never before: wrapping first would hand DOMPurify a
 * string we had already modified.
 */
export function sanitizeRich(html: string): string {
  const clean = sanitize(html);
  if (!clean || clean.indexOf("<table") === -1) return clean;

  if (typeof document === "undefined") {
    // No DOM (SSR or a test runner): fall back to a string wrap. Safe because
    // the input is already sanitized and tables are not nested in these docs.
    return clean.replace(
      /<table[\s\S]*?<\/table>/gi,
      (t) => `<div class="legal-table">${t}</div>`,
    );
  }

  const host = document.createElement("div");
  host.innerHTML = clean;
  host.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("legal-table")) return;
    const box = document.createElement("div");
    box.className = "legal-table";
    table.parentNode?.insertBefore(box, table);
    box.appendChild(table);
  });
  return host.innerHTML;
}

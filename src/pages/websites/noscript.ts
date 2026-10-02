// BUILD-TIME ONLY (src/lib/seo/prerenderBody.ts). Relative imports: esbuild bundles it.
import { websitePageAt } from "./content";
import { PRICE_FOOTNOTE, priceRowsBoth, priceRowsMonthly } from "./shared";

/**
 * The no-JavaScript copy of a /websites page, written into its prerendered
 * HTML inside the <noscript> that src/lib/seo/prerenderBody.ts builds (after
 * the h1 and the meta description). Same content module as the page, so a
 * crawler that runs no script reads what a visitor reads: the intro, what the
 * site includes, every price with its setup fee and term, the rules, the
 * steps, every question with its answer, and the links.
 */

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const a = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
const p = (text: string) => (text ? `<p>${esc(text)}</p>` : "");
const h2 = (text: string) => `<h2>${esc(text)}</h2>`;
const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "");

/**
 * "" for any path that is not a /websites page. `postSlugs`: the published
 * posts; a related link to a post that is not among them is left out, as the
 * page itself does (parts/Info.tsx, Related).
 */
export function websitesNoscript(path: string, whatsappNumber?: string, postSlugs?: Set<string>): string {
  const page = websitePageAt(path);
  if (!page) return "";
  const related = page.related.links.filter((l) => !l.href.startsWith("/blog/") || !postSlugs || postSlugs.has(l.href.slice("/blog/".length)));
  const out: string[] = page.intro.map(p);
  const digits = (whatsappNumber || "").replace(/\D/g, "");
  const wa = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(page.whatsapp)}` : "";
  if (wa) out.push(`<p>${a(wa, "Message us on WhatsApp")}</p>`);

  if (page.cards) {
    out.push(h2(page.cards.heading), p(page.cards.intro || ""));
    out.push(ul(page.cards.items.map((c) => `${a(c.href, c.title)}: ${esc(c.body)}`)));
  }
  if (page.includes) {
    out.push(h2(page.includes.heading), p(page.includes.intro || ""));
    out.push(ul(page.includes.items.map((i) => `<strong>${esc(i.title)}</strong>. ${esc(i.body)}`)), p(page.includes.note || ""));
  }
  if (page.samples) out.push(h2(page.samples.heading), p(page.samples.intro));

  const rows = page.price === "monthly" ? priceRowsMonthly() : priceRowsBoth();
  out.push(h2(page.price === "monthly" ? "What it costs, in full" : "What it costs"));
  out.push(ul(rows.map((r) => `<strong>${esc(r.label)}</strong>: ${esc(r.value)}. ${esc(r.note)}`)), p(PRICE_FOOTNOTE));
  out.push(`<p>${a("/pricing", "Every plan and package on the pricing page")}</p>`);

  if (page.terms) {
    out.push(h2(page.terms.heading), p(page.terms.intro || ""));
    out.push(ul(page.terms.items.map((t) => `<strong>${esc(t.title)}</strong>. ${esc(t.body)}`)));
    out.push(`<h3>Not in the monthly fee</h3>`, ul(page.terms.notIncluded.map(esc)));
  }
  if (page.rules) {
    out.push(h2(page.rules.heading), ...page.rules.paragraphs.map(p));
    out.push(ul(page.rules.sources.map((s) => a(s.href, s.label))));
  }
  out.push(h2(page.steps.heading), `<ol>${page.steps.items.map((s) => `<li><strong>${esc(s.title)}</strong>. ${esc(s.body)}</li>`).join("")}</ol>`);
  out.push(h2(page.faqs.heading), ...page.faqs.items.map((f) => `<h3>${esc(f.question)}</h3>${p(f.answer)}`));
  out.push(h2(page.related.heading), ul(related.map((l) => `${a(l.href, l.label)}${l.note ? `: ${esc(l.note)}` : ""}`)));
  out.push(h2(page.closing.heading), p(page.closing.body));
  if (wa) out.push(`<p>${a(wa, "Message us on WhatsApp")} or ${a("/contact", "ask for a free website check")}.</p>`);
  return out.filter(Boolean).join("");
}

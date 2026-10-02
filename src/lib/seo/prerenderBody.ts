/**
 * BUILD-TIME ONLY. The <noscript> summary written into each prerendered page
 * (see ./prerender.ts). A browser running JavaScript never shows it: React
 * renders the real page. It is for crawlers and link-preview bots that run no
 * script, and for a person with JavaScript off, so it holds the page's h1 (the
 * only h1 in that case), its text, its prices and its links, from the same data
 * the page renders. Plain HTML, no styling beyond what index.css already gives.
 */
import type { BlogPost, Faq, Project, Service } from "../cms/types";
import {
  ABROAD, CARE, GST_LINE, ONE_TIME, PLAN_ORDER, PLANS, bandRange, inr, monthlyLine, seoAbroadLine,
  seoIndiaLine, servicePrice, termLine, usdRange,
} from "../pricing";
import type { PageSeo } from "./pages";
import { websitesNoscript } from "../../pages/websites/noscript";
import { formatPostDate } from "../postDate";

export interface BodyContext {
  services: Service[];
  projects: Project[];
  posts: BlogPost[];
  faqs: Faq[];
  postBodies: Map<string, string>;
  legalBodies: Record<string, { body: string }>;
  phoneDisplay: string;
  phoneHref: string;
  whatsappNumber: string;
  businessHours: string;
  responsePromise: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const a = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
const p = (text: string) => (text ? `<p>${esc(text)}</p>` : "");
const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "");

/** Repo-authored article and policy HTML, with anything executable or embedding taken out. */
function cleanHtml(html: string): string {
  return (html || "")
    .replace(/<(script|style|iframe|object|embed|noscript)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|noscript)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

const FAQ_HEADINGS: Record<string, string> = {
  services: "Working with us", seo: "Local SEO", eduflow: "EduFlow", internship: "The LaunchPad internship", general: "Good to know",
};

function faqBlock(faqs: Faq[]): string {
  return faqs.map((f) => `<h3>${esc(f.question)}</h3>${p(f.answer)}`).join("");
}

function priceSummary(): string {
  const plans = PLAN_ORDER.map((id) => {
    const pl = PLANS[id];
    const yearly = pl.yearly
      ? ` Or ${inr(pl.yearly.price)} a year paid upfront${pl.yearly.setupApplies ? `, plus the ${inr(pl.setup)} setup` : ""}.`
      : "";
    return `<strong>${esc(pl.name)}</strong>: ${esc(monthlyLine(pl))}, ${esc(termLine(pl))}.${esc(yearly)} ${esc(pl.includes.join(". "))}.`;
  });
  const bands = Object.values(ONE_TIME).map((b) => `${esc(b.label)}: ${esc(bandRange(b))}`);
  const care = CARE.map((c) => `${esc(c.name)}: ${esc(inr(c.monthly))} a month or ${esc(inr(c.yearly))} a year`);
  const abroad = ABROAD.map((r) => `${esc(r.label)}: ${esc(usdRange(r))}`);
  return [
    "<h2>Website on a monthly plan</h2>", ul(plans),
    "<h2>Buy your website or software outright</h2>", ul(bands),
    "<h2>Care plans after launch</h2>", ul(care),
    "<h2>Local SEO</h2>", ul([esc(`In India: ${seoIndiaLine()}`), esc(`Outside India: ${seoAbroadLine()}`)]),
    "<h2>Prices for clients outside India (USD)</h2>", ul(abroad),
    p(GST_LINE),
  ].join("");
}

function serviceBody(s: Service, ctx: BodyContext): string {
  const price = servicePrice(s.slug);
  const own = s.faqCategory ? ctx.faqs.filter((f) => f.category === s.faqCategory) : [];
  return [
    p(s.intro || s.longDescription || s.shortDescription),
    s.deliverables?.length ? `<h2>What you get</h2>${ul(s.deliverables.map(esc))}` : "",
    price ? `<h2>${esc(price.heading)}</h2>${ul(price.lines.map((l) => `${esc(l.label)}: ${esc(l.value)}${l.note ? `. ${esc(l.note)}` : ""}`))}${p(GST_LINE)}` : "",
    ...(s.sections || []).map((sec) =>
      `<h2>${esc(sec.heading)}</h2>${p(sec.body || "")}${ul((sec.items || []).map(esc))}${ul((sec.links || []).map((l) => a(l.href, l.label)))}`),
    own.length ? `<h2>Questions about ${esc(s.title)}</h2>${faqBlock(own)}` : "",
  ].join("");
}

function pageBody(path: string, ctx: BodyContext): string {
  const serviceList = ul(ctx.services.map((s) => `${a(`/services/${s.slug}`, s.title)}: ${esc(s.shortDescription)}`));
  const workList = ul(ctx.projects.map((pr) => `${a(`/work/${pr.slug}`, pr.title)}${pr.summary ? `. ${esc(pr.summary)}` : ""}`));
  switch (path) {
    case "/":
      return `<h2>What we build</h2>${serviceList}<h2>What it costs</h2>${priceSummary()}<h2>Work you can open</h2>${workList}`;
    case "/services":
      return `<h2>Services</h2>${serviceList}`;
    case "/pricing":
      return priceSummary();
    case "/work":
      return workList;
    case "/blog":
      return ul(ctx.posts.map((po) => `${a(`/blog/${po.slug}`, po.title)}${po.excerpt ? `. ${esc(po.excerpt)}` : ""}`));
    case "/faq": {
      const cats = [...new Set(ctx.faqs.map((f) => f.category || "general"))];
      return cats.map((c) => `<h2>${esc(FAQ_HEADINGS[c] || c)}</h2>${faqBlock(ctx.faqs.filter((f) => (f.category || "general") === c))}`).join("");
    }
    case "/contact":
      return ul([
        `Phone and WhatsApp: ${a(ctx.phoneHref, ctx.phoneDisplay)}, ${a(`https://wa.me/${ctx.whatsappNumber}`, "message us on WhatsApp")}`,
        esc(`Saket, New Delhi. ${ctx.businessHours}.`),
        esc(ctx.responsePromise),
      ]);
    default:
      // The /websites pages (2 Oct 2026) build their own copy from their content
      // module; "" for every other path.
      return websitesNoscript(path, ctx.whatsappNumber, new Set(ctx.posts.map((po) => po.slug)));
  }
}

/** The whole <noscript> block for one route. */
export function noscriptBlock(path: string, seo: PageSeo, ctx: BodyContext): string {
  const [, section, slug] = path.split("/");
  let main = "";
  if (section === "services" && slug) {
    const s = ctx.services.find((x) => x.slug === slug);
    if (s) main = serviceBody(s, ctx);
  } else if (section === "work" && slug) {
    const pr = ctx.projects.find((x) => x.slug === slug);
    if (pr) {
      main = [p(pr.summary), pr.challenge ? `<h2>The problem</h2>${p(pr.challenge)}` : "", pr.solution ? `<h2>What we built</h2>${p(pr.solution)}` : "",
        pr.technologies?.length ? `<h2>Built with</h2>${p(pr.technologies.join(", "))}` : "",
        pr.liveUrl ? p(`Live at ${pr.liveUrl}`) : pr.noLiveUrlReason ? p(pr.noLiveUrlReason) : ""].join("");
    }
  } else if (section === "blog" && slug) {
    const po = ctx.posts.find((x) => x.slug === slug);
    if (po) {
      // The byline the page prints: the date only when the record has a real one
      // (seed.ts), in the words and format BlogDetail.tsx uses.
      const byline = [po.author ? `By ${po.author}.` : "", po.publishDate ? `Published ${formatPostDate(po.publishDate)}.` : ""]
        .filter(Boolean).join(" ");
      main = `${p(byline)}${p(po.excerpt)}${cleanHtml(ctx.postBodies.get(String(po.id)) || "")}`;
    }
  } else if (ctx.legalBodies[section] && !slug) {
    main = cleanHtml(ctx.legalBodies[section].body);
  } else {
    main = `${p(seo.description)}${pageBody(path, ctx)}`;
  }
  // "Websites" (2 Oct 2026): the hub of the /websites pages, so a crawler that
  // runs no script reaches them from every page, as the footer row does.
  const nav = ul([a("/services", "Services"), a("/websites", "Websites"), a("/services/seo", "Local SEO"), a("/work", "Work"),
    a("/pricing", "Pricing"), a("/about", "About"), a("/blog", "Blog"), a("/faq", "FAQ"), a("/contact", "Contact")]);
  // The rest of the sitemap's pages that the nav above does not reach (SEO audit,
  // 2 Oct 2026: no other page's no-script copy linked /internship, /verify or
  // /privacy), as the rendered footer lists them. Draft policies stay out.
  const more = ul([a("/eduflow", "EduFlow, in development"), a("/internship", "LaunchPad internship"),
    a("/verify", "Verify a certificate"), a("/privacy", "Privacy Policy")]);
  return [
    '<noscript data-prerendered="true"><div class="container-page py-10">',
    `<p>${a("/", "Ideovent Technologies")}: a web and software studio in Saket, New Delhi.</p>`,
    `<nav aria-label="Site">${nav}</nav>`,
    `<main><h1>${esc(seo.h1)}</h1>${main}</main>`,
    `<footer>${p(`Ideovent Technologies, Saket, New Delhi. Phone and WhatsApp ${ctx.phoneDisplay}. ${ctx.businessHours}.`)}${more}</footer>`,
    "</div></noscript>",
  ].join("");
}

import { Link } from "react-router-dom";
import { ChevronRight, MessageCircle } from "lucide-react";
import { ONE_TIME, PLANS, bandRange, firstYearTotal, inr, monthlyLine, seoIndiaLine, termLine } from "@/lib/pricing";
import { keepNumberCompounds, unbreakable } from "@/lib/typography";
import { btnOutline, btnPrimary } from "../../pricing/styles";
import type { WebsitePage } from "../types";

/**
 * The first screen of a /websites page: the trail, the h1 (from PAGE_SEO, the
 * same words the prerendered HTML carries), the two-paragraph intro, the
 * WhatsApp button and, on a wide screen, the prices at a glance. No motion on
 * the h1 and no decoration behind it (the 1 Oct 2026 brief: no aurora, no
 * eyebrow pill, no gradient word). Every monthly figure carries its setup fee
 * and its term.
 */

const s = PLANS.starter;
const g = PLANS.growth;

function glance(kind: WebsitePage["price"]) {
  if (kind === "monthly") {
    return [
      { label: "Paid on the first day", value: `${inr(s.setup + s.monthly)} (setup and first month)`, to: "#price" },
      { label: `${s.name}, first year in total`, value: inr(firstYearTotal(s)), to: "#price" },
      { label: g.name, value: `${monthlyLine(g)}, ${termLine(g)}`, to: "#price" },
    ];
  }
  return [
    { label: "On a monthly plan", value: `${monthlyLine(s)}, ${termLine(s)}`, to: "#price" },
    { label: "Bought outright", value: `${bandRange(ONE_TIME.website)}, one time`, to: "#price" },
    { label: "Local SEO add-on", value: seoIndiaLine(), to: "/services/seo" },
  ];
}

export function Crumbs({ page }: { page: WebsitePage }) {
  const trail = [{ name: "Home", path: "/" }, ...page.crumbs];
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={c.path} className="inline-flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-foreground/80">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link to={c.path} className="inline-flex min-h-6 items-center underline-offset-4 transition-colors hover:text-foreground hover:underline">
                    {c.name}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Hero({ page, h1, whatsapp }: { page: WebsitePage; h1: string; whatsapp: string }) {
  const rows = glance(page.price);
  return (
    <section className="pt-28 pb-12 md:pt-36 md:pb-16" aria-labelledby="websites-h1">
      <div className="container-page">
        <Crumbs page={page} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-14">
          <div>
            <h1
              id="websites-h1"
              className="max-w-[18em] font-display text-[clamp(2rem,1.3rem+2.2vw,3.125rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-balance"
            >
              {keepNumberCompounds(unbreakable(h1))}
            </h1>
            {page.intro.map((para, i) => (
              <p
                key={i}
                className={i === 0 ? "mt-5 max-w-2xl text-base text-foreground/85 text-pretty md:text-lg" : "mt-3 max-w-2xl text-base text-muted-foreground text-pretty"}
              >
                {keepNumberCompounds(para)}
              </p>
            ))}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {whatsapp && (
                <a className={btnPrimary} href={whatsapp} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Message us on WhatsApp
                </a>
              )}
              {/* A router link, so ScrollToTop takes it to #price under the fixed header. */}
              <Link className={btnOutline} to="#price">
                See what it costs
              </Link>
            </div>
          </div>

          {/* The answers at a glance, each a link to its section. */}
          <dl className="divide-y divide-border/70 border-y border-border/70">
            {/* Label above value on a phone (a long value squeezed the label to
                three lines beside it), side by side from 640px. */}
            {rows.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <dt className="shrink-0">
                  <Link to={r.to} className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                    {r.label}
                  </Link>
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground sm:text-right">{keepNumberCompounds(unbreakable(r.value))}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

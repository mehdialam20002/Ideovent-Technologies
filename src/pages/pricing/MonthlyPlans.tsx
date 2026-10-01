import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import {
  GST_LINE,
  ONE_TIME,
  PLANS,
  PLAN_ORDER,
  firstYearTotal,
  inr,
  monthlyLine,
  seoIndiaLine,
  termLine,
  yearlySaving,
  type PlanId,
} from "@/lib/pricing";
import { keepNumberCompounds, unbreakable } from "@/lib/typography";
import { ArrowLink, Ticks } from "./ui";
import { btnOutline, btnPrimary } from "./styles";
import type { Choice } from "./choice";

/**
 * The top of /pricing: what the page is, then the two monthly plans straight
 * away (Mehdi, 1 Oct 2026: monthly plans first). The h1 carries no motion and
 * no decoration; it is the largest thing in the first screen and it says what
 * the page is. Each plan prints its setup fee and its 12-month term in the
 * same block as the monthly figure, at a size nobody can miss.
 */

const JUMPS = [
  { to: "#start", label: "Start a plan" },
  { to: "#compare", label: "Monthly or one-time" },
  { to: "#one-time", label: "Buy it outright" },
  { to: "#care-plans", label: "Care plans" },
  { to: "#seo", label: "Local SEO" },
  { to: "#abroad", label: "Outside India" },
  { to: "#questions", label: "Questions" },
  { to: "#policies", label: "Policies and delivery" },
];

const s = PLANS.starter;
const GLANCE = [
  { to: "#monthly", label: "Monthly plan", value: `${monthlyLine(s)}, ${termLine(s)}` },
  { to: "#one-time", label: "Bought outright", value: `From ${inr(ONE_TIME.landing.min)}, one time` },
  { to: "#seo", label: "Local SEO add-on", value: `${seoIndiaLine()}` },
];

function PlanCard({ id, onStart }: { id: PlanId; onStart: (c: Choice) => void }) {
  const p = PLANS[id];
  return (
    <article aria-labelledby={`plan-${id}`} className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h3 id={`plan-${id}`} className="font-display text-2xl font-semibold">
        {p.name}
      </h3>
      {/* Two lines reserved on wide screens, so both cards' prices sit level. */}
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty lg:min-h-[2.5rem]">{p.suits}</p>

      <div className="mt-6" data-testid={`price-${id}`}>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-foreground">
          <span className="font-display text-5xl font-semibold tabular-nums tracking-tight">{inr(p.monthly)}</span>
          <span className="text-lg font-medium">/month</span>
          <span className="text-lg font-semibold">{unbreakable(`+ ${inr(p.setup)} one-time setup`)}</span>
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {keepNumberCompounds(termLine(p))} · first year in total {unbreakable(inr(firstYearTotal(p)))}
        </p>
        {p.yearly && (
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Or {inr(p.yearly.price)} for the year, paid upfront
            {p.yearly.setupApplies ? `, plus the ${inr(p.setup)} setup` : ""}: {inr(yearlySaving(p))} less than 12 monthly
            payments, about two months.
          </p>
        )}
      </div>

      <Ticks items={p.includes} className="mt-6 flex-1 border-t border-border/70 pt-6" />

      <div className="mt-7">
        <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => onStart(`${id}-monthly` as Choice)}>
          Start with {inr(p.monthly)}/month
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          {inr(p.setup)} setup once, then {inr(p.monthly)} a month for {p.months} months. Domain not included.
        </p>
      </div>
    </article>
  );
}

export default function MonthlyPlans({ onStart, whatsapp }: { onStart: (c: Choice) => void; whatsapp: string }) {
  return (
    <section className="pt-32 pb-12 md:pt-40 md:pb-16" aria-labelledby="pricing-h1">
      <div className="container-page">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-14">
          <div>
            <h1
              id="pricing-h1"
              className="max-w-[15em] font-display text-[clamp(2.125rem,1.35rem+2.3vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-balance"
            >
              Website and software prices, in writing
            </h1>
            <p className="mt-5 max-w-2xl text-base text-foreground/85 text-pretty md:text-lg">
              Take your website on a monthly plan, or buy it outright. Every figure on this page is the full amount you
              pay us. Your domain is paid to the registrar.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{GST_LINE}</p>
          </div>

          {/* The three answers at a glance, each a link to its section. Wide
              screens only: on a phone the plans themselves come next. */}
          <dl className="hidden divide-y divide-border/70 border-y border-border/70 lg:block">
            {GLANCE.map((g) => (
              <div key={g.to} className="flex items-baseline justify-between gap-6 py-3">
                <dt>
                  <Link to={g.to} className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                    {g.label}
                  </Link>
                </dt>
                <dd className="text-right text-sm font-semibold tabular-nums text-foreground">{keepNumberCompounds(unbreakable(g.value))}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div id="monthly" className="mt-12">
          <h2 className="font-display text-xl font-semibold md:text-2xl">Your website on a monthly plan</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground text-pretty md:text-base">
            We build it, host it and keep it up to date: a one-time setup, then a monthly fee for 12 months.
          </p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {PLAN_ORDER.map((id) => (
              <PlanCard key={id} id={id} onStart={onStart} />
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {whatsapp && (
            <a className={btnOutline} href={whatsapp} target="_blank" rel="noreferrer noopener">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Talk to us on WhatsApp
            </a>
          )}
          <ArrowLink to="#one-time">Rather own it outright? One-time from {inr(ONE_TIME.landing.min)}</ArrowLink>
        </div>

        <nav aria-label="On this page" className="mt-10 border-t border-border/70 pt-4">
          <p className="text-sm text-muted-foreground">On this page</p>
          <ul className="mt-1 flex flex-wrap gap-x-5">
            {JUMPS.map((j) => (
              <li key={j.to}>
                <Link
                  to={j.to}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {j.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}

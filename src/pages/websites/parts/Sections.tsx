import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { keepNumberCompounds } from "@/lib/typography";
import { SectionHead } from "../../pricing/ui";
import type { WebsitePage } from "../types";

/**
 * The middle of a /websites page: the cards (kinds of business, or who the
 * plan suits), what the website includes, and screenshots of our own
 * templates. Every block renders only when the page has it.
 */

export function Cards({ cards }: { cards: NonNullable<WebsitePage["cards"]> }) {
  return (
    <section className="section-tight pt-4" aria-labelledby="websites-cards">
      <div className="container-page">
        <SectionHead id="websites-cards" title={cards.heading} intro={cards.intro} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.items.map((c) => (
            <li key={c.href}>
              <Link
                to={c.href}
                className="group flex h-full flex-col rounded-3xl border border-border bg-card/60 p-6 transition-colors duration-200 hover:border-primary/50 hover:bg-card active:bg-card/80"
              >
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground text-pretty">{c.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {c.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Includes({ includes }: { includes: NonNullable<WebsitePage["includes"]> }) {
  return (
    <section className="section-tight pt-4" aria-labelledby="websites-includes">
      <div className="container-page">
        <SectionHead id="websites-includes" title={includes.heading} intro={includes.intro} />
        <ul className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {includes.items.map((i) => (
            <li key={i.title} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">{i.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">{keepNumberCompounds(i.body)}</p>
              </div>
            </li>
          ))}
        </ul>
        {includes.note && <p className="mt-6 max-w-2xl text-sm text-muted-foreground text-pretty">{includes.note}</p>}
      </div>
    </section>
  );
}

/**
 * Screenshots of OUR OWN templates (public/home/), the same frames the home
 * hero shows, with the caption that says they are samples with made-up names.
 * Never a prospect's demo, and no link to one: demos are per prospect and
 * noindex (src/pages/DemoSiteRoute.tsx). The button asks for a sample instead.
 */
export function Samples({ samples, whatsapp }: { samples: NonNullable<WebsitePage["samples"]>; whatsapp: string }) {
  const base = import.meta.env.BASE_URL;
  // Two frames sit beside their words on a wide screen; four take the full row.
  const pair = samples.frames.length <= 2;
  const words = (
    <div className={pair ? "lg:pb-10" : undefined}>
      <h2 id="websites-samples" className="font-display text-xl font-semibold md:text-2xl">
        {samples.heading}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
        {samples.intro}{" "}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer noopener" className="font-medium text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-primary">
            Ask us for a full sample site
          </a>
        )}
      </p>
    </div>
  );
  const frames = (
    <ul className={pair ? "grid grid-cols-2 gap-4 lg:gap-6" : "grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6"}>
      {samples.frames.map((f) => (
        <li key={f.src}>
          <div className="overflow-hidden rounded-2xl border border-foreground/15 bg-card">
            <img src={`${base}${f.src}`} width={f.width} height={f.height} alt={f.alt} loading="lazy" decoding="async" className="block h-auto w-full" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground/85">{f.label}</p>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="pb-12 md:pb-16" aria-labelledby="websites-samples">
      <div className="container-page">
        {pair ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-14">
            {words}
            <div className="max-w-xl lg:max-w-none">{frames}</div>
          </div>
        ) : (
          <div className="grid gap-6">
            {words}
            {frames}
          </div>
        )}
      </div>
    </section>
  );
}

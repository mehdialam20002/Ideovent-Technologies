import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { FaqList } from "@/components/ui/faq-list";
import { keepNumberCompounds } from "@/lib/typography";
import { SectionHead } from "../../pricing/ui";
import { btnOutline, btnPrimary } from "../../pricing/styles";
import type { WebsitePage } from "../types";

/**
 * The lower half of a /websites page: the rules the buyer's own regulator
 * sets for their site (with the sources, so nobody has to take our word for
 * it), the four steps, the questions (marked up as this page's FAQPage, see
 * ../schema.ts), the links onward and the closing band.
 */

export function Rules({ rules }: { rules: NonNullable<WebsitePage["rules"]> }) {
  return (
    <section className="section-tight pt-4" aria-labelledby="websites-rules">
      <div className="container-page grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <SectionHead id="websites-rules" title={rules.heading} />
        <div className="max-w-2xl lg:pt-8">
          {rules.paragraphs.map((para, i) => (
            <p key={i} className={i ? "mt-4 text-muted-foreground text-pretty" : "text-foreground/90 text-pretty"}>
              {keepNumberCompounds(para)}
            </p>
          ))}
          <p className="mt-6 text-sm font-medium text-foreground">Sources</p>
          <ul className="mt-2 space-y-2">
            {rules.sources.map((src) => (
              <li key={src.href}>
                <a
                  href={src.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-start gap-1.5 text-sm text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  <span className="text-pretty">{src.label}</span>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Steps({ steps }: { steps: WebsitePage["steps"] }) {
  return (
    <section className="section-tight pt-4" aria-labelledby="websites-steps">
      <div className="container-page">
        <SectionHead id="websites-steps" title={steps.heading} />
        <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.items.map((s, i) => (
            <li key={s.title} className="border-t border-border/70 pt-5">
              <p className="font-display text-sm font-semibold tabular-nums text-secondary">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{keepNumberCompounds(s.body)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Questions({ faqs }: { faqs: WebsitePage["faqs"] }) {
  return (
    <section id="questions" className="section-tight pt-4" aria-labelledby="websites-faq">
      <div className="container-page grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
        <SectionHead id="websites-faq" title={faqs.heading} />
        <FaqList faqs={faqs.items} className="md:pt-6" />
      </div>
    </section>
  );
}

/**
 * A link to a /blog/ post shows only while that post is published (the blog is
 * edited in /admin, and a renamed or withdrawn post must not leave a dead link
 * here). Every other link is a route in App.tsx and always shows.
 */
export function Related({ related, postSlugs }: { related: WebsitePage["related"]; postSlugs: Set<string> }) {
  const links = related.links.filter((l) => !l.href.startsWith("/blog/") || postSlugs.has(l.href.slice("/blog/".length)));
  return (
    <section className="pb-12 md:pb-16" aria-labelledby="websites-related">
      <div className="container-page border-t border-border pt-8">
        <h2 id="websites-related" className="font-display text-xl font-semibold md:text-2xl">
          {related.heading}
        </h2>
        <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link to={l.href} className="group inline-flex min-h-11 flex-col justify-center">
                <span className="text-sm font-medium text-primary underline-offset-4 group-hover:underline">{l.label}</span>
                {l.note && <span className="text-xs text-muted-foreground">{l.note}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Closing({ closing, whatsapp, promise }: { closing: WebsitePage["closing"]; whatsapp: string; promise?: string }) {
  return (
    <section className="pb-16 pt-2 md:pb-20 lg:pb-24" aria-labelledby="websites-close">
      <div className="container-page">
        <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
          <div>
            <h2 id="websites-close" className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              {closing.heading}
            </h2>
            <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
              {closing.body} {promise || ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end md:pb-1">
            {whatsapp && (
              <a className={btnPrimary} href={whatsapp} target="_blank" rel="noreferrer noopener">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Message us on WhatsApp
              </a>
            )}
            <Link className={btnOutline} to="/contact">
              Get a free website check
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

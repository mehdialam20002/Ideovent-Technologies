import { Fragment } from "react";
import { MessageCircle } from "lucide-react";
import { useSingleton } from "@/lib/cms/context";
import { seed } from "@/lib/cms/seed";
import type { HomeHeroContent } from "@/lib/cms/types";
import { PLANS, monthlyLine, termLine } from "@/lib/pricing";
import { HeroLink } from "./hero/HeroLink";
import { SampleFrames } from "./hero/SampleFrames";

/**
 * Home hero, rebuilt 1 October 2026.
 *
 * Mehdi: "hero section ko v thik kro, AI generated lag rha hai, mujhe bilkul
 * aisa nahi chahiye." The brief (scratchpad seo-pricing/hero-brief.md) found
 * every unit the 2025-26 design press names as the generated-page kit, all in
 * one screen: a pill eyebrow, a whole headline line in gradient italic serif,
 * blurred blobs over a grid, pill buttons with a glow, a 96px headline, and
 * nothing a visitor could check. All of that is gone from this file, on
 * purpose. Do not bring back <Aurora>, .bg-grid, <Eyebrow>, .accent-italic,
 * .text-gradient, rounded-full buttons or a glow shadow here.
 *
 * What replaced it is what a person would put there: a plain two-line
 * headline, one sentence, a button for the free check, the WhatsApp number
 * itself, a plain link to the monthly plans, one line of true facts
 * including the partners' names, and screenshots of our own templates,
 * captioned as samples (./hero/SampleFrames.tsx). NO PRICE up here, not even
 * in the plans link: figures stay in the price block further down and on
 * /pricing (Mehdi, 26 Sep 2026: "ye pricing starting me hi kyu dikha rahe?").
 *
 * DATA. Only `home.hero` (seed.ts). The live Supabase `home` row predates it
 * and still stores "est. 2023" and "three partners" in the old fields; it has
 * no `hero`, so the seed's block shows as written, on first paint and after
 * the store loads (no swap; checked against a copy of the live row). A stored
 * `hero` is laid over the seed field by field, so a row saved before a field
 * existed still gets that field.
 *
 * SPEED. No entrance animation anywhere in the hero. The h1 is one block of
 * text with a <br> (not one block per line), so it is ONE largest-contentful-
 * paint candidate, larger than any single screenshot, and it paints with the
 * first render. Images carry width and height, so nothing shifts.
 */
const BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-medium " +
  "transition-colors duration-200 active:scale-[0.99] motion-reduce:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function Hero() {
  const stored = useSingleton("home").hero;
  const seeded = seed.home.hero as HomeHeroContent;
  const h: HomeHeroContent = { ...seeded, ...(stored || {}) };
  // The page's only h1 is never left empty, whatever the admin form saved.
  const lines = ((h.lines || []).filter(Boolean).length ? h.lines : seeded.lines).filter(Boolean);
  const trust = (h.trust || []).filter(Boolean);
  const frames = (h.frames || []).filter((f) => f && f.src);
  // The seeded link carries no figure. If a "{starter}" token is ever typed
  // into it in /admin, it is filled from src/lib/pricing.ts, the one place
  // every price on the site comes from, so the setup fee and the term always
  // travel with the monthly figure: "₹899/month + ₹2,999 one-time setup,
  // 12-month plan". A figure typed by hand would print without them.
  const plansLink = h.plansLink?.label
    ? { ...h.plansLink, label: h.plansLink.label.replace("{starter}", `${monthlyLine(PLANS.starter)}, ${termLine(PLANS.starter)}`) }
    : undefined;

  return (
    // The text face stack puts "Inter Fallback" (index.css: Arial sized to
    // Inter's widths) before the system faces, for this section only. The
    // site-wide stack falls back to Segoe UI, about 8% narrower than Inter, so
    // the sentence, the plans line and the facts row each gained a line when
    // Inter arrived and pushed the buttons down (measured at 360 to 768px).
    <section className="pb-14 pt-[8.5rem] [font-family:Inter,'Inter_Fallback',ui-sans-serif,system-ui,sans-serif] sm:pt-36 md:pb-20 lg:pt-40">
      <div className="container-page">
        {/* Two lines from 1024px up (one <br>, shown there only); on a phone the
            sentences run on and wrap to four lines at most. Sizes measured:
            32px keeps 360 to 430px phones at four lines; 40px on a tablet keeps
            the h1 larger than the first screenshot (so it stays the LCP); 4.2vw
            from 1024px keeps the first line on one line (1120px at 52px). */}
        <h1 className="max-w-[24em] text-[2rem] leading-[1.08] tracking-[-0.02em] text-foreground md:text-[2.5rem] lg:text-[clamp(2.5rem,4.2vw,3.25rem)]">
          {lines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <>
                  {" "}
                  <br className="hidden lg:inline" />
                </>
              )}
              {line}
            </Fragment>
          ))}
        </h1>

        {h.sub && (
          <p className="mt-5 max-w-[40rem] text-[17px] leading-relaxed text-foreground/80 text-pretty sm:text-lg">{h.sub}</p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {h.primary?.label && (
            <HeroLink cta={h.primary} className={`${BTN} bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80`} />
          )}
          {h.whatsapp?.label && (
            <HeroLink cta={h.whatsapp} className={`${BTN} border border-foreground/25 text-foreground hover:bg-muted active:bg-muted/70`}>
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {h.whatsapp.label}
            </HeroLink>
          )}
        </div>

        {plansLink?.href && (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[15px]">
            <HeroLink
              cta={plansLink}
              className="font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors duration-200 hover:decoration-primary"
            />
            {/* The note takes its own line on a phone: run on, it sat right at
                the wrap point at 375px and gained a line when Inter arrived. */}
            {h.plansNote && (
              <>
                {/[.!?]$/.test(plansLink.label.trim()) ? "" : "."}{" "}
                <span className="block sm:inline sm:whitespace-nowrap">{h.plansNote}</span>
              </>
            )}
          </p>
        )}

        {/* One line of facts, run as text. Each dot is glued to the fact before
            it and a short fact never breaks inside itself, so when the row
            wraps on a phone no line starts with a dot or splits "Since 2024". */}
        {trust.length > 0 && (
          <ul className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {trust.map((t, i) => (
              <li key={i} className="inline">
                <span className={t.length <= 32 ? "whitespace-nowrap" : undefined}>
                  {t}
                  {i < trust.length - 1 && <span aria-hidden="true" className="pl-2 pr-1 text-foreground/30">·</span>}
                </span>{" "}
              </li>
            ))}
          </ul>
        )}

        {frames.length > 0 && <SampleFrames frames={frames} caption={h.framesCaption} link={h.framesLink} />}
      </div>
    </section>
  );
}

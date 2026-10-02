import { Fragment, useRef, useSyncExternalStore, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { useSingleton } from "@/lib/cms/context";
import { seed } from "@/lib/cms/seed";
import type { HomeHeroContent } from "@/lib/cms/types";
import { HeroLink } from "./hero/HeroLink";
import { HeroScene, HeroSceneBoundary } from "./hero/scene/HeroScene";

/**
 * Home hero, rebuilt 1 October 2026; the 3D art added the same day.
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
 * What a person would put there: a plain headline, one sentence, a button for
 * the free check, the WhatsApp number itself and one line of true facts
 * including the partners' names. Beside it (below it on a phone) is the art,
 * "Plan to Page" (./hero/scene, spec _build/specs/hero-3d-spec.md): the plan
 * of a small business's mobile page is drawn, its parts rise in reading order,
 * and a gold pin lands on its map, once, in 1.65 s, in a worker. It carries no
 * words, numbers, prices, names or year.
 *
 * NO PROJECTS AND NO PRICE UP HERE (Mehdi, 1 Oct 2026: "mat dikhao project ya
 * pricing yahan"; 26 Sep: "ye pricing starting me hi kyu dikha rahe?"). This
 * file never reads `frames`, `framesCaption`, `framesLink`, `plansLink` or
 * `plansNote`, so a Home row saved in /admin while those fields existed can
 * never bring the screenshots or the plans link back. Client work is in the
 * work section further down and on /work; figures are in the price block and
 * on /pricing.
 *
 * DATA. Only `home.hero` (seed.ts). A stored `hero` is laid over the seed field
 * by field, so a row saved before a field existed still gets that field.
 *
 * SPEED. No entrance animation on the text. The h1 is one block of text with a
 * <br> (not one block per line), so it is ONE largest-contentful-paint
 * candidate, and it paints with the first render. The art is an inline SVG
 * (never an LCP candidate) whose box is sized by CSS alone, so nothing shifts;
 * three.js loads only in the worker, only when every gate passes.
 */
const BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-medium " +
  "transition-colors duration-200 active:scale-[0.99] motion-reduce:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * THE HEADLINE'S LINE RULES (spec 6.3). Below 640px the sentences run on (32px, global
 * balance). From 640px each CMS line starts on a line of its own and its last two words
 * never split, so no line ends on one word. From 1024px the last line's two-word tail
 * also starts a line of its own, which is where Sora puts it anyway ("...We build the
 * website / they find."). Written out, that break does not depend on the font: the
 * metric-matched "Sora Fallback" is narrower than Sora 500 and kept "they find." on
 * line 3 at 1280px, so the swap to Sora moved everything under the h1 (CLS 0.09,
 * measured 1 Oct 2026).
 *
 * In the browser the h1 is written for the layout step it is at (useStep): one text
 * node below 640px, and from 640px one text node per line start, with a no-break space
 * gluing each two-word tail. So NO text node starts in the middle of a line, and when
 * Sora replaces its fallback a few hundred ms after the first paint, no run of words
 * slides along its line: with the tails in their own <span>s, two of them moved 3px or
 * more at 344 to 639px, a layout shift the hero added (0.0008, measured 2 Oct 2026).
 *
 * headline()'s step -1 is the same headline with the rules in CSS alone (<br>s shown
 * from sm and lg, the tails in sm:whitespace-nowrap spans). It is what a server render
 * or a future prerendered hero gets (useStep's server value), so hydration matches at
 * any width. Its spaces sit INSIDE text nodes that have words: Chrome's accessibility
 * tree drops a space-only text node next to a display:none <br> ("call.We build the
 * websitethey find.", measured 1 Oct 2026).
 */
const STEP_QUERIES = ["(min-width: 640px)", "(min-width: 1024px)"];
function onStepChange(cb: () => void) {
  const qs = STEP_QUERIES.map((q) => matchMedia(q));
  for (const q of qs) q.addEventListener("change", cb);
  return () => qs.forEach((q) => q.removeEventListener("change", cb));
}
/** 0 below 640px, 1 to 1023px, 2 from 1024px; -1 on a server (CSS decides). */
const useStep = () => useSyncExternalStore(onStepChange, () => STEP_QUERIES.filter((q) => matchMedia(q).matches).length, () => -1);

/** [all but the last two words, the last two] of a line; head is "" for a short line. */
function split2(line: string): [string, string] {
  const w = line.trim().split(/\s+/);
  return w.length < 3 ? ["", w.join(" ")] : [w.slice(0, -2).join(" "), w.slice(-2).join(" ")];
}

function headline(lines: string[], step: number): ReactNode {
  if (step === 0) return lines.join(" ");
  return lines.map((line, i) => {
    const [head, tail] = split2(line);
    const lgBreak = i > 0 && i === lines.length - 1 && head;
    if (step < 0) {
      const lead = i > 0 ? " " : "";
      return (
        <Fragment key={i}>
          {i > 0 && <br className="hidden sm:inline" />}
          {head ? (
            <>
              {lead + head + " "}
              {lgBreak && <br className="hidden lg:inline" />}
              <span className="sm:whitespace-nowrap">{tail}</span>
            </>
          ) : (
            lead + tail
          )}
        </Fragment>
      );
    }
    const glued = tail.replace(" ", "\u00A0");
    return (
      <Fragment key={i}>
        {i > 0 && <br />}
        {step === 2 && lgBreak ? (
          <>
            {head + " "}
            <br />
            {glued}
          </>
        ) : (
          (head ? head + " " : "") + glued + (i === lines.length - 1 ? "" : " ")
        )}
      </Fragment>
    );
  });
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stored = useSingleton("home").hero;
  const seeded = seed.home.hero as HomeHeroContent;
  const h: HomeHeroContent = { ...seeded, ...(stored || {}) };
  // The page's only h1 is never left empty, whatever the admin form saved.
  const lines = ((h.lines || []).filter(Boolean).length ? h.lines : seeded.lines).filter(Boolean);
  const trust = (h.trust || []).filter(Boolean);
  const step = useStep();

  return (
    // The text face stack puts "Inter Fallback" (index.css: Arial sized to
    // Inter's widths) before the system faces, for this section only. The
    // site-wide stack falls back to Segoe UI, about 8% narrower than Inter, so
    // the sentence and the facts row each gained a line when Inter arrived and
    // pushed the buttons down (measured at 360 to 768px).
    <section ref={sectionRef} className="pb-14 pt-[8.5rem] [font-family:Inter,'Inter_Fallback',ui-sans-serif,system-ui,sans-serif] sm:pt-36 md:pb-20 lg:pt-40">
      {/* Text first in the DOM (a screen reader reads h1, sub, buttons, then the
          facts). From 1024px the art takes the right column across both rows;
          row 2 absorbs its extra height, so the facts stay 24px under the
          buttons instead of drifting down. */}
      <div className="container-page grid grid-cols-1 [grid-template-areas:'copy'_'art'_'trust'] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:[grid-template-areas:'copy_art'_'trust_art']">
        <div className="[grid-area:copy]">
          {/* Measured in headless Chrome with the site's Sora (spec 6.3). Below
              640px: 32px, the sentences run on, four lines at 360 to 430px.
              From 640px: the <br> shows, the width is capped at 15.75em and the
              last two words of each line are kept together, with plain `wrap`
              (balance always gave "look / you up"): three lines to 1023px,
              four from 1024px, where the size tops out at 46px so "look you up"
              never splits and "find." never sits alone (headline() above). */}
          <h1 className="max-w-[24em] text-[2rem] leading-[1.08] tracking-[-0.02em] text-foreground sm:max-w-[15.75em] sm:[text-wrap:wrap] md:text-[2.5rem] lg:text-[clamp(2.25rem,3.5vw,2.875rem)]">
            {headline(lines, step)}
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
        </div>

        {/* Outside any data-driven key: a CMS store update re-renders the hero
            without remounting the scene. */}
        <HeroSceneBoundary>
          <HeroScene sectionRef={sectionRef} className="[grid-area:art]" />
        </HeroSceneBoundary>

        {/* One line of facts, run as text. Each dot is glued to the fact before
            it and a short fact never breaks inside itself, so when the row
            wraps on a phone no line starts with a dot or splits "Since 2019". */}
        {trust.length > 0 && (
          <ul className="[grid-area:trust] mt-6 text-sm leading-relaxed text-muted-foreground lg:self-start">
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
      </div>
    </section>
  );
}

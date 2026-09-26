import { cn } from "@/lib/utils";

/**
 * Ambient brand wash for a hero backdrop. Purely decorative, hence aria-hidden.
 *
 * IT NO LONGER ANIMATES, AND THAT IS THE POINT.
 *
 * Each of the three shapes below is a 30-38rem circle with a 120-130px blur.
 * Until this pass all three also carried `animate-aurora`, an 18s infinite
 * translate-and-scale keyframe, offset from each other by -6s and -12s. Aurora
 * is rendered on 15 routes, so that was three continuously animating
 * 120px-blurred layers on every single page of the site, forever, including
 * while the visitor was reading something 4000px further down.
 *
 * Two reasons it is gone.
 *
 * The design reason: the brief's list of things that make a page read as
 * generated opens with "a glassmorphic card floating on a gradient blob". A
 * drifting gradient blob is the single most recognisable template flourish
 * there is, and it is the clearest case of motion that exists for its own sake
 * on this site. Nothing about the page is clearer for it moving.
 *
 * The measured reason: a blurred element that transforms cannot be composited
 * once and reused, so the blur is re-rasterised every frame it moves. On the
 * home page that is three of them.
 *
 * The WASH stays. It is what carries the navy-and-gold ground behind a hero,
 * and a hero on a flat fill is not what the palette was built for. Static, the
 * browser paints these three layers once and never touches them again.
 *
 * If one of these is ever wanted in motion again, animate `opacity` rather than
 * `transform` on a blurred layer, and read the prefers-reduced-motion block at
 * the foot of index.css first.
 *
 * THE ALPHAS ARE HALVED IN THE LIGHT THEME, AND THAT IS NOT A PREFERENCE.
 *
 * These three layers are tinted with --primary and --secondary, and both tokens
 * change colour per theme rather than just changing lightness. On navy the gold
 * is gold-300 #E4CE8E and the wash reads as light falling on the page. On the
 * light ground --secondary is gold-700 #8C6F22, a BROWN, and 25% of a brown over
 * #F8FAFC is not a glow: sampled at 1440x900 the densest point of the top-right
 * layer painted #E1DCCD against a #EBEFF4 neighbourhood, a khaki cast on a cool
 * slate ground, which reads as a stain or a compression artefact rather than as
 * light. Same measurement in dark: #373E4B against #121F39, a warm lift, correct.
 *
 * So the light theme gets roughly half the alpha. This is the same correction,
 * for the same reason, that `.light .bg-spotlight` already makes in index.css
 * ("a 20% navy bloom on a near-white panel reads as a dirty mark"), and the
 * numbers are kept in step with that rule: gold 0.25 -> 0.12, navy 0.20 -> 0.10.
 *
 * Written as base + `dark:` rather than a `.light` override because Tailwind
 * ships no `light:` variant, and because a `.light.aurora` compound selector is
 * exactly the bug this file's sibling rules in index.css were just fixed for:
 * next-themes puts the theme class on <html>, so it can only ever be reached as
 * an ANCESTOR. `dark:` compiles to `.dark &`, which is that, and is safe here
 * because enableSystem is false and <html> therefore always carries one of the
 * two classes.
 *
 * The third layer is --accent, which in the light theme is navy-100 #E8EEFB,
 * already within a few units of the page ground. It is left alone: it paints
 * nothing visible there and halving nothing is not a change.
 */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-32 left-1/4 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px] dark:bg-primary/20" />
      <div className="absolute top-10 right-0 h-[32rem] w-[32rem] rounded-full bg-secondary/[0.12] blur-[130px] dark:bg-secondary/25" />
      <div className="absolute -bottom-32 left-10 h-[30rem] w-[30rem] rounded-full bg-accent/15 blur-[130px]" />
    </div>
  );
}

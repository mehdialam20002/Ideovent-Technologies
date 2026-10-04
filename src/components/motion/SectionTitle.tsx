import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeIn, fadeUp, TRANSITION, CONTINUATION_DELAY } from "@/lib/motion";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

/*
  THE TYPE ROLES THIS TRACK'S SECTIONS USE, written out once.

  They are the measured brief's numbers (_assets/SITE-REDESIGN-BRIEF.md, type
  spec), and since 26 Sep 2026 they are the named roles in src/styles/system.css
  rather than Tailwind arbitrary values here, so there is one definition of
  each and the home page's h2 cannot drift from /pricing's. system.css loads
  after Tailwind and is authoritative over any utility on the same element.

  .text-display h2   Sora 500. 28/1.15/-0.015em, 36/1.12/-0.018em from 768,
                     44/1.1/-0.02em from 1280, max 28ch. ONE size per viewport
                     for every h2 on the page (site:hero's `.home-h2` carries
                     the same numbers), two-tone: statement foreground,
                     continuation muted.
  .text-h3           Sora 500 18/1.3/-0.01em.
  .text-body         Inter 400, 16/1.6, 17/1.55 from 768, max 60ch.
  small              Inter 400 14/1.5, muted.
  .text-label        Inter 500 13px, tracking 0.02em, muted. No pill, no dot.
  .textlink          The second action everywhere: a text link with an arrow,
                     never a second button. Colour 150ms, arrow 2px in 200ms.
*/
/** `m-h2` pins the 28ch measure in em so it survives the font swap (motion.css). */
export const H2_CLASS = "text-display m-h2 text-foreground text-balance";
export const H3_CLASS = "text-h3 text-foreground";
export const BODY_CLASS = "text-body";
export const SMALL_CLASS = "text-sm leading-[1.5] text-muted-foreground";
export const LABEL_CLASS = "text-label";
export const TEXT_LINK_CLASS = "textlink";

interface SectionTitleProps {
  /** The statement, in the foreground colour. */
  statement: ReactNode;
  /** The continuation, same size, muted, inside the same h2. */
  continuation?: ReactNode;
  /** An optional lead paragraph UNDER the heading (never in a right-hand column). */
  lead?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * A section opener: the two-tone h2 alone, left on the gutter, with an optional
 * lead paragraph under it at 60ch. No eyebrow, no gold rule, no paragraph in a
 * right-hand column: those three together were the "every section opens the
 * same way" tell the redesign exists to remove.
 *
 * MOTION. The block rises 12px over 220ms once, when its top is 15% up the
 * viewport; the
 * muted continuation arrives 80ms later on opacity alone, so the statement is
 * read first. Settled at 0.30s. Only the heading moves: whatever the section
 * holds under it renders static, because a grid of cards fading in one by one
 * is a tell. Under reduced motion this renders plain elements with no framer
 * state at all, so nothing can be left at opacity 0.
 */
export function SectionTitle({ statement, continuation, lead, id, className }: SectionTitleProps) {
  // Hydration-safe (prerendered pages): see ./useReducedMotionSafe.
  const reduce = useReducedMotionSafe();

  const heading = (cont: ReactNode) => (
    <h2 id={id} className={H2_CLASS}>
      {statement}
      {continuation ? <> {cont}</> : null}
    </h2>
  );
  // A plain string, NOT cn(). tailwind-merge reads the unknown `text-body` as a
  // text colour, so cn("text-body", "text-muted-foreground") silently dropped
  // the role: the lead printed at 16px with no 60ch measure, 1184px wide at
  // 1440 (verifier, 26 Sep 2026).
  const leadEl = lead ? <p className={`${BODY_CLASS} mt-5 text-muted-foreground text-pretty`}>{lead}</p> : null;

  if (reduce) {
    return (
      <div className={className}>
        {heading(<span className="text-muted-foreground">{continuation}</span>)}
        {leadEl}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      // Triggered by the block's TOP crossing 85% of the viewport, not by a
      // share of its height. In a grid row (FaqSection at lg) this block is
      // stretched to the height of the column beside it, so "60% in view" of
      // a ~400px box left the h2 invisible while the questions next to it were
      // already on screen.
      viewport={{ once: true, amount: "some", margin: "0px 0px -15% 0px" }}
    >
      {heading(
        <motion.span
          variants={fadeIn}
          transition={{ ...TRANSITION, delay: CONTINUATION_DELAY }}
          className="text-muted-foreground"
        >
          {continuation}
        </motion.span>
      )}
      {leadEl}
    </motion.div>
  );
}

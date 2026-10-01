import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * The small label over a section heading: plain muted text, sentence case.
 *
 * Until 1 Oct 2026 this was a pill with a gold hairline, a leading gold dot,
 * a blurred fill and tracked capitals. That "eyebrow chip" is one of the two
 * tells the 2026 design press singles out on generated landing pages (hero
 * brief, scratchpad seo-pricing/hero-brief.md, section 2), and Mehdi's word
 * for the page that carried it was "AI generated". The look lives in `.eyebrow`
 * in src/index.css; this component only adds the class.
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}

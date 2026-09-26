import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * A horizontal strip of short labels (the tech stack on the home page).
 *
 * IT NO LONGER SCROLLS. The name is kept because the call sites are, but the
 * infinite `animate-marquee` translate, its duplicated second copy and its
 * `group-hover` pause are gone, along with the keyframes in index.css and the
 * `marquee` entry in tailwind.config.ts.
 *
 * THE ACCESSIBILITY REASON, which is the one that forced it.
 * WCAG 2.2.2 (Pause, Stop, Hide) is Level A and applies to anything that moves
 * automatically for more than five seconds alongside other content. The only
 * pause this had was `group-hover:[animation-play-state:paused]`: no keyboard
 * user, screen-reader user or touch user could reach it, and the strip held no
 * focusable element, so adding `focus-within` would not have reached it either.
 * The two honest fixes were a visible pause button on a decorative strip, or
 * stopping it. The second is also the better design.
 *
 * THE DESIGN REASON. A strip of framework names sliding past under the hero is
 * one of the most recognisable generated-landing-page units there is, and this
 * site is being redesigned specifically so that it does not read that way.
 *
 * THE MEASURED REASON. It was a composited layer translating on every frame,
 * for as long as the tab was open, on a page where it is 600px above the fold
 * for most of the visit.
 *
 * Nothing is cut: every label still renders, it simply wraps. The second,
 * aria-hidden copy is gone too, so a screen reader no longer has to be
 * protected from reading the list twice.
 *
 * `duration` is accepted and ignored so that an existing call site does not
 * break; delete it from the call sites when convenient.
 */
export function Marquee({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** @deprecated the strip no longer animates; accepted so call sites keep compiling. */
  duration?: number;
  fade?: boolean;
  label?: string;
}) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className={cn("flex flex-wrap items-center justify-center gap-y-2", className)}
    >
      {children}
    </div>
  );
}

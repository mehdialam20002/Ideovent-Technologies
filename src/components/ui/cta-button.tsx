import { Link } from "react-router-dom";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";
import type { Cta } from "@/lib/cms/types";

const variantMap: Record<NonNullable<Cta["variant"]>, ButtonProps["variant"]> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
};

/**
 * Renders a CMS Cta as an internal Link or an external anchor, styled as a button.
 *
 * THE MAGNETIC HOVER IS GONE, along with src/components/ui/magnetic-button.tsx,
 * which had no other consumer.
 *
 * It worked by listening to mousemove over the button and translating it up to 35%
 * of the cursor's offset from the button's centre, on a spring. On the widest call
 * site (a `size="lg"` button, ~200px) that is up to 35px of travel, so the button
 * moved away from the pointer that was aiming at it, and the pointer chased it. For
 * a visitor with any tremor, or anyone using a trackpad at low speed, that turns a
 * one-click action into a two-click one. It also does nothing at all on a touch
 * screen, which is most of this site's traffic, and nothing for a keyboard user.
 *
 * So it cost every mouse user a slightly harder target and returned an effect only a
 * mouse user could see, which is the definition of motion for its own sake. The press
 * feedback a button actually needs is in the Button variants themselves: a hover
 * tint, an `active:` pressed tint, a 1% scale-down, and a gold focus ring.
 *
 * The `magnetic` prop went with it. Three call sites were already passing
 * `magnetic={false}` to opt out.
 *
 * NO PILL, NO GLOW (1 Oct 2026). The shape was `rounded-full` and the primary
 * button carried a 40px glow in --primary. A pair of glowing pill buttons is on
 * the hero brief's list of generated-page tells (section 1, item 5), so every
 * CtaButton now has the plain shape the new home hero and the navbar use:
 * rounded-lg, flat, no shadow.
 */
export function CtaButton({ cta, size = "lg", className }: { cta: Cta; size?: ButtonProps["size"]; className?: string }) {
  const variant = variantMap[cta.variant || "primary"];
  const external = /^https?:\/\//.test(cta.href) || cta.href.startsWith("mailto:") || cta.href.startsWith("tel:");

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn("rounded-lg font-medium shadow-none", className)}
    >
      {external ? (
        <a href={cta.href} target={cta.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener">
          {cta.label}
        </a>
      ) : (
        <Link to={cta.href}>{cta.label}</Link>
      )}
    </Button>
  );
}

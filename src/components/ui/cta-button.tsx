import { Link } from "react-router-dom";
import { Button, type ButtonProps } from "./button";
import { Magnetic } from "./magnetic-button";
import { cn } from "@/lib/utils";
import type { Cta } from "@/lib/cms/types";

const variantMap: Record<NonNullable<Cta["variant"]>, ButtonProps["variant"]> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
};

/** Renders a CMS Cta as an internal Link or external anchor styled as a button, with a magnetic hover. */
export function CtaButton({ cta, size = "lg", className, magnetic = true }: { cta: Cta; size?: ButtonProps["size"]; className?: string; magnetic?: boolean }) {
  const variant = variantMap[cta.variant || "primary"];
  const external = /^https?:\/\//.test(cta.href) || cta.href.startsWith("mailto:") || cta.href.startsWith("tel:");

  const inner = (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn("rounded-full font-medium", variant === "default" && "shadow-[0_0_40px_-12px_hsl(var(--primary)/0.7)]", className)}
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

  return magnetic ? <Magnetic>{inner}</Magnetic> : inner;
}

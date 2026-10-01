import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Cta } from "@/lib/cms/types";

/**
 * A CMS link for the home hero: a router <Link> for an address on this site
 * ("/#contact", "/pricing#monthly"), a plain <a> for anything else. An http(s)
 * address (the wa.me link) opens in a new tab; mailto: and tel: do not.
 */
export function HeroLink({ cta, className, children }: { cta: Cta; className?: string; children?: ReactNode }) {
  const external = /^(https?:|mailto:|tel:)/i.test(cta.href);
  if (external) {
    const newTab = /^https?:/i.test(cta.href);
    return (
      <a href={cta.href} className={className} {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children ?? cta.label}
      </a>
    );
  }
  return (
    <Link to={cta.href} className={className}>
      {children ?? cta.label}
    </Link>
  );
}

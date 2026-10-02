import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WEBSITE_LINKS } from "./links";

/**
 * The /websites pages as one block of links, for /services and the website
 * development service page (2 Oct 2026). Labels and lines from ./links.ts;
 * the monthly plan's line carries its setup fee and term.
 */
export default function WebsitesStrip({ as: Heading = "h2", className }: { as?: "h2" | "h3"; className?: string }) {
  return (
    <div className={cn("rule-gold grid gap-6 pt-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12", className)}>
      <div>
        <Heading className="font-display text-2xl font-semibold text-balance md:text-3xl">Websites for your kind of business</Heading>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
          What the site holds, what it costs and the rules your field sets, one page each.
        </p>
      </div>
      <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {WEBSITE_LINKS.map((l) => (
          <li key={l.href}>
            <Link to={l.href} className="group flex min-h-11 flex-col justify-center py-1">
              <span className="text-sm font-medium text-primary underline-offset-4 group-hover:underline">Websites {l.label.charAt(0).toLowerCase() + l.label.slice(1)}</span>
              <span className="text-xs text-muted-foreground text-pretty">{l.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

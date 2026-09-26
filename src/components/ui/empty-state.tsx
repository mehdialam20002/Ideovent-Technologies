import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { Aurora } from "@/components/ui/aurora";

/*
  ONE SHAPE FOR EVERY DEAD END ON THE SITE.

  There are seven of them and, before this file existed, there were five
  different designs between them:

    /404 and a case study that does not resolve   a full-height hero with the
                                                  Aurora wash behind it and a
                                                  bare <Link> styled as a pill
                                                  with `hover:scale-105`
    /services/<unknown>                           a card with an eyebrow and a
                                                  CtaButton
    /blog/<unknown> and /blog with no posts       a card with a 48px icon disc
                                                  and no eyebrow
    /work with nothing published                  a card with a 56px icon
                                                  SQUARE and a different button
                                                  size

  Five treatments for the same event is what "generated" looks like from the
  inside: each one was written when its page was written, and nobody ever saw
  two of them next to each other. A dead end is also the moment a visitor is
  most likely to decide the site is broken, so it is the worst page on which to
  look improvised.

  What this component fixes, beyond the look:

  - THE PILL LINKS ARE GONE. Both of them were hand-rolled anchors with
    `transition-transform hover:scale-105` and no `active:` state at all, so a
    tap on a phone got no acknowledgement, and a 5% grow is the one hover on the
    site that moved a target out from under the pointer. Every action here is a
    <CtaButton>, i.e. the Button variants, which carry a hover tint, a pressed
    tint, a 1% scale-down that `motion-reduce` removes, and the gold focus ring.

  - THE WAY OUT IS PLURAL. A dead end that offers exactly one link ("Back to
    home") makes the visitor start again. `links` prints the two or three
    addresses that are actually likely to be what they wanted, as real text
    links rather than as a second row of buttons competing with the first.

  - NO INVENTED CONSOLATION. Nothing here says "try searching" when there is no
    search, and nothing claims the content is coming when nobody has said it is.
    Each call site passes its own sentence and each sentence is true on the day
    it renders.

  `tone="page"` is the whole-page case (a 404, an unresolved slug): it centres
  in the viewport and carries the Aurora wash the other heroes use, so the page
  still looks like this site rather than like a server error. `tone="panel"` is
  the in-page case (a collection that is empty but the page around it is fine):
  a bordered card inside the normal section rhythm.
*/

export type EmptyStateLink = { label: string; to: string };

export function EmptyState({
  eyebrow,
  icon,
  code,
  title,
  body,
  action,
  links,
  tone = "panel",
  headingAs = "h2",
  className,
}: {
  /** Small caps above the heading. Say what happened, not how sorry we are. */
  eyebrow?: string;
  /** A lucide icon element, already sized by the call site to h-5 w-5. */
  icon?: ReactNode;
  /** The HTTP-ish number, printed only by the real 404. */
  code?: string;
  title: ReactNode;
  body: ReactNode;
  /** The one thing we would like them to do next. */
  action?: { label: string; href: string };
  /** Other addresses that may be what they meant. */
  links?: EmptyStateLink[];
  tone?: "page" | "panel";
  headingAs?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingAs;

  const inner = (
    <div
      className={cn(
        "mx-auto flex max-w-xl flex-col items-center text-center",
        tone === "panel" && "card-surface rounded-3xl border border-border bg-card/60 px-8 py-16"
      )}
    >
      {code && (
        <p
          aria-hidden="true"
          className="text-gradient font-display text-[7rem] font-thin-display leading-[0.85] tracking-[-0.04em] md:text-[10rem]"
        >
          {code}
        </p>
      )}

      {icon && !code && (
        <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
          {icon}
        </span>
      )}

      {eyebrow && <Eyebrow className={cn(code && "mt-6")}>{eyebrow}</Eyebrow>}

      <Heading className={cn("font-display text-2xl font-semibold text-balance md:text-3xl", eyebrow ? "mt-4" : code ? "mt-6" : "")}>
        {title}
      </Heading>

      <p className="mt-3 text-sm text-muted-foreground text-pretty">{body}</p>

      {action && (
        <div className="mt-8">
          <CtaButton cta={{ label: action.label, href: action.href }} />
        </div>
      )}

      {links && links.length > 0 && (
        <nav aria-label="Other pages" className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex min-h-6 items-center text-sm font-medium text-muted-foreground underline-offset-4
                         transition-colors duration-200 hover:text-foreground hover:underline active:text-foreground/70"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );

  if (tone === "page") {
    /*
      pt-28 is the fixed header's own height: Navbar is py-4 around an h-20 bar,
      i.e. 112px at the top of the page. <main> carries no offset for it, because
      every hero on the site pads itself, and this section did not. Screenshotted
      at 375px the 404 numeral's cap sat 5px below the logo lockup, so on a phone
      the two read as one overlapping object. `items-center` still centres, now
      inside the space that is actually free.
    */
    return (
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden pt-28">
        {/* The same static navy-and-gold wash every hero on the site carries, so
            a dead end still looks like this site rather than like a fault. It
            does not animate: see the note at the top of aurora.tsx. */}
        <Aurora />
        <div className={cn("container-page relative", className)}>{inner}</div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className={cn("container-page", className)}>{inner}</div>
    </section>
  );
}

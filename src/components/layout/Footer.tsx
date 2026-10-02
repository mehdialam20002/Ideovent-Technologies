import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { useCollection, useContent } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { CtaButton } from "@/components/ui/cta-button";
import { unbreakable } from "@/lib/typography";
import { liveEmail } from "@/lib/mailbox";
import { WEBSITES_HEADING, WEBSITE_LINKS } from "@/pages/websites/links";

/**
 * Site footer.
 *
 * Carries the routes the header deliberately does not: the LaunchPad internship,
 * the certificate verifier, the writing, the FAQ and the four policy pages. The
 * grouping and the order live in `navigation.footer.columns` in seed.ts, which is
 * also what the mobile menu reads, so the two never drift.
 *
 * Layout is a 12-column grid from lg up: a 4-column brand block (logo, what the
 * firm is, how to reach it, socials) and four 2-column link stacks. Before this the
 * grid was `lg: grid-cols-5` with the contact details in a fifth column of their own,
 * which could not hold a fourth link column without wrapping one cell onto a line
 * by itself.
 */
export default function Footer() {
  const { navigation, contact, settings, socials } = useContent();
  // No address until contact@ideovent.in has a mailbox (src/lib/mailbox.ts).
  const email = liveEmail(contact);
  /* The services column. `showInFooter` sat on every service record, and in the
     admin, with nothing reading it: service pages were linked from /services and
     from a navbar panel that renders its links only while it is open, so a
     crawler found them from one page. Built from the collection, so a service
     added in /admin appears here on its own (1 Oct 2026). */
  const footerServices = useCollection("services").filter((s) => s.showInFooter);
  const year = new Date().getFullYear();

  /*
    Joined from non-empty parts only: the postal code is blank until one is
    confirmed, and an empty field should not leave a dangling comma.

    The state is dropped when the city already contains it: the confirmed address is
    Saket / New Delhi / Delhi, which the old join rendered as "Saket, New Delhi,
    Delhi". Nobody writes their address that way, and on a page whose job is to look
    like a real firm it reads as a form that was filled in by a script.
  */
  const { line1, city, state, postalCode } = contact.address;
  const regionRedundant = !!state && !!city && city.toLowerCase().includes(state.toLowerCase());
  const addressLine = [
    line1,
    city,
    [regionRedundant ? "": state, postalCode].filter(Boolean).join(" "),
  ]
.filter(Boolean)
.join(", ");

  return (
    <footer className="relative mt-10 border-t border-border bg-card/30">
      <div className="container-page section !pb-10">
        {/* CTA band */}
        <div className="relative mb-16 overflow-hidden rounded-[2rem] border border-border bg-background p-8 md:p-14 bg-spotlight">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              {/* h2, not h3: this is the first heading of the footer landmark and it must
                  not skip a level from the page h1. On /404 and the certificate
                  states, <main> carries only an h1, so an h3 here produced an
                  h1 -> h3 jump on every one of those routes. */}
              {/*
                ONE WEIGHT, NO ACCENT (1 Oct 2026). This was a Sora 300 line
                with its last words in 800, over a navy-and-gold glow. Both are
                gone site-wide (src/index.css, `.font-thin-display` and
                `.bg-spotlight`) after Mehdi called the page "AI generated": a
                heading is one sentence in one weight, on a flat panel.

                The copy changed with it. "Let's build something worth talking
                about" is the studio-adjective register the brief rules out; the
                line below is the one /work and /pricing already close with, and
                it asks for the one thing a prospect can actually supply.
              */}
              <h2 className="text-display font-display font-semibold">
                Is your website doing its job?
              </h2>
              {/* 26 Sep 2026 (HOMEPAGE-COPY-DECK.md section 13): the footer on
                  every page offers the free website check, the small first step,
                  instead of "Start a project". */}
              <p className="mt-3 text-muted-foreground text-pretty">
                Send us your website address. We check it on a phone, the way your
                customer does, and tell you what we found in plain words. If it is fine, we say
                so. {contact.responseTimePromise}
              </p>
            </div>
            <CtaButton cta={{ label: "Get a free website check", href: "/contact", variant: "primary" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8 lg:grid-cols-12 lg:gap-x-8">
          {/* Brand + how to reach us */}
          <div className="col-span-2 lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3 rounded-xl transition-opacity hover:opacity-80 active:opacity-60">
              {/*
                THE MARK, NOT THE STACKED LOCKUP, AND THE NAME SET ONCE.

                This used to print public/ideovent.png, which already contains the
                words IDEOVENT and TECHNOLOGIES, immediately beside the text
                "Ideovent Technologies". The company name was therefore set twice
                in the same 200px: once in Sora at 20px and once, four pixels
                tall and unreadable, inside a 44px image. See the note in
                Navbar.tsx for the measurements and for the brand book's own
                minimum size for that file.

                Mark plus type IS the brand book's horizontal lockup, so this is
                the composition it prescribes rather than an improvisation.

                OPTICAL SIZING. The wordmark is Sora semibold at 20px, whose cap
                height is about 14px. The mark is set at 24px, i.e. 1.7x the cap,
                which is the ratio at which a geometric mark reads as the same
                weight as the type it sits beside rather than as a bullet in front
                of it. Matching the mark to the 20px FONT SIZE instead would make
                it 1.4x the cap and it would sit visibly light.

                The gap is 12px. LOGO-USAGE §3 sets clear space at 17.5% of the
                mark's width, which at 32px wide is 5.6px, so 12px clears it with
                room; the previous 10px was measured against a file that carried
                its own 15px of transparent canvas, i.e. the real gap was 25px.

                alt="" is correct: the wordmark next to it is the link's visible
                text.
              */}
              <img
                src={`${import.meta.env.BASE_URL}ideovent-mark.svg`}
                alt=""
                width={199}
                height={149}
                loading="lazy"
                decoding="async"
                /*
                  THE 1.5px IS THE OPTICAL CORRECTION, AND IT IS MEASURED.

                  `items-center` aligns the mark's box against the wordmark's
                  LINE BOX, and a line box reaches below the baseline to hold the
                  descender of the "g" in "Technologies". Its centre is therefore
                  below the centre of the capitals, which is the line a reader
                  actually sees the mark against.

                  Measured off a 3x screenshot of this lockup, scanning ink rows
                  per glyph: the mark's ink ran rows 66..137, centre 101.5, and
                  the "I" of Ideovent ran 76..119, so cap top 76, baseline 119,
                  cap centre 97.5. The mark was sitting 4 device pixels low at 3x,
                  i.e. 1.33 CSS pixels. Nudged up 1.5px, which is the nearest
                  value that renders crisply at 2x, the two centres agree to
                  within a sixth of a pixel.

                  Rounded up rather than down on purpose: the iV is widest at the
                  top and narrows to a 7-unit stem at the bottom, so its mass sits
                  above its bounding-box centre and its perceived centre is
                  slightly higher than the number above.
                */
                className="h-6 w-auto -translate-y-[1.5px] object-contain dark:brightness-0 dark:invert"
              />
              <span className="font-display text-xl font-semibold tracking-tight">{settings.siteName}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{navigation.footer.tagline}</p>

            <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href={contact.phoneHref}
                  className="inline-flex items-center gap-2 rounded-md py-0.5 transition-colors hover:text-foreground active:text-foreground/70"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {unbreakable(contact.phoneDisplay)}
                </a>
              </li>
              {email && (
                <li>
                  <a
                    href={email.href}
                    className="inline-flex items-center gap-2 rounded-md py-0.5 transition-colors hover:text-foreground active:text-foreground/70"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {email.display}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{addressLine}</span>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {socials.map((s) => {
                const Icon = getIcon(s.icon);
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={s.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground
                               transition-colors duration-200 hover:border-primary/60 hover:bg-muted hover:text-primary
                               active:bg-muted/70"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
);
              })}
            </div>
          </div>

          {footerServices.length > 0 && (
            <div className="lg:col-span-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">Services</h3>
              <ul className="mt-4 space-y-1">
                {[...footerServices.map((s) => ({ label: s.title, href: `/services/${s.slug}` })), { label: "All services", href: "/services" }].map((l) => (
                  <li key={l.href}>
                    <Link
                      to={l.href}
                      className="group inline-flex items-center gap-1 rounded-md py-1.5 text-sm text-muted-foreground
                                 transition-colors duration-200 hover:text-foreground active:text-foreground/70"
                    >
                      {l.label}
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {navigation.footer.columns.map((col) => (
            /* A plain <div>, not a <nav>: the audit measured exactly one nav
               landmark per page and four more in the footer would make a screen
               reader's landmark list four fifths footer. The <h3> already names
               each group. */
            <div key={col.heading} className="lg:col-span-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{col.heading}</h3>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    {/*
                      py-1.5 on the link, not margin on the <li>: WCAG 2.5.8 wants a
                      24×24 target and these measured 20px tall in the audit. The
                      padding is inside the link, so the box that grows is the one a
                      thumb actually has to hit. The visible text does not move.
                    */}
                    <Link
                      to={l.href}
                      className="group inline-flex items-center gap-1 rounded-md py-1.5 text-sm text-muted-foreground
                                 transition-colors duration-200 hover:text-foreground active:text-foreground/70"
                    >
                      {l.label}
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
))}
              </ul>
            </div>
))}
        </div>

        {/* THE /websites PAGES (2 Oct 2026), a plain row of links on every page,
            so each one has a link a crawler can follow from everywhere. Built
            from code (src/pages/websites/links.ts), not the CMS navigation, and
            a row rather than a fifth column: the 12-column grid above is full. */}
        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-baseline sm:gap-5">
          <h3 className="shrink-0 font-display text-sm font-semibold uppercase tracking-wider text-foreground">{WEBSITES_HEADING}</h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {WEBSITE_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="inline-flex items-center rounded-md py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground active:text-foreground/70"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {year} {settings.siteName}. All rights reserved.</p>
          <p>Built in {contact.address.line1}, {contact.address.city}.</p>
        </div>
      </div>
    </footer>
);
}

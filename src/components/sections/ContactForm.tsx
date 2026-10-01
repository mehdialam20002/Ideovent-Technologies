import { lazy, Suspense, type ComponentType } from "react";
import { Mail, Phone, MapPin, Clock, ArrowRight, MessageCircle } from "lucide-react";
import { useSingleton } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { unbreakable } from "@/lib/typography";
import { liveEmail } from "@/lib/mailbox";
import { whatsappToUs } from "@/components/lead/core";

/*
  THE CONTACT SECTION, 26 Sep 2026 (track site:leads).

  This file is the SHELL: the heading, the contact rows and the WhatsApp link,
  which render with the page. The form itself (fields, validation, delivery)
  is src/components/lead/ContactFormBody.tsx, fetched as a separate chunk.

  WHY. This section is on the home page, so everything this file imports is in
  the entry chunk that gates the first paint on every route, and the
  redesign's budget lets that chunk grow by 10 KB in total. The rebuilt form
  and its pipeline came to about 20 KB minified, all of it for a form at the
  foot of the page that nobody can reach in the first second. So the body is
  requested once the page has finished loading (or at once, if this section
  renders first, as it does on /contact) and the shell holds its place.

  LAYOUT. The h2 runs across the top on the gutter and the two columns sit
  under it, rather than the h2 sitting in the left column: the redesign's
  checklist forbids a paragraph that starts to the right of its heading's right
  edge, and every hint and error in the form column did.

  NO ENTRANCE MOTION on the form or the contact rows. A form that fades in is a
  form a fast scroller meets at opacity 0.4; below the fold only the section
  heading reveals.
*/

/**
 * If the chunk cannot be fetched (offline, or an old tab after a deploy has
 * replaced the file), React.lazy would throw and take the page down with it.
 * This is what renders instead: the two ways to reach us that need no form.
 */
function FormUnavailable() {
  const contact = useSingleton("contact");
  const wa = whatsappToUs(contact.whatsappNumber);
  return (
    <div role="status" className="max-w-xl rounded-[8px] bg-foreground/[0.05] p-5 text-[15px] leading-relaxed">
      The form did not load, so please reach us directly:{" "}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer noopener" className="font-medium underline underline-offset-4">
          WhatsApp
        </a>
      )}
      {contact.phoneHref && (
        <>
          {" or "}
          <a href={contact.phoneHref} className="font-medium underline underline-offset-4">
            {unbreakable(contact.phoneDisplay)}
          </a>
        </>
      )}
      .
    </div>
  );
}

type BodyModule = { default: ComponentType };
let bodyPromise: Promise<BodyModule> | null = null;
const loadBody = () =>
  (bodyPromise ??= import("@/components/lead/ContactFormBody").catch(() => ({ default: FormUnavailable })));
const ContactFormBody = lazy(loadBody);

// Fetch the body once the page has loaded, so it never competes with the
// hero for bandwidth but is there long before anybody scrolls to it.
if (typeof window !== "undefined") {
  const start = () => window.setTimeout(loadBody, 0);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

const linkClass =
  "group inline-flex min-h-11 items-center gap-1.5 rounded-[4px] text-[15px] font-medium text-foreground underline-offset-4 " +
  "transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function ContactForm({ sourcePage = "contact" }: { sourcePage?: string }) {
  const contact = useSingleton("contact");
  const wa = whatsappToUs(contact.whatsappNumber);
  const email = liveEmail(contact);

  const rows = [
    { icon: Phone, label: "Call or WhatsApp", value: unbreakable(contact.phoneDisplay), href: contact.phoneHref },
    // Shown only once contact@ideovent.in has a mailbox (src/lib/mailbox.ts).
    ...(email ? [{ icon: Mail, label: "Email", value: email.display, href: email.href }] : []),
    // Area only: FACTS.md has no confirmed street address or postal code.
    { icon: MapPin, label: "Where", value: [contact.address.line1, contact.address.city].filter(Boolean).join(", ") },
    { icon: Clock, label: "Hours", value: contact.businessHours },
  ];

  return (
    // `.section-loud`: the last section on the home page and on /contact, the
    // one the whole page is pointed at.
    <section id="contact" data-source={sourcePage} className="section-loud">
      <div className="container-page">
        <SectionHeading
          align="left"
          eyebrow="Free website check"
          // One sentence pair in one colour (1 Oct 2026): a dark first half
          // with a greyed second half is the two-tone headline habit the
          // repair took off the rest of the site.
          title="Send us your website address. We will tell you what your customers see."
          subtitle={contact.responseTimePromise}
        />
        {/* No urgency on the page. The admission-calendar line was true only
            for schools, so it went (HOMEPAGE-COPY-DECK-V2.md A12). This line
            lowers the risk of the first step instead. */}
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground text-pretty">
          The check is free, and there is nothing to sign. No website yet? Send your business name.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          {/* Contact rows. Plain rows on the ground, not four cards. */}
          <div>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.label} className="flex items-center gap-4 py-4 first:pt-0">
                  <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block text-[13px] text-muted-foreground">{row.label}</span>
                    {row.href ? (
                      <a
                        href={row.href}
                        className="inline-flex min-h-6 items-center text-[15px] font-medium underline-offset-4 transition-colors duration-150 hover:underline"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="block text-[15px] font-medium">{row.value}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer noopener" className={`${linkClass} mt-6`}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Rather send it on WhatsApp? Message us
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            )}
          </div>

          <div>
            {/* The placeholder holds roughly the form's height, so the page
                below does not jump when the body arrives. */}
            <Suspense fallback={<div aria-hidden="true" className="min-h-[1060px] sm:min-h-[820px] lg:min-h-[745px]" />}>
              <ContactFormBody />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

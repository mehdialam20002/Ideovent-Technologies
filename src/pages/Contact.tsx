import { useEffect, useRef, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import ContactForm from "@/components/sections/ContactForm";
import FaqSection from "@/components/sections/FaqSection";
import { cn } from "@/lib/utils";
import { PAGE_SEO } from "@/lib/seo/pages";

/*
  A CROSS-ORIGIN IFRAME CANNOT SHOW A FOCUS RING BY ITSELF, AND IT IS A TAB STOP.

  The map on this page is a real stop in the tab order (24 of 34 at 375px,
  30 of 44 at 1440px). Measured with the frame focused, it had no indicator of
  any kind: outline-style "none", box-shadow "none". Three things were tried,
  in this order, and the first two do not work:

    `iframe:focus-visible`   Chrome never matches :focus-visible on an iframe.
                             Logged directly: with document.activeElement ===
                             the frame, matches(":focus-visible") is false and
                             matches(":focus") is false too.
    `:focus-within` wrapper  Matches when the frame is focused with .focus(),
                             and NOT when a visitor tabs to it. Confirmed by
                             tabbing to the frame and reading the wrapper:
                             :focus-within false, box-shadow none.

  What actually happens on that Tab, instrumented with listeners on the frame,
  on the document (capture) and on the window: exactly ONE event fires, `blur`
  on the WINDOW, and document.activeElement becomes the frame. No focus,
  focusin, focusout or blur reaches the element or the document, because focus
  has crossed into a browsing context this page cannot see into.

  So the state is tracked in JavaScript from the one signal there is. It is not
  a nicety: the next Tab after this one goes inside Google's page, and this is
  the last frame in which we can tell a keyboard user where they are.
*/
function useIframeFocus(ref: React.RefObject<HTMLIFrameElement>) {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const onWindowBlur = () => setFocused(document.activeElement === ref.current);
    // Focus coming back into this document, by Tab, by click or by the window
    // regaining focus, always clears it.
    const onReturn = () => setFocused(false);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onReturn);
    document.addEventListener("focusin", onReturn);
    return () => {
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("focusin", onReturn);
    };
  }, [ref]);
  return focused;
}

export default function Contact() {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const mapFocused = useIframeFocus(mapRef);
  const contact = useSingleton("contact");

  return (
    <Layout>
      {/* Title and description: src/lib/seo/pages.ts (PAGE_SEO["/contact"]). The
          description leads with WhatsApp and the phone number. contact@ideovent.in
          has been a working mailbox since 1 Oct 2026 (Zoho Mail, src/lib/mailbox.ts),
          and the contact block in ContactForm prints it as a mailto: link. */}
      <Seo
        path="/contact"
        breadcrumbs={[{ name: "Contact", path: "/contact" }]}
        schema={{ "@type": "ContactPage", name: "Contact Ideovent Technologies" }}
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        {/* Left-aligned on the .container-page gutter, like the h1 on /work,
            /about and /services. A centred hero over a centred section over a
            centred grid is the shape _assets/DESIGN-DIRECTION.md describes as
            the tell, and this page had three of them in a row. */}
        <div className="container-page relative">
          {/* The h1 in search words where the eyebrow pill was; the display line
              is a paragraph, so the page has one h1. No entrance motion above
              the fold (SEO audit, 1 Oct 2026). */}
          <h1 className="max-w-3xl font-display text-base font-semibold text-primary text-balance md:text-lg">
            {PAGE_SEO["/contact"].h1}
          </h1>
          {/* Deliberately not "Tell us what is not working": that is the
              heading on the footer CTA band, which renders on this page too.
              Same request, said once at 96px and once at 40px would read as
              a template repeating itself. */}
          <p className="mt-5 max-w-4xl text-hero font-display font-semibold">
            Start with the{" "}
            <span className="accent-italic text-gradient">problem</span>
          </p>

          <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
            <p className="text-lg text-foreground/85 text-pretty">
              That is a better first message than a brief.{" "}
              {contact.responseTimePromise || "We reply to new enquiries within two working days."}
            </p>
            <p className="text-base text-muted-foreground text-pretty">
              Nobody will put a call in your calendar, and there is no sequence of follow-up
              emails behind this form. If the answer turns out to be that you do not need us, or
              that somebody else is a better fit, we will say so in the reply.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Contact form + NAP cards */}
      <ContactForm sourcePage="contact" />

      {/* 3. Map.
             `.section-tight pt-0`: the contact form above it is `.section-loud`
             and this is a locator, not a section in its own right.

             THE COPY HERE WAS A CLAIM WE CANNOT SUPPORT. It read "Come say
             hello" over "Drop by our office, or reach out, whatever's easiest
             for you", and the embed is a pin on the Saket area rather than on
             a street address: _assets/FACTS.md records the address as "Saket,
             New Delhi" with no confirmed premises and no postal code
             (`contact.address.postalCode` is deliberately blank for that
             reason). Inviting somebody to drop by an office we have not told
             them how to find is the sort of small untruth a prospect finds out
             about by standing in the wrong street.

             Weight contrast, not a serif accent: this page's one accent is the
             h1. */}
      {contact.mapEmbedUrl && (
        <section className="section-tight pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Where we are"
              title={
                <>
                  Saket, <span className="font-loud-display">New Delhi</span>
                </>
              }
              subtitle="We work from Saket and across Delhi NCR, and we are happy to come to you for a first meeting inside Delhi. Ask before you travel to us: the pin below is the area, not a reception desk."
              className="max-w-3xl"
            />
            <Reveal className="mt-10">
              {/* The ring is driven from JS: see useIframeFocus above. */}
              <div
                className={cn(
                  "rounded-3xl ring-offset-background transition-shadow duration-200",
                  mapFocused && "ring-2 ring-ring ring-offset-2"
                )}
              >
                <iframe
                  ref={mapRef}
                  src={contact.mapEmbedUrl}
                  title="Saket, New Delhi, on a map"
                  className="block w-full h-[380px] rounded-3xl border border-border"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>
        </section>
)}

      {/* 4. FAQ (self-hides when empty) */}
      <FaqSection category="general" heading={true} />
    </Layout>
);
}

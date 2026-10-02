import { AlertTriangle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/motion/Reveal";
import { useDeferredBodies, useSingleton } from "@/lib/cms/context";
import { sanitizeRich } from "@/lib/sanitize";
import type { LegalKind } from "@/lib/cms/types";
import { legalSeo } from "@/lib/seo/pages";
import { liveEmail, whatsappInstead } from "@/lib/mailbox";

/** Route path for each legal document. Keep in sync with App.tsx and public/_redirects. */
const PATHS: Record<LegalKind, string> = {
  privacy: "/privacy",
  terms: "/terms",
  refund: "/refund",
  disclaimer: "/disclaimer",
};

/** One-line description for the page's meta description. */
const BLURBS: Record<LegalKind, string> = {
  privacy:
    "How Ideovent Technologies collects, uses and protects personal data under India’s DPDP Act, the GDPR and the UK GDPR, including your rights and our Grievance Officer.",
  terms:
    "The terms on which the Ideovent Technologies website is offered: acceptable use, intellectual property, liability and governing law.",
  refund:
    "When an advance is refundable, what cancellation costs, how pro-rata is calculated and how long a refund takes at Ideovent Technologies.",
  disclaimer:
    "What Ideovent Technologies does not promise: no guaranteed business results, no guaranteed search rankings, and the limits of third-party dependencies.",
};

/**
 * Static legal pages rendered from CMS HTML.
 *
 * The bodies are generated from the canonical Markdown in 03-legal-docs/policies/
 * by `node scripts/build-legal.mjs`. Blanks the business has not yet decided are
 * left in the text as `[[TOKEN]]` inside a <mark>, and this page shows a draft
 * notice for as long as any of them (or the effective date) is missing. The
 * notice disappears on its own the moment the last blank is filled.
 */
export default function Legal({ kind }: { kind: LegalKind }) {
  // The four policy bodies are ~54 KB of HTML and are not in the entry chunk.
  // This asks for them; `bodiesReady` is false only for the moment between mount
  // and the chunk landing, and it is what the skeleton below waits on.
  const bodiesReady = useDeferredBodies();
  const legal = useSingleton("legal");
  const contact = useSingleton("contact");
  // No email until contact@ideovent.in has a mailbox (src/lib/mailbox.ts).
  const email = liveEmail(contact);
  const whatsapp = whatsappInstead(contact.whatsappNumber, "Hi Ideovent, I have a question about one of your policies.");
  const doc = legal[kind];
  const path = PATHS[kind];

  const blanks = doc.body.match(/\[\[[A-Z_0-9]+\]\]/g) ?? [];
  const isDraft = blanks.length > 0 || !doc.updatedAt;
  const awaitingBody = !doc.body && !bodiesReady;

  return (
    <Layout>
      {/* Policy pages must stay indexable: a payment gateway, a school's procurement
          team and a GDPR enquiry all expect to find them from a search. They were
          previously noindex, which is why nothing external could ever link to them.
          A draft page is the one exception. It should not be indexed while it is
          still full of blanks. */}
      {/* "Privacy Policy: How Ideovent Technologies Handles Your Data" and the description: legalSeo(), the same
          helper the build uses for this page's prerendered head. */}
      <Seo
        title={legalSeo(kind, doc.title).title}
        fullTitle
        description={legalSeo(kind, doc.title).description}
        path={path}
        noindex={isDraft}
        breadcrumbs={[{ name: doc.title, path }]}
      />

      <section className="section">
        <div className="container-page">
          {/* amount={0} is load-bearing, not a tweak. Reveal defaults to
              amount=0.2, i.e. "fire once 20% of this element is on screen".
              A full privacy policy is ~9,500px tall, so 20% of it is ~1,900px, 
              more than any viewport ever shows at once. The IntersectionObserver
              therefore never fires and the element stays at opacity 0 FOREVER:
              the whole page renders blank. Measured on /privacy at 1440x900
              before this fix (computed opacity "0" on a 9,560px article).
              With 0 it reveals as soon as any pixel is visible. */}
          <Reveal amount={0}>
            <article className="mx-auto max-w-3xl">
              <header className="mb-10 text-center">
                <h1 className="text-display font-display text-foreground">{doc.title}</h1>
                {doc.updatedAt ? (
                  <p className="mt-4 text-sm text-muted-foreground">Last updated {doc.updatedAt}</p>
): null}
              </header>

              {/* Held back until the body is here: the blank count is read out of the
                  text, so showing the note early would announce "0 values" and then
                  correct itself. */}
              {/* --warning, not a hard-coded amber-500. amber-500 #F59E0B measures
                  2.15:1 on the light page ground, so the icon and the rule failed
                  the 3:1 non-text floor in exactly the theme where this banner has
                  to be noticed. --warning is #8E5E0B (5.34:1) in light and #FBBF4E
                  (10.64:1) in dark, and it tracks the palette. */}
              {!awaitingBody && isDraft && (
                <div
                  role="note"
                  className="mb-10 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm leading-relaxed text-foreground/90"
                >
                  <p className="flex items-start gap-3 font-semibold text-foreground">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                    <span>Draft. This policy is not yet in force.</span>
                  </p>
                  <p className="mt-3">
                    {blanks.length > 0 ? (
                      <>
                        {blanks.length} value{blanks.length === 1 ? "": "s"} below{" "}
                        {blanks.length === 1 ? "is": "are"} still to be confirmed. They are
                        highlighted in the text as <code>[[LIKE_THIS]]</code>.{" "}
                      </>
): null}
                    {!doc.updatedAt ? "No effective date has been set. ": null}
                    This document has also not been reviewed by a qualified advocate. Until both are
                    done it is published for reference only and does not create obligations on
                    either side.
                  </p>
                  <p className="mt-3">
                    If you need a position on anything here before then,{" "}
                    {email ? (
                      <>
                        email{" "}
                        <a className="text-primary underline underline-offset-4" href={email.href}>
                          {email.display}
                        </a>
                      </>
                    ) : (
                      <>
                        message us on WhatsApp at{" "}
                        <a
                          className="whitespace-nowrap text-primary underline underline-offset-4"
                          href={whatsapp || contact.phoneHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {contact.phoneDisplay}
                        </a>
                      </>
                    )}
                    .
                  </p>
                </div>
)}

              {awaitingBody ? (
                /* The policy text is a separate chunk (see useDeferredBodies above).
                   aria-busy + a polite live region means a screen reader is told the
                   document is arriving rather than being handed an empty <article>;
                   the bars are aria-hidden because they say nothing. */
                /* min-h: the skeleton holds roughly the policy's own height, so the
                   footer does not jump down a whole page when the text lands. That
                   jump measured CLS 0.31 to 0.38 on /privacy (SEO audit, 1 Oct 2026;
                   0.1 is the limit Google calls good). The shortest policy is about
                   two and a half phone screens long. */
                <div aria-busy="true" aria-live="polite" className="min-h-[250vh] md:min-h-[180vh]">
                  <p className="sr-only">Loading the policy text.</p>
                  <div aria-hidden="true" className="space-y-3">
                    {[
                      "w-1/3", "w-full", "w-full", "w-11/12", "w-2/5", "w-full", "w-full", "w-10/12",
                    ].map((w, i) => (
                      <div
                        key={i}
                        className={`h-4 rounded bg-muted ${w} ${i === 0 || i === 4 ? "mt-8 h-6": ""}`}
                      />
))}
                  </div>
                </div>
): (
              <div
                className="legal-prose max-w-3xl text-foreground/90 leading-relaxed [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeRich(doc.body) }}
              />
)}
            </article>
          </Reveal>
        </div>
      </section>
    </Layout>
);
}

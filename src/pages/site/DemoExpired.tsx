import { Helmet } from "react-helmet-async";
import { MessageCircle } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import {
  IDEOVENT_EMAIL,
  IDEOVENT_PHONE_DISPLAY,
  IDEOVENT_PHONE_HREF,
  IDEOVENT_WHATSAPP,
} from "@/lib/pitch/helpers";

/**
 * What a demo shows after its `expiresAt` date.
 *
 * WHY THIS IS NOT A 404, WHEN A DRAFT AND A CLOSED DEMO BOTH ARE.
 * A draft and a closed demo are addresses a stranger may be guessing at, so
 * neither may admit that anything was ever there. An EXPIRED demo is different
 * in one decisive way: the only person who has this link is the person Mehdi
 * gave it to. They were sent it, they kept it, and they are opening it a month
 * later, which is a good sign rather than a bad one. Showing them the site's
 * ordinary 404 at that exact moment reads as "the firm has folded", and the
 * conversation ends on a dead link instead of on a reply.
 *
 * So this says the true thing in one sentence and hands them a way to reach
 * him. It gives nothing away that the reader does not already know, because
 * the reader is the one who was sent the link.
 *
 * WHAT IT DOES NOT DO. It does not show any of the institute's content, does
 * not apologise at length, and does not offer to "restore" anything. The demo
 * is expired because somebody decided it should be; the way back is a
 * conversation, which is the point of the whole exercise.
 */
export default function DemoExpired({ site }: { site: DemoSite }) {
  const text =
    `Namaste Ideovent team. ${site.instituteName}. ` +
    `Jo website link aapne bheja tha wo ab expire ho gaya hai. Dobara dekh sakte hain?`;
  const wa = `https://wa.me/${IDEOVENT_WHATSAPP}?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Helmet>
        <title>{site.instituteName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="flex flex-1 items-center py-16">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Ideovent Technologies
            </p>
            <h1 className="mt-4 font-display text-3xl font-light leading-tight sm:text-4xl">
              This demonstration site for{" "}
              <span className="font-extrabold">{site.instituteName}</span> has expired.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
              It was a working example built to show what the institute&rsquo;s website could
              be. The link has been taken down. If you would like to see it again, or pick up
              where the conversation left off, one message is enough.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Message Mehdi on WhatsApp
              </a>
              <a
                href={IDEOVENT_PHONE_HREF}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/50"
              >
                {IDEOVENT_PHONE_DISPLAY}
              </a>
            </div>

            <p className="mt-6 text-[13px] text-muted-foreground">{IDEOVENT_EMAIL}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

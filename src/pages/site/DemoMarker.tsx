import { ExternalLink, MessageCircle } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import { useSingleton } from "@/lib/cms/context";
import { IDEOVENT_EMAIL, IDEOVENT_PHONE_DISPLAY, IDEOVENT_WHATSAPP } from "@/lib/pitch/helpers";
import { demoPlace } from "@/lib/demo/record";
import { useDemoLang } from "@/lib/demo/language";
import { markerCopy } from "@/lib/demo/copy/marker";

/**
 * THE MARKER THAT GOES ON EVERY DEMO, AND IT IS DOING TWO JOBS AT ONCE.
 *
 * JOB ONE, THE HONEST ONE. Nobody may mistake this page for the institute's
 * live website. It carries their name in the masthead, their city in the
 * footer and, if they gave us one, a photograph of their own building. That
 * is the whole idea and it is also exactly why an unmarked version would be a
 * problem: a parent who finds it through a forwarded link, reads an admission
 * date off it and turns up on the wrong day was misled by us. So the marker
 * says, in a sentence and not in small print, what this is and where the real
 * site is.
 *
 * JOB TWO, THE COMMERCIAL ONE. THE CREDIT IS THE PITCH. This is not a
 * disclaimer Mehdi is obliged to bolt on. It is the only place on the page
 * where Ideovent speaks, and it is the reason the page was built: the director
 * scrolls their own beautiful website, reaches the bottom, and finds out who
 * made it and how to reach him. So it is designed rather than apologised for.
 *
 * HOW THOSE TWO ARE RECONCILED, BECAUSE THEY PULL AGAINST EACH OTHER. A
 * warning banner across the top would do job one and destroy job two: the
 * first thing the director sees would be a grey strip saying "this is not
 * real", and the four seconds the page has are spent on our caveat instead of
 * on their name. A tasteful footer credit alone would do job two and fail job
 * one, because a page can be forwarded and a footer can be missed.
 *
 * So there are two pieces, and this component is the one at the END of the
 * page: a proper section, set in Ideovent's own voice, which is the first
 * moment on the whole page where the institute is not the speaker. The other
 * piece is a single quiet line the template puts at the very top, above the
 * masthead: `DemoRibbon` below. One sentence, small, always there, never
 * covering anything. Between them, nobody can read this page and come away
 * thinking it is the institute's live site, and nobody can reach the end
 * without learning who built it.
 *
 * NOTHING IN HERE IS INVENTED. The phone number, the email and the firm's name
 * come from src/lib/pitch/helpers.ts, which reads _assets/FACTS.md. The
 * institute's own website is whatever Mehdi typed into `officialWebsite`, and
 * when that is empty this says so instead of guessing at a domain.
 */

/**
 * The prefilled WhatsApp opener, written from the DIRECTOR'S side.
 *
 * Not `pitchWhatsappHref`. That one says "aapka page dekha", which is right
 * for a pitch page, where the thing they have just read is a page ABOUT them.
 * Here the thing they have just read is their own website, so the sentence
 * that actually gets sent is a different sentence. The number and the
 * Hinglish register are shared; the words are not.
 *
 * It names the institute and the place so that the message landing on Mehdi's
 * phone identifies the sender before he opens it, and so the director does not
 * have to type anything on a phone keyboard to start the conversation. That
 * second part is the whole reason WhatsApp beats a form here.
 */
function demoWhatsappHref(site: DemoSite, opener: (institute: string, place: string) => string): string {
  const place = demoPlace({ city: site.city, state: site.state, country: site.country });
  const where = place ? `, ${place}` : "";
  return `https://wa.me/${IDEOVENT_WHATSAPP}?text=${encodeURIComponent(opener(site.instituteName, where))}`;
}

/**
 * ONE BAR, AND ONLY ONE.
 *
 * The earlier build stacked a second full-width strip under this one on the
 * example records, saying that the record was an example, which cost roughly
 * ninety pixels of our own chrome above the institute's masthead and pushed
 * their site below the fold on a phone. That sentence is now ONE CLAUSE of
 * this bar, on the example records only, and the second strip is gone. DAIS
 * runs a single admissions strip and Crimson a single announcement bar; this
 * is the same object. Not sticky: it scrolls away and never covers anything.
 * At most 44px at desktop and two lines, about 60px, at 390px.
 */
export function DemoRibbon({ site }: { site: DemoSite }) {
  /* The ribbon follows the reader's choice for one plain reason: a director
     who has just switched the whole page to Hindi and finds the one line above
     the masthead still in English reads that as the translation having run
     out. `useDemoLang` reports "en" on any record that does not offer the
     control, so this needs no market check of its own. */
  const m = markerCopy(useDemoLang(site));
  const link = (extra: string) => (
    <a
      href="#built-by-ideovent"
      className={
        "text-[#C8A951] underline decoration-[#C8A951]/40 underline-offset-4 hover:decoration-[#C8A951] " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A951] " +
        extra
      }
    >
      {m.ribbonLink}
    </a>
  );
  return (
    <div className="bg-[#081738] text-white/75">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-5 gap-y-0.5 py-[6px] text-[11.5px] leading-[1.35] sm:text-[12px] sm:leading-[1.3] xl:py-2.5 xl:text-[12.5px]">
        <p className="min-w-0">
          {m.ribbonBefore}
          <span className="font-medium text-white">{m.ribbonBuiltBy}</span>
          {m.ribbonFor}
          <span className="font-medium text-white">{site.instituteName}</span>
          {m.ribbonAfter}
          {/* THE EXAMPLE CLAUSE RIDES INSIDE THE SENTENCE FROM 1024px UP, where
              the whole strip fits in one line. Below that it is dropped and the
              link runs on inline, so the strip measures about 43px at 375 and
              768 rather than the four lines (75px) it took with the clause and
              a wrapped link. On a phone the "Example figures" tag on every
              section that carries a number and the closing footer note still
              label the page; this bar only has to say whose it is and whose
              it is not. Both templates render THIS component, so the two demos
              a director opens on the same afternoon carry the same bar. */}
          {site.isExample && <span className="hidden text-white/60 lg:inline"> {m.exampleClause}</span>}
          {" "}
          {link("xl:hidden")}
        </p>
        {link("hidden shrink-0 xl:inline")}
      </div>
    </div>
  );
}

export function DemoMarker({ site }: { site: DemoSite }) {
  const m = markerCopy(useDemoLang(site));
  /* Generated from the record rather than stored, so a demo cannot carry an
     opener that has drifted from the name in its own masthead. The message
     itself follows the reader's language, because the director is the one
     pressing the button and it lands on Mehdi's phone either way. */
  const wa = demoWhatsappHref(site, m.openerFor);
  const official = (site.officialWebsite || "").trim();
  /* The firm's own address, from the one place every canonical URL on the
     site is built from, so a preview deploy links to itself rather than to
     production. */
  const settings = useSingleton("settings");
  const ideoventHome = (settings?.defaultSeo?.canonicalHost || "").replace(/\/$/, "") || "/";

  return (
    <section
      id="built-by-ideovent"
      /*
        Deliberately NOT inside the institute's own palette scope. This band is
        Ideovent speaking, in Ideovent's navy, and the visual break is the
        point: everything above it belongs to the institute and this does not.
      */
      className="bg-[#081738] py-14 text-white sm:py-16"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A951]">
            {m.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-2xl font-light leading-tight sm:text-3xl">
            {m.titleBefore}
            <span className="font-extrabold">{m.titleFirm}</span>
            {m.titleFor(site.instituteName)}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            {m.body(site.instituteName)}
          </p>
          {official ? (
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              {m.officialLead}
              <a
                href={official}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                {official.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              .
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#C8A951] px-5 py-2.5 text-sm font-semibold text-[#081738] transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {m.talkToMehdi}
            </a>
            <a
              href={ideoventHome}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/50"
            >
              {m.seeMore}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <p className="mt-5 text-[13px] text-white/55">
            Ideovent Technologies · {IDEOVENT_PHONE_DISPLAY} · {IDEOVENT_EMAIL}
          </p>
        </div>
      </div>
    </section>
  );
}

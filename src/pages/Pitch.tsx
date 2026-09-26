import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useCms, useCollection } from "@/lib/cms/context";
import { pitchMarket, resolvePitchPage } from "@/lib/pitch/record";
import NotFound from "./NotFound";
import PitchIndia from "./pitch/PitchIndia";
import PitchInternational from "./pitch/PitchInternational";

/**
 * The pitch-page router.
 *
 * Takes a slug off the URL, finds the record in the CMS, and hands it to the
 * page that owns that market. Nothing here knows anything about how a pitch
 * looks: this file exists so there is exactly one place that decides which
 * page renders, and so adding a market is one branch rather than a new route.
 *
 * THREE THINGS ARE DECIDED HERE AND NOWHERE ELSE.
 *
 * 1. WHAT RESOLVES. `resolvePitchPage` returns null for an unknown slug and
 *    for a record that is not `live`, so a draft and an archived page both
 *    render the ordinary 404. That is not a nicety: a pitch still being
 *    written must not be readable by anyone who guesses the institute's name,
 *    and an archived one has to stop working when the offer stops standing.
 *    Neither may hint that something exists at that address.
 *
 * 2. THAT IT IS SAFE ON THE BARE `/:slug`. React Router ranks a static segment
 *    above a dynamic one, so /about, /work, /pricing and every other real
 *    route still win their own address, and this only ever sees something that
 *    matched nothing else. An address that is neither a page nor an institute
 *    is a 404 exactly as it was before. The other half of that guarantee is in
 *    the admin: `pitchSlugIssue` refuses a slug that collides with a real
 *    route, reading the route table out of App.tsx rather than a list somebody
 *    has to remember to update.
 *
 * 3. NOINDEX, ON EVERY PITCH PAGE, WHATEVER THE DESIGN DOES. Each design sets
 *    it through <Seo> as well, and should. This is the belt under those
 *    braces: a pitch page names a real institute and a real person and quotes
 *    them a price. It is sent to them; it is not published to the web. One
 *    design forgetting the flag must not be able to put a prospect's proposal
 *    into a competitor's search results. It is rendered BELOW the design's own
 *    <Seo> for that reason, because react-helmet-async lets the later
 *    declaration of a tag win.
 *
 *    WHAT THIS TAG CANNOT DO, AND WHERE THE REST OF IT LIVES. The meta tag is
 *    written by JavaScript. A crawler that renders the page sees it; a crawler
 *    that only reads the served HTML sees index.html, which carries no robots
 *    directive at all. So `vercel.json` also sends `X-Robots-Tag: noindex,
 *    nofollow` as a real HTTP header on `/pitch/*`, which needs no JavaScript
 *    and is the version a non-rendering crawler obeys. That header cannot
 *    cover the bare `/:slug` form, because a static rule cannot tell an
 *    institute's slug from a real route. Two consequences worth knowing:
 *    prefer the `/pitch/<slug>` address when a link may be forwarded, and do
 *    not link a pitch page from anywhere crawlable. Nothing puts these in the
 *    sitemap, and scripts/generate-sitemap.mjs says not to add them.
 */
export default function Pitch() {
  const { slug } = useParams<{ slug: string }>();
  const { loading } = useCms();
  const pages = useCollection("pitchPages");
  const page = resolvePitchPage(slug, pages);

  /*
    NOT FOUND ONLY ONCE THE STORE HAS ANSWERED. ContentProvider renders the seed
    first and swaps in the live rows when the store's load() resolves. With
    Supabase on, a pitch page written in /admin exists only in those rows, so
    during that gap every real pitch looked like an unknown slug and flashed
    "page not found" at the director it was sent to (and at any crawler that
    snapshots early). A blank page in the background colour for a few hundred
    milliseconds says nothing either way, which is the point. noindex goes out
    here too, so an early snapshot of the placeholder is not indexable.
  */
  if (!page && loading) {
    return (
      <>
        <div className="min-h-screen bg-background" aria-busy="true" />
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      </>
    );
  }
  if (!page) return <NotFound />;

  const design =
    pitchMarket(page) === "india" ? <PitchIndia page={page} /> : <PitchInternational page={page} />;

  return (
    <>
      {design}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    </>
  );
}

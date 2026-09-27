import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useCms, useCollection } from "@/lib/cms/context";
import { resolveDemoSite } from "@/lib/demo/record";
import { isTemplateSlug } from "@/lib/demo/templates/ids";
import { recordDemoOpen } from "@/lib/demo/opens";
import NotFound from "./NotFound";
import DemoExpired from "./site/DemoExpired";
import DemoSiteView from "./site/DemoSiteView";

/**
 * The demo-site router, at /site/:slug and every subpage under it
 * (/site/:slug/*: /admissions, /courses/<course>, ...). Which page renders is
 * decided by ./site/DemoSiteView and the page registry; this file decides
 * only whether the RECORD is reachable, exactly as before.
 *
 * Takes a slug off the URL, finds the record, and decides one of three things:
 * render the institute's site, render the expired card, or render the ordinary
 * 404. Nothing here knows what a demo looks like. This file exists so that
 * exactly one place decides what is reachable, and so that adding the second
 * template is a branch rather than a second route.
 *
 * FOUR THINGS ARE DECIDED HERE AND NOWHERE ELSE.
 *
 * 1. WHAT RESOLVES. `resolveDemoSite` returns "missing" for an unknown slug
 *    AND for any record that is not `sent`, so a free slot, a draft and a
 *    closed demo all render the site's ordinary 404, indistinguishable from an
 *    address that never existed. A demo still being built must not be readable
 *    by somebody who guesses the institute's name, a closed one has to stop
 *    working, and neither may hint that a page exists here, because "not
 *    published yet" told to the wrong reader is itself information. Mehdi sees
 *    his own drafts at /admin/preview/site/<slug>, behind the login.
 *
 *    Expiry is the deliberate exception and the reasoning is in
 *    ./site/DemoExpired.tsx: the only person holding that link is the person
 *    it was given to.
 *
 * 2. A SEPARATE NAMESPACE FROM THE PITCH PAGES. Pitch pages took the bare
 *    /<slug>, because ideovent.in/their-own-name is half of that pitch. A
 *    demo is the institute's own website and sits one segment down, at
 *    /site/<slug>, so the two can never collide at the router and a link is
 *    unambiguous about which of the two Mehdi has just pasted. Declaring this
 *    route also reserves "site" against every future pitch slug for free,
 *    because src/lib/pitch/reservedRoutes.ts parses the real route table out
 *    of App.tsx rather than reading a list somebody has to remember to update.
 *
 * 3. NOINDEX, ON EVERY DEMO, WHATEVER THE TEMPLATE DOES. ONE INDEXED DEMO
 *    TELLS EVERY OTHER PROSPECT WHAT THEY ARE BEING GIVEN. A director who
 *    searches the firm's name and finds four other institutes' "own websites"
 *    learns in one second that theirs was not made for them, and the whole
 *    mechanism is gone. Worse, a school's name attached to a site they never
 *    commissioned, sitting in Google, is a problem for THEM.
 *
 *    Each template sets it too, and should. This is the belt under those
 *    braces, rendered BELOW the template so that react-helmet-async's
 *    last-declaration-wins gives it the final word.
 *
 *    WHAT THE TAG CANNOT DO. It is written by JavaScript, so a crawler that
 *    does not render sees index.html, which carries no robots directive. That
 *    is why vercel.json also sends `X-Robots-Tag: noindex, nofollow` as a real
 *    HTTP header on `/site/*`. Unlike the pitch pages' bare /<slug>, a demo's
 *    address is a fixed prefix, so the header covers ALL of them and there is
 *    no second, weaker form to warn anybody about. Nothing puts a demo in the
 *    sitemap and nothing on the site links to one.
 *
 * 4. THE OPEN IS RECORDED HERE, AND ONLY WHEN THE SITE ACTUALLY RENDERS. Not
 *    on a 404, because an unknown slug is not an open, and not on the expired
 *    card, because that is a dead link rather than a reading. The write is
 *    fire and forget and cannot fail visibly: see src/lib/demo/opens.ts, which
 *    also explains why it does not go through the store.
 */
export default function DemoSiteRoute() {
  const { slug, "*": rest } = useParams<{ slug: string; "*": string }>();
  const sites = useCollection("demoSites");
  /*
    `loading` is why the effect below is gated. ContentProvider renders the
    seed first and replaces it once the store answers, so on a Supabase deploy
    the first pass has no real records and `resolveDemoSite` correctly returns
    "missing" for a real slug. Recording an open off that pass would be a miss;
    rendering the 404 for one frame is only a flicker, and the 404 itself is
    what a genuinely unknown slug should show once loading is done.
  */
  const { loading, data } = useCms();
  const alertsEnabled = data.settings?.demoOpenAlerts;
  /*
    A TEMPLATE IS NEVER SERVED HERE. Templates are code, not records, so there
    is no document for this lookup to find; this line makes it explicit and
    keeps it true if one is ever put in the collection by hand. A template's id
    and its preview slug both resolve to the ordinary 404, indistinguishable
    from an address that never existed. The admin refuses these names for a
    real demo (src/lib/demo/reservedRoutes.ts), so nothing real is hidden.
    Templates render only at /admin/preview/template/:id, behind the login.
    ./templates/ids is a list of ten strings; the registry is never imported
    by this route.
  */
  const refused = isTemplateSlug(slug);
  const { site, reachability } = refused
    ? { site: null, reachability: "missing" as const }
    : resolveDemoSite(slug, sites);

  const trackedId = reachability === "ok" && site ? site.id : null;
  useEffect(() => {
    if (loading || !trackedId || !site) return;
    // The alert context rides along; opens.ts decides whether to e-mail.
    void recordDemoOpen(trackedId, {
      site: { id: site.id, slug: site.slug, status: site.status, instituteName: site.instituteName, city: site.city },
      enabled: alertsEnabled,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, trackedId]);

  if (loading && !site) {
    /*
      A blank screen rather than the 404 while the store is still answering.
      The alternative is showing an institute the words "page not found" for
      half a second on a page that is supposed to be their own website, which
      is the one frame they will remember.
    */
    return <div className="min-h-screen bg-background" />;
  }

  if (reachability === "missing" || !site) return <NotFound />;
  if (reachability === "expired") return <DemoExpired site={site} />;

  /*
    WHICH TEMPLATE. `kind` is the only thing that decides it, and it is asked
    for in the admin rather than defaulted, because neither answer is safe for
    the other: a page that talks about annual day and the principal's message
    to a JEE director has stopped being about them, and one that leads with
    last year's ranks to a nursery school has never been about them.

    Both templates are live. There is no stand-in left and there is no
    default branch either: `kind` is required on the record, so the ternary
    covers the union exactly and a third kind would be a type error here
    rather than a blank page for a director.

    Each template renders its own demo ribbon and marker from
    ./site/DemoMarker. That is one thing a template CAN forget, so it is the
    first thing to check when a new one lands: a real school's name on the
    internet with nothing saying who built the page, or that the school has
    never seen it, is the one failure this feature cannot have.
  */
  const template = <DemoSiteView site={site} basePath={`/site/${slug}`} rest={rest || ""} />;

  return (
    <>
      {template}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    </>
  );
}

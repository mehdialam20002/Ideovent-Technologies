import { Helmet } from "react-helmet-async";
import type { DemoSite } from "@/lib/cms/types";
import { demoPlace, demoShortName } from "@/lib/demo/record";
import { DemoMarker, DemoRibbon } from "./DemoMarker";

/**
 * A PLACEHOLDER. THE DESIGN AGENTS REPLACE THIS.
 *
 * It exists so that the route, the slug guard, the status gate, the expiry
 * gate, the open tracking and the admin can all be built, opened and measured
 * before either real template exists. It is deliberately plain: nothing here
 * is a design decision anybody should inherit.
 *
 * WHAT IT DOES ESTABLISH, AND WHAT A REPLACEMENT MUST KEEP.
 *
 *   1. THE RIBBON AND THE MARKER. `<DemoRibbon>` at the very top and
 *      `<DemoMarker>` at the very bottom. Both are required on every demo,
 *      for the two reasons written across the top of ./DemoMarker.tsx:
 *      nobody may mistake this for the institute's live site, and the credit
 *      is the pitch. A template that drops either one is not finished.
 *
 *   2. NO IDEOVENT CHROME. There is no `<Layout>`, so no Ideovent navbar and
 *      no Ideovent footer. This is the institute's website. Our name appears
 *      in exactly two places and both of them are deliberate.
 *
 *   3. NOINDEX. Set here as well as on the route. See the note in
 *      ./DemoSiteRoute.tsx: one indexed demo tells every other prospect
 *      exactly what they are being given.
 *
 *   4. EMPTY IS THE NORMAL STATE. Every optional field is empty on the two
 *      records that ship, because that is the state Mehdi is in most often: he
 *      has a name and a city. A template that only looks finished once ten
 *      arrays are populated is a template that cannot be sent. Where there is
 *      nothing to show, print something that reads as a placeholder in plain
 *      words, never a plausible invented value.
 *
 *   5. `.container-page`. The gutter ladder was measured across thirteen
 *      routes and thirteen widths and scripts/measure-gutters.mjs checks that
 *      every page agrees at every width. A template that wants its own
 *      container must either match that ladder or be taken out of the ROUTES
 *      list in that script, and taking it out means nobody is checking a page
 *      that gets opened on a phone on mobile data.
 */
export default function DemoPlaceholder({ site }: { site: DemoSite }) {
  const place = demoPlace(site);
  const short = demoShortName(site);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{site.instituteName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <DemoRibbon site={site} />

      <header className="border-b border-border">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5">
          <span className="font-display text-lg font-semibold">{short}</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span>About</span>
            <span>{site.kind === "coaching" ? "Courses" : "Academics"}</span>
            <span>{site.kind === "coaching" ? "Faculty" : "Admissions"}</span>
            <span>Contact</span>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border py-16 sm:py-24">
          <div className="container-page">
            <h1 className="max-w-3xl font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {site.instituteName}
            </h1>
            {site.tagline ? (
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">{site.tagline}</p>
            ) : (
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Your own line goes here. One sentence about what the institute is.
              </p>
            )}
            {place && <p className="mt-6 text-sm text-muted-foreground">{place}</p>}
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="container-page">
            <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Template not built yet
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                This is the placeholder that ships with the route. The{" "}
                {site.kind === "coaching" ? "coaching institute" : "school"} template renders
                here once it exists. Everything around it is real: the address, the status
                gate, the expiry, the open count and the marker at the foot of the page.
              </p>
            </div>
          </div>
        </section>
      </main>

      <DemoMarker site={site} />
    </div>
  );
}

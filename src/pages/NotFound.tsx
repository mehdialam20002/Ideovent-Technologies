import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { EmptyState } from "@/components/ui/empty-state";

/*
  THE 404 IS ALSO THE DRAFT-PITCH PAGE.

  src/pages/Pitch.tsx renders this component for any pitch record that is not
  `live`, deliberately: a proposal still being written must not be readable by
  anyone who guesses the institute's name, and an archived one has to stop
  working when the offer stops standing. Neither may hint that something exists
  at that address. So this page is read by two kinds of visitor, and it must
  give nothing away about which one is reading it.

  That is why the copy names no slug, offers no "did you mean", and does not
  distinguish "never existed" from "not published yet". It also means this is
  the most-reached dead end on the site, which is why it is worth more than one
  link back to the homepage: the four addresses below are the pages a visitor
  who mistyped something was most likely aiming at.
*/
export default function NotFound() {
  return (
    <Layout>
      <Seo title="Page not found" noindex />
      <EmptyState
        tone="page"
        headingAs="h1"
        code="404"
        eyebrow="Page not found"
        title={
          <>
            This page took a <span className="accent-italic">wrong turn.</span>
          </>
        }
        body="The address may have been moved or renamed, or it may never have existed. Nothing is lost: everything on the site is two clicks from here."
        action={{ label: "Back to home", href: "/" }}
        links={[
          { label: "Selected work", to: "/work" },
          { label: "What we build", to: "/services" },
          { label: "Prices", to: "/pricing" },
          { label: "Talk to us", to: "/contact" },
        ]}
      />
    </Layout>
  );
}

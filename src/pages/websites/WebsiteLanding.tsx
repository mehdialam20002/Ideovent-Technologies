import { useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection, useSingleton } from "@/lib/cms/context";
import { PAGE_SEO } from "@/lib/seo/pages";
import { whatsappHref } from "../pricing/styles";
import { WEBSITE_PAGES } from "./content";
import { websitesSchema } from "./schema";
import type { WebsitePageId } from "./types";
import { Hero } from "./parts/Hero";
import { Cards, Includes, Samples } from "./parts/Sections";
import { Price, Terms } from "./parts/Price";
import { Closing, Questions, Related, Rules, Steps } from "./parts/Info";

/**
 * THE /websites PAGES (2 Oct 2026): the hub and four keyword landing pages,
 * one component. Mehdi, 2 Oct: "ye kro best way me i want rank".
 *
 *   /websites                        website design in Delhi, every business
 *   /websites/dental-clinic          dental clinic website
 *   /websites/school                 school website
 *   /websites/coaching-institute     coaching institute website
 *   /websites/899-per-month          the Starter plan, with its setup fee and term
 *
 * Title, description and h1: src/lib/seo/pages.ts (PAGE_SEO), which <Seo>
 * enforces and scripts/prerender-heads.mjs writes into dist/websites/.../
 * index.html. Words: ./content/. JSON-LD: ./schema.ts. No-script copy:
 * ./noscript.ts. Prices: src/lib/pricing.ts, nowhere else.
 *
 * Order: the problem and the answer (hero), what the site holds, samples of
 * our own templates, the price, the plan's terms, the rules of the buyer's
 * field, the steps, questions, links onward, the closing band.
 */
export default function WebsiteLanding({ id }: { id: WebsitePageId }) {
  const contact = useSingleton("contact");
  const posts = useCollection("posts");
  const postSlugs = useMemo(() => new Set(posts.filter((p) => p.status === "published").map((p) => p.slug)), [posts]);
  const page = WEBSITE_PAGES[id];
  const seo = PAGE_SEO[page.path];
  const ld = websitesSchema(page.path);
  const whatsapp = whatsappHref(contact.whatsappNumber, page.whatsapp);

  return (
    <Layout>
      <Seo
        title={seo.title}
        fullTitle
        description={seo.description}
        path={page.path}
        breadcrumbs={ld?.crumbs}
        schema={ld?.nodes}
      />

      <Hero page={page} h1={seo.h1} whatsapp={whatsapp} />
      {page.price === "monthly" ? (
        // The plan page: what you get, what it costs in full, its terms, then who it suits.
        <>
          {page.includes && <Includes includes={page.includes} />}
          <Price kind={page.price} />
          {page.terms && <Terms terms={page.terms} />}
          {page.cards && <Cards cards={page.cards} />}
        </>
      ) : (
        <>
          {page.cards && <Cards cards={page.cards} />}
          {page.includes && <Includes includes={page.includes} />}
          {page.samples && <Samples samples={page.samples} whatsapp={whatsapp} />}
          <Price kind={page.price} />
        </>
      )}
      {page.rules && <Rules rules={page.rules} />}
      <Steps steps={page.steps} />
      <Questions faqs={page.faqs} />
      <Related related={page.related} postSlugs={postSlugs} />
      <Closing closing={page.closing} whatsapp={whatsapp} promise={contact.responseTimePromise} />
    </Layout>
  );
}

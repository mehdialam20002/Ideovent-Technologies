/**
 * REVIEWS. /reviews
 *
 *   rating    a rating line only with its review count and a link to the
 *             profile it came from
 *   filter    category chips (Parents, Students, JEE...) with the transition
 *   grid      consented reviews only, as text cards giving the person's
 *             relation; a video is a poster that loads only on tap
 */

import { Helmet } from "react-helmet-async";
import { biLabel, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { RatingLine, ReviewCard } from "@/lib/demo/ui/coaching/cards";
import { Chips } from "@/lib/demo/ui/coaching/Chips";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { distinct, useFilter } from "@/lib/demo/ui/coaching/filter";
import { PageHead } from "../kit/Hero";
import { SampleNote } from "../kit/SampleNote";
import { CardGrid, Section } from "../kit/Section";
import { Action } from "../kit/Text";

const COPY = {
  title: { en: "What parents and students say", hi: "अभिभावक और छात्र क्या कहते हैं" },
  lead: { en: "Published with each person's permission.", hi: "हर व्यक्ति की अनुमति से प्रकाशित।" },
  reviews: { en: "Reviews", hi: "रिव्यू" },
  kind: { en: "Show", hi: "दिखाएँ" },
} satisfies Record<string, Bilingual>;

export default function ReviewsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const reviews = withText(site.reviews, "quote").filter((r) => r.consent);
  const cats = distinct(reviews.map((r) => r.category));
  const f = useFilter<string>("all");
  const shown = f.value === "all" ? reviews : reviews.filter((r) => (r.category || "").trim() === f.value);
  const demo = ctx.href("demo-class") || ctx.href("contact");

  return (
    <>
      <Helmet><title>{`${tr(COPY.reviews, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.reviews, lang) }]}
      >
        <div className="mt-3"><RatingLine /></div>
        <SampleNote block="reviews" className="mt-3" />
      </PageHead>
      <Section n={1} title={tr(COPY.reviews, lang)}>
        <Chips label={tr(COPY.kind, lang)} value={f.value} onChange={f.choose}
          options={[{ value: "all", label: tr(C_COPY.all, lang) }, ...cats.map((c) => ({ value: c, label: biLabel(reviews, "category", c, lang) }))]} />
        <p className="sr-only" aria-live="polite">{trf(C_COPY.showing, lang, { n: String(shown.length) })}</p>
        <div ref={f.gridRef}>
          <CardGrid cols={3}>
            {shown.map((r, i) => <div key={i} data-f="" className="h-full"><ReviewCard r={r} /></div>)}
          </CardGrid>
        </div>
        {demo && <div className="mt-10"><Action href={demo}>{tr(SHELL_COPY.bookDemo, lang)}</Action></div>}
      </Section>
    </>
  );
}

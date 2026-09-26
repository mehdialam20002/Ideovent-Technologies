/**
 * THE DESIGNED "NOT PUBLISHED YET" STATE. Rendered by a page whose component
 * is not written yet, and by any page whose minimum-data test fails when the
 * address is typed by hand. It is never linked: visiblePages() drops such a
 * page from the nav, the footer and the sitemap. It links on to Admissions
 * (school) or Courses (coaching) and Contact, when those are shown.
 */

import { tr } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { EMPTY_COPY, SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "./Hero";
import { Action, EmptyNote } from "./Text";

export function PageStub({ ctx }: SitePageProps) {
  const { lang, kind, page } = ctx;
  const next = ctx.href(kind === "school" ? "admissions" : "courses");
  const contact = ctx.href("contact");
  const home = ctx.href("home");
  return (
    <>
      <PageHead title={tr(page.label, lang)} crumbs={[{ label: tr(SHELL_COPY.home, lang), href: home }, { label: tr(page.label, lang) }]} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <EmptyNote title={EMPTY_COPY.title} body={kind === "school" ? EMPTY_COPY.body : EMPTY_COPY.bodyCoaching}>
          {next && <Action href={next}>{tr(kind === "school" ? SHELL_COPY.applyNow : SHELL_COPY.coursesAndFees, lang)}</Action>}
          {contact && <Action href={contact} tone="ghost">{tr(SHELL_COPY.enquire, lang)}</Action>}
          {!contact && home && <Action href={home} tone="ghost">{tr(SHELL_COPY.backHome, lang)}</Action>}
        </EmptyNote>
      </div>
    </>
  );
}

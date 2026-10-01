/**
 * THE DESIGNED "NOT PUBLISHED YET" STATE. Rendered by a page whose component
 * is not written yet, and by any page whose minimum-data test fails when the
 * address is typed by hand. It is never linked: visiblePages() drops such a
 * page from the nav, the footer and the sitemap. It links on to Admissions
 * (school), Courses (coaching) or Book appointment (dental clinic, 30 Sep
 * 2026: a clinic's page never says courses) and Contact, when those are shown.
 */

import { tr } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { EMPTY_COPY, SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "./Hero";
import { Action, EmptyNote } from "./Text";

/** Where a stub sends the reader next, in its kind's own words. */
const ONWARD = {
  school: { page: "admissions", label: SHELL_COPY.applyNow, body: EMPTY_COPY.body },
  coaching: { page: "courses", label: SHELL_COPY.coursesAndFees, body: EMPTY_COPY.bodyCoaching },
  dental: { page: "book", label: SHELL_COPY.bookAppointment, body: EMPTY_COPY.bodyDental },
} as const;

export function PageStub({ ctx }: SitePageProps) {
  const { lang, kind, page } = ctx;
  const onward = ONWARD[kind] || ONWARD.coaching;
  const next = ctx.href(onward.page);
  const contact = ctx.href("contact");
  const home = ctx.href("home");
  return (
    <>
      <PageHead title={tr(page.label, lang)} crumbs={[{ label: tr(SHELL_COPY.home, lang), href: home }, { label: tr(page.label, lang) }]} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <EmptyNote title={EMPTY_COPY.title} body={onward.body}>
          {next && <Action href={next}>{tr(onward.label, lang)}</Action>}
          {contact && <Action href={contact} tone="ghost">{tr(SHELL_COPY.enquire, lang)}</Action>}
          {!contact && home && <Action href={home} tone="ghost">{tr(SHELL_COPY.backHome, lang)}</Action>}
        </EmptyNote>
      </div>
    </>
  );
}

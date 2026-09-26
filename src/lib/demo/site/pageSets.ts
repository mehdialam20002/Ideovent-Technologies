/**
 * WHICH PAGES EACH SEGMENT OFFERS, by page id, in nav order.
 *
 * A template's content file sets `sitePages` to one of these (it is KEPT on
 * duplicate: it is the segment's structure, not a fact). A record with no
 * `sitePages` gets its kind's full list. Either way a page appears only when
 * its own minimum-data test passes (src/lib/demo/site/pages.ts), so a list
 * here is a ceiling, never a promise of content.
 *
 * Sources: E:/myagency/_assets/DEMO-SCHOOL-IA.md section 4 and
 * DEMO-COACHING-IA.md "Pages per template". This file imports nothing, so a
 * template content file may import it without pulling in the registry.
 */

export type SchoolPageId =
  | "home" | "about" | "admissions" | "academics" | "programmes" | "faculty"
  | "facilities" | "boarding" | "safety" | "student-life" | "results"
  | "gallery" | "news" | "parents" | "transport" | "disclosure" | "policies"
  | "contact" | "sitemap";

export type CoachingPageId =
  | "home" | "courses" | "course" | "results" | "faculty" | "about"
  | "demo-class" | "test-series" | "scholarship" | "reviews" | "blog" | "post"
  | "faq" | "contact" | "portal" | "fees-and-refunds" | "exam-calendar"
  | "cut-offs" | "olympiad" | "gallery" | "sitemap";

export type SitePageId = SchoolPageId | CoachingPageId;

export const SCHOOL_PAGE_SETS = {
  /** s1 urban CBSE, 14 pages. */
  "s1-urban-cbse": [
    "home", "about", "admissions", "academics", "faculty", "facilities", "results", "gallery",
    "news", "parents", "transport", "disclosure", "policies", "contact",
  ],
  /** s2 rural state board, 9 pages. Transport and facilities are blocks on Contact and About. */
  "s2-rural-state-board": [
    "home", "about", "admissions", "academics", "faculty", "results", "gallery", "news", "contact",
  ],
  /** s3 play school, 11 pages. No results, no disclosure. */
  "s3-play-school": [
    "home", "programmes", "admissions", "safety", "faculty", "facilities", "gallery", "news",
    "parents", "transport", "contact",
  ],
  /** s4 residential, 15 pages. Travel lives on Boarding and Contact. */
  "s4-residential": [
    "home", "about", "admissions", "academics", "boarding", "student-life", "faculty",
    "facilities", "results", "gallery", "news", "parents", "disclosure", "policies", "contact",
  ],
  /** s5 international, 15 pages. Disclosure only if dual CBSE (its own test decides). */
  "s5-international": [
    "home", "about", "admissions", "academics", "faculty", "facilities", "student-life",
    "results", "gallery", "news", "parents", "transport", "policies", "disclosure", "contact",
  ],
} as const satisfies Record<string, readonly SchoolPageId[]>;

export const COACHING_PAGE_SETS = {
  /** c1 JEE/NEET urban: everything but c4/c5 pages and the gallery page. */
  "c1-jee-neet-urban": [
    "home", "courses", "course", "results", "faculty", "test-series", "scholarship", "about",
    "demo-class", "reviews", "blog", "post", "faq", "portal", "fees-and-refunds", "contact",
  ],
  /** c2 rural tuition: six light page types, one classes-and-fees page. */
  "c2-rural-tuition": ["home", "courses", "results", "about", "demo-class", "faq", "contact"],
  /** c3 science 9-12: per-subject course pages, faculty high. */
  "c3-science": [
    "home", "courses", "course", "faculty", "results", "about", "demo-class", "test-series",
    "blog", "post", "faq", "fees-and-refunds", "contact",
  ],
  /** c4 foundation + Olympiad: per-class pages, an Olympiad page, parent reviews. */
  "c4-foundation": [
    "home", "courses", "course", "olympiad", "results", "faculty", "about", "demo-class",
    "reviews", "faq", "portal", "fees-and-refunds", "contact",
  ],
  /** c5 SSC/Banking/Railways: exam calendar and cut-offs. */
  "c5-government-jobs": [
    "home", "courses", "course", "exam-calendar", "cut-offs", "results", "faculty",
    "test-series", "demo-class", "blog", "post", "faq", "portal", "fees-and-refunds", "contact",
  ],
} as const satisfies Record<string, readonly CoachingPageId[]>;

# Demo site pages: the contract

Every page of a multi-page demo site (`/site/<slug>/...`) is written to this
contract. The two reference pages follow it line by line; copy them:

- school: `src/pages/site/school/AdmissionsPage.tsx`
- coaching: `src/pages/site/coaching/CoursePage.tsx`

## 1. Where things live

| What | File |
|---|---|
| Page registry: ids, paths, labels, minimum-data tests, lazy loaders | `src/lib/demo/site/pages.ts` |
| Page ids and each template's page list | `src/lib/demo/site/pageSets.ts` |
| What a page receives (`SitePageProps`, `SiteContext`, `useSite`) | `src/lib/demo/site/context.ts` |
| Bilingual helpers (`tr`, `trf`, `bi`, `biLang`, `hasBi`, `withText`) | `src/lib/demo/site/bilingual.ts` |
| Shared structural copy (shell, empty states, footer groups) | `src/lib/demo/site/copy.ts` |
| Multi-page themes (palette, face, radius, motion budget) | `src/lib/demo/site/themes.ts`, ids in `ids.ts` |
| CBSE Appendix IX rows | `src/lib/demo/site/disclosure.ts` |
| Family compositions: `Hero`, `PageHead`, `Section`, `Card`, `CardGrid`, `Figure`, `FactTable` | `src/pages/site/kit/Hero.tsx`, `kit/Section.tsx` |
| Text, photo, empty state, actions, accordion, breadcrumb | `src/pages/site/kit/Text.tsx` |
| Motion: `Reveal`, `CountUp`, `SiteLink`, `useMotion` | `src/pages/site/kit/motion.tsx` |
| Designed "not published yet" page | `src/pages/site/kit/PageStub.tsx` |
| Shell: header, footer, bottom bar, marker, routing | `src/pages/site/SiteShell.tsx`, `shell/*` |
| Single page or multi-page? | `src/pages/site/DemoSiteView.tsx` |
| Styles and motion tokens (lazy CSS chunk) | `src/pages/site/site.css` |
| Page files | `src/pages/site/school/*Page.tsx`, `src/pages/site/coaching/*Page.tsx` |

## 2. Routes

- Public: `/site/:slug/*`. Admin: `/admin/preview/site/:slug/*` and
  `/admin/preview/template/:id/*`. All three render `DemoSiteView`, which picks
  the multi-page shell when `site.theme` is a multi-page id (`metro atlas
  aangan crayon pinewood almanac` for schools, `podium timetable register
  folio courtyard` for coaching). Any other theme renders the frozen single
  page, and a subpage address on it redirects to the home page.
- Page paths are relative: `""` (home), `"admissions"`, `"courses/:course"`,
  `"blog/:post"`. `matchPage` resolves them; an address that names no page
  redirects home.
- Never build a URL by hand. `ctx.href(id, param?)` returns the address of a
  page **only if this record shows it**, else `null`. Render nothing for
  `null`. That is the whole of the "the nav never links to a hollow page"
  guarantee, and it holds for in-page links too.

## 3. Writing a page

```tsx
import type { SitePageProps } from "@/lib/demo/site/context";
import { tr, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { Card, CardGrid, Section } from "../kit/Section";
import { Bi } from "../kit/Text";
import { Reveal } from "../kit/motion";

const COPY = {
  title: { en: "Faculty", hi: "शिक्षक" },
  lead: { en: "The people who teach here.", hi: "यहाँ पढ़ाने वाले लोग।" },
} satisfies Record<string, Bilingual>;

export default function FacultyPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const people = withText(site.faculty, "name");
  let n = 0;
  return (
    <>
      <PageHead title={tr(COPY.title, lang)} lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]} />
      {people.length > 0 && (
        <Section n={++n} title={tr(COPY.title, lang)}>
          <CardGrid cols={3}>
            {people.map((f, i) => (
              <Reveal key={f.name} index={i}>
                <Card interactive><p className="font-semibold">{f.name}</p><Bi of={f} k="subject" as="p" /></Card>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}
    </>
  );
}
```

Rules:

1. **Default export**, one component per file, props `SitePageProps`
   (`{ site, ctx }`). The file lives at the path its registry entry imports.
2. **Register it**: in `src/lib/demo/site/pages.ts`, set `built: true` on its
   entry in the same change. Its `has(site, today)` is the page's
   minimum-data test (from DEMO-SCHOOL-IA.md section 3 and the coaching
   page catalogue); keep it honest: true only when the page has something
   worth a visit. A page that is not in a template's list in `pageSets.ts`
   never shows for that template.
3. **Start with `PageHead`** (family-shaped subpage head, with crumbs). The
   home page starts with `Hero` instead.
4. **Sections are `<Section n={++n} ...>`**, numbered in render order, each
   wrapped in a condition so it renders only with data. `n` is the chapter
   number in Classic and the band parity in Modern and Warm.
5. **Never branch on the family for layout.** `Hero`, `PageHead`, `Section`,
   `Card`, `CardGrid`, `Monogram`, `Photo` and `Action` read the family and
   variant themselves. If a page genuinely needs a family-specific block, read
   `ctx.family` / `ctx.variant` and keep both branches in the same file.
6. **Colours only through tokens**: `hsl(var(--ds-ink))`, `--ds-ink-soft`,
   `--ds-surface`, `--ds-surface-2`, `--ds-brand`, `--ds-on-brand`,
   `--ds-brand-ink`, `--ds-accent`, `--ds-line`, `--ds-rule`, `--ds-cta`,
   `--ds-on-cta`, `--ds-hero-*`. Headings use class `ds-display`; numbers
   `ds-num`. Buttons are `ds-btn ds-btn-cta | ds-btn-brand | ds-btn-ghost` or
   `<Action>`. No new fonts, no hex values, no Tailwind colour names.
7. **Links**: in-site with `<SiteLink to={ctx.href(...)!}>` or `<Action>`,
   external (`tel:`, `https://wa.me/...`, a portal) with `<Action>` or `<a>`.
   Call and WhatsApp come from `ctx.actions` and are absent without a number.
8. **Page title**: the shell sets `"<page label> | <institute>"`. A page with a
   parameter (course, post) sets its own `<Helmet><title>` as `CoursePage` does.

## 4. Language (the "Hindi stays on the English page" fix)

- **Our copy** (headings, labels, buttons, empty states, chip text, aria
  labels, table headers) is a `Bilingual` `{ en, hi }`. Both keys are required
  by the type: write the page's table as
  `const COPY = { ... } satisfies Record<string, Bilingual>` and read it with
  `tr(COPY.key, lang)` or `trf(COPY.key, lang, { vars })`. A string literal a
  reader sees, written straight into JSX, is a bug: it cannot follow the
  toggle. Hindi is Hinglish as a Delhi parent reads it (admission, form, fees,
  batch, WhatsApp stay in Latin script).
- **Institute content** is a plain field (English) plus the object's own `hi`
  block under the same key (`DemoHi` in `src/lib/cms/types.ts`). Read it with
  `<Bi of={obj} k="key" />`, or `bi(obj, "key", lang)` for a plain string.
  Hindi mode prefers `hi.key`, English mode the plain field, and each falls
  back to the other only when its own is empty. `<Bi>` puts `lang="hi"` (or
  `"en"`) on a fallback, so an English page carries no Devanagari outside
  `[lang="hi"]`. Never print `obj.field` directly for text a reader sees.
- **Names, numbers and URLs** (a teacher's name, a fee amount, a year) have
  no Hindi twin and print as typed.
- Never type Hindi into a plain field. `node scripts/check-demo-lang.mjs`
  fails on Devanagari outside a `hi` block in any template, and on a `hi` key
  that has no English. A record may set `defaultLang: "hi"` (s2) so a
  first-time reader sees Hindi; the reader's own choice still wins.

## 5. Empty states

A record with only a name and a city must be a whole, sendable site.

- A page whose `has()` is false is **not linked anywhere** (nav, footer,
  sitemap, in-page links all go through `ctx.pages` / `ctx.href`). If its
  address is typed by hand, the shell renders `PageStub`, the designed
  "not published yet" state, linking to Admissions (school) or Courses
  (coaching) and Contact.
- Inside a page, **a section with no data is omitted**, never an empty box.
  When the absence itself is information (a cleared fee on a course page),
  print the designed line (`"Fee on call, printed on the receipt"`), never a
  blank or a zero.
- The Disclosure page is the exception by law: a required Appendix IX row
  with no value prints `SHELL_COPY.toBeUploaded`, never hidden. The page
  itself exists only for a CBSE school with an affiliation number.
- Photos: `<Photo src alt ratio>` is lazy and sized, and renders the family's
  no-photo panel (monogram) when `src` is empty or fails. Only the hero passes
  `priority`.

## 6. Family compositions

The FAMILY owns the composition; the theme owns only the palette.

| | Classic ("The Prospectus" / "The Register") | Modern ("The Campus Dashboard" / "The Scoreboard") | Warm ("The Courtyard") |
|---|---|---|---|
| Hero a | masthead: centred name, ruled facts line, 21:9 band or monogram | split: headline + actions, data object as a solid card, stat bar on the bottom edge | stacked: brand full bleed, thumb actions, data card overlapping the next section |
| Hero b | title page: 20ch name beside a tall portrait, facts as hairline rows | full bleed: statement headline, data object as a strip on the bottom edge | arched window: photo in an arch frame, round sticker |
| Section | numbered chapter, label rail at 1/4, content at 3/4, hairline rule | alternating page / tint bands, overline + left heading | rounded tinted rooms inset 16px, centred heading |
| Card | ruled row, no box; hover tints the row | 1px border, 12px corners, hover lift -4px | 16 to 24px corners, soft shadow, hover scale 1.01 |
| Header | ink strip of small caps; centred name + nav; 56px crest row on scroll | strip + 64px bar with solid Apply; 60px blurred bar on scroll | no strip on phones; hides on scroll down, returns on scroll up |

Assignments: s1 metro (Modern a), s5 atlas (Modern b), s2 aangan (Warm a),
s3 crayon (Warm b), s4 pinewood (Classic a), spare almanac (Classic b);
c1 podium (Modern a), c5 timetable (Modern b), c2 register (Classic a),
c3 folio (Classic b), c4 courtyard (Warm a). The older ten ids keep their
single page and never change look.

`Hero` takes content only: `eyebrow, title, lead, primary, secondary, facts,
aside (the data object), photo, sticker`. What goes in `aside` per template is
the home page builder's choice from the research (admissions card for metro,
latest notice for aangan, next batches for podium, next three exams for
timetable, goal picker otherwise).

## 7. Motion

Use only the primitives; no motion library, no `@keyframes` of your own, no
loop of any kind (no pulse, bounce, marquee, Ken Burns, autoplay carousel).

- `<Reveal index={i}>`: rises in once when scrolled into view (16px school,
  12px coaching, 560/450ms, TSRS ease-out, stagger 60ms capped at 6). Content
  already on screen at load is never animated; nothing is hidden before JS.
  `Section` already wraps its body in one; use `Reveal` for list items.
- `<CountUp value basis>` (or `<Figure value label basis>`): counts up once,
  only when the value parses as a number AND a basis line exists AND motion is
  "full". The final value is in `aria-label` and in the DOM on every other
  path. No counters on cut-off tables or on c2.
- `<SiteLink>`: View Transitions cross-fade between pages when motion is
  "full"; the header and bottom bar are excluded.
- Hover effects come from the card CSS (`interactive` prop), only under
  `(hover: hover)`. Accordion is `<Accordion>` (grid rows 0fr to 1fr, 280ms).
- `ctx.motion` is "none" under `prefers-reduced-motion`, and on still pages
  (Disclosure, Policies, Contact, Fees and refunds); "light" on aangan and
  register (reveals only: no FLIP, no counters, no page transitions). Pages
  that add their own transition (a FLIP filter) must check `useMotion() ===
  "full"`. Verification: `page.emulateMedia({ reducedMotion: "reduce" })`,
  then `document.getAnimations().length === 0` after load and after a scroll,
  and every counter's text equals its stored value.

## 8. Honesty (non-negotiable)

- Nothing on a page is generated, inferred, rounded or "made representative".
  Every institute fact comes from the record; our copy never states a fact
  about the institute ("Parents are welcome on weekday mornings" is a claim;
  "Call the office to fix a time" is not).
- Results (CCPA 2024 coaching-ad guidelines): each result shows the rank or
  score, the course taken, its duration, and whether it was paid or on
  scholarship, at body size. A student's name, photo or quote prints only when
  `consent` is true. Selection counts (c5) show `count` and `status` (Final).
- Trust figures print with their `basis` line; a rating prints only with its
  count and a link.
- Portal and Login are LINKS to the institute's real portal (`portalLinks`),
  hidden when there is none. Never build a login form or anything that
  collects credentials.
- Forms: at most 5 fields, one step, they open WhatsApp (or the mail app)
  with the message and store nothing. Coaching demo form: student name,
  WhatsApp number, class, course, optional parent name.
- Transport never shows a driver's name or phone; the transport desk only.
  No principal's signature image: the typed name and title.
- Coaching c4 copy never implies government approval (MoE 2024 guideline on
  under-16s): frame it as after-school classes and Olympiad preparation.
- Every page keeps the Ideovent ribbon and marker (the shell renders both).
  No em dashes. No `<meta name>` with a space after the colon. The domain is
  www.ideovent.in, never the old .com domain.

## 9. Performance (phones on mobile data)

- Each page is its own lazy chunk through its registry `load()`. Never import
  one page from another; share through `kit/`. Anything only a subpage needs
  (age checker, lightbox, FLIP, filters) lives in that page's file or a kit
  file only that page imports, never in the shell or the home page.
- The registry, themes and shell are reached only through the lazy
  `DemoSiteView`; nothing under `src/lib/demo/site` or `src/pages/site` may be
  imported by the marketing site or the entry chunk.
- Images: `<Photo>` (lazy, `decoding="async"`, aspect ratio reserved, the
  no-photo state). No map iframe or video element until tapped. No icon font;
  lucide icons only, imported one by one.
- aangan (s2) and register (c2) are the light budgets: no heavy blocks, no
  counters, no page transitions.

## 10. Which page reads what

School (`SchoolPageId`): home (tagline, boardOrAffiliation, city,
sessionLabel, admissionsOpenUntil, admissionsHeadline, notices, about,
principal*, courses, facilities, stats, photos, reviews); about (about, vision,
mission, principalName/Title/Message, udiseCode, established*, facilities for
s2); admissions (admissions.*, sessionLabel, admissionsOpenUntil, courses,
faq group "Admissions", contact); academics (academics.*, courses); programmes
(courses as age bands, dayPlan); faculty (faculty, grouped by `group`);
facilities (facilities, facilityDetails, photos); boarding (boarding.*);
safety (safety); student-life (studentLife); results (boardResults, results
incl. destinations, resultsHeading/Note, stats); gallery (photos, gallery);
news (notices with kind, posted, expires); parents (portalLinks, downloads,
academics.calendar); transport (transport.*, contact.transportDesk);
disclosure (disclosure.rows, boardResults, faculty groups, annualReportUrl);
policies (policies); contact (contact.*, branches, landmark).

Coaching (`CoachingPageId`): home (focusAreas, city, tagline, stats, courses,
faculty, results with consent, reviews with consent, joining, notices for c2,
govExams.calendar for c5); courses (courses, grouped by `category`); course
(one course: every DemoCourse field, faculty by `facultyNames`, results by
`courseName`); results (results, stats, resultsNote); faculty (faculty);
about (about, founder, vision, mission, classSizePromise, hostel, photos);
demo-class (trial, contact, courses); test-series (testSeries.*); scholarship
(scholarship.*); reviews (reviews, rating); blog and post (posts); faq (faq by
group); gallery (photos, 6+); portal (portalLinks); fees-and-refunds
(feesPolicy.*, courses fees); exam-calendar, cut-offs (govExams.*); olympiad
(olympiad.*); contact (contact.*, branches).

## 11. Adding a field

1. Add it, optional, to the Demo* types in `src/lib/cms/types.ts`, with a
   `hi` key in that object's `DemoHi<...>` if a reader sees it.
2. Classify it in `src/lib/demo/templates/fromTemplate.ts`: the build fails
   until you do (`DUPLICATE_POLICY` and the sub-policies are exhaustive). A
   fact about a real institute is CLEAR; only segment structure is KEEP.
3. Add it to `MULTIPAGE_CLEAR` (or the matching list) and to the probe in
   `scripts/test-from-template.mjs`.
4. Add it to the admin form in `src/admin/DemoSitesPagesSchema.ts`, under
   the page that reads it.
5. Read it in the page with `<Bi>` / `bi()` and let the page's `has()` see it.

## 12. Checks

```
npm run typecheck
node scripts/test-from-template.mjs
FROM_TEMPLATE_NEGATIVE=1 node scripts/test-from-template.mjs   # must fail
node scripts/check-demo-contrast.mjs
node scripts/check-demo-lang.mjs
npm run test:share
```

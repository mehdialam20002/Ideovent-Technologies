/**
 * THE PAGE REGISTRY. One entry per page a demo site can have, per kind.
 *
 * Each entry says four things and nothing else:
 *   path    where it lives under /site/<slug>/ ("" is the home page)
 *   label   its nav label in both languages
 *   has     its MINIMUM-DATA TEST: true when this record has enough for the
 *           page to be worth a visit. The nav, the footer, the sitemap and
 *           every in-page link are generated from `visiblePages`, which
 *           applies this test, so an empty page is never linked
 *   load    a dynamic import of the page component, so every page is its
 *           own lazy chunk and nothing a subpage needs loads on the home page
 *
 * `built: false` keeps a page out of the nav until its component is written;
 * a page builder flips it to true in the same change that fills the file.
 *
 * This module is imported only by the lazy site shell, never by the entry
 * chunk. The contract for writing a page is src/lib/demo/pages/README.md.
 */

import type { ComponentType } from "react";
import type { DemoKind, DemoScheduleRow, DemoSite } from "@/lib/cms/types";
import type { Bilingual } from "./bilingual";
import { hasBi, withText } from "./bilingual";
import { isCbseSchool } from "./disclosure";
import type { CoachingPageId, DentalPageId, SchoolPageId, SitePageId } from "./pageSets";
import { COACHING_PAGE_SETS, DENTAL_PAGE_SETS, SCHOOL_PAGE_SETS } from "./pageSets";
import type { SitePageProps } from "./context";

/** Where a page is linked from. "main": the header nav. "footer": footer only. */
export type NavPlacement = "main" | "footer";

/** The footer's four groups. Labels live in ./copy.ts. */
export type FooterGroup = "institute" | "admissions" | "resources" | "legal";

export interface SitePageDef<Id extends SitePageId = SitePageId> {
  id: Id;
  /** Relative path. "courses/:course" and "blog/:post" take one parameter. */
  path: string;
  label: Bilingual;
  nav: NavPlacement;
  footer: FooterGroup;
  has: (site: DemoSite, today: string) => boolean;
  load: () => Promise<{ default: ComponentType<SitePageProps> }>;
  /** False until the page component is written. Unbuilt pages are never linked. */
  built: boolean;
  /** True for Disclosure, Policies and Contact: no reveal motion at all. */
  still?: boolean;
}

/* ── Shared minimum-data helpers ─────────────────────────────────────────── */

const n = (list: unknown[] | undefined) => (list || []).length;
const withUrl = <T extends { url?: string }>(list: T[] | undefined) => (list || []).filter((x) => (x.url || "").trim());
const photoCount = (s: DemoSite) =>
  (s.photos || []).filter((p) => p.src).length + (s.gallery || []).filter((g) => g.src).length;

/**
 * The rows of a timetable that carry a time. A timetable with no times is no
 * data: a duplicate clears every `time` (templates/fromTemplate.ts, because a
 * clock time is the institute's fact), and a table of batch names with no
 * hours is not a timetable. Every reader of a batch timetable (site.schedule)
 * goes through this, so it disappears until times are typed in.
 */
export function timedRows(rows: DemoScheduleRow[] | undefined): DemoScheduleRow[] {
  return withText(rows, "label").filter((r) => hasBi(r, "time"));
}

/** True when the record has a batch timetable worth printing. */
export const hasTimetable = (s: DemoSite) => timedRows(s.schedule).length > 0;

/** A notice is live until its ISO `expires` date has passed. */
export function liveNotices(site: DemoSite, today: string) {
  return withText(site.notices, "title").filter((x) => !x.expires || x.expires >= today);
}

const L = (en: string, hi: string): Bilingual => ({ en, hi });

/* ── School ──────────────────────────────────────────────────────────────── */

export const SCHOOL_PAGES: SitePageDef<SchoolPageId>[] = [
  { id: "home", path: "", label: L("Home", "होम"), nav: "main", footer: "institute", built: true,
    has: () => true, load: () => import("@/pages/site/school/HomePage") },
  { id: "about", path: "about", label: L("About", "हमारे बारे में"), nav: "main", footer: "institute", built: true,
    has: (s) => hasBi(s, "about") || hasBi(s, "principalMessage") || hasBi(s, "vision"),
    load: () => import("@/pages/site/school/AboutPage") },
  { id: "admissions", path: "admissions", label: L("Admissions", "एडमिशन"), nav: "main", footer: "admissions", built: true,
    has: () => true, load: () => import("@/pages/site/school/AdmissionsPage") },
  { id: "academics", path: "academics", label: L("Academics", "पढ़ाई"), nav: "main", footer: "resources", built: true,
    has: (s) => n(s.academics?.stages) > 0 || hasBi(s.academics, "intro") || n(s.courses) > 0,
    load: () => import("@/pages/site/school/AcademicsPage") },
  { id: "programmes", path: "programmes", label: L("Programmes", "प्रोग्राम"), nav: "main", footer: "resources", built: true,
    has: (s) => n(withText(s.courses, "name")) > 0, load: () => import("@/pages/site/school/ProgrammesPage") },
  { id: "faculty", path: "faculty", label: L("Faculty", "शिक्षक"), nav: "main", footer: "institute", built: true,
    has: (s) => n(withText(s.faculty, "name")) > 0, load: () => import("@/pages/site/school/FacultyPage") },
  { id: "facilities", path: "facilities", label: L("Campus", "कैंपस"), nav: "main", footer: "institute", built: true,
    has: (s) => n(s.facilities) + n(s.facilityDetails) >= 2, load: () => import("@/pages/site/school/FacilitiesPage") },
  { id: "boarding", path: "boarding", label: L("Boarding", "हॉस्टल"), nav: "main", footer: "institute", built: true,
    has: (s) => n(s.boarding?.houses) + n(s.boarding?.routine) + n(s.boarding?.topics) > 0,
    load: () => import("@/pages/site/school/BoardingPage") },
  { id: "safety", path: "safety", label: L("Safety and care", "सुरक्षा और देखभाल"), nav: "main", footer: "institute", built: true,
    has: (s) => n(withText(s.safety, "title")) >= 2, load: () => import("@/pages/site/school/SafetyPage") },
  { id: "student-life", path: "student-life", label: L("Student life", "छात्र जीवन"), nav: "main", footer: "institute", built: true,
    has: (s) => n(withText(s.studentLife, "title")) >= 2, load: () => import("@/pages/site/school/StudentLifePage") },
  { id: "results", path: "results", label: L("Results", "रिज़ल्ट"), nav: "main", footer: "resources", built: true,
    has: (s) => n(s.results) + n(s.boardResults) > 0, load: () => import("@/pages/site/school/ResultsPage") },
  { id: "gallery", path: "gallery", label: L("Gallery", "गैलरी"), nav: "main", footer: "resources", built: true,
    has: (s) => photoCount(s) >= 4, load: () => import("@/pages/site/school/GalleryPage") },
  { id: "news", path: "news", label: L("Notices and events", "सूचना और कार्यक्रम"), nav: "main", footer: "resources", built: true,
    has: (s, today) => liveNotices(s, today).length > 0, load: () => import("@/pages/site/school/NewsPage") },
  { id: "parents", path: "parents", label: L("Parents", "अभिभावक"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withUrl(s.portalLinks)) + n(s.academics?.calendar) + n(withUrl(s.downloads)) > 0,
    load: () => import("@/pages/site/school/ParentsPage") },
  { id: "transport", path: "transport", label: L("Transport", "ट्रांसपोर्ट"), nav: "footer", footer: "admissions", built: true,
    has: (s) => n(s.transport?.routes) > 0 || !!(s.contact?.transportDesk || "").trim(),
    load: () => import("@/pages/site/school/TransportPage") },
  { id: "disclosure", path: "disclosure", label: L("Mandatory Disclosure", "अनिवार्य सार्वजनिक जानकारी"), nav: "footer", footer: "legal", built: true, still: true,
    has: (s) => isCbseSchool(s), load: () => import("@/pages/site/school/DisclosurePage") },
  { id: "policies", path: "policies", label: L("Policies", "नीतियाँ"), nav: "footer", footer: "legal", built: true, still: true,
    has: (s) => (s.policies || []).some((p) => hasBi(p, "body") || (p.url || "").trim()),
    load: () => import("@/pages/site/school/PoliciesPage") },
  { id: "contact", path: "contact", label: L("Contact", "संपर्क"), nav: "main", footer: "institute", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/school/ContactPage") },
  { id: "sitemap", path: "sitemap", label: L("Sitemap", "साइटमैप"), nav: "footer", footer: "legal", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/SitemapPage") },
];

/* ── Coaching ────────────────────────────────────────────────────────────── */

export const COACHING_PAGES: SitePageDef<CoachingPageId>[] = [
  { id: "home", path: "", label: L("Home", "होम"), nav: "main", footer: "institute", built: true,
    has: () => true, load: () => import("@/pages/site/coaching/HomePage") },
  { id: "courses", path: "courses", label: L("Courses", "कोर्स"), nav: "main", footer: "admissions", built: true,
    has: (s) => n(withText(s.courses, "name")) > 0, load: () => import("@/pages/site/coaching/CoursesPage") },
  /* One page per course, never in the nav itself: the nav links Courses,
     and the course pages are linked from it, from the goal picker and from
     the footer's course list. */
  { id: "course", path: "courses/:course", label: L("Course", "कोर्स"), nav: "footer", footer: "admissions", built: true,
    has: (s) => n(withText(s.courses, "name")) > 0, load: () => import("@/pages/site/coaching/CoursePage") },
  { id: "results", path: "results", label: L("Results", "रिज़ल्ट"), nav: "main", footer: "resources", built: true,
    has: (s) => n(withText(s.results, "achievement")) + n(s.results?.filter((r) => r.count)) > 0,
    load: () => import("@/pages/site/coaching/ResultsPage") },
  { id: "faculty", path: "faculty", label: L("Faculty", "टीचर्स"), nav: "main", footer: "institute", built: true,
    has: (s) => n(withText(s.faculty, "name")) > 0, load: () => import("@/pages/site/coaching/FacultyPage") },
  { id: "test-series", path: "test-series", label: L("Test series", "टेस्ट सीरीज़"), nav: "main", footer: "resources", built: true,
    has: (s) => n(s.testSeries?.schedule) + n(s.testSeries?.types) > 0 || !!(s.testSeries?.platformUrl || "").trim(),
    load: () => import("@/pages/site/coaching/TestSeriesPage") },
  { id: "scholarship", path: "scholarship", label: L("Scholarship test", "स्कॉलरशिप टेस्ट"), nav: "main", footer: "admissions", built: true,
    has: (s) => hasBi(s.scholarship, "date"), load: () => import("@/pages/site/coaching/ScholarshipPage") },
  { id: "exam-calendar", path: "exam-calendar", label: L("Exam calendar", "परीक्षा कैलेंडर"), nav: "main", footer: "resources", built: true,
    has: (s) => n(s.govExams?.calendar) > 0, load: () => import("@/pages/site/coaching/ExamCalendarPage") },
  { id: "cut-offs", path: "cut-offs", label: L("Previous cut-offs", "पिछले कट-ऑफ"), nav: "main", footer: "resources", built: true,
    has: (s) => n(s.govExams?.cutoffs) > 0, load: () => import("@/pages/site/coaching/CutOffsPage") },
  { id: "olympiad", path: "olympiad", label: L("Olympiad", "ओलंपियाड"), nav: "main", footer: "resources", built: true,
    has: (s) => n(withText(s.olympiad?.exams, "title")) > 0, load: () => import("@/pages/site/coaching/OlympiadPage") },
  { id: "about", path: "about", label: L("About", "हमारे बारे में"), nav: "main", footer: "institute", built: true,
    has: (s) => hasBi(s, "about") || hasBi(s.founder, "story") || hasBi(s, "vision") || hasBi(s, "mission"),
    load: () => import("@/pages/site/coaching/AboutPage") },
  { id: "demo-class", path: "demo-class", label: L("Free demo class", "फ्री डेमो क्लास"), nav: "footer", footer: "admissions", built: true, still: true,
    has: (s) => hasBi(s.trial, "heading") || hasBi(s.trial, "body") || !!(s.contact?.phone || s.contact?.whatsapp || "").trim(),
    load: () => import("@/pages/site/coaching/DemoClassPage") },
  { id: "reviews", path: "reviews", label: L("Reviews", "रिव्यू"), nav: "footer", footer: "resources", built: true,
    has: (s) => (s.reviews || []).filter((r) => r.consent && hasBi(r, "quote")).length >= 3,
    load: () => import("@/pages/site/coaching/ReviewsPage") },
  { id: "blog", path: "blog", label: L("Blog", "ब्लॉग"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withText(s.posts, "title")) > 0, load: () => import("@/pages/site/coaching/BlogPage") },
  { id: "post", path: "blog/:post", label: L("Article", "लेख"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withText(s.posts, "title")) > 0, load: () => import("@/pages/site/coaching/PostPage") },
  { id: "faq", path: "faq", label: L("FAQs", "सवाल-जवाब"), nav: "footer", footer: "admissions", built: true,
    has: (s) => n(withText(s.faq, "title")) >= 3, load: () => import("@/pages/site/coaching/FaqPage") },
  { id: "gallery", path: "gallery", label: L("Gallery", "गैलरी"), nav: "footer", footer: "resources", built: true,
    has: (s) => photoCount(s) >= 6, load: () => import("@/pages/site/coaching/GalleryPage") },
  { id: "portal", path: "portal", label: L("Student portal", "स्टूडेंट पोर्टल"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withUrl(s.portalLinks)) > 0, load: () => import("@/pages/site/coaching/PortalPage") },
  { id: "fees-and-refunds", path: "fees-and-refunds", label: L("Fees and refunds", "फीस और रिफंड"), nav: "footer", footer: "legal", built: true, still: true,
    has: (s) => hasBi(s.feesPolicy, "refund"), load: () => import("@/pages/site/coaching/FeesPage") },
  { id: "contact", path: "contact", label: L("Contact", "संपर्क"), nav: "main", footer: "institute", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/coaching/ContactPage") },
  { id: "sitemap", path: "sitemap", label: L("Sitemap", "साइटमैप"), nav: "footer", footer: "legal", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/SitemapPage") },
];

/* ── Dental (28 Sep 2026) ────────────────────────────────────────────────── */

/* Footer groups are shared names; the dental footer labels them Clinic,
   Treatments and booking, Patients, Legal (src/pages/site/dental/shell). */

/** A doctor with a bio gets a page of their own. */
export const doctorHasPage = (d: { name?: string; bio?: string; hi?: { bio?: string } }) =>
  !!(d.name || "").trim() && hasBi(d, "bio");

const dn = (s: DemoSite) => s.dental || {};
const consentedReviews = (s: DemoSite) => (s.reviews || []).filter((r) => r.consent && hasBi(r, "quote")).length;

export const DENTAL_PAGES: SitePageDef<DentalPageId>[] = [
  { id: "home", path: "", label: L("Home", "होम"), nav: "main", footer: "institute", built: true,
    has: () => true, load: () => import("@/pages/site/dental/HomePage") },
  { id: "clinics", path: "clinics", label: L("Find a clinic", "क्लिनिक खोजें"), nav: "main", footer: "institute", built: true,
    has: (s) => n(withText(dn(s).branches, "name")) >= 2, load: () => import("@/pages/site/dental/ClinicsPage") },
  { id: "clinic", path: "clinics/:clinic", label: L("Clinic", "क्लिनिक"), nav: "footer", footer: "institute", built: true,
    has: (s) => n(withText(dn(s).branches, "name")) >= 2, load: () => import("@/pages/site/dental/ClinicPage") },
  { id: "treatments", path: "treatments", label: L("Treatments", "इलाज"), nav: "main", footer: "admissions", built: true,
    has: (s) => n(withText(dn(s).treatments, "name")) > 0, load: () => import("@/pages/site/dental/TreatmentsPage") },
  { id: "treatment", path: "treatments/:treatment", label: L("Treatment", "इलाज"), nav: "footer", footer: "admissions", built: true,
    has: (s) => n(withText(dn(s).treatments, "name")) > 0, load: () => import("@/pages/site/dental/TreatmentPage") },
  { id: "doctors", path: "doctors", label: L("Doctors", "डॉक्टर"), nav: "main", footer: "institute", built: true,
    has: (s) => n(withText(dn(s).doctors, "name")) > 0, load: () => import("@/pages/site/dental/DoctorsPage") },
  { id: "doctor", path: "doctors/:doctor", label: L("Doctor", "डॉक्टर"), nav: "footer", footer: "institute", built: true,
    has: (s) => (dn(s).doctors || []).some(doctorHasPage), load: () => import("@/pages/site/dental/DoctorPage") },
  { id: "before-after", path: "before-after", label: L("Before and after", "पहले और बाद"), nav: "main", footer: "resources", built: true,
    has: (s) => n(withText(dn(s).cases, "title")) > 0, load: () => import("@/pages/site/dental/BeforeAfterPage") },
  { id: "kids", path: "kids", label: L("Kids dentistry", "बच्चों के दाँत"), nav: "main", footer: "admissions", built: true,
    has: (s) => n(dn(s).kids?.firstVisit) + n(dn(s).kids?.ageBands) > 0, load: () => import("@/pages/site/dental/KidsPage") },
  { id: "reviews", path: "reviews", label: L("Reviews", "रिव्यू"), nav: "main", footer: "resources", built: true,
    has: (s) => consentedReviews(s) >= 3, load: () => import("@/pages/site/dental/ReviewsPage") },
  { id: "fees", path: "fees", label: L("Fees and EMI", "फीस और EMI"), nav: "main", footer: "admissions", built: true,
    has: (s) => n(withText(dn(s).fees, "treatment")) > 0, load: () => import("@/pages/site/dental/FeesPage") },
  { id: "technology", path: "technology", label: L("Technology", "तकनीक"), nav: "footer", footer: "institute", built: true,
    has: (s) => n(withText(dn(s).technology, "title")) >= 2, load: () => import("@/pages/site/dental/TechnologyPage") },
  { id: "emergency", path: "emergency", label: L("Emergency", "इमरजेंसी"), nav: "footer", footer: "admissions", built: true,
    has: (s) => hasBi(dn(s).emergency, "headline") || n(dn(s).emergency?.firstAid) > 0,
    load: () => import("@/pages/site/dental/EmergencyPage") },
  { id: "about", path: "about", label: L("About", "हमारे बारे में"), nav: "footer", footer: "institute", built: true,
    has: (s) => hasBi(s, "about") || n(dn(s).sterilisation) > 0, load: () => import("@/pages/site/dental/AboutPage") },
  { id: "international", path: "international", label: L("International patients", "विदेश से आने वाले मरीज़"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(dn(s).international?.steps) > 0, load: () => import("@/pages/site/dental/InternationalPage") },
  { id: "blog", path: "blog", label: L("Guides", "जानकारी"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withText(s.posts, "title")) > 0, load: () => import("@/pages/site/dental/BlogPage") },
  { id: "post", path: "blog/:post", label: L("Guide", "जानकारी"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withText(s.posts, "title")) > 0, load: () => import("@/pages/site/dental/PostPage") },
  { id: "faq", path: "faq", label: L("FAQs", "सवाल-जवाब"), nav: "footer", footer: "resources", built: true,
    has: (s) => n(withText(s.faq, "title")) >= 4, load: () => import("@/pages/site/dental/FaqPage") },
  { id: "book", path: "book", label: L("Book appointment", "अपॉइंटमेंट बुक करें"), nav: "footer", footer: "admissions", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/dental/BookPage") },
  { id: "contact", path: "contact", label: L("Contact", "संपर्क"), nav: "main", footer: "institute", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/dental/ContactPage") },
  /* Every dental demo carries a privacy notice (DENTAL-COMPLIANCE.md s4, s5):
     the booking consent line and the footer's Legal group link to it. It is a
     labelled TEMPLATE the clinic replaces with its own reviewed notice. */
  { id: "privacy", path: "privacy", label: L("Privacy notice", "प्राइवेसी नोटिस"), nav: "footer", footer: "legal", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/dental/PrivacyPage") },
  { id: "sitemap", path: "sitemap", label: L("Sitemap", "साइटमैप"), nav: "footer", footer: "legal", built: true, still: true,
    has: () => true, load: () => import("@/pages/site/SitemapPage") },
];

/* ── Lookups ─────────────────────────────────────────────────────────────── */

export function pagesOfKind(kind: DemoKind): SitePageDef[] {
  return kind === "dental" ? DENTAL_PAGES : kind === "coaching" ? COACHING_PAGES : SCHOOL_PAGES;
}

/** The segment's page list for a record: its own `sitePages`, else its template's, else all. */
export function pageSetFor(site: DemoSite): readonly string[] | null {
  if (site.sitePages && site.sitePages.length) return site.sitePages;
  const sets = { ...SCHOOL_PAGE_SETS, ...COACHING_PAGE_SETS, ...DENTAL_PAGE_SETS } as Record<string, readonly string[]>;
  return (site.templateId && sets[site.templateId]) || null;
}

/**
 * THE ONE LIST every link on a demo is generated from: pages that are built,
 * in this record's page set, and pass their minimum-data test. Home, and the
 * sitemap, always. In the page set's order when it has one.
 */
export function visiblePages(site: DemoSite, today: string): SitePageDef[] {
  const all = pagesOfKind(site.kind);
  const set = pageSetFor(site);
  /* Home, the sitemap and (dental) the privacy notice show whatever the page set says. */
  const always = (d: SitePageDef) => d.id === "home" || d.id === "sitemap" || d.id === "privacy";
  const allowed = (d: SitePageDef) => always(d) || !set || set.includes(d.id);
  const list = all.filter((d) => d.built && allowed(d) && d.has(site, today));
  if (!set) return list;
  const rank = (d: SitePageDef) => (d.id === "sitemap" ? 999 : d.id === "privacy" ? 998 : set.indexOf(d.id) < 0 ? 0 : set.indexOf(d.id));
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/**
 * Which page an address names. `rest` is the path after /site/<slug>/,
 * without slashes at either end. Returns the page and its parameter, or null
 * for an address that names nothing.
 */
export function matchPage(kind: DemoKind, rest: string): { def: SitePageDef; param?: string } | null {
  const parts = rest.split("/").filter(Boolean);
  for (const def of pagesOfKind(kind)) {
    const pp = def.path.split("/").filter(Boolean);
    if (pp.length !== parts.length) continue;
    let param: string | undefined;
    const ok = pp.every((seg, i) => {
      if (seg.startsWith(":")) {
        param = decodeURIComponent(parts[i]);
        return true;
      }
      return seg === parts[i];
    });
    if (ok) return { def, param };
  }
  return null;
}

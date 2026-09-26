/**
 * THE MULTI-PAGE FIELDS OF A DEMO SITE, for the /admin/c/demoSites form,
 * grouped by the page that reads them. Spread into the demoSites entry in
 * ./schemas.ts. Every field is optional; a page with nothing entered leaves
 * the site's nav on its own (src/lib/demo/site/pages.ts), so an empty group
 * here is never a hollow page there.
 *
 * HINDI. Every text a parent reads has a "Hindi (optional)" twin in a `hi`
 * group under the same key. The plain field is English. Leave the Hindi empty
 * and the Hindi page shows the English; never type Hindi into the English
 * field, which is how the old pages leaked Hindi onto the English page.
 */

import type { FieldConfig } from "./fields";
import { APPENDIX_IX } from "@/lib/demo/site/disclosure";

const text = (name: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({ name, label, type: "text", ...extra });
const area = (name: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({ name, label, type: "textarea", full: true, ...extra });
const list = (name: string, label: string, help?: string): FieldConfig => ({ name, label, type: "stringlist", full: true, help });
const hi = (keys: [string, string, ("text" | "textarea")?][]): FieldConfig => ({
  name: "hi", label: "Hindi (optional)", type: "group", full: true,
  help: "The same fields in Hindi. Empty shows the English on the Hindi page.",
  fields: keys.map(([k, l, t]) => ({ name: k, label: l, type: t || "text", full: t === "textarea" })),
});
const point = (name: string, label: string, help?: string): FieldConfig => ({
  name, label, type: "array", full: true, help,
  itemFields: [text("title", "Heading", { full: true }), area("body", "Body"), text("group", "Group"), hi([["title", "Heading"], ["body", "Body", "textarea"]])],
});
const dated = (name: string, label: string): FieldConfig => ({
  name, label, type: "array", full: true,
  itemFields: [text("title", "What", { full: true }), text("date", "When, as they write it"), area("body", "Detail"), hi([["title", "What"], ["date", "When"], ["body", "Detail", "textarea"]])],
});
const schedule = (name: string, label: string): FieldConfig => ({
  name, label, type: "array", full: true,
  itemFields: [text("label", "Row", { full: true }), text("days", "Days"), text("time", "Time"), text("subject", "Subject")],
});
const links = (name: string, label: string, help: string): FieldConfig => ({
  name, label, type: "array", full: true, help,
  itemFields: [text("label", "Label", { full: true }), text("url", "Address (https://...)", { full: true }), text("group", "Group"), hi([["label", "Label"]])],
});

export const DEMO_SITE_PAGE_FIELDS: FieldConfig[] = [
  /* ── The site ── */
  { name: "sitePages", label: "Pages this site offers", type: "tags", full: true,
    help: "Page ids in nav order (home, about, admissions, ...). Empty uses the template's list. A page still appears only when it has content." },
  { name: "defaultLang", label: "First language", type: "select", options: [{ label: "English", value: "en" }, { label: "Hindi first", value: "hi" }],
    help: "What a first-time visitor sees. The reader can still switch." },
  hi([["tagline", "Tagline"], ["about", "About", "textarea"], ["admissionsHeadline", "Admissions line"], ["principalMessage", "Principal's message", "textarea"],
    ["principalTitle", "Principal's title"], ["resultsHeading", "Results heading"], ["resultsNote", "Results note"], ["vision", "Vision", "textarea"],
    ["mission", "Mission", "textarea"], ["classSizePromise", "Class size promise"], ["hostel", "Hostel guidance", "textarea"], ["sessionLabel", "Session"]]),

  /* ── Admissions page ── */
  text("sessionLabel", "Admissions session", { placeholder: "2027-28", help: "Typed, never computed. Empty hides the session everywhere." }),
  text("admissionsOpenUntil", "Admissions open until", { placeholder: "YYYY-MM-DD", help: "The status chip hides itself after this date." }),
  point("joining", "How joining works (coaching)", "Three steps. Empty prints our generic three."),

  /* ── About page ── */
  area("vision", "Vision"),
  area("mission", "Mission"),
  text("udiseCode", "UDISE+ code (state board)"),
  text("classSizePromise", "Class size promise (coaching)", { placeholder: "40 students per batch" }),
  area("hostel", "Hostel and PG guidance (coaching)"),
  { name: "founder", label: "Founder (coaching About)", type: "group", full: true, fields: [
    text("name", "Name"), text("role", "Role"), area("story", "Story"), { name: "photo", label: "Photograph", type: "image", full: true },
    { name: "photoConsent", label: "We have written consent for this photograph", type: "boolean", full: true },
    hi([["role", "Role"], ["story", "Story", "textarea"]]),
  ] },

  /* ── Trust figures, reviews, photos ── */
  { name: "stats", label: "Trust figures (with a basis line)", type: "array", full: true,
    help: "Only figures they publish. A figure without a basis line never counts up.",
    itemFields: [text("value", "Figure", { placeholder: "1,080" }), text("label", "What it counts"), text("basis", "Basis", { full: true, placeholder: "CBSE Class XII, 2026, 212 appeared" }),
      hi([["label", "What it counts"], ["basis", "Basis"]])] },
  { name: "reviews", label: "Reviews", type: "array", full: true, help: "Real reviews only, with written consent for the name.",
    itemFields: [area("quote", "Quote"), text("name", "Name"), text("relation", "Relation", { placeholder: "Parent of a Class 8 student" }), text("rating", "Rating out of 5"),
      text("source", "Source"), text("videoUrl", "Video link"), { name: "consent", label: "Written consent held", type: "boolean" }, hi([["quote", "Quote", "textarea"], ["relation", "Relation"]])] },
  { name: "rating", label: "Public rating", type: "group", full: true, help: "Printed only with the count and the link.",
    fields: [text("value", "Rating"), text("count", "Number of reviews"), text("url", "Profile link", { full: true }), text("source", "Source")] },
  { name: "photos", label: "Photographs (with categories)", type: "array", full: true, help: "The Gallery page. Files you hold, or stock photos from the library (add them in the Photos panel above; their alt text comes from the library, so leave “What it shows” empty). Never caption a stock photo as their campus.",
    itemFields: [{ name: "src", label: "Photograph", type: "image", full: true }, text("alt", "What it shows", { full: true }), text("category", "Category"), text("caption", "Caption"),
      hi([["alt", "What it shows"], ["caption", "Caption"], ["category", "Category"]])] },
  links("portalLinks", "Portal and app links", "Links to THEIR real portal. Never a login form here."),
  links("downloads", "Downloads", "Model papers, syllabus, TC form, book list."),
  { name: "policies", label: "Policies", type: "array", full: true,
    itemFields: [text("title", "Title", { full: true }), area("body", "Text"), text("url", "PDF link", { full: true }), hi([["title", "Title"], ["body", "Text", "textarea"]])] },
  /* ── School pages ── */
  { name: "academics", label: "Academics page (school)", type: "group", full: true, fields: [
    area("intro", "Introduction"), point("stages", "Stages or programme continuum"), area("assessment", "Assessment"),
    dated("calendar", "Academic calendar and holidays"), links("downloads", "Academic downloads", "Syllabus, model papers."),
    hi([["intro", "Introduction", "textarea"], ["assessment", "Assessment", "textarea"]]),
  ] },
  point("facilityDetails", "Facilities in detail (school Campus page)"),
  { name: "boardResults", label: "Board results, CBSE Appendix IX columns", type: "array", full: true,
    help: "One row per year and class, exactly as published.",
    itemFields: [text("year", "Year"), text("className", "Class", { placeholder: "X or XII" }), text("registered", "Registered"), text("passed", "Passed"), text("passPercent", "Pass %"), text("note", "Note", { full: true })] },
  { name: "transport", label: "Transport page (school)", type: "group", full: true, fields: [
    area("intro", "Introduction"),
    { name: "routes", label: "Routes", type: "array", full: true, help: "Stops and timings. Never a driver's name or number.",
      itemFields: [text("name", "Route", { full: true }), list("stops", "Stops"), text("pickup", "Morning pick-up"), text("drop", "Afternoon drop")] },
    list("safety", "Safety facts", "Only what is true: GPS, attendant, speed governor."), text("feeNote", "Fee note", { full: true }),
    hi([["intro", "Introduction", "textarea"], ["feeNote", "Fee note"]]),
  ] },
  { name: "boarding", label: "Boarding page (residential)", type: "group", full: true, fields: [
    area("intro", "Introduction"), point("houses", "Houses"), schedule("routine", "Daily routine"),
    point("topics", "Food, health, pastoral care, visits, what to pack"), dated("termDates", "Term dates"), point("howToReach", "How to reach"),
    hi([["intro", "Introduction", "textarea"]]),
  ] },
  point("studentLife", "Student life (clubs, sports, houses)"),
  point("safety", "Safety and care (play school)"),
  schedule("dayPlan", "A day at the play school"),
  { name: "disclosure", label: "Mandatory Public Disclosure (CBSE Appendix IX)", type: "group", full: true,
    help: "A row left empty prints \"To be uploaded\". The page appears only for a CBSE school with an affiliation number.",
    fields: [
      { name: "rows", label: "Rows", type: "group", full: true,
        fields: APPENDIX_IX.flatMap((sec) => sec.rows.map((r) => ({
          name: r.id, label: `${sec.id}. ${r.label.en}`, type: "group" as const, full: true,
          fields: [text("value", "Value"), text("url", r.shape === "document" ? "Document link (PDF)" : "Link, if any")],
        }))) },
      text("annualReportUrl", "Annual report link", { full: true }), text("lastUpdated", "Last updated", { placeholder: "YYYY-MM-DD" }),
    ] },

  /* ── Coaching pages ── */
  { name: "testSeries", label: "Test series page (coaching)", type: "group", full: true, fields: [
    area("intro", "Introduction"), point("types", "Test types"), schedule("schedule", "Schedule"), area("pattern", "Pattern"),
    links("downloads", "Downloads", "Sample paper, OMR sheet, previous papers."), text("platformUrl", "Their test platform", { full: true, help: "A link. No simulated analytics." }),
    hi([["intro", "Introduction", "textarea"], ["pattern", "Pattern", "textarea"]]),
  ] },
  { name: "scholarship", label: "Scholarship test page (coaching)", type: "group", full: true, fields: [
    text("name", "Test name"), text("date", "Date"), text("mode", "Mode"), list("centres", "Centres"), area("eligibility", "Eligibility"), area("syllabus", "Syllabus"),
    point("rewards", "Rewards"), text("registerUrl", "Registration link", { full: true }), text("resultDate", "Result date"), point("faq", "Questions"),
    hi([["name", "Test name"], ["date", "Date"], ["mode", "Mode"], ["eligibility", "Eligibility", "textarea"], ["syllabus", "Syllabus", "textarea"], ["resultDate", "Result date"]]),
  ] },
  { name: "posts", label: "Blog posts (coaching)", type: "array", full: true,
    itemFields: [text("title", "Title", { full: true }), text("slug", "Address", { placeholder: "derived from the title" }), text("date", "Date"), text("author", "Author"),
      area("excerpt", "Excerpt"), area("body", "Body", { help: "Paragraphs separated by a blank line." }), hi([["title", "Title"], ["excerpt", "Excerpt", "textarea"], ["body", "Body", "textarea"]])] },
  { name: "govExams", label: "Exam calendar and cut-offs (SSC, Banking, Railways)", type: "group", full: true, fields: [
    { name: "calendar", label: "Exam calendar", type: "array", full: true, itemFields: [text("exam", "Exam"), text("notification", "Notification"), text("examDate", "Exam date")] },
    text("calendarSource", "Calendar source", { full: true, placeholder: "ssc.gov.in calendar 2026-27" }), text("calendarUpdated", "Calendar last updated", { placeholder: "YYYY-MM-DD" }),
    { name: "cutoffs", label: "Previous cut-offs", type: "array", full: true, itemFields: [text("exam", "Exam"), text("year", "Year"), text("category", "Category"), text("cutoff", "Cut-off")] },
    text("cutoffSource", "Cut-off source", { full: true }),
    { name: "eligibility", label: "Eligibility and age", type: "array", full: true, itemFields: [text("exam", "Exam"), text("age", "Age"), text("qualification", "Qualification", { full: true })] },
  ] },
  { name: "olympiad", label: "Olympiad page (foundation)", type: "group", full: true, fields: [
    area("intro", "Introduction"), point("exams", "Olympiads prepared for"), schedule("schedule", "Practice schedule"), list("medals", "Medals, as published"),
    hi([["intro", "Introduction", "textarea"]]),
  ] },
  { name: "feesPolicy", label: "Fees, refunds and disclosure (coaching)", type: "group", full: true,
    help: "The MoE 2024 guidelines ask for fees, refunds and counts on the site. The page appears once a refund policy is entered.",
    fields: [
      area("intro", "Introduction"), list("paymentModes", "Payment modes"), area("instalmentNote", "Instalments"), area("refund", "Refund policy"),
      area("receipts", "Receipts"), area("noIncrease", "Fee increase during a course"), area("hostel", "Hostel and mess refunds"),
      text("studentsCoached", "Students coached"), text("studentsSucceeded", "Students succeeded"), text("countsYear", "For the year"),
      hi([["intro", "Introduction", "textarea"], ["instalmentNote", "Instalments", "textarea"], ["refund", "Refund policy", "textarea"],
        ["receipts", "Receipts", "textarea"], ["noIncrease", "Fee increase", "textarea"], ["hostel", "Hostel refunds", "textarea"]]),
    ] },
];

/**
 * Extra fields for the EXISTING item lists (courses, notices, faculty,
 * results, faq, admissions), appended to their itemFields in ./schemas.ts.
 */
export const DEMO_SITE_ITEM_EXTRAS: Record<"courses" | "notices" | "faculty" | "results" | "faq" | "admissions", FieldConfig[]> = {
  courses: [
    text("slug", "Page address", { placeholder: "derived from the name" }), text("category", "Goal chip", { placeholder: "JEE, NEET, SSC" }),
    area("eligibility", "Eligibility"), point("syllabus", "Syllabus units"), list("material", "Study material"), area("testPlan", "Test plan"),
    { name: "instalments", label: "Instalments", type: "array", full: true, itemFields: [text("label", "Instalment"), text("amount", "Amount"), text("note", "Due")] },
    list("inclusions", "Included in the fee"), area("refundNote", "Refund line"), { name: "facultyNames", label: "Teachers (names as in Faculty)", type: "tags", full: true },
    point("faq", "Course questions"),
    hi([["name", "Course"], ["level", "Who it is for"], ["subjects", "Subjects"], ["duration", "Duration"], ["timings", "Timings"], ["mode", "Mode"],
      ["detail", "Detail", "textarea"], ["eligibility", "Eligibility", "textarea"], ["testPlan", "Test plan", "textarea"], ["feeNote", "Fee note"], ["batchStarts", "Next batch"]]),
  ],
  notices: [
    { name: "kind", label: "Notice or event", type: "select", options: [{ label: "Notice", value: "notice" }, { label: "Event", value: "event" }] },
    text("posted", "Posted on", { placeholder: "YYYY-MM-DD" }), text("expires", "Expires on", { placeholder: "YYYY-MM-DD" }), text("url", "Circular link", { full: true }),
    hi([["title", "Notice"], ["date", "Date"], ["body", "Body", "textarea"]]),
  ],
  faculty: [
    text("role", "Role"), text("group", "Group", { placeholder: "PGT, TGT, PRT, Leadership" }), text("batches", "Batches taken"), text("style", "How they teach", { full: true }),
    hi([["subject", "Subject"], ["qualification", "Qualification"], ["experience", "Experience"], ["role", "Role"], ["style", "How they teach"]]),
  ],
  results: [
    text("category", "Filter chip"), text("courseName", "Course taken (CCPA)"), text("courseDuration", "Course duration (CCPA)"),
    { name: "paid", label: "Paid or scholarship (CCPA)", type: "select", options: [{ label: "", value: "" }, { label: "Paid", value: "paid" }, { label: "Scholarship", value: "scholarship" }, { label: "Free", value: "free" }] },
    { name: "consent", label: "Written consent for name, photo and quote, taken after the result", type: "boolean", full: true },
    area("quote", "Quote"), text("count", "Selection count (government exams)"), text("status", "Final or Provisional"), text("destination", "University destination"), text("country", "Country"),
    hi([["achievement", "Result"], ["note", "Note"], ["quote", "Quote", "textarea"], ["courseName", "Course taken"]]),
  ],
  faq: [text("group", "Group", { placeholder: "Admissions, Fees, Transport" }), hi([["title", "Question"], ["body", "Answer", "textarea"], ["group", "Group"]])],
  admissions: [
    dated("timeline", "Dated process"),
    { name: "fees", label: "Fee table", type: "array", full: true, itemFields: [text("label", "Item"), text("amount", "Amount"),
      { name: "period", label: "How often", type: "select", options: [{ label: "One-time", value: "one-time" }, { label: "Annual", value: "annual" }, { label: "Per term", value: "term" }, { label: "Monthly", value: "monthly" }, { label: "Also payable", value: "also" }] },
      text("note", "Note"), hi([["label", "Item"], ["note", "Note"]])] },
    text("feeNote", "Fee note", { full: true }),
    { name: "ageRules", label: "Age rules for the checker", type: "array", full: true, help: "Leave empty to hide the checker. NEP: Nursery 3+, Class 1 6+ as on 31 March; check the state's rule.",
      itemFields: [text("className", "Class"), text("minAge", "Minimum age"), text("maxAge", "Maximum age")] },
    text("ageAsOn", "Ages counted as on", { placeholder: "31 March" }), area("rteNote", "RTE 25% line"), text("applyUrl", "Their online form", { full: true }),
    text("whoCanApply", "Who can apply", { full: true }), area("assessment", "Entrance test or interaction"),
    hi([["dates", "Dates"], ["note", "Note", "textarea"], ["feeNote", "Fee note"], ["rteNote", "RTE line", "textarea"], ["whoCanApply", "Who can apply"], ["assessment", "Entrance test", "textarea"]]),
  ],
};

/**
 * The demoSites form, with the multi-page fields: the extras appended to the
 * existing lists and groups, and the page groups inserted before "Built on".
 */
export function withDemoPageFields(fields: FieldConfig[]): FieldConfig[] {
  const out = fields.map((f) => {
    const extra = DEMO_SITE_ITEM_EXTRAS[f.name as keyof typeof DEMO_SITE_ITEM_EXTRAS];
    if (!extra) return f;
    if (f.type === "array") return { ...f, itemFields: [...(f.itemFields || []), ...extra] };
    if (f.type === "group") return { ...f, fields: [...(f.fields || []), ...extra] };
    return f;
  });
  const at = out.findIndex((f) => f.name === "preparedOn");
  return at < 0 ? [...out, ...DEMO_SITE_PAGE_FIELDS] : [...out.slice(0, at), ...DEMO_SITE_PAGE_FIELDS, ...out.slice(at)];
}

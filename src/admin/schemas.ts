import type { FieldConfig } from "./fields";
import { withDemoPageFields } from "./DemoSitesPagesSchema";
import type { CollectionKey, SingletonKey } from "@/lib/cms/types";
import { nextId } from "@/lib/cms/store";
import { PITCH_PACKAGES } from "@/lib/pitch/record";

export interface CollectionSchema {
  label: string;
  singular: string;
  icon: string;
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  fields: FieldConfig[];
  defaults: () => Record<string, any>;
}

export interface SingletonSchema {
  label: string;
  icon: string;
  fields: FieldConfig[];
}

const mediaFields: FieldConfig[] = [
  { name: "src", label: "Image", type: "image", full: true },
  { name: "alt", label: "Alt text", type: "text" },
];

/**
 * The package dropdown, built from the canonical price table so the admin
 * cannot offer a package that does not exist and cannot show a price that
 * disagrees with /pricing. Cheapest first, per the presentation rule in
 * _assets/FACTS.md.
 *
 * Both markets are in one list, labelled, rather than two lists that switch on
 * the Market field: a select whose options change under you while you are
 * reading them is worse than a longer list. `pitchPackage()` returns null when
 * a record's package belongs to the other market, so the page never quotes
 * rupees to a prospect in Manchester.
 */
const PITCH_PACKAGE_OPTIONS = [
  { label: "(none yet, the page prints no price)", value: "" },
  ...PITCH_PACKAGES.map((p) => ({
    label: `${p.market === "india" ? "India" : "International"}: ${p.label}, ${p.range}`,
    value: p.id,
  })),
];

export const collectionSchemas: Partial<Record<CollectionKey, CollectionSchema>> = {
  services: {
    label: "Services", singular: "Service", icon: "LayoutGrid", titleField: "title", subtitleField: "shortDescription",
    defaults: () => ({ id: nextId("svc"), title: "", slug: "", icon: "Code", category: "Web", shortDescription: "", longDescription: "", deliverables: [], showOnHome: true, showInFooter: true }),
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "slug", label: "Slug", type: "text", help: "URL: /services/slug" },
      { name: "icon", label: "Lucide icon name", type: "text", placeholder: "Code, PenTool, Globe…" },
      { name: "category", label: "Category", type: "select", options: ["Web", "Design", "Marketing", "Mobile"].map((v) => ({ label: v, value: v })) },
      { name: "shortDescription", label: "Short description (card)", type: "textarea", full: true },
      { name: "longDescription", label: "Long description", type: "textarea", full: true },
      { name: "deliverables", label: "Deliverables", type: "stringlist", full: true },
      { name: "showOnHome", label: "Show on home", type: "boolean" },
      { name: "showInFooter", label: "Show in footer", type: "boolean" },
    ],
  },
  projects: {
    label: "Projects", singular: "Project", icon: "FolderKanban", titleField: "title", subtitleField: "clientName", imageField: "coverImage",
    defaults: () => ({ id: nextId("prj"), title: "", slug: "", category: "web", sector: "", clientName: "", summary: "", technologies: [], challenge: "", solution: "", results: [], coverImage: "", gallery: [], liveUrl: "", featured: false, body: "" }),
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "category", label: "Category", type: "text", placeholder: "web, product, employer work", help: "Drives which band the project sits in on /work. “web” = paid client work, “product” = ours, “employer work” = the founder’s work for another company. Anything else falls into a generic “More” band." },
      { name: "sector", label: "Sector", type: "text", placeholder: "Fitness · marketplace" },
      { name: "clientName", label: "Client", type: "text" },
      { name: "liveUrl", label: "Live URL", type: "text" },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "coverImage", label: "Cover image", type: "image", full: true },
      { name: "summary", label: "Summary", type: "textarea", full: true },
      { name: "technologies", label: "Technologies", type: "tags", full: true },
      { name: "challenge", label: "Challenge", type: "textarea", full: true },
      { name: "solution", label: "Solution", type: "textarea", full: true },
      { name: "tryThis", label: "Try this", type: "textarea", full: true, help: "One concrete thing a reader can go and look at on the live site. Never a claim." },
      { name: "results", label: "Results (measured only)", type: "array", full: true, help: "Leave empty unless the figure was actually measured, with the tool and the date. An invented number is worse than no number.", itemFields: [
        { name: "metric", label: "Metric", type: "text" }, { name: "label", label: "Label", type: "text" },
      ] },
      { name: "evidence", label: "True, with nothing to measure", type: "stringlist", full: true, help: "Binary facts a stranger can verify in fifteen seconds: the site is live, the cart works, the limits are stated on the page." },
      { name: "noClaims", label: "What this does NOT claim", type: "textarea", full: true, help: "Printed on the case study. Says out loud which numbers are the client’s own and which we are not taking credit for." },
      { name: "noImageReason", label: "Why there is no image", type: "textarea", full: true, help: "Shown in place of a cover when there is none, so an empty card reads as a decision rather than a broken asset." },
      { name: "noLiveUrlReason", label: "Why there is no live link", type: "textarea", full: true, help: "Printed where the “Visit live site” button would have been. Fill this instead of leaving a dead URL in Live URL: a link that goes nowhere costs more than no link." },
      { name: "gallery", label: "Gallery", type: "array", full: true, itemFields: mediaFields },
    ],
  },
  testimonials: {
    label: "Testimonials", singular: "Testimonial", icon: "Quote", titleField: "authorName", subtitleField: "authorCompany",
    defaults: () => ({ id: nextId("tst"), quote: "", authorName: "", authorPosition: "", authorCompany: "", authorPhoto: { src: "", alt: "" }, rating: 5, featured: true }),
    fields: [
      { name: "quote", label: "Quote", type: "textarea", full: true },
      { name: "authorName", label: "Author name", type: "text" },
      { name: "authorPosition", label: "Position", type: "text" },
      { name: "authorCompany", label: "Company", type: "text" },
      { name: "rating", label: "Rating (1-5)", type: "number" },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "authorPhoto", label: "Photo", type: "group", full: true, fields: mediaFields },
    ],
  },
  team: {
    label: "Team", singular: "Member", icon: "Users", titleField: "name", subtitleField: "role", imageField: "photo",
    defaults: () => ({ id: nextId("tm"), name: "", role: "", bio: "", photo: { src: "", alt: "" }, socials: [], visible: true }),
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "visible", label: "Visible", type: "boolean" },
      { name: "bio", label: "Bio", type: "textarea", full: true },
      { name: "photo", label: "Photo", type: "group", full: true, fields: mediaFields },
      { name: "socials", label: "Socials", type: "array", full: true, itemFields: [
        { name: "platform", label: "Platform", type: "text" }, { name: "url", label: "URL", type: "text" }, { name: "icon", label: "Icon", type: "text" },
      ] },
    ],
  },
  milestones: {
    label: "Milestones", singular: "Milestone", icon: "Milestone", titleField: "title", subtitleField: "year",
    defaults: () => ({ id: nextId("ms"), year: "", title: "", description: "" }),
    fields: [
      { name: "year", label: "Year", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea", full: true },
    ],
  },
  process: {
    label: "Process", singular: "Step", icon: "ListOrdered", titleField: "title", subtitleField: "number",
    defaults: () => ({ id: nextId("ps"), number: "", title: "", description: "" }),
    fields: [
      { name: "number", label: "Number", type: "text", placeholder: "01" },
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea", full: true },
    ],
  },
  faqs: {
    label: "FAQs", singular: "FAQ", icon: "HelpCircle", titleField: "question", subtitleField: "category",
    defaults: () => ({ id: nextId("faq"), question: "", answer: "", category: "services" }),
    fields: [
      { name: "question", label: "Question", type: "text", full: true },
      { name: "answer", label: "Answer", type: "textarea", full: true },
      { name: "category", label: "Category", type: "select", options: ["services", "eduflow", "internship", "general"].map((v) => ({ label: v, value: v })) },
    ],
  },
  stats: {
    label: "Stats", singular: "Stat", icon: "BarChart3", titleField: "label", subtitleField: "value",
    defaults: () => ({ id: nextId("st"), value: 0, suffix: "", label: "" }),
    fields: [
      { name: "value", label: "Value", type: "number" },
      { name: "suffix", label: "Suffix", type: "text", placeholder: "%, +, h" },
      { name: "label", label: "Label", type: "text", full: true },
    ],
  },
  clients: {
    label: "Clients", singular: "Client", icon: "Building2", titleField: "name", imageField: "logo",
    defaults: () => ({ id: nextId("cl"), name: "", logo: { src: "", alt: "" }, url: "" }),
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "url", label: "URL", type: "text" },
      { name: "logo", label: "Logo", type: "group", full: true, fields: mediaFields },
    ],
  },
  socials: {
    label: "Social Links", singular: "Link", icon: "Share2", titleField: "label", subtitleField: "url",
    defaults: () => ({ id: nextId("soc"), platform: "", label: "", url: "", icon: "Link" }),
    fields: [
      { name: "label", label: "Label", type: "text" },
      { name: "platform", label: "Platform", type: "text" },
      { name: "icon", label: "Lucide icon", type: "text", placeholder: "Linkedin, Instagram…" },
      { name: "url", label: "URL", type: "text", full: true },
    ],
  },
  posts: {
    label: "Blog Posts", singular: "Post", icon: "Newspaper", titleField: "title", subtitleField: "author", imageField: "coverImage",
    defaults: () => ({ id: nextId("post"), title: "", slug: "", excerpt: "", coverImage: "", body: "<p></p>", author: "Ideovent Team", publishDate: new Date().toISOString().slice(0, 10), tags: [], status: "published", featured: false }),
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["published", "draft"].map((v) => ({ label: v, value: v })) },
      { name: "author", label: "Author", type: "text" },
      { name: "publishDate", label: "Publish date", type: "text", placeholder: "YYYY-MM-DD" },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "coverImage", label: "Cover image", type: "image", full: true },
      { name: "excerpt", label: "Excerpt", type: "textarea", full: true },
      { name: "tags", label: "Tags", type: "tags", full: true },
      { name: "body", label: "Body (HTML)", type: "richtext", full: true, help: "HTML is allowed and sanitized on render." },
    ],
  },

  /**
   * PITCH PAGES. The field list below is the form; the LIST and the row
   * actions are not the generic CollectionEditor's, because this collection
   * needs things no other one does: a slug that is checked against the real
   * route table before it can be saved, duplicate (the fastest way to make the
   * next one), set live / archive, and a copy-link button that yields the full
   * https:// address to paste into WhatsApp.
   *
   * So `src/pages/admin/AdminCollection.tsx` routes /admin/c/pitchPages to
   * `src/admin/PitchPagesEditor.tsx`, which reads THIS schema for the form. The
   * entry stays here so the sidebar, the dashboard and the CollectionKey union
   * all treat it like every other collection.
   *
   * `slug` is deliberately NOT in this list. It is not a text box: it is
   * generated from the institute's name and validated against every route on
   * the site, so the editor renders it itself.
   */
  pitchPages: {
    label: "Pitch pages", singular: "Pitch page", icon: "Send", titleField: "instituteName", subtitleField: "slug",
    defaults: () => ({
      id: nextId("pp"),
      slug: "",
      status: "draft",
      instituteName: "",
      instituteType: "school",
      market: "india",
      // International only. Ignored by the India design, see the fields below.
      vertical: "other", timezone: "", locale: "", bookingUrl: "",
      city: "", state: "", country: "India",
      directorName: "", directorTitle: "",
      teamNames: [],
      currentWebsite: "",
      observedProblems: [],
      proposedScope: [],
      recommendedPackage: "",
      heroImage: "", logo: "",
      preparedOn: new Date().toISOString().slice(0, 10),
      validUntil: "",
    }),
    fields: [
      { name: "instituteName", label: "Institute name", type: "text", full: true, help: "Spell it exactly as they spell it, including “The” and any suffix. This is the heading of their page and it is the first thing they will check." },
      { name: "instituteType", label: "What they are", type: "select", options: [{ label: "School", value: "school" }, { label: "Coaching institute", value: "coaching" }], help: "A school sells admissions and trust. A coaching institute sells results and batches. The page argues differently for each." },
      { name: "market", label: "Market", type: "select", options: [{ label: "India", value: "india" }, { label: "International", value: "international" }], help: "Chooses which of the two page designs renders, and which price table applies." },

      /* ── International records only ────────────────────────────────────
         The India design never reads any of these four and a record left on
         "India" is unaffected by them. The international design computes the
         real working overlap between the reader's day and our published
         hours from the timezone, and prints the answer even when the answer
         is that there is none, so a wrong zone shows up as a visibly wrong
         page rather than a quietly wrong one. Both zone and locale may be
         left empty: the page falls back to a default for the country.
         ──────────────────────────────────────────────────────────────── */
      { name: "vertical", label: "Their trade (international)", type: "select", options: [
        { label: "Dental practice", value: "dental" },
        { label: "Law firm", value: "legal" },
        { label: "Accounting firm", value: "accounting" },
        { label: "Fitness studio", value: "fitness" },
        { label: "Trades company", value: "trades" },
        { label: "Something else", value: "other" },
      ], help: "Decides the language of the “what you would get” list: new-patient bookings for a dental practice, consultation requests for a law firm, trial signups for a gym. “Something else” is a real answer and reads fine." },
      { name: "timezone", label: "Their timezone (international)", type: "text", placeholder: "America/Chicago", help: "An IANA name, e.g. America/New_York, Europe/London, Asia/Dubai, Australia/Sydney. Leave empty and the country’s default is used, which for the US and Australia means the east coast. Get it right for a west-coast prospect: the page tells them what time it is where they are." },
      { name: "locale", label: "Their date format (international)", type: "select", options: [
        { label: "Use the country default", value: "" },
        { label: "United States, September 25, 2026", value: "en-US" },
        { label: "United Kingdom, 25 September 2026", value: "en-GB" },
        { label: "Australia, 25 September 2026", value: "en-AU" },
        { label: "Canada", value: "en-CA" },
        { label: "Ireland", value: "en-IE" },
      ], help: "Dates and clock times on the page follow this. An American reader meeting “25 September 2026” reads it as foreign, on a page whose whole job is to read as local." },
      { name: "bookingUrl", label: "Call booking link (international)", type: "text", full: true, placeholder: "https://calendly.com/…", help: "FILL THIS BEFORE SENDING THE LINK. Left empty, the page prints a visible [[CALENDLY_URL]] blank where the button would be. That is on purpose and it is the right trade: a dead button on a cold page confirms every suspicion the page exists to answer, and a loud blank is caught by you rather than by them." },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "country", label: "Country", type: "text" },
      { name: "directorName", label: "Director’s name", type: "text", help: "ONLY if you read it off their own website or listing. Leave it empty otherwise: the page has a tested path without it, and a wrong name above the fold proves the page was a template blast." },
      { name: "directorTitle", label: "Their title", type: "text", placeholder: "Principal · Director · Chairman", help: "Their word for the job, not ours." },
      { name: "teamNames", label: "A few names from their team", type: "stringlist", full: true, help: "Optional, and usually empty. Same rule as the director: read, never guessed." },
      { name: "currentWebsite", label: "Their website today", type: "text", full: true, placeholder: "https://…", help: "Leave empty if they do not have one. The page then says so plainly, which is a stronger opening than pretending otherwise." },
      { name: "observedProblems", label: "What is wrong with it today", type: "array", full: true, help: "Specific and checkable. “Nine seconds to open on 4G” wins the meeting; “your site is bad” loses it. An empty list is fine: the page then says nothing about their site rather than guessing.", itemFields: [
        { name: "title", label: "The problem, in about six words", type: "text", full: true },
        { name: "detail", label: "One or two sentences", type: "textarea", full: true },
        { name: "measuredBy", label: "How it was checked", type: "text", full: true, placeholder: "PageSpeed Insights, mobile, 24 Sep 2026", help: "REQUIRED whenever the line above contains a number. A figure with no tool and no date beside it is a sales claim, and they can open their own site and disagree with it." },
      ] },
      { name: "proposedScope", label: "What we would build", type: "stringlist", full: true, help: "Bullets, in their language. Four to eight reads best on a phone." },
      { name: "recommendedPackage", label: "Recommended package", type: "select", options: PITCH_PACKAGE_OPTIONS, help: "The price is NOT stored on this record. It is read from the one canonical table (_assets/FACTS.md, and the same figures /pricing shows) whenever the page renders, so a pitch page can never quote a number the rest of the site has moved on from. A bespoke figure belongs in the written scope." },
      { name: "preparedOn", label: "Prepared on", type: "text", placeholder: "YYYY-MM-DD", help: "Printed small on the page so it is not undated." },
      { name: "validUntil", label: "Valid until", type: "text", placeholder: "YYYY-MM-DD", help: "Optional. After this date the page softens the offer rather than hiding it." },
      { name: "logo", label: "Their logo", type: "image", full: true, help: "Only a file you actually have. Never hotlinked from their site." },
      { name: "heroImage", label: "Hero image", type: "image", full: true },
    ],
  },

  /**
   * DEMO SITES. The institute's OWN website, already built, under their own
   * name, at /site/<slug>. Mehdi sends the link and says "dekhiye, aapke liye
   * ye website banayi hai". It is not a proposal and it is not the pitch page
   * above: that one argues about their current site and quotes a price, and
   * the two go out in different conversations.
   *
   * Like pitchPages, the LIST is its own component (src/admin/DemoSitesEditor)
   * because a demo needs things no generic editor has: a slug validated
   * against the route table AND against every pitch slug, search and filters
   * built for thirty rows, an important toggle, an open count, and the edit
   * lock that stops a sent demo being silently overwritten. This entry is the
   * FORM, plus the sidebar label and the dashboard count.
   *
   * `slug`, `status` and `kind` are deliberately NOT in this list. Each is
   * rendered by the editor itself: the slug because it is validated, the
   * status because changing it to Sent asks who it went to, and the kind
   * because it decides which of the two templates renders and there is no
   * safe default to fall back on.
   *
   * EVERY HELP STRING IN THE CONTACT BLOCK SAYS THE SAME THING IN DIFFERENT
   * WORDS, AND THAT REPETITION IS ON PURPOSE. A phone number invented to make
   * a demo look finished is a real stranger's phone ringing, at a number a
   * parent found on what they believed was a school's website.
   */
  demoSites: {
    label: "Demo sites", singular: "Demo site", icon: "MonitorSmartphone",
    titleField: "instituteName", subtitleField: "slug", imageField: "heroImage",
    defaults: () => ({
      id: nextId("ds"),
      slug: "",
      status: "draft",
      kind: "school",
      instituteName: "",
      shortName: "", tagline: "",
      market: "india", currency: "INR",
      city: "", state: "", country: "India",
      logo: "", heroImage: "",
      focusAreas: [],
      established: "", establishedYear: "", boardOrAffiliation: "",
      about: "",
      principalName: "", principalTitle: "", principalMessage: "",
      facilities: [],
      admissionsHeadline: "",
      admissions: { steps: [], documents: [], dates: "", note: "" },
      notices: [],
      gallery: [],
      courses: [],
      resultsHeading: "", resultsNote: "",
      /* NEVER PRE-FILLED, and this empty array is the reason the field exists
         in the defaults at all: so nobody is tempted to "seed it with a couple
         of representative rows". A rank or a selection count that the
         institute did not publish is the single most damaging thing a demo can
         carry. A parent might act on it. */
      results: [],
      faculty: [],
      method: [],
      faq: [],
      schedule: [], scheduleNote: "",
      contact: { phone: "", whatsapp: "", email: "", addressLines: [], hours: "", mapUrl: "", mapQuery: "" },
      officialWebsite: "",
      preparedOn: new Date().toISOString().slice(0, 10),
      expiresAt: "",
    }),
    /* The multi-page fields are added by withDemoPageFields, grouped by page:
       see ./DemoSitesPagesSchema.ts. */
    fields: withHindiName(withDemoPageFields([
      { name: "instituteName", label: "Institute name", type: "text", full: true, help: "Spell it exactly as they spell it. This is the masthead of what they will believe is their own website, so a wrong spelling is the first and last thing they notice." },
      { name: "shortName", label: "Short name", type: "text", help: "For the navigation bar when the full name will not fit: “HighQ” for “HighQ Classes”. Leave empty to use the full name." },
      { name: "tagline", label: "Tagline", type: "text", help: "Their own line if they have one. Left empty the template prints an obvious placeholder, which is correct: an invented motto put under a real school’s name is words in their mouth." },

      { name: "market", label: "Market", type: "select", options: [{ label: "India", value: "india" }, { label: "International", value: "international" }], help: "Changes the sections and the language, not the styling. An Indian institute talks about boards and admission; an international one about grade levels and a first free session." },
      /* No "Colours" field. `palette` is superseded by `theme` (see DemoSite
         in src/lib/cms/types.ts) and neither renderer reads it, so a select
         for it changed nothing on the page while its help told Mehdi to vary
         it per demo. On a fresh template duplicate it showed "Crimson" beside
         a marigold page. The Look below is what sets the colours. */
      /* THE LOOK. One select for both templates, because the field is one
         field on the record. Each template ignores an id that belongs to the
         other and falls back to its own default, so a school id on a coaching
         record renders the Board look rather than a blank page. The ids are
         the ones in src/lib/demo/coachingThemes.ts and schoolThemes.ts, and
         they never change in place: a demo already sent keeps its look. */
      { name: "theme", label: "Look", type: "select", options: [
        { label: "Template default", value: "" },
        /* The multi-page looks (src/lib/demo/site/themes.ts). A record on one
           of these renders the multi-page site; the looks below them keep
           their single page, unchanged, for demos already sent. */
        { label: "Multi-page school: Metro (Modern, split hero with admissions card)", value: "metro" },
        { label: "Multi-page school: Atlas (Modern, full-bleed, programme strip)", value: "atlas" },
        { label: "Multi-page school: Aangan (Warm, notice first, lightest)", value: "aangan" },
        { label: "Multi-page school: Crayon (Warm, arched photo window, play school)", value: "crayon" },
        { label: "Multi-page school: Pinewood (Classic, masthead, boarding)", value: "pinewood" },
        { label: "Multi-page school: Almanac (Classic, title page, oxblood on bone)", value: "almanac" },
        { label: "Multi-page coaching: Podium (Modern, next batches beside the headline)", value: "podium" },
        { label: "Multi-page coaching: Timetable (Modern, next three exams)", value: "timetable" },
        { label: "Multi-page coaching: Register (Classic, masthead and register line, lightest)", value: "register" },
        { label: "Multi-page coaching: Folio (Classic, title page, faculty high)", value: "folio" },
        { label: "Multi-page coaching: Courtyard (Warm, question headline, pills)", value: "courtyard" },
        { label: "Coaching: Board (crimson on ink, heavy, ledger rows)", value: "ledger" },
        { label: "Coaching: Signal (indigo and cyan, hairline type, tiles)", value: "signal" },
        { label: "Coaching: Studio (teal and amber, book weight, single column)", value: "studio" },
        { label: "Coaching: Marks (amber on graphite, monospace, departure board)", value: "marks" },
        { label: "Coaching: Bulletin (plum and brick, spaced caps, notices first)", value: "bulletin" },
        { label: "School: Heritage", value: "heritage" },
        { label: "School: Modern campus", value: "modern-campus" },
        { label: "School: Bright and busy", value: "bright" },
        { label: "School: Quiet campus", value: "quiet-campus" },
        { label: "School: Riverside", value: "riverside" },
      ], help: "Five looks per template, and they are five designs, not five colours. Pick the one that matches the Kind above; the other template's looks are listed so a record can be flipped between kinds without losing its choice. Send two institutes in the same city two different looks." },
      { name: "currency", label: "Currency for fees", type: "select", options: [
        { label: "Indian rupee, ₹", value: "INR" },
        { label: "US dollar, $", value: "USD" },
        { label: "Pound sterling, £", value: "GBP" },
        { label: "UAE dirham, AED", value: "AED" },
        { label: "Australian dollar, A$", value: "AUD" },
      ], help: "The symbol only. A fee is typed as the amount alone, so one demo can never print two currencies." },

      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "country", label: "Country", type: "text" },

      { name: "established", label: "Established", type: "text", placeholder: "Since 2009", help: "Only if it is on their own site or their own signboard." },
      { name: "establishedYear", label: "Year founded", type: "text", placeholder: "2009", help: "The year alone, when that is all you have." },
      { name: "boardOrAffiliation", label: "Board or affiliation", type: "text", full: true, placeholder: "CBSE affiliation no. 2730123 · Cambridge Assessment International Education", help: "COPY IT, NEVER GUESS IT. An affiliation number is checkable in a public register, which is exactly why an invented one is the most damaging line on the whole page: a parent can look it up, find it false, and reasonably read it as fraud. Leave it empty if you did not read it off their own material." },
      { name: "about", label: "About the institute", type: "textarea", full: true, help: "Two or three sentences, in their voice, from their own site. Empty is fine and the template has a real design for it." },

      /* ── The school half ────────────────────────────────────────────── */
      { name: "principalName", label: "Principal’s name", type: "text", help: "ONLY if you read it off their own website, listing or board. Empty otherwise: a name invented above a message proves the page was a template." },
      { name: "principalTitle", label: "Their title", type: "text", placeholder: "Principal · Head of School · Director", help: "Their word for the job, not ours." },
      { name: "principalMessage", label: "Principal’s message", type: "textarea", full: true, help: "PASTE THEIRS OR LEAVE IT EMPTY. This is the field most likely to tempt you, because every school site has one and a plausible one takes two minutes to write. A message the head did not write, printed over the head’s name, on a page their own parents will read, is putting words in a real person’s mouth. The template has a designed empty state." },
      { name: "facilities", label: "Facilities", type: "stringlist", full: true, help: "Their list, from their own site: “Science laboratories”, “Library”, “Transport”. Not a stock list of what a school usually has." },
      { name: "admissionsHeadline", label: "Admissions line", type: "text", full: true, placeholder: "Admissions for 2027-28 open on 4 January", help: "The one dated line under the header. EXACTLY AS THEY PUBLISH IT, or empty: the page then says to ask about the current session. An invented date is one a parent acts on." },
      { name: "admissions", label: "Admissions", type: "group", full: true, fields: [
        { name: "steps", label: "The steps", type: "stringlist", full: true, help: "“Enquire”, “Visit the campus”, “Submit the form”. Three steps and nothing else is a complete section." },
        { name: "documents", label: "Documents to bring", type: "stringlist", full: true, help: "Never invented. A wrong list sends a parent to the office with the wrong papers." },
        { name: "dates", label: "Dates", type: "text", full: true, placeholder: "Forms open 5 January to 20 February", help: "Exactly as they publish it. A made-up closing date is the same mistake with a deadline attached." },
        { name: "note", label: "Anything else", type: "textarea", full: true, help: "A fee for the form, an age cut-off, anything that does not fit above." },
      ] },

      { name: "notices", label: "Notices", type: "array", full: true, help: "What the office would post: a holiday, a PTM, a test date, a fee reminder. Newest first. Pin one at most.", itemFields: [
        { name: "title", label: "Notice", type: "text", full: true },
        { name: "date", label: "Date, as they write it", type: "text", placeholder: "15 January · From Monday" },
        { name: "pinned", label: "Pin this one", type: "boolean" },
        { name: "body", label: "One or two sentences", type: "textarea", full: true },
      ] },

      /* ── The coaching half ──────────────────────────────────────────── */
      { name: "focusAreas", label: "What they teach", type: "tags", full: true, placeholder: "JEE, NEET, Foundation", help: "Drives the line under the name on the home page." },
      { name: "courses", label: "Courses and batches", type: "array", full: true, help: "The section that does the work. A fee is the amount only: the symbol comes from the Currency field above.", itemFields: [
        { name: "name", label: "Course", type: "text", full: true, placeholder: "JEE Main and Advanced, two year" },
        { name: "level", label: "Who it is for", type: "text", placeholder: "Class 11 to 12" },
        { name: "subjects", label: "Subjects", type: "text", placeholder: "Physics, Chemistry, Maths" },
        { name: "duration", label: "Duration", type: "text", placeholder: "24 months" },
        { name: "timings", label: "Timings", type: "text", placeholder: "Mon to Sat, 6:00 to 8:30 pm" },
        { name: "mode", label: "Mode", type: "text", placeholder: "Classroom · Online · Hybrid" },
        { name: "batchStarts", label: "Next batch", type: "text", placeholder: "Starts 12 April", help: "Only if they publish it. Never a date you picked." },
        { name: "seats", label: "Batch size", type: "text", placeholder: "24 students per batch" },
        { name: "fee", label: "Fee, amount only", type: "text", placeholder: "45,000", help: "Digits only, no symbol. Anything that does not start with a digit, like “On request”, is printed word for word." },
        { name: "feeNote", label: "Fee note", type: "text", placeholder: "per year, payable in three instalments" },
        { name: "detail", label: "One or two lines", type: "textarea", full: true },
      ] },
      { name: "faculty", label: "Faculty", type: "array", full: true, help: "In coaching the teacher is the product, so this section sits early. A teacher's own photograph renders ONLY when consent is ticked. A stock portrait from the library (set in the Photos panel) needs no consent: it is a licensed model, not their teacher.", itemFields: [
        { name: "name", label: "Name", type: "text", full: true },
        { name: "subject", label: "Subject", type: "text" },
        { name: "qualification", label: "Qualification", type: "text", placeholder: "M.Sc. Physics, Delhi University", help: "Their own line, copied. Never upgraded to something that sounds better." },
        { name: "experience", label: "Experience", type: "text", placeholder: "11 years teaching JEE Physics" },
        { name: "note", label: "Note", type: "textarea", full: true },
        { name: "photo", label: "Photograph", type: "image", full: true },
        { name: "photoConsent", label: "We have written consent for this photograph", type: "boolean", full: true, help: "The page shows no photograph without this. “We will crop it later” is not a mechanism." },
      ] },
      { name: "method", label: "Why us / how we teach", type: "array", full: true, itemFields: [
        { name: "title", label: "Heading", type: "text", full: true },
        { name: "body", label: "Body", type: "textarea", full: true },
      ] },
      { name: "schedule", label: "Timetable", type: "array", full: true, itemFields: [
        { name: "label", label: "Batch", type: "text", full: true, placeholder: "Class 11 JEE, Batch A" },
        { name: "days", label: "Days", type: "text", placeholder: "Mon, Wed, Fri" },
        { name: "time", label: "Time", type: "text", placeholder: "6:00 to 8:30 pm" },
        { name: "subject", label: "Subject", type: "text" },
        { name: "faculty", label: "Teacher", type: "text" },
        { name: "room", label: "Room", type: "text" },
      ] },
      { name: "scheduleNote", label: "Timetable note", type: "text", full: true },
      { name: "trial", label: "Free trial or demo class", type: "group", full: true, fields: [
        { name: "heading", label: "Heading", type: "text", full: true },
        { name: "body", label: "Body", type: "textarea", full: true },
        { name: "duration", label: "How long", type: "text", placeholder: "90 minutes" },
        { name: "bring", label: "What to bring", type: "text", placeholder: "A notebook and your last school report" },
        { name: "howToBook", label: "How to book", type: "text", full: true },
      ] },
      { name: "faq", label: "Questions parents ask", type: "array", full: true, help: "Their answers, not ours. The fee question lives here, which is why the page prints only one “from” figure elsewhere. A demo made from a template keeps only the general questions; check every answer is true for this institute.", itemFields: [
        { name: "title", label: "Question", type: "text", full: true },
        { name: "body", label: "Answer", type: "textarea", full: true },
      ] },

      /* ── Results ────────────────────────────────────────────────────── */
      { name: "resultsHeading", label: "Results heading", type: "text", placeholder: "Our 2025 results" },
      { name: "resultsNote", label: "Results note", type: "text", full: true, help: "How the list is verified, or where it came from." },
      { name: "results", label: "Published results", type: "array", full: true, help: "LEAVE THIS EMPTY UNLESS THE INSTITUTE PUBLISHED THE NUMBERS THEMSELVES, and then copy them exactly. Nothing here is ever rounded, made representative or filled in to make the section look complete. An invented rank or selection count is a claim about a named child that a parent may act on, and the template is designed to read well with no results at all.", itemFields: [
        { name: "achievement", label: "The result, as they print it", type: "text", full: true, placeholder: "AIR 1,284 · NEET 648/720 · 96.4% CBSE Class 12" },
        { name: "studentName", label: "Student’s name", type: "text", help: "Only with the student’s consent, and only as the institute itself prints it." },
        { name: "exam", label: "Exam", type: "text", placeholder: "JEE Advanced" },
        { name: "year", label: "Year", type: "text", placeholder: "2025" },
        { name: "note", label: "Note", type: "text", full: true },
        { name: "photo", label: "Photograph", type: "image", full: true },
        { name: "photoConsent", label: "We have written consent for this photograph", type: "boolean", full: true, help: "No photograph renders without it. A student’s face on a site they did not agree to is the most damaging thing a demo could carry." },
      ] },

      /* ── Pictures ───────────────────────────────────────────────────── */
      { name: "logo", label: "Their logo", type: "image", full: true, help: "Only a file you actually have. Never linked from their own site: the build fails on a hotlink, and a logo served from their server disappears the day they notice." },
      /* heroImage is edited in the Photos panel at the top of the form
         (src/admin/DemoPhotoSlots.tsx), with the section photos and the
         faculty portraits. */
      { name: "gallery", label: "Gallery (captions and files)", type: "array", full: true, help: "Stock photos from the template are marked in the Photos panel above. Replace them with the institute's own files before the demo goes out: a stock classroom must never be captioned as their campus.", itemFields: mediaFields },

      /* ── Their own contact details ──────────────────────────────────── */
      { name: "contact", label: "Their contact details: add from their own website", type: "group", full: true, fields: [
        { name: "phone", label: "Phone, as they print it", type: "text", placeholder: "Add from their own website", help: "COPIED FROM THEIR OWN SITE OR SIGNBOARD, OR LEFT EMPTY. Never a plausible number, never one digit changed, never “probably”. A wrong number here is published on a page a parent believes is the school’s, and the calls go to a real stranger. Empty leaves the phone row off the pages." },
        { name: "whatsapp", label: "WhatsApp, digits only", type: "text", placeholder: "Add from their own website", help: "With the country code, no spaces or plus. Same rule: theirs, or empty." },
        { name: "email", label: "Email", type: "text", placeholder: "Add from their own website", help: "Theirs, copied. Not a guess at the pattern." },
        { name: "addressLines", label: "Address", type: "stringlist", full: true, help: "One line per line, exactly as they write it." },
        { name: "hours", label: "Office hours", type: "text", full: true, placeholder: "Mon to Sat, 9 am to 7 pm" },
        { name: "mapUrl", label: "Map link", type: "text", full: true, placeholder: "Add from their own website", help: "Their own maps listing. Not a pin you dropped." },
        { name: "mapQuery", label: "Map search, if there is no link", type: "text", full: true, placeholder: "Holy Cross School, Patna", help: "Used to build a “find us” search when there is no listing. A search rather than a pin on purpose: a guessed pin puts a school on a stranger’s roof." },
      ] },
      { name: "officialWebsite", label: "Their real website", type: "text", full: true, placeholder: "https://…", help: "The demo marker links to it, so anyone who lands here by accident can reach the actual institute in one click instead of mistaking this page for it. Leave empty if they have none; the marker then says so." },

      { name: "preparedOn", label: "Built on", type: "text", placeholder: "YYYY-MM-DD" },
      { name: "expiresAt", label: "Expires on", type: "text", placeholder: "YYYY-MM-DD", help: "OPTIONAL, and most demos have none. After this date the link stops showing the site and shows a short, polite card with your number on it instead. Use it when you want a demo to stop being live without having to remember to close it." },
    ])),
  },
};

export const singletonSchemas: Record<SingletonKey, SingletonSchema> = {
  settings: {
    label: "Site Settings", icon: "Settings",
    fields: [
      { name: "siteName", label: "Site name", type: "text" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "logo", label: "Logo", type: "image", full: true },
      { name: "favicon", label: "Favicon", type: "text" },
      { name: "defaultSeo", label: "Default SEO", type: "group", full: true, fields: [
        { name: "title", label: "Default title", type: "text", full: true },
        { name: "description", label: "Default description", type: "textarea", full: true },
        { name: "keywords", label: "Keywords", type: "tags", full: true },
        { name: "ogImage", label: "OG image", type: "image", full: true },
        { name: "twitterHandle", label: "Twitter handle", type: "text" },
        { name: "canonicalHost", label: "Canonical host", type: "text" },
      ] },
      { name: "leadPopup", label: "Enquiry pop-up", type: "group", full: true, help: "The small card that appears in the bottom corner after the visitor has spent this long reading (only while the tab is on screen, counted across pages). Never on /contact, /admin, demos, pitch pages, certificates, legal pages or the 404. Once somebody closes it, or sends any enquiry, it never appears in their browser again.", fields: [
        { name: "enabled", label: "Show the pop-up", type: "boolean" },
        { name: "delaySeconds", label: "Seconds of reading before it appears", type: "number", placeholder: "60", help: "Default 60. Anything under 10 is treated as 10 and anything over 600 as 600: a pop-up that arrives before the page has been read is the one people close without reading." },
        { name: "heading", label: "Heading", type: "text", full: true, help: "A question the visitor can answer with one tap. No exclamation marks, no em dashes." },
        { name: "subheading", label: "Line under the heading", type: "textarea", full: true, help: "Say what happens next and who replies. Nothing you cannot keep." },
      ] },
      { name: "demoOpenAlerts", label: "E-mail me when a sent demo is opened", type: "boolean", full: true, help: "On by default. When somebody opens a sent demo at /site/<slug>, an e-mail titled \"Demo opened: <institute>\" reaches the enquiry inbox. At most once per demo per browser per day, never for drafts, never while you are signed in to the admin in that browser. The Outreach settings tab changes this same switch." },
    ],
  },
  contact: {
    label: "Contact / NAP", icon: "Phone",
    fields: [
      { name: "phoneDisplay", label: "Phone (display)", type: "text" },
      { name: "phoneHref", label: "Phone link (tel:)", type: "text" },
      { name: "emailDisplay", label: "Email (display)", type: "text" },
      { name: "emailHref", label: "Email link (mailto:)", type: "text" },
      { name: "whatsappNumber", label: "WhatsApp number", type: "text", help: "Digits only, incl. country code" },
      { name: "businessHours", label: "Business hours", type: "text", full: true },
      { name: "responseTimePromise", label: "Response promise", type: "text", full: true },
      { name: "mapEmbedUrl", label: "Map embed URL", type: "text", full: true },
      { name: "address", label: "Address", type: "group", full: true, fields: [
        { name: "line1", label: "Line 1", type: "text" }, { name: "city", label: "City", type: "text" },
        { name: "state", label: "State", type: "text" }, { name: "postalCode", label: "Postal code", type: "text" },
        { name: "country", label: "Country", type: "text" },
      ] },
    ],
  },
  home: {
    label: "Home Hero", icon: "Home",
    fields: [
      { name: "badge", label: "Badge", type: "text", full: true },
      { name: "headingLines", label: "Heading lines", type: "array", full: true, itemFields: [
        { name: "text", label: "Text", type: "text" }, { name: "highlighted", label: "Accent (italic gradient)", type: "boolean" },
      ] },
      { name: "subheading", label: "Subheading", type: "textarea", full: true },
      { name: "audience", label: "Who it is for", type: "textarea", full: true, help: "The 'for whom' line under the headline. Keep it concrete: the markets named in FACTS.md, nothing wider. This is one of the three questions the home page has to answer above the fold on a phone." },
      { name: "otherBuyers", label: "Line for non-schools", type: "group", full: true, help: "One quiet line under the subheading for businesses and firms abroad, with a link to /services.", fields: [
        { name: "text", label: "Text", type: "textarea", full: true },
        { name: "link", label: "Link", type: "group", full: true, fields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        ] },
      ] },
      { name: "ctas", label: "Buttons", type: "array", full: true, itemFields: [
        { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        { name: "variant", label: "Variant", type: "select", options: ["primary", "outline", "secondary", "ghost"].map((v) => ({ label: v, value: v })) },
      ] },
      { name: "priceTeaser", label: "Price block (home page, 'What it costs' section)", type: "group", full: true, help: "The 'roughly what it costs' answer. Not in the hero: it sits lower on the home page, after the work and the process. EVERY RANGE HERE MUST MATCH /pricing AND THE INDIA TABLE IN FACTS.md. Lowest first.", fields: [
        { name: "heading", label: "Heading", type: "text" },
        { name: "rows", label: "Rows", type: "array", full: true, itemFields: [
          { name: "label", label: "What", type: "text" }, { name: "range", label: "Range", type: "text" },
        ] },
        { name: "more", label: "Line under the rows", type: "textarea", full: true, help: "Care plan, custom software, outside India. Same FACTS.md figures." },
        { name: "note", label: "Caveat line", type: "textarea", full: true, help: "Must keep the word 'indicative'. Ideovent is not registered under GST, so 'non-GST' belongs here too." },
        { name: "link", label: "Link to full pricing", type: "group", full: true, fields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        ] },
        { name: "link2", label: "Second link (free check)", type: "group", full: true, fields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        ] },
      ] },
      { name: "socialProof", label: "Social proof", type: "group", full: true, fields: [
        { name: "line1", label: "Line 1", type: "text" }, { name: "line2", label: "Line 2", type: "text" },
        { name: "avatars", label: "Avatars", type: "array", full: true, itemFields: mediaFields },
      ] },
      { name: "stat", label: "Stat", type: "group", fields: [
        { name: "value", label: "Value", type: "text" }, { name: "label", label: "Label", type: "text" },
      ] },
    ],
  },
  navigation: {
    label: "Navigation", icon: "Menu",
    fields: [
      { name: "header", label: "Header", type: "group", full: true, fields: [
        { name: "items", label: "Nav items", type: "array", full: true, itemFields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
          { name: "panel", label: "Mega-menu panel", type: "select", full: true,
            options: [
              { label: "None, plain link", value: "" },
              { label: "Every service, grouped by category", value: "services" },
              { label: "Every project, grouped as on /work", value: "projects" },
              { label: "A hand-written list (fill in Panel groups below)", value: "links" },
            ],
            help: "Leave this on \"None\" unless the panel earns its keep. \"Services\" and \"Projects\" build themselves from those collections, so a service or project added in the admin appears in the menu on its own, with its own one-line description. Only \"A hand-written list\" needs the groups below." },
          { name: "panelGroups", label: "Panel groups (hand-written panels only)", type: "array", full: true, itemFields: [
            { name: "heading", label: "Column heading", type: "text" },
            { name: "links", label: "Links", type: "array", full: true, itemFields: [
              { name: "label", label: "Label", type: "text" },
              { name: "href", label: "Link", type: "text" },
              { name: "description", label: "One line under the label", type: "textarea", full: true },
            ] },
          ] },
          { name: "panelFooter", label: "Row along the bottom of the panel", type: "array", full: true,
            help: "Where the panel sends someone who wants the whole picture: the overview page, the price, the FAQ.",
            itemFields: [
              { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
            ] },
        ] },
        { name: "cta", label: "CTA button", type: "group", full: true, fields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        ] },
      ] },
      { name: "footer", label: "Footer", type: "group", full: true, fields: [
        { name: "tagline", label: "Tagline", type: "textarea", full: true },
        { name: "columns", label: "Columns", type: "array", full: true, itemFields: [
          { name: "heading", label: "Heading", type: "text" },
          { name: "links", label: "Links", type: "array", full: true, itemFields: [
            { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
          ] },
        ] },
      ] },
    ],
  },
  internship: {
    label: "LaunchPad (internship)", icon: "GraduationCap",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text", full: true },
      { name: "subtitle", label: "Subtitle", type: "textarea", full: true },
      { name: "batchLabel", label: "Batch label", type: "text", full: true, help: "LEAVE BLANK between batches. Fill it only while a batch is genuinely open (e.g. \"2 places · starts 3 Nov · applications close 20 Oct\") and clear it again when they close. \"Next batch enrolling now\" is false whenever it is not a batch window." },
      { name: "certificatePreviewImage", label: "Certificate preview", type: "image", full: true, help: "EMPTY ON PURPOSE. This used to be a crop of Ankit Kumar’s real certificate (his name, his dates and a partner’s handwritten signature) used as the hero image of the page selling the programme. The hero now renders a SPECIMEN drawn from the real template instead. Never put a real person’s certificate here. If you upload anything, it must be a specimen." },
      { name: "benefits", label: "What you get (cards)", type: "array", full: true, itemFields: [
        { name: "icon", label: "Icon", type: "text" }, { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },
      { name: "curriculum", label: "Curriculum blocks", type: "array", full: true, itemFields: [
        { name: "week", label: "Weeks", type: "text" }, { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },
      { name: "notPromisedHeading", label: "\"What this is not\" heading", type: "text", full: true },
      { name: "notPromised", label: "What this is NOT", type: "stringlist", full: true, help: "No job. No placement. Never \"placement assistance\", \"top performers may receive job offers\" or \"industry-recognised\". Ideovent places nobody." },
      { name: "artefacts", label: "The five shipped artefacts", type: "array", full: true, itemFields: [
        { name: "title", label: "Artefact", type: "text" }, { name: "description", label: "When and where", type: "textarea", full: true }, { name: "ownership", label: "Whose it is", type: "text" },
      ] },
      { name: "rubric", label: "Assessment rubric (100 marks)", type: "array", full: true, itemFields: [
        { name: "component", label: "Component", type: "text" }, { name: "marks", label: "Marks", type: "text" }, { name: "evidence", label: "Evidence used", type: "textarea", full: true },
      ] },
      { name: "rubricNote", label: "Rubric note (the two hard gates)", type: "textarea", full: true },
      { name: "mentors", label: "Who mentors you", type: "array", full: true, help: "Name them. \"Senior developers\" and \"the team\" are headcount claims in disguise and FACTS.md forbids stating a team size.", itemFields: [
        { name: "name", label: "Name", type: "text" }, { name: "role", label: "Role", type: "text" }, { name: "responsibility", label: "What they do on the programme", type: "textarea", full: true },
      ] },
      { name: "selection", label: "How selection works", type: "array", full: true, itemFields: [
        { name: "step", label: "Step", type: "text" }, { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },
      { name: "certifiedIds", label: "Certificate IDs issued", type: "stringlist", full: true, help: "EXACTLY the certificates that exist, two, INT2025A73 and INT2025A74. Each one is rendered as a live /verify link, so an ID that has not been issued would 404 in public." },
      { name: "certifiedNote", label: "Note under the certificates", type: "textarea", full: true },
      { name: "pricing", label: "Commitment fee", type: "group", full: true, fields: [
        { name: "amount", label: "Amount", type: "text" }, { name: "label", label: "Label", type: "text" }, { name: "note", label: "Note", type: "text" },
      ] },
      { name: "feeGate", label: "When the fee becomes payable", type: "textarea", full: true, help: "Never collect payment before a place is offered. Taking a fee from someone who will be rejected is the fastest way to become the thing college placement cells warn students about." },
      { name: "paymentLink", label: "Payment link", type: "text", full: true },
      { name: "checklist", label: "What happens next", type: "stringlist", full: true },
      { name: "terms", label: "Terms & good faith", type: "stringlist", full: true },
    ],
  },

  /* EduFlow is IN DEVELOPMENT. The fields with no seed value are the ones
   * nobody has decided yet: the page hides each line until its field is
   * filled, so it never shows a placeholder token to a visitor and never
   * invents a number to fill the gap. */
  eduflow: {
    label: "EduFlow", icon: "GraduationCap",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text", full: true },
      { name: "title", label: "H1", type: "textarea", full: true },
      { name: "subtitle", label: "Sub-heading", type: "textarea", full: true },
      { name: "honestyLine", label: "Honesty line (hero)", type: "textarea", full: true, help: "Sits directly under the sub-heading, above the fold. It is not optional: removing it to make the page \"stronger\" makes the page dishonest and every other claim on it suspect." },
      { name: "microLine", label: "Micro-line under the buttons", type: "textarea", full: true },
      { name: "ctas", label: "Hero buttons", type: "array", full: true, itemFields: [
        { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        { name: "variant", label: "Variant", type: "select", options: ["primary", "outline", "secondary", "ghost"].map((v) => ({ label: v, value: v })) },
      ] },

      { name: "problemHeading", label: "Problem, heading", type: "text", full: true },
      { name: "problemIntro", label: "Problem, intro", type: "textarea", full: true },
      { name: "problemCards", label: "Problem, three cards", type: "array", full: true, itemFields: [
        { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },
      { name: "problemClosing", label: "Problem, closing line", type: "textarea", full: true },

      { name: "whatHeading", label: "What it is, heading", type: "text", full: true },
      { name: "whatBody", label: "What it is, body", type: "textarea", full: true },
      { name: "roles", label: "Role cards (office / teachers / parents)", type: "array", full: true, itemFields: [
        { name: "audience", label: "Audience", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },

      { name: "modulesHeading", label: "Modules, heading", type: "text", full: true },
      { name: "modulesIntro", label: "Modules, intro", type: "textarea", full: true },
      { name: "modules", label: "Modules", type: "array", full: true, help: "Status: three values only. Built, In progress, Planned. \"Built\" means you would let a principal click it themselves without narrating around a crash. If you cannot name the week it becomes Built, it is Planned. 08-eduflow/FEATURE-MATRIX.md is the record.", itemFields: [
        { name: "name", label: "Module", type: "text" }, { name: "benefit", label: "What it changes in the office", type: "textarea", full: true }, { name: "status", label: "Status", type: "text" },
      ] },
      { name: "modulesFootnote", label: "Modules, footnote", type: "textarea", full: true },

      { name: "stepsHeading", label: "How it works, heading", type: "text", full: true },
      { name: "stepsIntro", label: "How it works, intro", type: "textarea", full: true },
      { name: "steps", label: "How it works, steps", type: "array", full: true, itemFields: [
        { name: "number", label: "Number", type: "text" }, { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },

      { name: "todayHeading", label: "Status panel, heading", type: "text", full: true },
      { name: "todayBody", label: "Status panel, body", type: "textarea", full: true },
      { name: "workingToday", label: "Working today", type: "text", full: true, help: "BLANK = the row is hidden. One short phrase naming only what is actually Built, e.g. \"student records, fee collection and attendance\". Nothing that is not Built may be named here." },
      { name: "targetDate", label: "Target availability", type: "text", full: true, help: "BLANK = the row is hidden." },
      { name: "demoUrl", label: "Demo URL", type: "text", full: true, help: "BLANK = the page prints \"Demo not yet available\" instead of a button. Never link a button to nothing, and never write \"demo on request\"." },
      { name: "roadmapUrl", label: "Public roadmap URL", type: "text", full: true, help: "BLANK = the row is hidden." },
      { name: "todayAlternative", label: "The alternative to waiting", type: "textarea", full: true },

      { name: "earlyAccessEyebrow", label: "Early access, eyebrow", type: "text", full: true },
      { name: "earlyAccessHeading", label: "Early access, heading", type: "text", full: true },
      { name: "earlyAccessBody", label: "Early access, body", type: "textarea", full: true },
      { name: "pilotSeats", label: "Pilot seats", type: "text", help: "BLANK = no number is shown and the copy still reads. Decide it ONCE: 05-pricing/EDUFLOW-PRICING.md §7 and 08-eduflow/EARLY-ACCESS-PROGRAM.md §1 currently disagree. It is the scarcity claim, so a wrong number is the one thing a prospect can catch you on later." },
      { name: "pilotPrice", label: "Pilot price", type: "text", help: "BLANK = hidden. Without it the CTA has nothing behind it." },
      { name: "pilotMonths", label: "Pilot months", type: "text", help: "BLANK = hidden." },
      { name: "parallelRunWeeks", label: "Parallel-run weeks", type: "text", help: "BLANK = hidden. How long the school runs its register alongside EduFlow before trusting it." },
      { name: "youGet", label: "What you get", type: "stringlist", full: true },
      { name: "weAsk", label: "What we ask", type: "stringlist", full: true },

      { name: "ctaHeading", label: "Closing CTA, heading", type: "text", full: true },
      { name: "ctaBody", label: "Closing CTA, body", type: "textarea", full: true },
      { name: "footnote", label: "Footer strip", type: "textarea", full: true },
    ],
  },
  legal: {
    label: "Legal", icon: "Scale",
    fields: [
      { name: "privacy", label: "Privacy Policy", type: "group", full: true, fields: [
        { name: "title", label: "Title", type: "text" }, { name: "updatedAt", label: "Updated", type: "text" }, { name: "body", label: "Body (HTML)", type: "richtext", full: true },
      ] },
      { name: "terms", label: "Terms of Service", type: "group", full: true, fields: [
        { name: "title", label: "Title", type: "text" }, { name: "updatedAt", label: "Updated", type: "text" }, { name: "body", label: "Body (HTML)", type: "richtext", full: true },
      ] },
      { name: "refund", label: "Refund & Cancellation Policy", type: "group", full: true, fields: [
        { name: "title", label: "Title", type: "text" }, { name: "updatedAt", label: "Updated", type: "text" }, { name: "body", label: "Body (HTML)", type: "richtext", full: true },
      ] },
      { name: "disclaimer", label: "Disclaimer", type: "group", full: true, fields: [
        { name: "title", label: "Title", type: "text" }, { name: "updatedAt", label: "Updated", type: "text" }, { name: "body", label: "Body (HTML)", type: "richtext", full: true },
      ] },
    ],
  },
};

/**
 * The institute's name in Devanagari, first in the site's "Hindi (optional)"
 * group. The Hindi page puts it in the header, masthead, footer and page
 * titles; empty keeps the English name there. A duplicate fills it from the
 * Hindi name typed in the Duplicate dialog.
 */
function withHindiName(fields: FieldConfig[]): FieldConfig[] {
  let done = false;
  return fields.map((f) => {
    if (done || f.name !== "hi" || f.type !== "group") return f;
    done = true;
    const name: FieldConfig = {
      name: "instituteName", label: "Institute name in Hindi", type: "text", full: true,
      help: "Exactly as they write it in Hindi, e.g. ज्ञान ज्योति विद्यालय. Empty shows the English name on the Hindi page too.",
    };
    return { ...f, fields: [name, ...(f.fields || [])] };
  });
}

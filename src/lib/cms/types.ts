/**
 * Ideovent CMS, content model.
 * Every user-facing string on the site is a field here so it can be edited from /admin.
 * The same shape is used by the local (seed + localStorage) store and the Supabase store.
 */

export type ID = string;

export interface Media {
  src: string;
  alt?: string;
}

export interface Cta {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export interface SeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  keywords?: string[];
}

export interface BaseDoc {
  id: ID;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/* ───────────────── Singletons ───────────────── */

export interface SiteSettings {
  siteName: string;
  logo: string;
  favicon: string;
  tagline: string;
  defaultSeo: Required<Pick<SeoMeta, "title" | "description">> & {
    keywords: string[];
    ogImage: string;
    twitterHandle: string;
    canonicalHost: string;
  };
  analytics: { gaId?: string };
  /**
   * The enquiry card that slides into the bottom corner after a minute of
   * reading. Optional so a stored settings record written before it existed
   * still type-checks; every consumer falls back to the defaults in
   * src/lib/leads.ts (LEAD_POPUP_DEFAULTS). See src/components/lead/.
   */
  leadPopup?: {
    /** Off switch. Default on. */
    enabled?: boolean;
    /** Engaged (tab visible) seconds before it appears. Default 60, clamped 10 to 600. */
    delaySeconds?: number;
    heading?: string;
    subheading?: string;
  };
  /**
   * RETIRED 1 Oct 2026: no e-mail is sent when a demo is opened
   * (src/lib/demo/opens.ts recordDemoOpen ignores the alert context, and
   * DemoSiteRoute still passes this value along to it). Nothing writes the flag
   * any more: the CRM Settings tab and the admin settings editor dropped their
   * switches. A stored value stays in the row and does nothing; the field is
   * kept so old rows still type-check. It was the public on/off for the
   * demo-open e-mail (undefined meant on).
   */
  demoOpenAlerts?: boolean;
}

export interface ContactInfo {
  phoneDisplay: string;
  phoneHref: string;
  emailDisplay: string;
  emailHref: string;
  whatsappNumber: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessHours: string;
  responseTimePromise: string;
  mapEmbedUrl: string;
}

export interface SocialLink extends BaseDoc {
  platform: string;
  label: string;
  url: string;
  icon: string; // lucide icon name
}

/**
 * How a header item fills its mega-menu panel.
 *
 *   "services" / "projects"  built from that collection at render time, so a
 *                            service added in the admin appears in the menu
 *                            without anyone editing the navigation.
 *   "links"                  an explicit list, for the pages that are not a
 *                            collection (About, LaunchPad, the blog).
 *
 * Omit `panel` and the item stays what it has always been: a plain link.
 */
export type NavPanelKind = "services" | "projects" | "links";

export interface NavItem {
  label: string;
  href: string;
  /**
   * One line under the label inside a panel. Collection-backed panels take this
   * from the document itself (a service's shortDescription, a project's sector),
   * so it only needs filling in for hand-written `panelGroups` links.
   */
  description?: string;
  /** Set this and the item grows a panel. See NavPanelKind. */
  panel?: NavPanelKind;
  /** Read only when `panel` is "links". */
  panelGroups?: { heading: string; links: NavItem[] }[];
  /** The row along the bottom of the panel: overview page, price, and so on. */
  panelFooter?: NavItem[];
}
export interface FooterColumn {
  heading: string;
  links: NavItem[];
}
export interface Navigation {
  header: { items: NavItem[]; cta: Cta };
  footer: { tagline: string; columns: FooterColumn[] };
}

/**
 * A single row of the hero's price block.
 *
 * These are the only figures that appear above the fold, and they are load-bearing:
 * a visitor who cannot see a number leaves to ask three other studios. Every value
 * must come from the India table in _assets/FACTS.md and must match /pricing: the
 * page these rows link to. If Mehdi changes a range, it changes in both places or
 * the site quotes two different prices for the same thing.
 */
export interface PriceRow {
  /** What is being priced, in the buyer's words. */
  label: string;
  /** The range, already formatted (e.g. "₹8,000-₹20,000"). */
  range: string;
  /**
   * Where the row links: its own anchor on /pricing ("/pricing#portal"), so the
   * first thing a visitor can click on the home page is a fact. Optional: a row
   * without one links to the ledger's "Full pricing" address.
   */
  href?: string;
}

/**
 * One screenshot in the home hero's strip. OUR OWN TEMPLATES ONLY: a sample
 * site with made-up names, captured by us. Never a prospect's /site/<slug>
 * demo, never a stock photograph of a person, never a sample rating in frame.
 */
export interface HomeHeroFrame {
  /** Under public/home/, e.g. "/home/sample-c2-hindi-tuition.webp". */
  src: string;
  /** The file's real pixel size, so the frame reserves its box before it loads. */
  width: number;
  height: number;
  alt: string;
  /** Printed under the frame, in plain words: "Orthodontic clinic". */
  label: string;
}

/**
 * The home hero since 1 Oct 2026 (Mehdi: the old one "looks AI-generated").
 *
 * A NEW KEY ON PURPOSE. The live Supabase `home` row stores every older field
 * (its badge still says "est. 2023" and its subheading "three partners"), and a
 * stored key always wins over the seed. That row has no `hero`, so this block
 * shows exactly as seeded until somebody saves Home in /admin. Hero.tsx reads
 * this and nothing else, and falls back to the seed field by field.
 */
export interface HomeHeroContent {
  /** The h1, one entry per line: two short lines on a computer, run together on a phone. */
  lines: string[];
  /** ONE supporting sentence under the h1. */
  sub: string;
  /** The main button. */
  primary: Cta;
  /** WhatsApp button: its label and the full wa.me link. */
  whatsapp: Cta;
  /**
   * NOT SHOWN SINCE 1 OCT 2026 (Mehdi: no projects and no pricing in the
   * hero). Out of the seed and of the /admin form; kept optional here only so
   * a stored row that still has it loads, and so the hero component compiles
   * while it changes. Was: a small text link to the monthly plans on /pricing,
   * with no figure; a "{starter}" token printed the monthly figure with its
   * setup fee and 12-month term (no drip pricing).
   */
  plansLink?: Cta;
  /** Words after that link. Not shown since 1 Oct 2026, like `plansLink`. */
  plansNote?: string;
  /** One line of short, true facts (FACTS.md only). Empty list hides it. */
  trust: string[];
  /**
   * NOT SHOWN SINCE 1 OCT 2026 (Mehdi: no projects and no pricing in the
   * hero). Out of the seed and of the /admin form, like `plansLink`; kept
   * optional here only so a stored row that still has it loads, and so the
   * hero component compiles while it changes. Was: screenshots of our own
   * templates in a strip under the facts line. A missing or empty list hides
   * the strip.
   */
  frames?: HomeHeroFrame[];
  /** Caption under the frames (said they were samples). Not shown since 1 Oct 2026, like `frames`. */
  framesCaption?: string;
  /** Link after the caption, to /work. Not shown since 1 Oct 2026, like `frames`. */
  framesLink?: Cta;
}

export interface HomeHero {
  /** 1 Oct 2026 hero. Everything from `badge` to `stat` below is the pre-October
   *  hero, no longer rendered (only `priceTeaser` still is, by PriceSummary). */
  hero?: HomeHeroContent;
  badge: string;
  headingLines: { text: string; highlighted?: boolean }[];
  subheading: string;
  /**
   * WHO the work is for. Split out of `subheading` so it cannot be edited away by
   * accident: the home page's job is to answer what / for whom / roughly what it
   * costs before a phone visitor scrolls, and this is the "for whom" half.
   */
  audience: string;
  /**
   * One quiet line under `subheading` for visitors who are not a school or a
   * coaching institute, with a link to /services. Optional.
   */
  otherBuyers?: { text: string; link?: Cta };
  ctas: Cta[];
  /**
   * The "roughly what it costs" ledger. Since 26 Sep 2026 it is NOT in the
   * hero: PriceSummary.tsx renders it at section 9 of the home page, after the
   * value has been shown (Mehdi's instruction, HOMEPAGE-COPY-DECK.md).
   */
  priceTeaser: {
    heading: string;
    rows: PriceRow[];
    /** One line under the rows: care plan, custom software, outside India. */
    more?: string;
    /** Caveat line, indicative, non-GST, discovery-call led. Never a promise. */
    note: string;
    link: Cta;
    /** Second link, to the free check. */
    link2?: Cta;
  };
  socialProof: { line1: string; line2: string; avatars: Media[] };
  mainImage: Media;
  stat: { value: string; label: string };

  /* ── 26 September 2026 redesign: the audience switch and the shelf ───────
   * All optional, so a snapshot saved before these existed still loads:
   * mergeWithSeed shallow-merges a stored singleton over the seed, so a field
   * missing from storage falls back to the seed's value. Hero.tsx also renders
   * correctly with any of them absent (no switch, no shelf).
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * "I run a [School] [Coaching institute] [Business] [Firm abroad]". Picking
   * one rewrites the price ledger with that buyer's rows, retargets the
   * button to /contact?for=<value> and the "Full pricing" link to `pricingHref`.
   * Nothing is picked on load: the ledger then shows `priceTeaser.rows`.
   *
   * EVERY `range` HERE MUST BE A FIGURE /pricing ALREADY PRINTS, from the
   * CURRENT table in _assets/FACTS.md. The switch shows prices, it never makes
   * one up.
   */
  audienceSwitch?: {
    /** The words before the chips: "I run a". */
    label: string;
    options: {
      /** Radio value, and the `for` parameter on /contact. */
      value: string;
      /** Chip text: "School". */
      label: string;
      /**
       * Exactly three rows, cheapest first. `lit` rows read in foreground and
       * the others dim, so a visitor sees which line is theirs without the
       * other two disappearing.
       */
      rows: { label: string; range: string; href: string; lit?: boolean }[];
      /** Replaces `priceTeaser.note` while this option is picked. */
      note: string;
      /** Where "Full pricing, tier by tier" points while this option is picked. */
      pricingHref: string;
      /** Read out by the polite live region when the ledger changes. */
      announce: string;
    }[];
  };

  /** Label over the strip of real work under the hero: "Live work. Open any of them." */
  shelfLabel?: string;
  /** The text link at the right of that label: "All projects" to /work. */
  shelfLink?: Cta;
  /**
   * The frames of the shelf, in order. Each one names a project by slug; the
   * live address and the case-study link come from that project, so a URL is
   * only ever edited in one place. A slug with no matching project is skipped,
   * never rendered as a link to a missing page.
   */
  shelf?: {
    slug: string;
    /** Short name printed under the frame ("GYM MAP"), not the full title. */
    name: string;
    /** The 8:5 card crop, never the -full capture. */
    image: string;
    width: number;
    height: number;
    alt: string;
    /** CSS object-position for a crop that is not 8:5 ("top" for Onyx). */
    position?: string;
    /** Printed in place of the address when the project has no live URL. */
    caption?: string;
  }[];
  /**
   * Index of the frame that sits on the gutter on load (default 1). The frames
   * before it are cut by the left edge of the viewport, which is what makes the
   * strip read as a shelf running past the page rather than a boxed gallery.
   */
  shelfStart?: number;
}

export interface InternshipContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  /**
   * Batch label. BLANK unless a batch really is open, "Next batch enrolling now"
   * is evergreen urgency that is false whenever it is not a batch window
   * (13-launchpad/LAUNCHPAD-MARKETING.md §1 row 5). The page renders nothing
   * when this is empty.
   */
  batchLabel: string;
  certificatePreviewImage: string;
  benefits: { title: string; description: string; icon: string }[];
  curriculum: { week: string; title: string; description: string }[];
  terms: string[];
  pricing: { amount: string; label: string; note: string };
  paymentLink: string;
  checklist: string[];

  /* ── Ideovent LaunchPad additions ──────────────────────────────────────
   * All optional so a snapshot saved from an older admin session still loads
   * (mergeWithSeed shallow-merges stored singletons over the seed, so a field
   * missing from storage falls back to the seed value rather than vanishing).
   * Sources: 13-launchpad/PROGRAMME-DESIGN.md and LAUNCHPAD-MARKETING.md.
   * ────────────────────────────────────────────────────────────────────── */

  /** Heading for the "what this is not" panel. */
  notPromisedHeading?: string;
  /** No job. No placement. Earned, not attended. Own laptop. Hours a week. */
  notPromised?: string[];
  /** The five shipped artefacts (PROGRAMME-DESIGN.md §5). */
  artefacts?: { title: string; description: string; ownership: string }[];
  /** The published 100-mark rubric (PROGRAMME-DESIGN.md §7). */
  rubric?: { component: string; marks: string; evidence: string }[];
  rubricNote?: string;
  /** Who reviews the work, named. Never "senior developers". */
  mentors?: { name: string; role: string; responsibility: string }[];
  /** The five-step selection process (PROGRAMME-DESIGN.md §3.4). */
  selection?: { step: string; title: string; description: string }[];
  /**
   * Certificate IDs already issued, for the "check one yourself" panel.
   * Exactly two exist. Never add an ID that has not actually been issued.
   */
  certifiedIds?: string[];
  certifiedNote?: string;
  /** States that the fee is payable only after a place has been offered. */
  feeGate?: string;
}

/* ── EduFlow ─────────────────────────────────────────────────────────────
 * EduFlow is IN DEVELOPMENT: no paying schools, no public demo, nothing in
 * production (_assets/FACTS.md, EDUFLOW STATUS). Every field below is shaped
 * so the page reads correctly while the undecided values are still blank, 
 * the page prints no number rather than an invented one.
 * Source copy: 08-eduflow/EDUFLOW-LANDING-COPY.md + FEATURE-MATRIX.md.
 * ─────────────────────────────────────────────────────────────────────── */

export interface EduFlowModule {
  name: string;
  /** What it changes in the office, not what the software does. */
  benefit: string;
  /**
   * Three values only: "Built", "In progress", "Planned", or, while the
   * matrix status column is still unfilled, "In development".
   * FEATURE-MATRIX.md is the only place that records the real answer.
   */
  status: string;
}

export interface EduFlowContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Not optional, not a footer, not shortened. Sits under the sub-heading. */
  honestyLine: string;
  microLine: string;
  ctas: Cta[];

  problemHeading: string;
  problemIntro: string;
  problemCards: { title: string; description: string }[];
  problemClosing: string;

  whatHeading: string;
  whatBody: string;
  roles: { audience: string; description: string }[];

  modulesHeading: string;
  modulesIntro: string;
  modules: EduFlowModule[];
  modulesFootnote: string;

  stepsHeading: string;
  stepsIntro: string;
  steps: { number: string; title: string; description: string }[];

  /** "Where EduFlow actually is today". This section does not get shortened. */
  todayHeading: string;
  todayBody: string;
  /** Blank = the row is not rendered. Never a placeholder token on the page. */
  workingToday: string;
  targetDate: string;
  /** There is no demo. Leave blank; the page prints a plain line, never a dead button. */
  demoUrl: string;
  roadmapUrl: string;
  todayAlternative: string;

  earlyAccessEyebrow: string;
  earlyAccessHeading: string;
  earlyAccessBody: string;
  /** Undecided, 05-pricing/EDUFLOW-PRICING.md §7 and EARLY-ACCESS-PROGRAM.md §1 disagree. */
  pilotSeats: string;
  pilotPrice: string;
  pilotMonths: string;
  parallelRunWeeks: string;
  youGet: string[];
  weAsk: string[];

  ctaHeading: string;
  ctaBody: string;
  footnote: string;
}

export interface LegalDoc {
  title: string;
  /** Effective / last-updated date. Blank until Mehdi sets one, see DEPLOY-GUIDE.md. */
  updatedAt: string;
  body: string;
}

export interface LegalContent {
  privacy: LegalDoc;
  terms: LegalDoc;
  refund: LegalDoc;
  disclaimer: LegalDoc;
}

/** The legal documents that have a public route. Order = footer order. */
export type LegalKind = keyof LegalContent;

/* ───────────────── Collections ───────────────── */

/** One block of a service page: an h2 with a paragraph, a list, or both. */
export interface ServiceSection {
  heading: string;
  body?: string;
  items?: string[];
  /** Internal links under the block, with words that say where they go. */
  links?: { label: string; href: string }[];
}

export interface Service extends BaseDoc {
  title: string;
  slug: string;
  icon: string;
  shortDescription: string;
  longDescription: string;
  category: "Web" | "Design" | "Marketing" | "Mobile" | string;
  deliverables: string[];
  showOnHome: boolean;
  showInFooter: boolean;
  /* Search fields (1 Oct 2026, keyword plan). All optional: a service without
     them falls back to title / shortDescription / longDescription exactly as
     before. See src/lib/seo/pages.ts, serviceSeo(). */
  /** The complete <title>, brand included, 60 characters or fewer. */
  seoTitle?: string;
  /** Meta description, 155 characters or fewer. */
  metaDescription?: string;
  /** The page's one <h1>, in the words people search with. `title` when empty. */
  h1?: string;
  /** The paragraph under the h1. `longDescription` when empty. */
  intro?: string;
  /** The line under the "What you get" list. Unset: the revision-rounds line. "": none. */
  deliverablesNote?: string;
  /** Extra sections below the hero, in order. */
  sections?: ServiceSection[];
  /** Show the `faqs` of this category on the page (and mark them up there). */
  faqCategory?: string;
  /**
   * Hide the four project stages (ProcessSection: two revision rounds, 50% to
   * start and 50% at launch, code on final payment) on a monthly service such as SEO or a care plan,
   * where those project terms do not apply. Unset: shown, as before.
   */
  hideProcess?: boolean;
}

export interface Testimonial extends BaseDoc {
  quote: string;
  authorName: string;
  authorPosition: string;
  authorCompany: string;
  authorPhoto: Media;
  rating: number;
  featured: boolean;
}

export interface ProjectResult {
  metric: string;
  label: string;
}
export interface Project extends BaseDoc {
  title: string;
  slug: string;
  category: string;
  clientName: string;
  summary: string;
  technologies: string[];
  challenge: string;
  solution: string;
  /**
   * Measured outcomes only. Empty on every project today because nothing has
   * been measured and no client has supplied a figure. An invented number is
   * worse than no number: the case-study template hides the band when empty.
   */
  results: ProjectResult[];
  coverImage: string;
  gallery: Media[];
  liveUrl?: string;
  featured: boolean;
  body?: string;

  /* ── Honest-framing fields, carried over from 06-portfolio/case-studies ──
   * Every case study in that folder ends with the same two things: a list of
   * facts a reader can check in fifteen seconds, and an explicit statement of
   * what we are NOT claiming. Both are optional so existing stored projects
   * keep working.
   * ──────────────────────────────────────────────────────────────────────── */

  /** One concrete thing to go and look at on the live site. Never a claim. */
  tryThis?: string;
  /** "True, with nothing to measure", binary facts anyone can verify. */
  evidence?: string[];
  /** What this project does NOT claim, and why. Printed, not implied. */
  noClaims?: string;
  /**
   * Why there is no screenshot, when there is none. Shown in place of an
   * image so an empty card reads as a decision rather than a broken asset.
   */
  noImageReason?: string;
  /**
   * Why there is no live link, when there is none. The case study prints this
   * in the slot the "Visit live site" button would have occupied.
   *
   * A dead link on a portfolio is worse than no link: a prospect who clicks it
   * learns something about us, and it is not the thing we wanted them to learn.
   * But a silently missing link reads as a project we are hiding. So the reason
   * is a field, not an omission: HighQ Classes is on a subdomain of a domain
   * that is not resolving, HRMS Lite and Lead CRM open on a login by design,
   * and this site's own public address is down.
   */
  noLiveUrlReason?: string;
  /**
   * What the project is FOR, in two or three words, "Fitness · marketplace",
   * "HR · internal tool". Taken from the meta grid every written case study in
   * 06-portfolio/case-studies opens with, so the two stay in step.
   */
  sector?: string;
  /* Search fields (SEO audit, 2 Oct 2026). Optional, as on Service: without
     them the case study's <title> is built from `title` and its description
     is `summary` cut at a sentence. See src/lib/seo/pages.ts, projectSeo(). */
  /** The complete <title>, brand included, 50 to 60 characters. Ignored on employer work. */
  seoTitle?: string;
  /** Meta description, 150 to 155 characters, saying only what the page itself says. */
  metaDescription?: string;
}

export interface TeamMember extends BaseDoc {
  name: string;
  role: string;
  bio: string;
  photo: Media;
  socials: { platform: string; url: string; icon: string }[];
  visible: boolean;
}

export interface Milestone extends BaseDoc {
  year: string;
  title: string;
  description: string;
}

export interface ProcessStep extends BaseDoc {
  number: string;
  title: string;
  description: string;
}

export interface Faq extends BaseDoc {
  question: string;
  answer: string;
  category: "services" | "internship" | "general" | string;
}

export interface Stat extends BaseDoc {
  value: number;
  suffix: string;
  label: string;
}

export interface ClientLogo extends BaseDoc {
  name: string;
  logo: Media;
  url?: string;
}

export interface BlogPost extends BaseDoc {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  body: string; // sanitized HTML
  author: string;
  publishDate: string;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  seo?: SeoMeta;
}

/**
 * A certificate record: THE PUBLIC HALF.
 *
 * Everything in this interface is served to anyone who opens /verify/<id>, and
 * in Supabase mode it is readable by `anon` (see supabase/migrations/0001).
 * So the rule for this shape is simple: if a field would embarrass or expose
 * the person named in it, it does not belong here.
 *
 * `grade` USED TO BE HERE and is not any more. The numeric rubric total of two
 * real, named people was rendered on the public page as "GRADE nn.n%" and
 * shipped inside public/certificates.json and inside the JS
 * bundle. Mehdi confirmed on 24 Sep 2026 that it comes off the public view, so
 * it now lives in `CertificateGrade` below: a separate collection with its own
 * row-level-security policy. Moving it rather than hiding it in the UI is the
 * point: a field that is still in the payload is still published, whatever the
 * component chooses to render.
 *
 * `completion` is what replaces it. A verifier needs to know the programme was
 * completed, not what somebody scored.
 */
export interface Certificate extends BaseDoc {
  certificateId: string; // e.g. INT2025A73
  internName: string;
  designation: string;
  issuedBy: string;
  /** Programme name as printed. "Ideovent LaunchPad" for every certificate issued so far. */
  programme?: string;
  duration: string;
  location: string;
  projectWork: string;
  profileImage: string;
  certificateImage: string;
  /** Public completion status. Never a number, see the note above. */
  completion?: "completed" | "completed-with-distinction";
  status: "active" | "revoked";
  /** Why a certificate was revoked. Shown to nobody; kept so the record is legible later. */
  revokedReason?: string;
  revokedAt?: string;
  issuedAt: string;
}

/**
 * A certificate's numeric rubric total: THE ADMIN HALF.
 *
 * Deliberately its own collection rather than a field on `Certificate`, because
 * the storage layer's access control works per collection, not per field:
 *
 *   - Supabase mode: `supabase/migrations/0002_certificate_grades.sql` removes
 *     `certificateGrades` from the public read policy, so `anon` gets nothing
 *     back for it. Only a signed-in admin can select it.
 *   - Local mode: it lives in the admin's own browser localStorage and is never
 *     part of the seed, so it is not compiled into the JS bundle the public
 *     downloads.
 *   - `scripts/build-public-certificates.mjs` allow-lists the fields that reach
 *     public/certificates.json, so it cannot leak back in by accident there
 *     either.
 *
 * `id` is the certificate ID, so the grade for INT2025A73 is the document
 * `certificateGrades/INT2025A73`.
 */
export interface CertificateGrade extends BaseDoc {
  /** Rubric total out of 100, one decimal place, as a string. */
  grade: string;
  /** Free text. Which band, who scored it, anything worth remembering. */
  note?: string;
}

/* ── Pitch pages ──────────────────────────────────────────────────────────
 * One record per prospect. Mehdi fills it in /admin and the institute opens
 * https://ideovent.vercel.app/<slug> to a page addressed to THEM.
 *
 * THIS COLLECTION IS WORLD-READABLE, AND THAT DECIDES ITS SHAPE.
 * `supabase/migrations/0001_content.sql` grants `anon` select on every
 * collection that is not on PRIVATE_COLLECTIONS, and in local mode the seed is
 * compiled into the JS bundle every visitor downloads. So anything on this
 * record is published, whatever the page component chooses to render. Two
 * consequences, both load-bearing:
 *
 *   1. There is NO phone, email or postal-address field for the prospect, and
 *      none may be added. A school's number stored here is a published number,
 *      and _assets/FACTS.md forbids inventing one in the first place: a guessed
 *      number belongs to a real stranger who then gets the call. Who to write
 *      to, and at which address, is a private working list that stays out of
 *      the repo.
 *   2. The internal note lives in its own collection, `pitchPageNotes`, for
 *      exactly the reason `certificateGrades` does. "Never rendered" is a
 *      decision a component makes; "never published" is a decision the storage
 *      layer makes. See PitchPageNote below.
 *
 * EVERY FIELD IS OPTIONAL EXCEPT `slug`, `instituteName` and `status`, and the
 * page must render sensibly with the rest empty. Mehdi will often have only a
 * name and a city, and a page that prints a plausible-looking placeholder for
 * the director's name is worse than one that prints nothing: a wrong name above
 * the fold proves the page was a template blast, which is the exact impression
 * the page exists to avoid.
 * ───────────────────────────────────────────────────────────────────────── */

/** draft and archived both 404 for the public. Only `live` is reachable. */
export type PitchStatus = "draft" | "live" | "archived";

/* `PitchMarket` ("india" | "international"), which decides WHICH design renders
 * a record, is declared once further down this file. `src/lib/pitch/types.ts`
 * re-declares the same two values for the standalone record model; if one moves,
 * both move. */

/**
 * What the institute is. A coaching institute sells results and batches, a
 * school sells admissions and trust, so the designs give different things top
 * billing. "dental" (28 Sep 2026) is an Indian dental clinic on the India
 * design: it sells trust and an appointment, and the page speaks of patients
 * rather than parents. A dental practice ABROAD is `vertical: "dental"` on
 * the international design instead.
 */
export type PitchInstituteType = "school" | "coaching" | "dental";

/**
 * The trade an international prospect is in, from the secondary-market list in
 * _assets/FACTS.md: dental, legal, fitness, trades and accounting SMEs in the
 * US, UK, UAE and Australia.
 *
 * It decides which language the "what you would get" list is written in, and
 * nothing else: a dental practice is shown new-patient bookings, a law firm
 * consultation requests, a gym trial signups. `other` is a real value and not a
 * shrug, its wording is written to stand on its own, because a business that
 * fits none of the five is a normal thing to meet and a generic list that
 * apologises for itself sells nothing.
 */
export type PitchVertical = "dental" | "legal" | "accounting" | "fitness" | "trades" | "other";

/**
 * One specific, checkable thing that is wrong with the site they have today.
 *
 * "Nine seconds to open on 4G" wins the meeting. "Your site is bad" loses it.
 * The difference is that the first is a measurement they can repeat, and it
 * carries no verdict about their judgement.
 *
 * `measuredBy` and a number TRAVEL TOGETHER. A figure with no tool and no date
 * beside it is a sales claim, and the prospect can open their own site and
 * disagree with it. An empty list is a normal, supported state: the page then
 * says nothing about their current site rather than guessing at faults.
 */
export interface PitchObservedProblem {
  /** Short and factual, about six words. */
  title: string;
  /** One or two sentences. Specific, and never an insult. */
  detail?: string;
  /** Tool, profile and date: "PageSpeed Insights, mobile, 24 Sep 2026". */
  measuredBy?: string;
}

export interface PitchPage extends BaseDoc {
  /** URL segment. The page is served at /<slug>. Unique, and never a real route. */
  slug: string;
  status: PitchStatus;

  /** Exactly as they spell it themselves, including "The" and any suffix. */
  instituteName: string;
  instituteType?: PitchInstituteType;
  /** "New Delhi", "Patna", "Gorakhpur". */
  city?: string;
  state?: string;
  /** Printed country. Blank reads as India on an india-market page. */
  country?: string;
  /** Which design renders this record. Defaults to "india" when empty. */
  market?: PitchMarket;

  /* ── International market only ──────────────────────────────────────────
     Three fields the India design has no use for and never reads. They are on
     the shared record rather than in a parallel one because a prospect can move
     between markets (an Indian school group with a campus in Dubai is a real
     case) and because the admin must stay one form.

     `timezone` and `locale` are used for ARITHMETIC, not decoration: the
     international page computes the actual working overlap between the reader's
     day and our published hours, and prints the answer even when the answer is
     "there is none inside our published hours". A wrong value therefore
     produces a visibly wrong page rather than a quietly wrong one, which is the
     behaviour we want. Both may be left empty: the page falls back to a
     country-level default and says which one it used.
     ──────────────────────────────────────────────────────────────────────── */

  /** The trade this business is in. Drives the language of "what you get". */
  vertical?: PitchVertical;
  /** IANA zone, e.g. "America/Chicago". Empty falls back to the country. */
  timezone?: string;
  /** BCP-47 tag, e.g. "en-US". Decides date, time and number conventions. */
  locale?: string;
  /**
   * The call-booking link for this prospect, if one has been set up.
   *
   * Empty is a supported state and the international page prints the visible
   * blank [[CALENDLY_URL]] for it rather than a button that goes nowhere. That
   * is deliberate and it is the correct trade: a dead button on a cold page
   * confirms every suspicion the page exists to answer, whereas a loud blank is
   * caught by whoever is about to paste the link into an email, which is the
   * last moment at which it can still be fixed.
   */
  bookingUrl?: string;

  /** Verified spelling only. Empty if it was not read off their own site. */
  directorName?: string;
  /** "Principal", "Director", "Chairman", "Managing Trustee". Their word, not ours. */
  directorTitle?: string;
  /** A few names to show we looked. Optional, and often empty. */
  teamNames?: string[];

  /** Their site today, if they have one. Empty means we found none, and says so. */
  currentWebsite?: string;

  observedProblems?: PitchObservedProblem[];
  /** What we would build, as bullets. */
  proposedScope?: string[];

  /**
   * The id of a row in PITCH_PACKAGES (src/lib/pitch). The PRICE IS NOT STORED
   * HERE: it is looked up from that table at render time, so a pitch page
   * cannot quote a figure that /pricing and _assets/FACTS.md have moved on
   * from. If a bespoke number is ever needed it belongs in the written scope,
   * not on a page that was generated in one click.
   */
  recommendedPackage?: string;

  /* THERE IS NO `proof` FIELD AND NO `whatsappMessage` FIELD, and both were
   * drafted and taken back out. Each design picks which of Ideovent's real
   * projects to show (see `defaultProofOrder` in src/lib/pitch/proof.ts) and
   * generates its own WhatsApp opening from the institute's name and city
   * (`pitchWhatsappText` in src/lib/pitch/helpers.ts). A field nothing renders
   * is worse than a missing one in an admin panel: somebody fills it in, sends
   * the link, and wonders why the page ignored them. Add either back only
   * together with the code that reads it. */

  /** Optional imagery. Only ever a file Mehdi actually has. */
  heroImage?: string;
  logo?: string;

  /** ISO dates, so the page is not undated and the offer is not open forever. */
  preparedOn?: string;
  validUntil?: string;

  /**
   * TRUE on the one shipped example record. The page and the admin both print
   * a standing banner saying so, and the admin says to delete it, so a sample
   * can never be mistaken for a researched prospect or sent to anybody.
   */
  isExample?: boolean;
}

/**
 * A pitch page's internal note: THE ADMIN HALF.
 *
 * Its own collection rather than a field on PitchPage, for the same reason
 * CertificateGrade is its own collection: access control in this storage layer
 * works per collection, not per field. `pitchPageNotes` is on
 * PRIVATE_COLLECTIONS, so `anon` gets no rows back for it
 * (supabase/migrations/0003) and it is never in the seed, so it is never in the
 * bundle the public downloads.
 *
 * `id` is the pitch page's id, so the note for pitch page `pp_x` is the
 * document `pitchPageNotes/pp_x`.
 */
export interface PitchPageNote extends BaseDoc {
  /** Free text. Who to chase, what was said, what is still unverified. */
  note?: string;
}

export interface ContactSubmission extends BaseDoc {
  name: string;
  email: string;
  phone: string;
  message: string;
  sourcePage: string;
  status: "new" | "read" | "archived";
  receivedAt: string;
  /* ── Added 26 Sep 2026 with the lead pipeline (src/lib/leads.ts). All
     optional: submissions written before then have none of them. ── */
  /** What they need, as the chip label they picked ("School website"). */
  need?: string;
  /** The site to check, or the institute name when there is no site (26 Sep 2026). */
  website?: string;
  /** Institute or business name. */
  organisation?: string;
  city?: string;
  /** "This month", "In 1 to 3 months", "Just exploring". */
  timeline?: string;
  /** A canonical range from FACTS.md, or "Not sure yet". */
  budget?: string;
  /** Which form: "popup" or "contact-form". */
  source?: string;
  /** The path the visitor was on when they sent it. */
  page?: string;
  /** The phone in +<country><number> form, for tel: links. */
  phoneE164?: string;
  /** Digits only, for wa.me. Empty for a landline, which WhatsApp cannot reach. */
  whatsapp?: string;
  /** Set on the optional second step of the pop-up: the id of the enquiry it adds to. */
  followUpOf?: string;
}

export interface Application extends BaseDoc {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  stream: string;
  notes: string;
  paymentStatus: "pending" | "verified" | "failed";
  seatConfirmed: boolean;
  submittedAt: string;
}

/**
 * Which pitch page a record renders.
 *
 * The two markets are not a styling switch. They are two different arguments.
 * India reads to a school or coaching director who wants to know the price and
 * whether the thing will be finished. International reads to an SME owner in the
 * US, UK, UAE or Australia whose first question is whether an agency in India is
 * a real business at all, so that page answers the offshore question before it
 * sells anything.
 */
export type PitchMarket = "india" | "international";

/* ── Demo sites ────────────────────────────────────────────────────────────
 * A DEMO SITE IS NOT A PITCH PAGE, and confusing the two is the mistake this
 * comment exists to prevent.
 *
 *   A pitch page (above) is a SALES PAGE at /<slug>. It says: here is what is
 *   wrong with your current site, here is what we would build, here is what it
 *   costs. Ideovent is the speaker and the institute is the audience.
 *
 *   A demo site is THE INSTITUTE'S OWN WEBSITE, already built, at
 *   /site/<slug>. Their name is the masthead, their courses are the content,
 *   their city is in the footer. Mehdi sends the link and says "dekhiye, aapke
 *   liye ye website banayi hai. Agar pasand aaye to aage baat karte hain."
 *   The institute is the speaker. Ideovent appears only in the demo marker.
 *
 * So the two records share almost nothing. A pitch page holds observations and
 * a package id; a demo site holds courses, batches, faculty and a timetable.
 * They are separate collections and neither reads the other's fields.
 *
 * THREE RULES THIS SHAPE ENFORCES.
 *
 * 1. EVERY FIELD IS OPTIONAL EXCEPT `slug`, `instituteName`, `kind` AND
 *    `status`. Mehdi will usually have a name and a city and nothing else, and
 *    the page has to be sendable in that state. Each section renders a
 *    PLACEHOLDER that reads as a placeholder ("Add your 2026 results here"),
 *    never a plausible-looking invention. A demo carrying a made-up rank or a
 *    made-up helpline is worse than an empty one: a parent might act on it.
 *
 * 2. THERE IS A CONTACT BLOCK HERE, AND PitchPage DELIBERATELY HAS NONE.
 *    That difference is the whole point of the two records and it is safe for
 *    exactly one reason: these fields are filled by hand, from the institute's
 *    OWN published details, or they are left empty. Never guessed, never
 *    "probably", never a number pattern that looks right. This collection is
 *    world-readable like every other public one, so a wrong number here is a
 *    published wrong number belonging to a real stranger who then gets the
 *    calls. The admin help text says this on every field in the block.
 *
 * 3. A PHOTOGRAPH OF A PERSON NEEDS CONSENT, AND THE RECORD ASKS FOR IT.
 *    `photoConsent` is a real boolean on both `DemoResult` and `DemoFaculty`
 *    and the page renders no photograph without it. A student's face on a
 *    website they have not agreed to is the single most damaging thing a demo
 *    could carry, and "we will crop it later" is not a mechanism.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Which template renders. A school sells admission; a coaching institute sells
 * results; a dental clinic (28 Sep 2026) sells trust and an appointment. The
 * dental half of the record is `DemoSite.dental` (DentalContent below).
 */
export type DemoKind = "coaching" | "school" | "dental";

/**
 * WHERE A DEMO IS IN ITS LIFE. This is the field the whole slot system turns
 * on, so it is worth reading slowly.
 *
 *   free    an empty slot. A name may be typed in it, nothing has gone out.
 *   draft   being built. Not reachable by anybody with the link.
 *   sent    it has gone out to a named person. THE ONLY STATUS THAT OPENS.
 *   closed  the conversation is over, won or lost. The link stops working.
 *
 * ONLY `sent` IS PUBLICLY REACHABLE, AND THAT COUPLING IS THE POINT.
 * Marking a demo sent is the same action as turning its link on, so the moment
 * the link starts working is the moment `sentTo` and `sentAt` are recorded on
 * the slot. That is not bookkeeping for its own sake: it is what the edit lock
 * reads to tell Mehdi, in plain words, whose demo he is about to overwrite.
 * A "publish" button that did not ask who it was for would leave the lock with
 * nothing to say, and the lock is the feature.
 *
 * Mehdi looks at his own drafts through /admin/preview/site/<slug>, which is
 * behind the admin login, so nothing is lost by keeping the public route strict.
 *
 * (This replaced "draft" | "live" | "archived". `live` became `sent` and
 * `archived` became `closed`; `demoStatusFromLegacy` in src/lib/demo/record.ts
 * migrates a record written under the old names, because a row already in a
 * Supabase table cannot be renamed by editing this file.)
 */
export type DemoStatus = "free" | "draft" | "sent" | "closed";

/**
 * India or abroad. It changes the SECTIONS and the LANGUAGE, not the styling:
 * an Indian coaching institute lists JEE, NEET and board batches and talks
 * about admission; a tutoring centre in Texas or Dubai lists subjects, grade
 * levels and a first free session. The currency moves with it.
 */
export type DemoMarket = "india" | "international";

/**
 * The institute's colours. Six presets, each a pair of hues driving a fixed,
 * contrast-verified token ladder (see `.demo-scope` in src/index.css and
 * scripts/check-demo-palettes.mjs).
 *
 * The first three are the coaching defaults and the last three the school
 * defaults, and they are kept apart ON PURPOSE. The two demos are sent to
 * different people in the same week, and a director who has seen both is
 * looking for the moment the second one is the first with the words changed.
 */
export type DemoPalette = "crimson" | "indigo" | "teal" | "forest" | "plum" | "brick";

/**
 * A TEMPLATE'S WHOLE LOOK: palette, type pairing, hero composition and section
 * order together. See the `theme` field on DemoSite for why a colour on its own
 * is not enough, and `src/lib/demo/schoolThemes.ts` for the definitions.
 *
 * The five ids here are the school template's. The coaching template adds its
 * own to this union when it lands; both templates fall back to their own
 * default for an id they do not recognise, so a record can be switched from
 * school to coaching without rendering an empty page.
 */
export type DemoTheme =
  /* The school template's, defined in src/lib/demo/schoolThemes.ts. */
  | "heritage"
  | "modern-campus"
  | "bright"
  | "quiet-campus"
  | "riverside"
  /* The coaching template's, defined in src/lib/demo/coachingThemes.ts.
     Both templates fall back to their OWN default for an id they do not
     recognise, so a record can be switched from school to coaching in the
     admin and still renders a page rather than nothing.

     `marks` and `bulletin` joined the three originals in the September 2026
     rebuild. The three originals keep their ids and their meanings, because a
     demo that has already been sent has to go on looking the way it looked
     when it was sent. */
  | "ledger"
  | "signal"
  | "studio"
  | "marks"
  | "bulletin"
  /* THE MULTI-PAGE THEMES (26 September 2026), defined in
     src/lib/demo/site/themes.ts. A record on one of these renders the
     multi-page site; a record on any id above keeps its single page exactly
     as it was sent. School: */
  | "metro"
  | "atlas"
  | "aangan"
  | "crayon"
  | "pinewood"
  | "almanac"
  /* Coaching: */
  | "podium"
  | "timetable"
  | "register"
  | "folio"
  | "courtyard"
  /* Dental (28 September 2026), multi-page only. See
     E:/myagency/_assets/DENTAL-ARCHITECTURE.md. */
  | "haven"
  | "meridian"
  | "ivory"
  | "anchor"
  | "mint"
  | "sprout"
  | "harbour";

/** What a fee is printed in. Drives a symbol and nothing else. */
export type DemoCurrency = "INR" | "USD" | "GBP" | "AED" | "AUD";

/** One course, with the batch attached. The page that does the work. */
export interface DemoCourse {
  /** "JEE Main and Advanced, two year" · "IELTS intensive" · "Class 10 maths". */
  name: string;
  /** Who it is for: "Class 11 to 12", "Grades 9 to 12", "Beginner to B2". */
  level?: string;
  subjects?: string;
  /** "24 months", "12 weeks", "One academic year". */
  duration?: string;
  /** "Mon to Sat, 6:00 to 8:30 pm". Their own words. */
  timings?: string;
  /** Classroom, Online, Hybrid. Free text so a local word survives. */
  mode?: string;
  /** "Starts 12 April" or "New batch every month". Never invented. */
  batchStarts?: string;
  /** "24 students per batch". Only if they publish it. */
  seats?: string;
  /**
   * The amount ONLY, as they publish it: "45,000". The symbol comes from
   * `currency`, so one record cannot print two currencies. Anything that does
   * not start with a digit ("On request") is printed verbatim.
   */
  fee?: string;
  /** "per year, payable in three instalments". */
  feeNote?: string;
  /** One or two lines of detail under the row. */
  detail?: string;

  /* ── Multi-page fields (September 2026). All optional; see DemoSite. ── */
  /** URL segment of this course's own page: /site/<slug>/courses/<slug>. Derived from `name` when empty. */
  slug?: string;
  /** The goal-picker and filter group: "JEE", "NEET", "Foundation", "SSC". Short. */
  category?: string;
  /** Who may join, in their words: "Passed Class 10 with maths". */
  eligibility?: string;
  /** The syllabus as an accordion: one entry per unit, topics in `body`. */
  syllabus?: DemoPoint[];
  /** "Printed modules", "DPPs", "Recorded lectures". */
  material?: string[];
  /** How tests run on this course: "Weekly chapter test, monthly full mock". */
  testPlan?: string;
  /** The fee split, as published. The total stays in `fee`. */
  instalments?: DemoFeeRow[];
  /** "Study material", "Test series", "Doubt classes". */
  inclusions?: string[];
  /** The refund line for this course. The full policy is `feesPolicy`. */
  refundNote?: string;
  /** Teachers on this course, by `DemoFaculty.name`. */
  facultyNames?: string[];
  /** Questions about this course only. */
  faq?: DemoPoint[];
  /** Hindi versions of the text fields above. See DemoHi. */
  hi?: DemoHi<DemoCourse, "name" | "level" | "subjects" | "duration" | "timings" | "mode" | "detail" | "eligibility" | "testPlan" | "refundNote" | "feeNote" | "batchStarts" | "category" | "material" | "inclusions" | "seats" | "fee">;
}

/* ── BILINGUAL CONTENT (the Hindi-in-English-mode fix, 26 Sep 2026) ────────
 * THE RULE. Every plain text field on a demo record is ENGLISH (or the
 * institute's words in Latin script). A Hindi version of the same field goes
 * in the object's own `hi` block, under the SAME key. A page reads a field
 * through `bi(obj, "key", lang)` from src/lib/demo/site/bilingual.ts, which
 * returns the Hindi when the reader chose Hindi and it exists, and otherwise
 * the English; when only one of the two exists it returns that one. So a
 * record typed in English only reads English in both modes, and Hindi never
 * appears on the English page unless there is no English at all.
 * scripts/check-demo-lang.mjs fails when a template puts Devanagari in a
 * plain field, which is exactly how the leak happened.
 */
export type DemoHi<T, K extends keyof T> = {
  /* A list field (facilities, documents, stops) takes a list in the same
     order as the English; every other field takes a string. */
  [P in K]?: NonNullable<T[P]> extends readonly unknown[] ? string[] : string;
};

/** One row of a fee table. `amount` follows the DemoCourse.fee rule. */
export interface DemoFeeRow {
  /** "Admission fee", "Tuition", "Instalment 1". */
  label: string;
  amount?: string;
  /** How often: one-time, annual, term, monthly, or "also" for extras payable on top. */
  period?: "one-time" | "annual" | "term" | "monthly" | "also";
  /** "Nursery to Class 2", or "Due at admission". */
  note?: string;
  hi?: DemoHi<DemoFeeRow, "label" | "note" | "amount">;
}

/** A dated line: a timeline step, a holiday, a term date. Dates are free text. */
export interface DemoDatedItem {
  title: string;
  date?: string;
  body?: string;
  hi?: DemoHi<DemoDatedItem, "title" | "date" | "body">;
}

/** A link to something real: a portal, a PDF, an app. Hidden when `url` is empty. */
export interface DemoLink {
  label: string;
  url?: string;
  /** "Parents", "Students", "Staff". */
  audience?: string;
  note?: string;
  hi?: DemoHi<DemoLink, "label" | "note" | "audience">;
}

/** A figure with the line that says where it comes from. No basis, no counter. */
export interface DemoStat {
  /** "1,080" or "98.4%". Animated only when it parses as a number. */
  value: string;
  label: string;
  /** "CBSE Class XII, 2026, 212 appeared". Printed at body size under the figure. */
  basis?: string;
  hi?: DemoHi<DemoStat, "label" | "basis">;
}

/**
 * One published result.
 *
 * `achievement` is the only required field and it is a QUOTE of what the
 * institute itself publishes. Nothing here is ever generated, inferred,
 * rounded or "made representative". An empty list is the normal state and the
 * section is designed for it.
 */
export interface DemoResult {
  /** Only with the student's consent, and only as the institute prints it. */
  studentName?: string;
  /** "AIR 1,284" · "NEET 648/720" · "IELTS 8.0 overall". Their published line. */
  achievement: string;
  /** "JEE Advanced 2025" · "CBSE Class 12". */
  exam?: string;
  year?: string;
  /** Rendered ONLY when photoConsent is true. See the block comment above. */
  photo?: string;
  photoConsent?: boolean;
  note?: string;
  /* ── Multi-page fields. CCPA 2024 coaching-ad rules: a result names the
     course taken, its duration and whether it was paid; a name or photo only
     with written consent taken after the selection. ── */
  /** Filter chip: "JEE", "NEET", "Board", "Olympiad", "SSC CGL". */
  category?: string;
  courseName?: string;
  courseDuration?: string;
  paid?: "paid" | "scholarship" | "free";
  /** Written consent held for the name, photo and quote. Without it only the rank shows. */
  consent?: boolean;
  quote?: string;
  /** Selection-count results (c5): "38 selected". Rendered as a count tile. */
  count?: string;
  /** "Final" or "Provisional", for selection counts. */
  status?: string;
  /** University destination (s4, s5): "University of Toronto" and its country. */
  destination?: string;
  country?: string;
  hi?: DemoHi<DemoResult, "achievement" | "note" | "quote" | "courseName" | "exam" | "courseDuration" | "category" | "status" | "count" | "year" | "destination" | "country">;
}

/** A teacher. In coaching the teacher IS the product, so this section is early. */
export interface DemoFaculty {
  name: string;
  /** "Physics" · "Organic chemistry" · "IELTS speaking". */
  subject?: string;
  /** "M.Sc. Physics, Delhi University". Their own line, never upgraded. */
  qualification?: string;
  /** "11 years teaching JEE Physics". */
  experience?: string;
  note?: string;
  /** Rendered ONLY when photoConsent is true. */
  photo?: string;
  photoConsent?: boolean;
  /** "Principal", "Head of Physics", "Hostel warden". */
  role?: string;
  /** Grouping. School: "Leadership", "PGT", "TGT", "PRT", "Special educator", "Counsellor" (feeds the disclosure counts). Coaching: free text. */
  group?: string;
  /** Coaching: "JEE 2-year, Dropper". */
  batches?: string;
  /** One line on how they teach. */
  style?: string;
  hi?: DemoHi<DemoFaculty, "subject" | "qualification" | "experience" | "note" | "role" | "style" | "group" | "batches">;
}

/** A titled paragraph. Used by "why us" and by the method section. */
export interface DemoPoint {
  title: string;
  body?: string;
  /** Accordion or FAQ group: "Admissions", "Fees", "Transport". */
  group?: string;
  hi?: DemoHi<DemoPoint, "title" | "body" | "group">;
}

/** One line of a timetable. */
export interface DemoScheduleRow {
  /** "Class 11 JEE, Batch A". */
  label: string;
  /** "Mon, Wed, Fri". */
  days?: string;
  /** "6:00 to 8:30 pm". */
  time?: string;
  subject?: string;
  faculty?: string;
  room?: string;
  hi?: DemoHi<DemoScheduleRow, "label" | "days" | "time" | "subject" | "faculty" | "room">;
}

/** The free trial or demo class, which is how coaching actually converts. */
export interface DemoTrial {
  heading?: string;
  body?: string;
  /** "90 minutes" · "One full session". */
  duration?: string;
  /** "A notebook and your last school report." */
  bring?: string;
  /** "Call or WhatsApp us and we will put you in the next batch." */
  howToBook?: string;
  hi?: DemoHi<DemoTrial, "heading" | "body" | "duration" | "bring" | "howToBook">;
}

/**
 * The institute's OWN published contact details, typed in by hand or left
 * empty. Read rule 2 in the block comment above before adding a field here.
 */
export interface DemoContactDetails {
  /** As they print it: "+91 98765 43210". A tel: link is derived from it. */
  phone?: string;
  /** Digits only including the country code, for wa.me. */
  whatsapp?: string;
  email?: string;
  /** One line per line of the address. */
  addressLines?: string[];
  /** "Mon to Sat, 9 am to 7 pm". */
  hours?: string;
  /** A maps link. Their own listing, not a guessed pin. */
  mapUrl?: string;
  /**
   * What to search for on a map: "Holy Cross School, Patna". Used to build a
   * "find us" link when there is no `mapUrl`, and it is a SEARCH rather than a
   * pin on purpose. A guessed lat/long puts a school on a stranger's roof; a
   * search hands the reader the map's own answer and is honest about the fact
   * that we are not claiming to know the exact door.
   */
  mapQuery?: string;
  /** "Opposite the district court". The line people actually navigate by. */
  landmark?: string;
  /** Other centres (coaching) or a city office (boarding). */
  branches?: DemoBranch[];
  /** The transport desk number, never a driver. */
  transportDesk?: string;
  hi?: DemoHi<DemoContactDetails, "hours" | "landmark" | "addressLines">;
}

export interface DemoBranch {
  name: string;
  addressLines?: string[];
  phone?: string;
  mapQuery?: string;
  hours?: string;
  hi?: DemoHi<DemoBranch, "name" | "addressLines" | "hours">;
}

/**
 * One notice, the way a school actually posts one.
 *
 * This is the section that decides whether a school keeps its own website
 * alive. A holiday, a PTM date, a result, a fee reminder: three lines the
 * office types itself, no developer, no bill for a two-line change. So the
 * shape is deliberately the smallest thing somebody will actually fill in.
 *
 * `date` is FREE TEXT and is never parsed into a Date. Schools write "15 Jan",
 * "Sept 2026", "From Monday" and "Immediate effect", and a parser that turns
 * three of those into "Invalid Date" on a page carrying the school's name is
 * worse than printing exactly what was typed.
 */
export interface DemoNotice {
  title: string;
  /** As they would write it. Printed verbatim, never reformatted. */
  date?: string;
  /** One or two sentences. Optional: a headline and a date is a real notice. */
  body?: string;
  /**
   * Draws the eye to one notice, for the thing that is actually urgent. Use it
   * on one at a time; a page where everything is pinned has nothing pinned.
   */
  pinned?: boolean;
  /** Notice board or event. Both live on one expiry-aware News page. */
  kind?: "notice" | "event";
  /** ISO date (YYYY-MM-DD). After it the item leaves Home and moves to the archive. */
  expires?: string;
  /** ISO date it was posted, for "Last updated" and the 60-day rule on Home. */
  posted?: string;
  /** A circular or PDF. */
  url?: string;
  hi?: DemoHi<DemoNotice, "title" | "date" | "body">;
}

/**
 * How to get in. The one section a school's site exists for, and the one most
 * likely to be half known.
 *
 * Each part renders independently, so three steps and nothing else is a
 * complete, sendable section. Nothing here is ever generated: an invented
 * document list or an invented closing date sends a parent to the office with
 * the wrong papers on the wrong day.
 */
export interface DemoAdmissions {
  /** "Enquire", "Visit the campus", "Submit the form". Their process. */
  steps?: string[];
  /** "Birth certificate", "Transfer certificate", "Two photographs". */
  documents?: string[];
  /** Free text, exactly as published: "Forms open 5 January to 20 February". */
  dates?: string;
  /** Anything that does not fit: a fee for the form, an age cut-off, a note. */
  note?: string;
  /* ── Multi-page fields ── */
  /** The dated process: "Registration opens" on "1 Nov". */
  timeline?: DemoDatedItem[];
  /** One-time, annual, monthly and "also payable" rows. */
  fees?: DemoFeeRow[];
  feeNote?: string;
  /** Age rules for the checker. Empty means the NEP defaults in code (Nursery 3+, Class 1 6+, as on 31 March). */
  ageRules?: DemoAgeRule[];
  /** "31 March" unless the state says otherwise. */
  ageAsOn?: string;
  /** Their own RTE 25% line. Empty prints our generic sentence. */
  rteNote?: string;
  /** Their real online form or enquiry link. Empty means WhatsApp. */
  applyUrl?: string;
  /** Who can apply, in their words: "Nursery to Class 9 and Class 11". */
  whoCanApply?: string;
  /** Entry tests (s4, s5): "Entrance test in January at Dehradun and Delhi". */
  assessment?: string;
  hi?: DemoHi<DemoAdmissions, "dates" | "note" | "feeNote" | "rteNote" | "whoCanApply" | "assessment" | "steps" | "documents" | "ageAsOn">;
}

/** One class and its minimum age on the as-on date. */
export interface DemoAgeRule {
  /** "Nursery", "Class 1". */
  className: string;
  /** Whole years, as a string: "3". */
  minAge: string;
  maxAge?: string;
  hi?: DemoHi<DemoAgeRule, "className">;
}

/* ── MULTI-PAGE SITE DATA (26 September 2026) ─────────────────────────────
 * One interface per page that needs a structure of its own. Every field is
 * optional and every page has a designed empty state or leaves the nav, so a
 * record with a name and a city is still a whole site. See
 * src/lib/demo/pages/README.md for which page reads what.
 */

/** A photograph with a category for the gallery chips. Only files Mehdi holds. */
export interface DemoPhoto {
  src: string;
  alt: string;
  /** "Campus", "Sports", "Annual day", "Centre". */
  category?: string;
  caption?: string;
  width?: number;
  height?: number;
  hi?: DemoHi<DemoPhoto, "alt" | "caption" | "category">;
}

/** A parent's or student's words. Consent is required for the name to print. */
export interface DemoReview {
  quote: string;
  name?: string;
  /** "Parent of a Class 8 student", "JEE 2026, 2-year course". */
  relation?: string;
  /** Out of 5, only if it came from a real review. */
  rating?: string;
  /** "Google review, March 2026". */
  source?: string;
  consent?: boolean;
  /** A video on their own channel: rendered as a poster that loads on tap. */
  videoUrl?: string;
  category?: string;
  /** Dental: when it was written, as the source shows it: "Aug 2026". */
  date?: string;
  /** Dental chains: the branch slug the review is about. */
  branch?: string;
  hi?: DemoHi<DemoReview, "quote" | "relation" | "source" | "category" | "date">;
}

/** A public rating, printed only with its count and a link to the profile. */
export interface DemoRatingSummary {
  value?: string;
  count?: string;
  url?: string;
  source?: string;
  hi?: DemoHi<DemoRatingSummary, "source">;
}

/** A download: a model paper, the syllabus, a TC form, the book list. */
export interface DemoDownload {
  label: string;
  url?: string;
  /** "Syllabus", "Model papers", "Forms". */
  group?: string;
  hi?: DemoHi<DemoDownload, "label" | "group">;
}

/** Board results in CBSE Appendix IX columns, one row per year and class. */
export interface DemoBoardResult {
  year: string;
  /** "X" or "XII", or the state board's own word. */
  className: string;
  registered?: string;
  passed?: string;
  passPercent?: string;
  note?: string;
  hi?: DemoHi<DemoBoardResult, "className" | "note">;
}

/** The school's academic programme. */
export interface DemoAcademics {
  intro?: string;
  /** Stages or the IB/Cambridge continuum: title "Primary (Class 1 to 5)", body. */
  stages?: DemoPoint[];
  assessment?: string;
  /** Calendar and holiday list. */
  calendar?: DemoDatedItem[];
  downloads?: DemoDownload[];
  hi?: DemoHi<DemoAcademics, "intro" | "assessment">;
}

/** One transport route. Stops and timings, never a driver's name or phone. */
export interface DemoRoute {
  name: string;
  stops?: string[];
  pickup?: string;
  drop?: string;
  hi?: DemoHi<DemoRoute, "name" | "stops" | "pickup" | "drop">;
}

export interface DemoTransport {
  intro?: string;
  routes?: DemoRoute[];
  /** "GPS on every bus", "A woman attendant on board". Only what is true. */
  safety?: string[];
  feeNote?: string;
  hi?: DemoHi<DemoTransport, "intro" | "feeNote" | "safety">;
}

/** The boarding page (s4). */
export interface DemoBoarding {
  intro?: string;
  houses?: DemoPoint[];
  routine?: DemoScheduleRow[];
  /** Food, health centre, pastoral care, staying in touch, visits and exeats, what to pack. */
  topics?: DemoPoint[];
  termDates?: DemoDatedItem[];
  /** How to reach the campus: rail, road, air. */
  howToReach?: DemoPoint[];
  hi?: DemoHi<DemoBoarding, "intro">;
}

/**
 * CBSE Mandatory Public Disclosure (Appendix IX). The row list and its labels
 * are code (src/lib/demo/site/disclosure.ts); this holds only the values,
 * keyed by row id. A missing row prints "To be uploaded".
 */
export interface DemoDisclosure {
  rows?: Record<string, DemoDisclosureRow>;
  annualReportUrl?: string;
  /** ISO date. */
  lastUpdated?: string;
}

/** One disclosure row's value; `hi.value` is its Hindi ("00000000 (उदाहरण)"). */
export interface DemoDisclosureRow {
  value?: string;
  url?: string;
  hi?: DemoHi<DemoDisclosureRow, "value">;
}

/** A gallery entry: a file and its alt, with the alt's Hindi. */
export interface DemoMedia extends Media {
  hi?: DemoHi<Media, "alt">;
}

/** A policy: safeguarding, anti-bullying, fee refund, privacy. */
export interface DemoPolicy {
  title: string;
  body?: string;
  url?: string;
  hi?: DemoHi<DemoPolicy, "title" | "body">;
}

/** Coaching: the test series page. */
export interface DemoTestSeries {
  intro?: string;
  types?: DemoPoint[];
  schedule?: DemoScheduleRow[];
  pattern?: string;
  downloads?: DemoDownload[];
  /** Their real test platform. No simulated analytics, ever. */
  platformUrl?: string;
  hi?: DemoHi<DemoTestSeries, "intro" | "pattern">;
}

/** Coaching: the scholarship test landing page. */
export interface DemoScholarship {
  name?: string;
  date?: string;
  mode?: string;
  centres?: string[];
  eligibility?: string;
  syllabus?: string;
  rewards?: DemoPoint[];
  registerUrl?: string;
  resultDate?: string;
  faq?: DemoPoint[];
  hi?: DemoHi<DemoScholarship, "name" | "date" | "mode" | "eligibility" | "syllabus" | "resultDate" | "centres">;
}

/** A blog post. `body` is paragraphs separated by a blank line. */
export interface DemoPost {
  slug?: string;
  title: string;
  date?: string;
  excerpt?: string;
  body?: string;
  author?: string;
  /** Dental (DCI 8.1.7): "Medically reviewed by Dr. X, MDS (Endodontics)". */
  reviewedBy?: string;
  /** Dental: a treatment slug the guide links to ("Book a consultation for ..."). */
  treatment?: string;
  /** "Implants", "Kids", "Braces". Filter chip on the blog list. */
  category?: string;
  hi?: DemoHi<DemoPost, "title" | "excerpt" | "body" | "date" | "author" | "reviewedBy" | "category">;
}

/** Coaching: the founder's story on About. */
export interface DemoFounder {
  name?: string;
  role?: string;
  story?: string;
  photo?: string;
  photoConsent?: boolean;
  hi?: DemoHi<DemoFounder, "role" | "story">;
}

/** Coaching (c5): exam calendar, previous cut-offs and eligibility, each with a source. */
export interface DemoGovExams {
  calendar?: DemoExamDate[];
  calendarSource?: string;
  calendarUpdated?: string;
  cutoffs?: DemoCutoff[];
  cutoffSource?: string;
  eligibility?: DemoExamEligibility[];
  hi?: DemoHi<DemoGovExams, "calendarSource" | "calendarUpdated" | "cutoffSource">;
}

export interface DemoExamDate {
  exam: string;
  notification?: string;
  examDate?: string;
  hi?: DemoHi<DemoExamDate, "exam" | "notification" | "examDate">;
}

export interface DemoCutoff {
  exam: string;
  year?: string;
  category: string;
  cutoff: string;
  hi?: DemoHi<DemoCutoff, "exam" | "category" | "cutoff">;
}

export interface DemoExamEligibility {
  exam: string;
  age?: string;
  qualification?: string;
  hi?: DemoHi<DemoExamEligibility, "exam" | "age" | "qualification">;
}

/** Coaching (c4): the Olympiad page. */
export interface DemoOlympiad {
  intro?: string;
  exams?: DemoPoint[];
  schedule?: DemoScheduleRow[];
  medals?: string[];
  hi?: DemoHi<DemoOlympiad, "intro" | "medals">;
}

/** Coaching: fees, refunds and the MoE 2024 disclosure. */
export interface DemoFeesPolicy {
  intro?: string;
  paymentModes?: string[];
  instalmentNote?: string;
  refund?: string;
  receipts?: string;
  /** "No fee increase during a course." Only if they commit to it. */
  noIncrease?: string;
  hostel?: string;
  /** MoE counts: students coached and succeeded, with the year. */
  studentsCoached?: string;
  studentsSucceeded?: string;
  countsYear?: string;
  hi?: DemoHi<DemoFeesPolicy, "intro" | "instalmentNote" | "refund" | "receipts" | "noIncrease" | "hostel" | "paymentModes" | "countsYear">;
}

/* ── DENTAL (28 September 2026) ───────────────────────────────────────────
 * The dental half of a record: `DemoSite.dental`. Contract, page list and
 * copy rules: E:/myagency/_assets/DENTAL-ARCHITECTURE.md, DENTAL-IA.md,
 * DENTAL-COMPLIANCE.md. Rules the type cannot check:
 *   - No "best", "painless", "guaranteed", "award-winning", "% off", "free".
 *   - Prices are "starting from" an amount (digits only, no symbol), and
 *     every price shows the diagnosis note (src/lib/demo/ui/dental/copy.ts).
 *   - A specialist title only for a recognised MDS branch; the degree and the
 *     specialisation are separate fields.
 *   - Before-after on a template is an ILLUSTRATIVE PLACEHOLDER: no photo.
 *     `before`/`after` are set only by a real clinic, with `consent: true`.
 * Every text field has its Hindi twin in the object's own `hi`, as elsewhere.
 */

/** Icon keys the dental kit draws (src/lib/demo/ui/dental/icons.tsx). */
export type DentalIcon =
  | "tooth" | "checkup" | "cleaning" | "filling" | "root-canal" | "crown" | "bridge"
  | "implant" | "denture" | "extraction" | "wisdom" | "braces" | "aligner" | "retainer"
  | "whitening" | "veneer" | "smile" | "gum" | "kids" | "sealant" | "fluoride"
  | "emergency" | "pain" | "swelling" | "broken" | "xray" | "scan" | "cbct" | "laser"
  | "microscope" | "sterile" | "calendar" | "clock" | "shield" | "heart" | "globe"
  | "rupee" | "family" | "senior" | "accessible" | "parking" | "metro";

/**
 * The seven first screens. Default: from the theme (haven, meridian:
 * clinical-split; mint: clinical-reason; ivory: luxury-centred; sprout:
 * kids-arch; anchor: calm-full; harbour: calm-branch).
 */
export type DentalHeroVariant =
  | "luxury-centred" | "luxury-split" | "clinical-split" | "clinical-reason"
  | "kids-arch" | "calm-full" | "calm-branch";

export interface DentalHero {
  variant?: DentalHeroVariant;
  /** A FACT, never an award: "Smile design studio, Bandra West" or "Open today, 10 am to 8:30 pm". */
  pill?: string;
  /** May carry ONE *accent* phrase: "Your *smile journey* starts here". */
  headline?: string;
  /** 3 to 5 main treatments and the area: the 3-second rule. */
  lead?: string;
  /** Floating card on clinical-split: a standing fact such as "Evening slots from 5 pm, Mon to Sat". Never a live-looking "free today" claim on a template. */
  nextSlot?: string;
  /** Calm heroes: the lead surgeon's degree and registration number. */
  credential?: string;
  hi?: DemoHi<DentalHero, "pill" | "headline" | "lead" | "nextSlot" | "credential">;
}

export interface DentalDoctor {
  /** URL segment for /doctors/<slug>. Derived from `name` when empty. */
  slug?: string;
  /** "Dr. Aditi Rao". Fictional on a template. */
  name: string;
  /** A stock portrait (people/dentist-*) on a template; a real photo needs `photoConsent`. */
  photo?: string;
  photoConsent?: boolean;
  gender?: "female" | "male";
  /** Earned, recognised degrees only: "BDS, MDS (Prosthodontics)". */
  qualification: string;
  /** A recognised MDS branch title ("Prosthodontist") or "General dentist". Never "Implantologist". */
  specialisation?: string;
  /** Areas of work: "Dental implants, full-mouth rehabilitation". */
  focus?: string;
  /** "12 years in practice". */
  experience?: string;
  /** "English", "Hindi", "Marathi". Filter chips on chains. */
  languages?: string[];
  /** State Dental Council registration: "Reg. no. A-00000 (sample)". */
  regNo?: string;
  /** Visiting specialists: "Tuesdays and Fridays, 5 to 8 pm". */
  days?: string;
  visiting?: boolean;
  /** The lead dentist: long bio, first card, hero credential. One per site. */
  lead?: boolean;
  /** Chains: branch slugs this doctor sits at. */
  branches?: string[];
  /** Paragraphs separated by a blank line. With a bio the doctor gets /doctors/<slug>. */
  bio?: string;
  /** A short line in their voice about how they work. No boasting. */
  quote?: string;
  training?: string[];
  memberships?: string[];
  hi?: DemoHi<DentalDoctor, "name" | "qualification" | "specialisation" | "focus" | "experience" | "languages" | "days" | "bio" | "quote" | "training" | "memberships" | "regNo">;
}

export interface DentalTreatment {
  /** URL segment for /treatments/<slug>. Required: pages and bookings key on it. */
  slug: string;
  name: string;
  /** Specialty or problem group: "Implants", "Root canal and fillings", "Braces and aligners". */
  category?: string;
  icon?: DentalIcon;
  /** A stock section photo on a template. Never a smile close-up. */
  image?: string;
  /** One or two lines for cards. */
  summary: string;
  /** "What is it": a paragraph. */
  what?: string;
  /** "Signs you may need it". */
  symptoms?: string[];
  /** "Who it suits". */
  whoNeedsIt?: string[];
  /** The treatment steps, in order. */
  steps?: DemoPoint[];
  /** "2 to 3 visits over 3 to 6 months". */
  duration?: string;
  /** "1 visit of about 60 minutes". */
  visits?: string;
  recovery?: string;
  /** What you will feel, factually: "Done under local anaesthesia...". */
  comfort?: string;
  faqs?: DemoPoint[];
  /** Amount only, as published: "3,500". Absent: consultation required. */
  fromPrice?: string;
  /** "per tooth", or "Cost after consultation and X-ray". The diagnosis note is added by the kit. */
  priceNote?: string;
  /** Large card on the home page (d3 signature treatments, d1 grid first). */
  featured?: boolean;
  /** Booking step-1 reason this treatment pre-selects (DentalReason.id). */
  reason?: string;
  hi?: DemoHi<DentalTreatment, "name" | "category" | "summary" | "what" | "symptoms" | "whoNeedsIt" | "duration" | "visits" | "recovery" | "comfort" | "priceNote">;
}

/** One technology item, written as the patient's benefit. */
export interface DentalTech {
  /** "Digital X-rays". */
  title: string;
  /** "A lower radiation dose than film, and the image is on screen in seconds." */
  benefit: string;
  group?: "diagnosis" | "comfort" | "precision" | "speed" | "preview" | "hygiene";
  icon?: DentalIcon;
  image?: string;
  hi?: DemoHi<DentalTech, "title" | "benefit">;
}

/** One fee row. Never a fixed price for complex work. */
export interface DentalFeeRow {
  /** "Root canal treatment (front tooth)". */
  treatment: string;
  /** The treatment page it links to. */
  slug?: string;
  /** "Starting from" amount, digits only: "3,500". Empty: consultation required. */
  from?: string;
  /** "per tooth", "per arch", "per visit". */
  unit?: string;
  /** True for implants, full-mouth, smile makeover, aligners: prints "Cost after consultation and X-ray". */
  consult?: boolean;
  note?: string;
  /** Grouping on the Fees page: "Consultation", "General", "Implants". */
  group?: string;
  hi?: DemoHi<DentalFeeRow, "treatment" | "unit" | "note" | "group" | "from">;
}

/** EMI, payment and insurance, in plain words (DENTAL-COMPLIANCE.md section 3). */
export interface DentalPayment {
  /** "EMI options may be available through partner lenders, subject to their approval." */
  emi?: string;
  /** "12 months at about Rs 2,900 a month on Rs 35,000": an illustration, labelled as one. */
  emiExample?: string;
  partners?: string[];
  /** "UPI", "Debit and credit cards", "Cash". */
  modes?: string[];
  /** Only what the clinic confirms: "Cashless with some insurers; ask at the desk". */
  insurance?: string;
  /** "Consultation: Rs 300" or "First visit not charged. Treatment is charged as per the estimate you approve." */
  consultFee?: string;
  hi?: DemoHi<DentalPayment, "emi" | "emiExample" | "partners" | "modes" | "insurance" | "consultFee">;
}

/**
 * A before-after case. On a template it has NO photos and renders as the
 * labelled illustrative placeholder tile. A real clinic adds `before` and
 * `after` with `consent: true` (written consent, cropped to teeth and lips).
 */
export interface DentalCase {
  /** Filter chip: "Implants", "Braces", "Whitening", "Veneers", "Smile design". */
  category: string;
  /** Neutral caption: "Single missing lower molar replaced with an implant crown". */
  title: string;
  /** Treatment slug. */
  treatment?: string;
  /** "4 months, 3 visits". */
  duration?: string;
  /** For d5 filters: "Crowding", "Gaps", "Overbite". */
  problem?: string;
  before?: string;
  after?: string;
  consent?: boolean;
  hi?: DemoHi<DentalCase, "category" | "title" | "duration" | "problem">;
}

/** One branch of a chain (d7) or a second chamber (d1). */
export interface DentalBranch {
  /** URL segment for /clinics/<slug>. Required. */
  slug: string;
  /** "Dwarka Sector 12". The area name, kept on a duplicate. */
  name: string;
  city?: string;
  /** CLEARED on duplicate: address, phone, WhatsApp, map, landmark. */
  addressLines?: string[];
  phone?: string;
  whatsapp?: string;
  mapQuery?: string;
  mapUrl?: string;
  landmark?: string;
  /** "Mon to Sat 10 am to 8 pm, Sun 10 am to 2 pm". Kept, like contact.hours. */
  hours?: string;
  /** Structured, for the Open now chip. Kept. */
  sessions?: DentalSession[];
  /** Doctor slugs at this branch. */
  doctors?: string[];
  photo?: string;
  /** "Lift to the first floor", "Ground floor, ramp at the entrance". Cleared. */
  access?: string;
  parking?: string;
  transit?: string;
  hi?: DemoHi<DentalBranch, "name" | "city" | "addressLines" | "hours" | "landmark" | "access" | "parking" | "transit">;
}

/** One opening session, for the Open now chip. 0 is Sunday. Times "HH:MM", 24 hour. */
export interface DentalSession {
  days: number[];
  from: string;
  to: string;
}

export interface DentalEmergency {
  /** "Tooth pain? Same-day emergency appointments". The kit adds "Same-day slots depend on availability". */
  headline?: string;
  intro?: string;
  /** CLEARED on duplicate. Empty: the page uses contact.phone and contact.whatsapp. */
  phone?: string;
  whatsapp?: string;
  /** "Emergency line answered 8 am to 10 pm". */
  hours?: string;
  /** "What counts as urgent": severe pain, swelling, a knocked-out tooth... */
  urgent?: string[];
  /** Numbered first aid: knocked-out tooth, broken tooth, bleeding after extraction. */
  firstAid?: DemoPoint[];
  /** "Can wait for a regular appointment". */
  canWait?: string[];
  hi?: DemoHi<DentalEmergency, "headline" | "intro" | "hours" | "urgent" | "canWait">;
}

/** The Kids page and the kids blocks (d6 whole site; d2, d5 one page). */
export interface DentalKids {
  intro?: string;
  /** "First visit in 4 steps". */
  firstVisit?: DemoPoint[];
  /** Babies, kids, pre-teens: title "Babies (0 to 3)", body. */
  ageBands?: DemoPoint[];
  /** Fluoride, sealants, diet. */
  prevention?: DemoPoint[];
  /** Thumb sucking, bottle, mouth breathing. */
  habits?: DemoPoint[];
  /** Tell-show-do, parent can stay, sedation information. No guarantees. */
  comfort?: DemoPoint[];
  specialCare?: string;
  parentFaq?: DemoPoint[];
  hi?: DemoHi<DentalKids, "intro" | "specialCare">;
}

/** Booking step 1: "What do you need help with". */
export interface DentalReason {
  /** Stable key: "checkup", "pain", "root-canal", "implants", "braces", "whitening", "kids", "not-sure". */
  id: string;
  label: string;
  icon?: DentalIcon;
  /** Treatment slug it maps to. */
  treatment?: string;
  /** Tooth pain and swelling: shows "Emergency? Call now" and sorts first. */
  urgent?: boolean;
  hi?: DemoHi<DentalReason, "label">;
}

/** The booking widget's data. The demo sends nothing: it opens WhatsApp. */
export interface DentalBooking {
  reasons?: DentalReason[];
  /** Slot labels, "10:00 am". Sample on a template. */
  morning?: string[];
  evening?: string[];
  /** Weekdays with no slots, 0 is Sunday. */
  closedDays?: number[];
  /** "Closed on Sundays". */
  closedNote?: string;
  hi?: DemoHi<DentalBooking, "closedNote">;
}

/** A comparison table: braces vs aligners (d5), implant options (d4). */
export interface DentalComparison {
  title?: string;
  /** Column heads: ["Metal braces", "Ceramic braces", "Clear aligners"]. */
  columns: string[];
  rows: { label: string; values: string[]; hi?: { label?: string; values?: string[] } }[];
  note?: string;
  hi?: { title?: string; columns?: string[]; note?: string };
}

/** Family care plan (d7). Factual price, no discount language. */
export interface DentalPlan {
  name: string;
  price?: string;
  period?: string;
  includes?: string[];
  note?: string;
  hi?: DemoHi<DentalPlan, "name" | "period" | "includes" | "note" | "price">;
}

export interface DentalInternational {
  intro?: string;
  /** Plan, teleconsult, travel, treatment, review. */
  steps?: DemoPoint[];
  /** "Implants: plan for two trips, 3 to 4 months apart". */
  stays?: DemoPoint[];
  hi?: DemoHi<DentalInternational, "intro">;
}

/** How to reach the clinic. CLEARED on duplicate (it is the address's fact). */
export interface DentalReach {
  transit?: string;
  parking?: string;
  access?: string;
  hi?: DemoHi<DentalReach, "transit" | "parking" | "access">;
}

/**
 * THE DENTAL HALF OF A RECORD. Every field optional; each page leaves the nav
 * when its data is missing (src/lib/demo/site/pages.ts, DENTAL_PAGES).
 */
export interface DentalContent {
  hero?: DentalHero;
  doctors?: DentalDoctor[];
  treatments?: DentalTreatment[];
  /** Specialty tiles (d2, d7): title, body, group = the treatment category it filters. */
  specialties?: DemoPoint[];
  technology?: DentalTech[];
  fees?: DentalFeeRow[];
  payment?: DentalPayment;
  cases?: DentalCase[];
  branches?: DentalBranch[];
  emergency?: DentalEmergency;
  kids?: DentalKids;
  booking?: DentalBooking;
  /** Structured opening hours for the Open now chip. Kept on duplicate. */
  sessions?: DentalSession[];
  reach?: DentalReach;
  /** The sterilisation protocol, in steps. Home strip + About. */
  sterilisation?: DemoPoint[];
  /** Why patients trust us (About). Facts, not superlatives. */
  trust?: DemoPoint[];
  /** Journey steps: smile journey (d3), implant journey (d4), ortho journey (d5). */
  journey?: DemoPoint[];
  /** "Who this is for" (d4): missing tooth, loose denture, many teeth. */
  audience?: DemoPoint[];
  /** Candidate checklist (d4): diabetes, smoking, bone. */
  candidate?: DemoPoint[];
  comparison?: DentalComparison;
  /** Comfort promise: what you will feel, anaesthesia, breaks. No guarantees. */
  comfort?: DemoPoint[];
  plans?: DentalPlan[];
  corporate?: DemoPoint[];
  international?: DentalInternational;
  /** Legal name for the footer: "Sheesham Dental Care LLP (sample)". */
  legalName?: string;
  hi?: DemoHi<DentalContent, "legalName">;
}

/** Hindi versions of DemoSite's own top-level text fields. */
/** See `DemoSite.sample` and src/lib/demo/site/sample.ts. */
export interface DemoSampleMarks {
  /** The template id the content came from. */
  from: string;
  /** Block name to fingerprint, as the block landed on the copy. */
  prints: Partial<Record<
    | "faculty" | "results" | "fees" | "reviews" | "timings" | "photos"
    /* Dental (28 Sep 2026): the trust row, before-after cases, the doctors. */
    | "stats" | "cases" | "doctors"
    /* Every kind (30 Sep 2026): the founding story and year the About page
       prints (`about`, `established`, `establishedYear` and their Hindi). */
    | "story",
    string
  >>;
  /** Ticked in the admin: the results and reviews are the institute's own. */
  real?: boolean;
}

export type DemoSiteHi = DemoHi<
  DemoSite,
  | "tagline" | "about" | "admissionsHeadline" | "principalMessage" | "principalTitle"
  | "resultsHeading" | "resultsNote" | "scheduleNote" | "vision" | "mission"
  | "classSizePromise" | "hostel" | "sessionLabel" | "instituteName"
  /* The Hindi slots of 26 Sep 2026: lines that printed English on the Hindi
     page. A list takes a list in the English order. */
  | "facilities" | "focusAreas" | "established" | "establishedYear"
  | "boardOrAffiliation" | "udiseCode" | "shortName" | "city" | "state"
>;

export interface DemoSite extends BaseDoc {
  /** URL segment. The site is served at /site/<slug>. */
  slug: string;
  status: DemoStatus;
  /** Which template renders. There is no safe default, so the admin asks. */
  kind: DemoKind;

  /**
   * After this date the public page stops rendering the site and shows a short,
   * polite "this demo has expired" card with a way to reach Mehdi. ISO date,
   * and OPTIONAL: most demos have no end.
   *
   * It is on the PUBLIC record rather than the private slot beside it for one
   * reason: the public route is what enforces it, and the public route cannot
   * read the private collection. Nothing sensitive is in a date.
   */
  expiresAt?: string;

  /** Exactly as they spell it. This is the masthead of their own website. */
  instituteName: string;
  /** For the nav, when the full name is too long: "HighQ" for "HighQ Classes". */
  shortName?: string;
  /** One line under the name. Theirs if they have one, else a placeholder. */
  tagline?: string;

  market?: DemoMarket;
  /**
   * WHICH LOOK THIS DEMO WEARS. See `DemoTheme` above for the ids and
   * src/lib/demo/schoolThemes.ts for what each one actually changes.
   *
   * PICK A DIFFERENT ONE FOR EVERY DEMO SENT IN THE SAME WEEK. Two directors
   * who compare notes are looking for the moment the second site is the first
   * with the words changed, and a shared palette is where they find it.
   *
   * A THEME IS NOT A COLOUR, IT IS A WHOLE COMPOSITION, and that is why it
   * replaced `palette`. A palette recolours one layout, which is exactly the
   * seam two directors comparing links would find. A theme moves four things
   * at once: the colours, WHICH FAMILY SETS THE HEADINGS AND WHICH SETS THE
   * BODY, the hero composition (framed, split, full-bleed, type-led, panel)
   * and the order the sections come in.
   *
   * Empty is normal and safe: each template falls back to the preset that
   * carries an empty record best, and an id belonging to the OTHER template
   * falls back the same way rather than rendering nothing.
   */
  theme?: DemoTheme;
  /**
   * Superseded by `theme`. Kept so a record written before themes existed
   * still loads and still renders, rather than losing its colours on the day
   * this file changed. Nothing new should set it.
   */
  palette?: DemoPalette;
  currency?: DemoCurrency;

  city?: string;
  state?: string;
  country?: string;

  logo?: string;
  heroImage?: string;

  /** What they coach: ["JEE", "NEET", "Foundation"]. Drives the hero line. */
  focusAreas?: string[];
  /** "Since 2009". Only if it is on their own site. */
  established?: string;
  /** The year alone, when that is all there is: "2009". Free text, never parsed. */
  establishedYear?: string;
  /**
   * Board, university or accreditation, EXACTLY as the institute publishes it:
   * "CBSE affiliation no. 2730123", "Cambridge Assessment International
   * Education", "Registered with the Department of Education".
   *
   * Free text and never a dropdown, because a dropdown invites a guess. An
   * affiliation number is checkable in a public register, which is precisely
   * why inventing one is the most damaging thing on this whole record: it is a
   * claim a parent can look up, find false, and reasonably read as fraud.
   * Empty unless it was read off their own site or their own letterhead.
   */
  boardOrAffiliation?: string;
  /** Two or three sentences about the institute, in their voice. */
  about?: string;

  /* ── The school half ────────────────────────────────────────────────────
     A coaching institute sells the teacher and the result; a school sells the
     head, the building and the admission process. The five fields below are
     what the school template needs and the coaching template ignores. All
     optional, all empty by default, each with a placeholder that reads as a
     placeholder. See rule 1 in the block comment above.
     ──────────────────────────────────────────────────────────────────────── */

  /** Read off their site, or empty. Never "Dr. Sharma" because it sounds right. */
  principalName?: string;
  /** Their word for the job: "Principal", "Head of School", "Director". */
  principalTitle?: string;
  /**
   * A paragraph signed by the head. NEVER GENERATED, and this is the field
   * most likely to tempt somebody, because a school site always has one and a
   * plausible one is easy to write. A message the head did not write, printed
   * over the head's name, is putting words in a real person's mouth on a page
   * their own parents will read. Empty renders as an obvious placeholder.
   */
  principalMessage?: string;
  /** "Science laboratories", "Library", "Transport". Their list, not a stock one. */
  facilities?: string[];
  /**
   * The one line about admission that sits high on the page: "Admissions open
   * for 2026-27". Free text, and EMPTY IS THE NORMAL STATE: the template falls
   * back to a sentence that promises nothing ("ask us about the current
   * session") rather than inventing a session, a year or a deadline. A demo
   * that announces an admission window the school has not opened is the kind
   * of error a parent acts on.
   */
  admissionsHeadline?: string;
  admissions?: DemoAdmissions;

  /**
   * Notices the school could post itself. See DemoNotice.
   *
   * It is on the shared record rather than in the school half alone because a
   * coaching institute posts exactly the same thing under a different word (a
   * new batch, a test date, a holiday). The school template heads the section
   * "Notices"; the coaching template can head it whatever its market calls it.
   */
  notices?: DemoNotice[];

  /**
   * Photographs OF THE INSTITUTE, and only files Mehdi actually holds.
   * Never hotlinked from their site (scripts/check-no-hotlinks.mjs fails the
   * build on that) and never a stock photograph of somebody else's campus
   * standing in for theirs.
   */
  gallery?: DemoMedia[];

  courses?: DemoCourse[];

  /** "Our 2025 results". Their heading if they have one. */
  resultsHeading?: string;
  /** The line under the results, e.g. how the list is verified. */
  resultsNote?: string;
  results?: DemoResult[];

  faculty?: DemoFaculty[];
  /** Why us / how we teach. */
  method?: DemoPoint[];

  /**
   * The questions a parent actually asks on the phone, with the institute's
   * own answers.
   *
   * IT IS WHERE THE FEE QUESTION LIVES. Mathnasium carries "What does
   * Mathnasium cost?" as one of sixteen questions and states no figure
   * anywhere else on the home page; MyTutor puts one "from" line above the
   * tutor cards and no table at all. Both are avoiding the same thing: a price
   * grid on a home page starts an argument before anybody has read what is
   * taught. So the coaching template prints one derived "from" figure and
   * sends the rest here.
   *
   * Same shape as `method`, and empty for the same reason every other array
   * here is empty by default: an invented answer over an institute's name is
   * an institute's promise, and this is the section a parent quotes back.
   */
  faq?: DemoPoint[];

  trial?: DemoTrial;

  schedule?: DemoScheduleRow[];
  scheduleNote?: string;

  contact?: DemoContactDetails;

  /**
   * Their real website, if they have one. The demo marker links to it, so a
   * visitor who arrives here by accident can reach the actual institute in one
   * click instead of mistaking this page for it.
   */
  officialWebsite?: string;

  preparedOn?: string;

  /** TRUE on the shipped example records, which the page labels as examples. */
  isExample?: boolean;

  /**
   * The template this demo was duplicated from, by id ("s1-urban-cbse"), or
   * empty. Set once by `fromTemplate` in src/lib/demo/templates and never read
   * by the page: it is there so the admin can say which design a demo started
   * as. Templates themselves are code, not records; see that folder.
   */
  templateId?: string;

  /**
   * What a template duplicate carried across, so the page can say so. Set
   * once by `fromTemplate`; see src/lib/demo/site/sample.ts. `prints` holds a
   * fingerprint of each carried block as it landed: while a block still
   * matches its print it is the template's sample content, and the results
   * and reviews on the page carry a small "Sample" line. `real` is the admin
   * switch "Results and reviews on this demo are the institute's real ones".
   */
  sample?: DemoSampleMarks;

  /* ── MULTI-PAGE FIELDS (26 September 2026) ─────────────────────────────
     All optional. The table in src/lib/demo/templates/fromTemplate.ts says
     which survive a duplicate; the page registry in src/lib/demo/site/pages.ts
     says which page reads which. ── */

  /** Pages this site offers, by page id, in nav order. Empty: the kind's default list. Structure, kept on duplicate. */
  sitePages?: string[];
  /** The language a first-time reader sees: "hi" for a Hindi-first rural site. */
  defaultLang?: "en" | "hi";
  /** Hindi versions of the top-level text fields. See DemoHi. */
  hi?: DemoSiteHi;

  /** The session admissions are for: "2027-28". Never computed from the clock. */
  sessionLabel?: string;
  /** ISO date. The "Admissions open" chip hides itself after it. */
  admissionsOpenUntil?: string;

  vision?: string;
  mission?: string;
  /** "UDISE+ 09150100000" for state-board schools. */
  udiseCode?: string;
  /** Coaching: "40 students per batch". A concrete promise instead of a superlative. */
  classSizePromise?: string;
  /** Coaching (c1): hostel and PG guidance. */
  hostel?: string;
  founder?: DemoFounder;

  /** Trust figures, each with its basis line. */
  stats?: DemoStat[];
  reviews?: DemoReview[];
  rating?: DemoRatingSummary;
  photos?: DemoPhoto[];
  /** Links to the institute's REAL portal or app. Never a login form here. */
  portalLinks?: DemoLink[];
  downloads?: DemoDownload[];
  policies?: DemoPolicy[];
  /** Steps of "How joining works" (coaching). Empty: our generic three. */
  joining?: DemoPoint[];

  /* School */
  academics?: DemoAcademics;
  facilityDetails?: DemoPoint[];
  boardResults?: DemoBoardResult[];
  transport?: DemoTransport;
  boarding?: DemoBoarding;
  studentLife?: DemoPoint[];
  /** Play school: safety and care facts. */
  safety?: DemoPoint[];
  /** Play school: a day in the life, as timetable rows. */
  dayPlan?: DemoScheduleRow[];
  disclosure?: DemoDisclosure;

  /* Coaching */
  testSeries?: DemoTestSeries;
  scholarship?: DemoScholarship;
  posts?: DemoPost[];
  govExams?: DemoGovExams;
  olympiad?: DemoOlympiad;
  feesPolicy?: DemoFeesPolicy;

  /* Dental (28 Sep 2026). Everything a clinic has that a school has not.
     The shared fields above carry the rest: about, mission, vision,
     established, stats (the trust row), reviews and rating, posts (the
     guides), faq, photos, heroImage, sectionPhotos, contact. */
  dental?: DentalContent;
}

/* ── The slot beside the demo: THE ADMIN HALF ──────────────────────────────
 *
 * THE PROBLEM THIS COLLECTION EXISTS TO SOLVE, in the words it was reported in:
 * Mehdi pitches a demo to institute A. An hour later he edits the same record
 * for institute B. A's director opens the link that night, five hours later,
 * and sees B's name. A's name is gone and the pitch is dead, and nobody saw it
 * happen.
 *
 * So the requirement is not "more slots". It is that a demo which has BEEN SENT
 * must never be silently overwritten. Everything below is in service of one
 * sentence the admin can put in front of him at the moment he clicks Edit:
 * "this demo was sent to <sentTo> on <date>, they may still open it, and
 * changing it now replaces what they will see."
 *
 * WHY IT IS A SEPARATE COLLECTION AND NOT FIELDS ON DemoSite.
 * The same reason `pitchPageNotes` and `certificateGrades` are separate: in
 * this storage layer access control is per collection, not per field, and
 * `demoSites` is world-readable because the institute has to open it without
 * an account. `sentTo` is a named human being. `internalNotes` is where
 * somebody writes "chasing them, the father is the one with the money".
 * `internalName` is "Delhi schools, batch 2", which tells the reader they are
 * one of a batch. Every one of those on the public record would be one View
 * Source away from the person it is about, on a page built to flatter them.
 * Hiding them in the component fixes nothing: the value is still in the
 * payload. `demoSiteSlots` is on PRIVATE_COLLECTIONS, so `anon` gets no rows.
 *
 * `id` is the demo's own id, so the slot for `ds_x` is `demoSiteSlots/ds_x`.
 * ───────────────────────────────────────────────────────────────────────── */
export interface DemoSiteSlot extends BaseDoc {
  /** A label only Mehdi sees: "Delhi schools, batch 2". Never rendered publicly. */
  internalName?: string;
  /** A short description. Never rendered publicly. */
  internalNotes?: string;
  /** Pins the row to the top of the admin list. Nothing else. */
  important?: boolean;
  /** Who it went to, free text: "Mrs Rao, principal, by WhatsApp". */
  sentTo?: string;
  /** ISO timestamp of when it went out. Written when the status becomes `sent`. */
  sentAt?: string;
}

/**
 * ONE OPEN OF ONE DEMO. Append-only, and its own collection for a reason that
 * is entirely about who is allowed to write what.
 *
 * The count has to be incremented by the PUBLIC page, which runs as `anon`.
 * `anon` cannot UPDATE a row in this store (see supabase/migrations/0001), so a
 * counter living on the demo record would sit at zero for ever and look exactly
 * like "nobody opened it", which is the one reading Mehdi must never be given
 * falsely, because he makes follow-up decisions on it. What `anon` CAN do is
 * insert into a named collection, so an open is written as a new row here and the admin
 * counts the rows. `openCount` and `lastOpenedAt` are therefore DERIVED, never
 * stored: see `demoOpenStats` in src/lib/demo/slots.ts.
 *
 * Nobody but a signed-in admin may read this collection: when and how often a
 * named institute opened a page is about them, not about us.
 *
 * ONE ROW PER BROWSER SESSION, not per page load, so a reader who refreshes
 * three times counts once. The number then answers the question actually being
 * asked, which is "did they open it, and when last", not "how many times did
 * the bundle execute".
 */
export interface DemoSiteOpen extends BaseDoc {
  /** The DemoSite id this open belongs to. */
  demoId: string;
  /** ISO timestamp, from the reader's own clock. Treat it as approximate. */
  at: string;
}

/* ───────────────── Aggregate ───────────────── */

export interface ContentData {
  settings: SiteSettings;
  contact: ContactInfo;
  navigation: Navigation;
  home: HomeHero;
  internship: InternshipContent;
  eduflow: EduFlowContent;
  legal: LegalContent;

  socials: SocialLink[];
  services: Service[];
  testimonials: Testimonial[];
  projects: Project[];
  team: TeamMember[];
  milestones: Milestone[];
  process: ProcessStep[];
  faqs: Faq[];
  stats: Stat[];
  clients: ClientLogo[];
  posts: BlogPost[];
  /** Personalised pitch pages for schools and coaching institutes. See PitchPage. */
  pitchPages: PitchPage[];
  /** Admin-only. Never seeded, never public, see PitchPageNote. */
  pitchPageNotes: PitchPageNote[];
  /** Demonstration websites built FOR an institute, under their own name. See DemoSite. */
  demoSites: DemoSite[];
  /** Admin-only. Never seeded, never public, see DemoSiteSlot. */
  demoSiteSlots: DemoSiteSlot[];
  /** Admin-only reads, anon-only inserts. Never seeded, see DemoSiteOpen. */
  demoSiteOpens: DemoSiteOpen[];
  certificates: Certificate[];
  /** Admin-only. Never seeded, never public, see CertificateGrade. */
  certificateGrades: CertificateGrade[];
  submissions: ContactSubmission[];
  applications: Application[];
}

/** Collections that are arrays of BaseDoc (CRUD-able). */
export type CollectionKey =
  | "socials" | "services" | "testimonials" | "projects" | "team"
  | "milestones" | "process" | "faqs" | "stats" | "clients"
  | "posts" | "pitchPages" | "pitchPageNotes"
  | "demoSites" | "demoSiteSlots" | "demoSiteOpens"
  | "certificates" | "certificateGrades" | "submissions" | "applications";

/**
 * Collections `anon` must never be able to read.
 * Kept here so the TypeScript side and the SQL policy are written from one list,
 * if you add to it, add the same string to the LATEST migration under
 * supabase/migrations/ (0002 for certificateGrades, 0003 for pitchPageNotes,
 * 0004 for demoSiteSlots and demoSiteOpens).
 */
export const PRIVATE_COLLECTIONS: CollectionKey[] = [
  "submissions",
  "applications",
  "certificateGrades",
  "pitchPageNotes",
  "demoSiteSlots",
  "demoSiteOpens",
];

/** Singletons (object edited in place). */
export type SingletonKey = "settings" | "contact" | "navigation" | "home" | "internship" | "eduflow" | "legal";

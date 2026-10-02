/**
 * The international pitch page: what it is allowed to assert, and the
 * arithmetic it does at render time.
 *
 * WHY THIS IS NOT IN `record.ts`
 * `record.ts` holds everything the two designs could disagree about: the record
 * shape, the slug rules, and the one price table both markets quote from.
 * Nothing in this file is shared, and nothing here may restate a price. What is
 * here is the half of the argument that only exists abroad.
 *
 * The India page opens on price and on whether the thing will be finished. This
 * page opens on a different question, and it is the only one that matters to a
 * dentist in Austin or a solicitor in Manchester reading a cold email: is an
 * agency in India a real business, and what happens to me if this goes wrong.
 * Everything below answers that with terms rather than with reassurance, and it
 * is kept in its own file so that a well-meaning edit to the shared helpers
 * cannot quietly soften it.
 *
 * SOURCE. Every commitment, name and URL below is copied from
 * `_assets/FACTS.md`, and the prices are not copied at all: they are read from
 * `PITCH_PACKAGES` in `record.ts` at render time, so this page cannot quote a
 * figure the rest of the site has moved on from.
 *
 * WHAT MAY NEVER GO IN THIS FILE
 * A testimonial, a client quote, a rating, an award, a certification, a
 * headcount, a project count, a conversion figure, or any sentence of the shape
 * "clients typically see". None of those has ever been measured at Ideovent.
 * The proof list is live URLs and nothing else, because a reader can open every
 * one of them in a new tab and disagree with us. That is the point of it.
 */

import type { PitchPage, PitchVertical } from "@/lib/cms/types";
import { proofBySlug, type ProofEntry } from "./proof";

export type { PitchVertical };

/* ──────────────────────────────────────────────────────────────────────────
 * Where the reader is, and what time it is there.
 *
 * `timezone` and `locale` are optional on the record, and often empty, so
 * everything below has a country-level fallback and every consumer has a path
 * for "we do not know". A page that prints the wrong local time is worse than
 * one that prints none: the whole section exists to show that somebody did the
 * arithmetic before sending the email.
 * ────────────────────────────────────────────────────────────────────────── */

interface Locale {
  timezone: string;
  locale: string;
}

/**
 * Default zone and date convention per country, for a record that carries a
 * country and nothing finer.
 *
 * THE UNITED STATES AND AUSTRALIA ARE A DELIBERATE COMPROMISE. Both span
 * several zones, so the default is the one with the largest share of the
 * small-business population, and the record's own `timezone` overrides it. A
 * record for Los Angeles or Perth that leaves `timezone` empty will therefore
 * show an east-coast figure, which is why the field exists and why the admin
 * asks for it.
 */
const COUNTRY_DEFAULTS: Record<string, Locale> = {
  "united states": { timezone: "America/New_York", locale: "en-US" },
  usa: { timezone: "America/New_York", locale: "en-US" },
  us: { timezone: "America/New_York", locale: "en-US" },
  "united kingdom": { timezone: "Europe/London", locale: "en-GB" },
  uk: { timezone: "Europe/London", locale: "en-GB" },
  england: { timezone: "Europe/London", locale: "en-GB" },
  scotland: { timezone: "Europe/London", locale: "en-GB" },
  ireland: { timezone: "Europe/Dublin", locale: "en-IE" },
  "united arab emirates": { timezone: "Asia/Dubai", locale: "en-GB" },
  uae: { timezone: "Asia/Dubai", locale: "en-GB" },
  australia: { timezone: "Australia/Sydney", locale: "en-AU" },
  canada: { timezone: "America/Toronto", locale: "en-CA" },
  "new zealand": { timezone: "Pacific/Auckland", locale: "en-NZ" },
  singapore: { timezone: "Asia/Singapore", locale: "en-SG" },
};

/**
 * Whether Intl recognises this IANA zone, asked rather than assumed.
 *
 * `timezone` is a free-text box in the admin, so "America/Austin", "CST" and a
 * trailing space are all things that will be typed into it. Every one of them
 * makes `computeOverlap` return null, and the page then prints the
 * [[PROSPECT_TIMEZONE]] blank whose wording is "neither a timezone nor a
 * country we recognise has been set". With a country on the record that was
 * simply false, and a false explanation on a page arguing for its own
 * honesty is worse than the gap it was explaining. So a zone Intl cannot
 * parse is treated as absent and the country default takes over, which is
 * what the reader would have got had the box been left empty.
 */
function isKnownZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The zone and date convention to render this record in. */
export function readerLocale(page: PitchPage): Locale {
  const byCountry = COUNTRY_DEFAULTS[(page.country || "").trim().toLowerCase()];
  const typed = (page.timezone || "").trim();
  return {
    timezone: (isKnownZone(typed) ? typed : "") || byCountry?.timezone || "",
    locale: (page.locale || "").trim() || byCountry?.locale || "en-US",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * The offshore question, answered as terms.
 *
 * The default reader has been burned by an offshore agency before, and
 * reassurance is exactly what the last one gave them. So there is none here.
 * Two of these rows are deliberately unflattering, the one about work pausing
 * and the one about which courts have jurisdiction, because a list of terms
 * containing nothing you would rather hide is not a list of terms, it is a
 * brochure. Those two are what make the other four believable. Do not delete
 * them to make the page read better: they are the page.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * `icon` USED TO BE A FIELD HERE AND IS GONE.
 *
 * These rendered as six cards, each with a lucide glyph in a gold disc, which
 * _assets/DESIGN-DIRECTION.md names as "the universal AI-page unit" and which
 * the 25 Sep 2026 craft pass replaced with a numbered, ruled list. The field
 * was then read by nothing. A data field that no renderer consumes is a field
 * somebody will faithfully maintain for a year before discovering it does not
 * appear anywhere, so it is removed rather than left as furniture.
 */
export interface TermRow {
  q: string;
  a: string;
}

export const OFFSHORE_TERMS: TermRow[] = [
  {
    q: "Who do I actually talk to?",
    a: "Mehdi Alam, a partner in the firm and the developer who writes the code. He is on the call, he writes the scope, and he answers the email. There is no account manager in between, and no handover to a team you have not met once the deposit clears. His work history and his code are both public, and both are linked at the foot of this page.",
  },
  {
    q: "What am I signing?",
    a: "Two documents. A master services agreement that sets the terms once, and a statement of work per project naming the pages, the features, the dates and the price. Nothing gets built that is not on the statement of work, and any change to it is a written change note with its own price, agreed before it becomes work. An NDA on request, signed before the first call if you would rather.",
  },
  {
    q: "How does the money work?",
    // 1 Oct 2026 (Mehdi): 50% advance and 50% at launch. Was "Three payments: 50% to start, 30% once the
    // design and the working build are on a staging link you can open yourself, and 20% before handover. ..."
    a: "Two payments: 50% to start, and 50% at launch, once you have checked the finished build on a staging link you can open yourself. The final payment is the one that assigns the source code and the intellectual property to you.",
  },
  {
    q: "What if you get it wrong?",
    a: "Two revision rounds are included at every design stage, so disagreeing about the design is planned for rather than charged for. After launch there are 30 days of free support, which is the same window every Ideovent project gets and is written into the agreement rather than offered as goodwill in a sales email. That is what makes it something you can hold us to.",
  },
  {
    q: "And the parts I would rather you did not read?",
    /*
      CHECKED AGAINST THE ACTUAL DOCUMENT, 03-legal-docs/contracts/
      Master-Service-Agreement-International.md, clause 23.2.

      This row used to say, flatly, that the agreement is governed by Indian
      law with jurisdiction at the courts in New Delhi. Clause 23.2 does not
      say that. It puts two options in front of the client and requires one
      to be selected per engagement: Option A, India, marked "(default)",
      and Option B, the client's own governing law and courts. So the page
      was stating as settled a term the contract leaves open, and it was
      stating the half that is worse for the reader. Wrong about our own
      paperwork is the one thing this section cannot be.

      It still leads with Option A, because that is what the document calls
      the default and because this block exists to say the unflattering part
      out loud. It does not promise Option B: which one applies is a per-deal
      decision the MSA says needs an advocate. [[GOVERNING_LAW_OPTION]] is
      unresolved in the template and Mehdi has to settle it.
    */
    a: "Work pauses if a payment is not made, and late payment carries interest at 1.5% a month. On governing law our agreement defaults to Indian law with jurisdiction at the courts in New Delhi, and that is a real asymmetry if a dispute ever went that far. The agreement also carries the alternative, your own governing law and your own courts, and which of the two applies is selected in writing before either of us signs rather than assumed. We would rather you weighed that now than found it on page four.",
  },
  {
    q: "Who is Ideovent?",
    // HIDDEN 27 Sep 2026 (Mehdi): Animesh Raturi removed for now; restore by uncommenting.
    // Original: "... based in Saket, New Delhi. Three partners, named further down this page, and the people who work with them. ..."
    // 1 Oct 2026 (Mehdi): founded 2019; the partnership firm dates from 2024. Was "A partnership firm founded in 2024 and based in Saket, New Delhi. ..."
    a: "Founded in 2019, a partnership firm since 2024, and based in Saket, New Delhi. The partners are named further down this page, with the people who work with them. We do not publish a headcount, a client count or a satisfaction score, because none of those has ever been measured here, and a number nobody measured is a number somebody invented.",
  },
];

/**
 * The things we are not, said before anybody has to find out.
 *
 * This block costs one scroll and buys the only thing a cold page can buy,
 * which is being taken at face value on everything above it.
 */
export const HONEST_LIMITS = [
  "Ideovent is not registered under GST in India, so invoices carry no Indian tax and say so on their face. For you that means the invoice total is the invoice total.",
  "The Indian export letter of undertaking has not been filed yet. It changes nothing you pay and nothing you receive, and it is here only because it is the sort of thing an agency leaves out.",
  "We are not a large agency and will not pretend to be one. What we publish is a list of live URLs you can open and the names of the people who would be on your project.",
  "We do not do photography, video production or paid ad management. If a build needs them we will say so and point you at somebody who does.",
];

/**
 * Commitments. Every one is in the agreement, which is why it can be printed.
 *
 * SIX, AND THE COUNT IS LOAD-BEARING. They render in a three-column grid whose
 * cells are separated by the border colour showing through a one-pixel gap, so
 * five items leave a visible empty cell that reads as a rendering fault. If one
 * is ever removed, remove two or change the grid.
 */
export const COMMITMENTS = [
  { label: "Revision rounds", value: "Two at every design stage, included" },
  { label: "Free support after launch", value: "30 days, included" },
  { label: "Source code and IP", value: "Assigned to you on final payment" },
  { label: "Change requests", value: "Priced in writing before they become work" },
  { label: "Published hours", value: "Monday to Friday, 9:00 am to 6:00 pm IST" },
  { label: "Reply to a new enquiry", value: "Within two working days" },
];

/**
 * What comes with every project regardless of which package it is.
 *
 * NOT PACKAGE SCOPE, AND KEPT SEPARATE FROM IT ON PURPOSE. `PITCH_PACKAGES`
 * owns what each package contains, and this page must not restate that or the
 * two drift. These four are process, and all four are already published on
 * /pricing as part of how a build is run rather than as line items in a tier.
 * They are on this page because ownership is the thing an international buyer
 * is quietly worried about: an agency that holds your domain and your hosting
 * account holds your business, and most of them do not say which way it is.
 */
export const EVERY_PROJECT = [
  "Your domain, your hosting account and your analytics, in your name and not ours",
  "A staging link for the whole build, so you watch it happen rather than read about it",
  "A speed and accessibility pass before handover, with the results shown to you",
  "A recorded walkthrough at handover that you keep",
];

/**
 * The money, as two things you pay against rather than as one number.
 * 1 Oct 2026 (Mehdi): 50% advance and 50% at launch, for India and abroad
 * alike. It replaced 50 / 30 / 20 (to start, at the design and build
 * milestone, before handover). Both rows carry 50%, so render keys use `when`.
 */
export const PAYMENT_STAGES = [
  { pct: "50%", when: "To start", what: "The statement of work is signed, the build is scheduled, work begins." },
  { pct: "50%", when: "At launch", what: "You have checked the finished build on the staging link. This final payment assigns the source code and the IP to you." },
];

/**
 * How a name and a title are written to this reader.
 *
 * `pitchAddressee` in record.ts returns "Principal Sharma", which is the right
 * form for an Indian school and reads as a job description stapled to a name
 * anywhere else: "Practice Owner Jane Smith" is not a sentence in English.
 * Western business correspondence puts the role after the name, so this does.
 * Null when there is no name, which is often, and the page drops the line
 * rather than guessing: a wrong name above the fold proves the page was a
 * template blast, which is the exact impression it exists to avoid.
 */
export function westernAddressee(page: PitchPage): string | null {
  const name = (page.directorName || "").trim();
  if (!name) return null;
  const title = (page.directorTitle || "").trim();
  return title ? `${name}, ${title}` : name;
}

/**
 * How long a package takes, when the shared table does not say.
 *
 * NOT A PRICE AND NOT A PROMISE. `PITCH_PACKAGES` carries timelines on the
 * India rows and not on the international ones, and a build window is the
 * second thing this reader looks for after the number. These mirror the
 * equivalent India rows on /pricing for the same scope, and the page prints
 * "from the deposit and your content" beside them, because the clock does not
 * start until both have arrived and saying so later is an argument.
 */
export const FALLBACK_TIMELINE: Record<string, string> = {
  "intl-landing": "Two to three weeks",
  "intl-website": "Three to five weeks",
  // Deliberately absent: "intl-application". Nothing on that line gets a window
  // before the scope exists, and a made-up one would be the first thing to slip.
};

/**
 * What is in the box, per package id in `PITCH_PACKAGES`.
 *
 * A FALLBACK, NOT A SECOND SOURCE. If the shared package row carries its own
 * `includes`, that wins and this is never read. It exists because the price
 * section is the one part of this page that cannot degrade to nothing: a
 * reader who has just been given a number and no list of what it buys reads
 * the number as the start of a negotiation, which is the opposite of the
 * effect the number is there to have.
 *
 * AS OF TODAY NONE OF IT RENDERS. All four international rows in
 * `PITCH_PACKAGES` carry their own `includes`, so every branch below is
 * unreachable and the price column you see on the page is the shared table's
 * list, not this one. Read that before editing: a change made here will look
 * like it did nothing. It is kept because the day somebody adds a package and
 * forgets its `includes` is the day the price column would otherwise be blank.
 * The corollary is that it has to stay TRUE while nobody is looking at it, so
 * every line here is held to the same rule as a line that renders.
 */
export const FALLBACK_INCLUDES: Record<string, string[]> = {
  "intl-landing": [
    "One page, built around the single action you want a visitor to take",
    "Responsive on phone, tablet and desktop, checked on all three",
    "Enquiry form delivered to your inbox, with the fields you ask for",
    "On-page SEO basics, SSL and analytics installed",
    "Two revision rounds at the design stage",
    "Handover, plus a recorded walkthrough you keep",
  ],
  "intl-website": [
    "Everything in the landing page",
    "Four to twelve pages, structured around how people actually search for you",
    "Custom design built to your brand, not adapted from a template",
    "Content areas you edit yourself, with one live training session",
    "Forms with validation, routed to the right person on your team",
    "A speed and accessibility pass before handover, with the results shown to you",
    "A staging link for the whole build, so you watch it happen",
    "Your domain, your hosting account, your analytics, in your name and not ours",
  ],
  "intl-application": [
    "A product with accounts, roles and a database behind it",
    "A written specification agreed before the first line of code",
    "Staged delivery, so you see working software rather than status reports",
    /*
      "In your own repository from the first commit" was here and is wrong.
      FACTS.md, and the terms row six screens above this one, both say the
      source code and the IP are ASSIGNED on final payment. A buyer who reads
      "yours from the first commit" in the price column and "assigned on final
      payment" in the terms has found the page contradicting itself on the one
      subject it asked to be trusted about. Visibility during the build is a
      real and separate thing, and the shared table already names the form it
      takes, so that wording is reused rather than a second one invented.
    */
    "A staging link from the first week, open to you for the whole build",
    "Source code and intellectual property assigned to you on final payment",
  ],
  "intl-care": [
    "Updates, backups and uptime monitoring",
    "A named response target: two working days, one working day, or the same working day, by tier",
    "Optional, and it starts only after the free 30 days end",
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
 * What they would get, in their own trade's words.
 *
 * DELIVERABLES, NOT RESULTS. Every line is something that will exist on the
 * site at handover and that the owner can check on the day. Not one of them is
 * "more bookings" or "better rankings", because neither is in anybody's gift
 * and FACTS.md forbids a number that was never measured. `goal` is the reader's
 * own word for what the site is for, and it is used as a noun in a sentence,
 * never as a promise about how many of them they will get.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * `article` IS A FIELD AND NOT A VOWEL TEST.
 *
 * The page writes "Built for a {noun}" as an H2, and five of the six nouns
 * take "a" while "accounting firm" takes "an". Read live at 1440 it said
 * "Built for a accounting firm", in the largest type in that section, on a
 * page sent cold to an accountant who is deciding whether we are careful.
 * A first-letter vowel check would fix these six and break on the first noun
 * that is spelled one way and said another ("a one-man practice", "an hour
 * of support"), so the article is carried with the noun it belongs to and a
 * new vertical cannot be added without choosing one.
 */
export const VERTICAL_COPY: Record<
  PitchVertical,
  { article: "a" | "an"; noun: string; goal: string; lines: string[] }
> = {
  dental: {
    article: "a",
    noun: "dental practice",
    goal: "new-patient bookings",
    lines: [
      "A new-patient page that answers the five things somebody asks before booking: what you treat, who treats them, roughly what it costs, where to park, and which insurance you take.",
      "A booking request form that reaches your front desk by email the second it is submitted, carrying the patient’s preferred day and time.",
      "One page per treatment, written so a search engine and a nervous patient can both read it, instead of one services page listing eleven procedures.",
      "Your phone number as a tap-to-call button on every phone screen, not as grey text in a footer.",
      "The reviews you already have, shown where somebody is deciding, each linked back to the platform it was left on so it can be checked.",
    ],
  },
  legal: {
    article: "a",
    noun: "law firm",
    goal: "consultation requests",
    lines: [
      "A consultation request form that arrives by email with the matter type and a preferred callback time already on it.",
      "One page per practice area, written so a person with a problem recognises their own problem, rather than one services page covering all eleven.",
      "Profiles carrying admission, years in practice and the kind of matters handled, because that is what a client checks before picking up the phone.",
      "Your intake process stated on the page: what happens after the form, who replies, and by when.",
      "No wording that could read as a guarantee of outcome. Your advertising rules are your call, and we build to the wording you approve.",
    ],
  },
  accounting: {
    article: "an",
    noun: "accounting firm",
    goal: "enquiries from businesses ready to switch",
    lines: [
      "An enquiry form that arrives with the service, the entity type, and the deadline the caller is actually worried about.",
      "One page per service line, bookkeeping, payroll, tax, advisory, so each can be found on its own rather than buried in a list.",
      "How a new client is onboarded, stated plainly: which documents you need, how they reach you, and who sees them.",
      "Your fee structure in the terms you use, fixed fee, monthly or hourly, so the first call is about fit and not about price.",
      "A deadlines page you update yourself, so the site stays current without a call to us.",
    ],
  },
  fitness: {
    article: "a",
    noun: "fitness studio",
    goal: "trial signups",
    lines: [
      "A trial signup that reaches your front desk by email with the class and the start date the person picked.",
      "A timetable readable on a phone in one screen, that you update yourself without calling anybody.",
      "Membership pricing named on the page. A studio that hides its price loses a comparison it never knew it was in.",
      "Tap-to-call and directions above the fold, because much of the traffic is somebody standing outside deciding.",
      "Photographs of your own floor, compressed so they load on a phone signal rather than only on studio wifi.",
    ],
  },
  trades: {
    article: "a",
    noun: "trades company",
    goal: "quote requests",
    lines: [
      "A quote request that arrives with the job type, the postcode and the homeowner’s photographs attached.",
      "A page per service area naming the towns you actually cover, so you stop fielding calls from two hours away.",
      "Your licence, insurance and accreditation numbers printed where a homeowner looks for them, not on a certificates page nobody opens.",
      "Tap-to-call in the header on every phone screen, because a trades enquiry usually starts as a call and ends if it cannot be one.",
      "Before-and-after photographs of your own jobs, compressed so they load on site and not only in the office.",
    ],
  },
  other: {
    article: "a",
    noun: "business",
    goal: "enquiries you can act on",
    lines: [
      "An enquiry form that reaches your inbox the second it is submitted, carrying the fields you need in order to reply.",
      "A page per thing you sell, so each can be found on its own rather than in a list of eleven.",
      "Pricing, or a price range, named on the page. A visitor who cannot find a number asks three of your competitors instead.",
      "Tap-to-call and your address above the fold on a phone.",
      "Content areas you edit yourself, with a live training session so you actually use them.",
    ],
  },
};

export function verticalCopy(page: PitchPage) {
  return VERTICAL_COPY[page.vertical || "other"] || VERTICAL_COPY.other;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Proof, re-pointed at a western SME.
 *
 * `proof.ts` carries the facts: the name, what it is, whether the link opens
 * today, and the card image. Its `relevance` lines are written for a school
 * principal ("the network your parents are on", "admission enquiries"), which
 * is right there and wrong here, so this module overrides only that one string
 * and leaves the facts alone. The two pages therefore cannot disagree about
 * what is live, which is the thing that would actually cost us.
 *
 * WTFGO IS DEFINED HERE, WITH ITS EMPLOYER NAMED IN THE SAME SENTENCE.
 * FACTS.md: it was built by Mehdi while EMPLOYED at Witness The Fitness Pvt.
 * Ltd. It is a partner's (Mehdi Alam's) professional work, not an Ideovent client project,
 * and the attribution sits in the first clause of `what` where it cannot be
 * cropped off by a layout change. It is not in the shared list because the
 * India page has no use for it.
 * ────────────────────────────────────────────────────────────────────────── */

const INTL_RELEVANCE: Record<string, string> = {
  /*
    THE WORDMARK MISMATCH IS SAID FIRST, AND DELETING IT WOULD BE THE ONE EDIT
    THAT BREAKS THIS PAGE.

    Checked on the live site: the browser tab reads "Atelier Co. | Modern
    Clothing Store" and the footer wordmark reads "Atelier Co.", while the
    header currently carries a different wordmark. This card tells the reader
    to open the link, so they will see it. A page that has just spent two
    screens arguing that every claim on it is checkable, and is then caught
    putting one name over a screenshot of another, loses the whole argument on
    the first card. Naming it costs a sentence.

    Only the observable facts are stated, never a reason for them: which brand
    name is the client's is Mehdi's to confirm, and /work says the same thing
    about the same build (see `tryThis` on the atelier project in the CMS seed).
    Both move together when he answers.
  */
  "atelier-co":
    "The closest thing here to a small business that has to sell something. Open a product card and change the colour: it updates with no page load. One thing before you click, because you would notice it anyway: the header of that site currently carries a different wordmark from the name above, while its browser tab and its footer both read Atelier Co. We would rather point at it than have you find it.",
  "wedart-films":
    "A service business whose whole job is show the work, name the price, take the enquiry. Scroll to Investment: the packages are named on the page rather than hidden behind price on request.",
  "gym-map":
    "Search, comparison and signup as one flow, which is the shape of what most businesses on this page are buying. Read its footer: the product states its own limits rather than filling itself with listings that do not exist.",
  "aura-orbit":
    "Ours, not a client’s, so you can open it right now with nobody’s permission. Accounts, a database, scheduled jobs and a live payment integration: the honest answer to whether we build more than websites.",
  "hrms-lite":
    "Behind a login, like every HR system. Listed as a fact rather than a link, because the public URL is a sign-in box and clicking it would tell you nothing.",
  "lead-crm":
    "Also behind a login, and for the same reason. Everything past it is other people’s contact details.",
};

/** WTFGO. A partner's employer work (Mehdi Alam's). The attribution stays inside `what`. */
const WTFGO: ProofEntry = {
  slug: "wtfgo",
  name: "WTFGO",
  what:
    "A multi-tenant gym management platform, built by Mehdi Alam, one of our partners, while employed at Witness The Fitness Pvt. Ltd. It is his professional work for that company and not an Ideovent client project, and it is listed with the employer named because leaving the name off would be the dishonest version.",
  /* NOT "own-product". It is not ours: the product and its IP belong to
     Witness The Fitness Pvt. Ltd. See ProofKind in ./proof. */
  kind: "employer-work",
  sector: "A partner’s employer work",
  url: "https://wtfgos.com",
  linkState: "live",
  relevance:
    "It is live, and it is the size of system he was trusted with as an employee. Open it if you want to know whether the person on your call can build past a brochure site.",
};

/**
 * The running order for a western SME.
 *
 * Atelier Co. and WedArt Films lead because they are the two builds this reader
 * takes in fastest: a storefront and a service business, both live, both in
 * English, both finished. GYM MAP follows because it is the enquiry-to-signup
 * flow most of these businesses are actually buying. Aura Orbit is the answer
 * to "can you build software", and WTFGO is last because it needs a sentence of
 * explanation before it counts for anything.
 */
export const INTL_PROOF_ORDER = ["atelier-co", "wedart-films", "gym-map", "aura-orbit", "wtfgo"];

export function internationalProof(): ProofEntry[] {
  const out: ProofEntry[] = [];
  for (const slug of INTL_PROOF_ORDER) {
    if (slug === "wtfgo") {
      out.push(WTFGO);
      continue;
    }
    const base = proofBySlug(slug);
    if (!base) continue;
    const relevance = INTL_RELEVANCE[slug];
    out.push(relevance ? { ...base, relevance } : base);
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Time, computed rather than asserted.
 *
 * The overlap sentence is the one a burned SME owner reads hardest, so it is
 * derived from the reader's own IANA zone at render time instead of written by
 * hand. It also has to be able to return "there is no overlap inside our
 * published hours", because for a reader in Austin or New York that is the true
 * answer: 9:00 am to 6:00 pm IST is the middle of their night. Saying so, and
 * then naming the evening window those calls are actually taken in, is worth
 * far more than a "we work in your timezone" line that falls apart on the first
 * call. A page that oversells the easy part does not get believed on the hard
 * part.
 * ────────────────────────────────────────────────────────────────────────── */

const IST_ZONE = "Asia/Kolkata";
/** Published hours in minutes from midnight IST. Matches the contact singleton. */
const OUR_DAY: [number, number] = [9 * 60, 18 * 60];
/** The evening window international calls are actually booked into, IST. */
const OUR_EVENING: [number, number] = [18 * 60, 22 * 60];
/** A working day on the reader's own clock. */
const THEIR_DAY: [number, number] = [8 * 60, 18 * 60];

/** Offset of an IANA zone from UTC, in minutes, at a given instant. */
function zoneOffsetMinutes(zone: string, at: Date): number | null {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts: Record<string, string> = {};
    for (const p of dtf.formatToParts(at)) if (p.type !== "literal") parts[p.type] = p.value;
    const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second),
    );
    if (Number.isNaN(asUtc)) return null;
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch {
    return null;
  }
}

/*
  Two digits for an hour, but ONLY where the locale has no AM/PM to disambiguate
  it.

  A British reader gets a 24-hour clock, and Intl's "numeric" hour renders 02:37
  as "2:37", which inside "22:07 where you are, 2:37 in New Delhi" reads as half
  past two in the afternoon. That is a twelve-hour error on a page whose entire
  argument is about when the two of us are awake at the same time.

  An American or Australian reader has no such problem, because AM or PM is
  already on the string, and "04:07 PM" there reads like a railway timetable.
  So the hour style follows whether the locale is a 12-hour one, which Intl will
  tell us rather than us keeping a list of locales that will go stale.
*/
function clockOptions(locale: string): Intl.DateTimeFormatOptions {
  let hour12 = true;
  try {
    hour12 = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 !== false;
  } catch {
    hour12 = true;
  }
  return { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit" };
}

function clockLabel(minutes: number, locale: string): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const d = new Date(Date.UTC(2026, 0, 1, Math.floor(m / 60), m % 60));
  const opts: Intl.DateTimeFormatOptions = { ...clockOptions(locale), timeZone: "UTC" };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  }
}

/** Intersect two windows on a 24-hour circle, trying the three possible shifts. */
function intersect(a: [number, number], b: [number, number]): [number, number] | null {
  let best: [number, number] | null = null;
  for (const shift of [-1440, 0, 1440]) {
    const lo = Math.max(a[0], b[0] + shift);
    const hi = Math.min(a[1], b[1] + shift);
    if (hi - lo >= 60 && (!best || hi - lo > best[1] - best[0])) best = [lo, hi];
  }
  return best;
}

export interface Overlap {
  /** "UTC-5" or "UTC+4" for the reader's own zone, today, with DST applied. */
  theirZoneLabel: string;
  /** Plain language: "10 hours 30 minutes behind New Delhi". */
  diffLabel: string;
  /** Our published hours, expressed on their clock. */
  ourHoursTheirClock: string;
  /**
   * Our published hours on OUR clock, but written in the reader's convention.
   * A 24-hour reader should not meet "9:00 am to 6:00 pm IST" in the same
   * sentence as "04:30 to 13:30": mixing the two conventions in one line is the
   * kind of thing that makes a page feel machine-assembled.
   */
  ourHoursOurClock: string;
  /** Where their working day and our published hours actually meet. Null = nowhere. */
  publishedWindow: string | null;
  /** The evening window, on their clock. Always present. */
  eveningWindow: string;
  /** Their local time at render, so the page shows it did the arithmetic. */
  theirTimeNow: string;
  /** Our local time at the same instant. */
  ourTimeNow: string;
}

export function computeOverlap(zone: string, locale = "en-US", now = new Date()): Overlap | null {
  if (!zone) return null;
  const theirs = zoneOffsetMinutes(zone, now);
  const ours = zoneOffsetMinutes(IST_ZONE, now);
  if (theirs === null || ours === null) return null;

  const diff = theirs - ours;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const mm = abs % 60;
  const diffLabel =
    diff === 0
      ? "on the same clock as New Delhi"
      : `${h} hour${h === 1 ? "" : "s"}${mm ? ` ${mm} minutes` : ""} ${diff > 0 ? "ahead of" : "behind"} New Delhi`;

  const offH = Math.floor(Math.abs(theirs) / 60);
  const offM = Math.abs(theirs) % 60;
  const theirZoneLabel = `UTC${theirs < 0 ? "-" : "+"}${offH}${offM ? `:${String(offM).padStart(2, "0")}` : ""}`;

  const ourDayThere: [number, number] = [OUR_DAY[0] + diff, OUR_DAY[1] + diff];
  const ourEveThere: [number, number] = [OUR_EVENING[0] + diff, OUR_EVENING[1] + diff];
  const hit = intersect(THEIR_DAY, ourDayThere);
  const win = (w: [number, number]) => `${clockLabel(w[0], locale)} to ${clockLabel(w[1], locale)}`;

  const timeIn = (z: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { ...clockOptions(locale), timeZone: z }).format(now);
    } catch {
      return "";
    }
  };

  return {
    theirZoneLabel,
    diffLabel,
    ourHoursTheirClock: win(ourDayThere),
    ourHoursOurClock: win(OUR_DAY),
    publishedWindow: hit ? win(hit) : null,
    eveningWindow: win(ourEveThere),
    theirTimeNow: timeIn(zone),
    ourTimeNow: timeIn(IST_ZONE),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Dates and calls to action, in US English.
 *
 * `pitchDate` in record.ts formats every international date as en-GB. That is
 * right for Manchester, Dubai and Sydney and wrong for Austin, where "25
 * September 2026" reads as foreign on a page whose entire job is to read as
 * local. This one takes the record's own locale.
 *
 * The shared `whatsappHref` writes Hinglish and opens WhatsApp, which is right
 * for a coaching director in Patna and wrong for a dentist in Austin. The email
 * below is the equivalent: it arrives with the subject line already naming who
 * it is from, so the reply is one keystroke away from being useful.
 * ────────────────────────────────────────────────────────────────────────── */

/** "September 25, 2026" in en-US, "25 September 2026" in en-GB and en-AU. */
export function readerDate(iso: string | undefined, locale = "en-US"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  }
}

export const IDEOVENT_EMAIL = "contact@ideovent.in";

/**
 * Visible blanks. FACTS.md rule 4: an unknown value is a visible token and
 * never a guess. The page renders these as a marked chip, so whoever is about
 * to send the link sees the gap before the prospect does.
 */
export const BLANKS = {
  booking: "[[CALENDLY_URL]]",
  /**
   * Shown when neither `timezone` nor a recognised `country` is on the record.
   *
   * The working-overlap block is the strongest thing on this page, and without a
   * zone it cannot be computed. Hiding it silently would be the worst outcome:
   * the page would still look finished, and the one section that answers the
   * reader's actual objection would simply not be there, with nobody the wiser.
   * So the gap is printed instead.
   */
  timezone: "[[PROSPECT_TIMEZONE]]",
};

export function internationalEmailHref(page: PitchPage): string {
  const subject = `${page.instituteName}${page.city ? `, ${page.city}` : ""}: website enquiry`;
  const body =
    `Hello Mehdi,\n\n` +
    `This is ${page.instituteName}${page.city ? ` in ${page.city}` : ""}. We have read the page you put together for us.\n\n` +
    `A good time for us to talk would be:\n\n` +
    `What we want out of the site:\n\n`;
  return `mailto:${IDEOVENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

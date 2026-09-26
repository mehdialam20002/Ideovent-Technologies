/**
 * The international demo site: what changes, and what does not.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * A demo site is the institute's own website with their name on it, and the
 * whole mechanism is that the director opens it and sees THEIR school. A page
 * built for Gorakhpur and shown to a head teacher in Manchester fails at that
 * before the first scroll, and it does not fail on the currency symbol. It
 * fails because the page leads with board affiliation to a reader who has never
 * thought about a board, promises "batches" to a parent who has never heard the
 * word, and never mentions the two things that reader actually went looking
 * for: the safeguarding policy and a street address.
 *
 * So this file owns three decisions, and nothing else does:
 *
 *   1. WHICH SECTIONS APPEAR AND IN WHAT ORDER (`demoSectionPlan`). A British
 *      or American private school leads with curriculum, admissions and term
 *      dates. An Indian school leads with affiliation, admission and results. A
 *      tutoring centre abroad leads with subjects, how sessions work and what
 *      they cost. The order IS the argument, and it is different in each of the
 *      four cases.
 *
 *   2. WHAT EACH SECTION IS CALLED (`demoSectionHeading`), which is a question
 *      for ./vocabulary.ts wherever it is only a word, and a question for this
 *      file wherever it is a different section wearing a similar name.
 *
 *   3. WHAT THE TRUST BLOCK SAYS (`demoTrustRows`). An Indian parent checks
 *      results and affiliation. An international parent checks policies, staff
 *      vetting and whether the place physically exists. These are not two
 *      phrasings of one list. They are two lists.
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is NOT a translation of the India page, and the India page is not its
 * source text. Where a section survives the journey it is shared, unchanged,
 * and it is not listed here at all. Only the sections that had to be rewritten
 * are written here.
 *
 * WHAT MAY NEVER GO IN IT
 * -----------------------
 * A named accreditation, an inspection grade, an examination result, a
 * registration number, a fee, a staff count or a founding year for any real
 * institute. Every one of those belongs to a real place, a parent might act on
 * it, and none of them is ours to assert. Where the record is empty this file
 * returns a line that reads AS a placeholder to the director reading it, which
 * is both honest and the thing that makes them reply.
 */

import type { DemoSite, DemoKind } from "@/lib/cms/types";
import { demoMarket } from "./record";
import { demoDialect, lower, type DemoVocabulary } from "./vocabulary";

/* ──────────────────────────────────────────────────────────────────────────
 * Emptiness, asked the same way everywhere in this file.
 *
 * Deliberately local and deliberately tiny. Every function below has to answer
 * "did Mehdi actually type anything here" about a differently shaped field, and
 * a record that carries a list of empty strings, or a list of objects whose
 * every property is blank, is empty in the only sense that matters: the page
 * would render a heading with nothing under it.
 * ────────────────────────────────────────────────────────────────────────── */

/** True when a value carries nothing a reader would see. */
function blank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return value === false;
  if (Array.isArray(value)) return value.every(blank);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(blank);
  return false;
}

/** The entries of a list that actually carry something. */
function kept<T>(list: T[] | undefined): T[] {
  return (list || []).filter((item) => !blank(item));
}

/* ──────────────────────────────────────────────────────────────────────────
 * The sections
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Every section either template can render.
 *
 * The ids are named after the RECORD FIELD they draw on rather than after the
 * heading they print, because the heading moves between markets and the field
 * does not. `courses` is "Courses and batches" in Gorakhpur, "Curriculum" in
 * Manchester and "Subjects we tutor" in Austin, and all three render from
 * `site.courses`.
 */
export type DemoSectionId =
  | "about"
  | "courses"
  | "admissions"
  | "results"
  | "faculty"
  | "method"
  | "schedule"
  | "safeguarding"
  | "fees"
  | "trial"
  | "contact";

/**
 * Which sections this record renders, in order, top to bottom.
 *
 * FOUR PLANS, WRITTEN OUT IN FULL RATHER THAN DERIVED. A reader of this file
 * should be able to see the whole argument of any of the four pages in one
 * glance, and a plan assembled from `market === "india" ? [...a] : [...b]`
 * with three splices on top is a plan nobody can read. They are short lists;
 * writing them out costs nothing and is the point.
 *
 * A section whose record fields are all empty is dropped by the template, not
 * here: this function answers "what belongs on this page", and "is there
 * anything in it" is a different question with a different answer per section
 * (some sections are worth rendering as a placeholder, and some are not).
 */
export function demoSectionPlan(site: Pick<DemoSite, "market" | "country" | "kind">): DemoSectionId[] {
  const international = demoMarket(site) === "international";
  const school = site.kind === "school";

  if (!international && school) {
    /* INDIA, SCHOOL. Affiliation and admission first, because those are the two
       questions an Indian parent opens a school site with, and results near the
       top because that is what they compare three schools on. */
    return ["about", "admissions", "courses", "results", "faculty", "method", "schedule", "fees", "trial", "contact"];
  }

  if (!international && !school) {
    /* INDIA, COACHING. Results and faculty ARE the product, so they come before
       anything about the institute. The free demo class sits above the fee,
       because it is what actually converts, and a fee read before a trial is a
       fee with nothing attached to it yet. */
    return ["courses", "results", "faculty", "method", "schedule", "trial", "fees", "admissions", "about", "contact"];
  }

  if (international && school) {
    /*
      INTERNATIONAL, SCHOOL. The order is the change.

      Curriculum leads, because a parent choosing a private school abroad is
      choosing a curriculum first and a building second: National Curriculum,
      IB, American, CBSE-in-Dubai. Admissions second, because the question after
      "what do you teach" is "how do I get in and by when". Term dates third,
      because they are the one piece of information a parent returns to the site
      for, and a school that buries them has a site its own parents dislike.

      Safeguarding is FOURTH AND IT IS NOT OPTIONAL. In the UK, Australia and
      the international schools of the UAE, a school website without a
      safeguarding statement and a named contact reads as a school that has not
      thought about it. There is no Indian equivalent of this section, which is
      exactly why translating the India page produces a page that fails.

      Results are LAST BUT ONE, not near the top. An international parent treats
      a results table as marketing; an Indian parent treats it as the product.
      Same section, different altitude.
    */
    return ["courses", "admissions", "schedule", "safeguarding", "faculty", "fees", "about", "method", "trial", "results", "contact"];
  }

  /*
    INTERNATIONAL, TUTORING. Subjects, scheduling and rates, in that order, and
    all three above anything about the centre.

    A parent looking for a tutor is solving a specific problem this week, in a
    specific subject, around a school day that is already full. They are not
    choosing an institution. So the page answers what you teach, when you can
    see my child, and what it costs, before it says a word about itself.
    Vetting comes straight after, because it is the thing that stops the
    booking, and the free first session sits under it as the next step.
  */
  return ["courses", "schedule", "fees", "faculty", "safeguarding", "trial", "method", "results", "about", "admissions", "contact"];
}

/* ──────────────────────────────────────────────────────────────────────────
 * What each section is called
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The heading for a section, in this record's market and vocabulary.
 *
 * ONE FUNCTION RATHER THAN A HEADING PROP AT EVERY CALL SITE, so that the
 * coaching template and the school template cannot end up calling the same
 * section two different things in the same market, which is what happened to
 * "Faculty" and "Our teachers" the first time this was written per page.
 */
export function demoSectionHeading(
  id: DemoSectionId,
  v: DemoVocabulary,
  kind: DemoKind,
): string {
  const school = kind === "school";
  const intl = v.market === "international";

  switch (id) {
    case "about":
      return school ? "About the school" : `About the ${lower(v.centreWord)}`;

    case "courses":
      if (!intl) return school ? "Classes and streams" : "Courses and batches";
      /* "Curriculum" is the word a British, Emirati or Australian school site
         uses for this page, and an American one says "Academics". A tutoring
         centre in either dialect says subjects. */
      if (school) return v.dialect === "us" ? "Academics" : "Curriculum";
      return "Subjects we teach";

    case "admissions":
      if (!intl) return school ? "Admission process" : "How to join a batch";
      return school ? "Admissions" : "Getting started";

    case "results":
      if (!intl) return school ? "Our results" : "Results and selections";
      /* Abroad this is a smaller claim in a smaller place. "Outcomes" is what a
         school that is not leading on a results table calls it. */
      return school ? "Outcomes" : "Progress our students have made";

    case "faculty":
      return v.teachersWord;

    case "method":
      if (!intl) return school ? "Why parents choose us" : "How we teach";
      return school ? "Our approach" : "How we work with your child";

    case "schedule":
      if (!intl) return school ? "School timings" : v.timetableWord;
      /* THE BIGGEST SINGLE DIFFERENCE IN THIS SWITCH. A British or Australian
         school's equivalent of a timetable page is TERM DATES, which is a
         different thing entirely: it is a calendar for the year, not a grid for
         the week, and parents return to it repeatedly. A tutoring centre's is
         neither: it is availability. */
      return school ? `${v.termWord} dates` : "How sessions work";

    case "safeguarding":
      /* No India case: there is no section here on an India plan. */
      return school ? "Safeguarding and policies" : `How we vet every ${v.teacherWord}`;

    case "fees":
      return school ? v.feeWord : intl ? v.feeWord : `${v.feeWord} and payment`;

    case "trial":
      if (!intl) return school ? "Visit the school" : "Free demo class";
      return school ? "Come and see us" : "Your first session is free";

    case "contact":
      return school ? "Visit us" : "Find us";
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * The trust block
 * ────────────────────────────────────────────────────────────────────────── */

export interface DemoTrustRow {
  label: string;
  /** The value from the record, or "" when there is none. */
  value: string;
  /**
   * What the page prints when `value` is empty. Written to read as a
   * placeholder to the director looking at it, because that is what it is, and
   * because a director who sees a gap with their own name on it replies to fill
   * it in. That reply is the whole purpose of sending the link.
   */
  placeholder: string;
}

/**
 * The four or five things this market's parent checks before anything else.
 *
 * INDIA AND ABROAD ARE NOT TWO PHRASINGS OF ONE LIST.
 *
 *   An Indian parent checks: which board, what were last year's results, what
 *   is the medium of instruction, and is there transport. Affiliation is the
 *   first filter and results are the comparison.
 *
 *   A British, Emirati or Australian parent checks: which curriculum, is there
 *   a safeguarding policy and who is the named contact, when are the terms, and
 *   where is the building. The physical address is a trust signal abroad in a
 *   way it simply is not in India, where everyone already knows where the
 *   school is.
 *
 * Nothing in here asserts a value. Every row is either something Mehdi typed
 * off their own published page, or a visible gap.
 */
export function demoTrustRows(
  site: Pick<DemoSite, "market" | "country" | "kind" | "established" | "focusAreas" | "contact">,
  v: DemoVocabulary,
): DemoTrustRow[] {
  const school = site.kind === "school";
  const intl = demoMarket(site) === "international";
  const focus = kept(site.focusAreas).join(" · ");
  const address = kept(site.contact?.addressLines).join(", ");
  const established = (site.established || "").trim();

  if (!intl) {
    return [
      {
        label: school ? "Board" : "We prepare for",
        value: focus,
        placeholder: school
          ? "Add your board and affiliation number here"
          : "Add the exams you prepare students for",
      },
      {
        label: school ? "Classes" : "Batches running now",
        value: "",
        placeholder: school
          ? `Add the ${lower(v.gradeWordPlural)} you teach, e.g. Nursery to Class 12`
          : "Add the batches currently running",
      },
      {
        label: "Established",
        value: established,
        placeholder: "Add the year you started",
      },
      {
        label: "Where we are",
        value: address,
        placeholder: "Add your address here",
      },
    ];
  }

  if (school) {
    return [
      {
        label: "Curriculum",
        value: focus,
        /* Deliberately lists the real options rather than inventing one. A head
           teacher reading this knows immediately which line is theirs. */
        placeholder: "Add your curriculum here, e.g. National Curriculum, IB, American, or your own",
      },
      {
        label: v.gradeWordPlural,
        value: "",
        placeholder: `Add the ${lower(v.gradeWordPlural)} you admit, e.g. Reception to ${v.gradeWord} 11`,
      },
      {
        label: "Safeguarding",
        value: "",
        /* NOT "we take safeguarding seriously". A claim about a real school's
           child-protection arrangements is the last thing on this page that may
           be written by us. The placeholder names the field instead. */
        placeholder: "Add your designated safeguarding lead and a link to the policy",
      },
      {
        label: "Where we are",
        value: address,
        placeholder: "Add your full address, including the postcode",
      },
      {
        label: "Inspection",
        value: "",
        placeholder: "Add a link to your most recent inspection report, if you have one published",
      },
    ];
  }

  return [
    {
      label: "Subjects",
      value: focus,
      placeholder: "Add the subjects you tutor",
    },
    {
      label: v.gradeWordPlural,
      value: "",
      placeholder: `Add the ${lower(v.gradeWordPlural)} you work with`,
    },
    {
      label: `${v.groupWord} format`,
      value: "",
      placeholder: `Add whether ${lower(v.groupWordPlural)} are one to one, small group, in ${lower(v.centreWord)} or online`,
    },
    {
      label: "Staff checks",
      value: "",
      /* The UK asks for DBS, Australia for a Working With Children Check, the
         US for a background check by state. The placeholder names all three
         rather than guessing which country the reader is in, because the record
         may carry a country we did not map. */
      placeholder: "Add your staff vetting: DBS, Working With Children Check, or your state background check",
    },
    {
      label: "Where we are",
      value: address,
      placeholder: "Add your address, or say that you work online only",
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────────────
 * The sections that only exist abroad
 * ────────────────────────────────────────────────────────────────────────── */

export interface DemoNote {
  title: string;
  body: string;
}

/**
 * The safeguarding block, which has no India equivalent.
 *
 * WHY IT IS A SET OF NAMED GAPS AND NOT A SET OF STATEMENTS. Every sentence a
 * school publishes about safeguarding is a statement about what that school
 * actually does, and we do not know what they do. Writing "all our staff are
 * DBS checked" on a page carrying a real school's name is the single most
 * damaging line this codebase could produce: it is a regulatory claim, made on
 * their behalf, to their parents, by somebody who has never met them.
 *
 * So every row below is the NAME of the thing their live site would carry, with
 * a line saying what goes there. A head teacher reads it as a checklist of
 * their own documents, which is what it is, and which is also why it earns a
 * reply.
 */
export function demoSafeguardingNotes(
  site: Pick<DemoSite, "kind" | "market" | "country">,
  v: DemoVocabulary,
): DemoNote[] {
  const dialect = demoDialect(site);
  const school = site.kind === "school";

  /* The name of the check differs by country and getting it wrong is worse
     than not naming it: a British head teacher reading "Working With Children
     Check" knows the page was written for somebody else. */
  const vetting =
    dialect === "us"
      ? "your state background check and fingerprinting"
      : "your DBS or Working With Children Check";

  if (school) {
    return [
      {
        title: "Your designated safeguarding lead",
        body: `A name, a role and a way to reach them. On your live site this is the block a parent, and an inspector, looks for first. Tell us who it should be and we will put it here.`,
      },
      {
        title: "Your policies, as downloads",
        body: `Safeguarding and child protection, admissions, behaviour, complaints, and your privacy notice. Send us the documents you already have and they go on the site as they are, with a date on each one.`,
      },
      {
        title: "Staff checks",
        body: `A plain sentence about ${vetting}, written by you, not by us. We will not write a word of this section on your behalf.`,
      },
      {
        title: "Your most recent inspection report",
        body: `If you have one published, we link to it rather than summarising it, because a summary written by your web developer is worth nothing to a parent.`,
      },
    ];
  }

  return [
    {
      title: "Every tutor is checked before they meet a student",
      body: `This is your sentence, describing ${vetting}, and we will put it here exactly as you write it. It is the line that decides whether a parent books.`,
    },
    {
      title: "Who is in the room",
      body: `Whether sessions are one to one or in a small group, whether a parent may sit in, and how an online session is set up. Parents ask all three before the first booking.`,
    },
    {
      title: "Your policies",
      body: `Cancellation, refunds, and how you handle a concern. Send us what you already use. If you have never written them down, that is a short conversation and we will draft them from what you tell us.`,
    },
  ];
}

/**
 * How sessions work, at a tutoring centre abroad.
 *
 * The India coaching page has a timetable: a fixed grid of batches somebody
 * joins. This is the opposite question. A parent abroad is fitting a tutor into
 * a week that is already full, so the section is about availability, format and
 * how a booking is changed, and it is above the price for that reason.
 */
export function demoSchedulingNotes(v: DemoVocabulary): DemoNote[] {
  return [
    {
      title: `When your ${lower(v.groupWordPlural)} run`,
      body: `Weekday evenings, weekend mornings, school holidays. Put your real availability here and a parent can decide in one read rather than sending an ${v.enquiryNoun} to find out.`,
    },
    {
      title: `In ${lower(v.centreWord)}, online, or both`,
      body: `Say which you offer and whether the price differs. A parent forty minutes away is deciding whether you are worth the drive.`,
    },
    {
      title: "Changing or cancelling",
      body: `Your own notice period, in your own words. Nothing loses a regular booking faster than a parent discovering the rule after they have broken it.`,
    },
  ];
}

/**
 * The line under the fee table, per market.
 *
 * India and abroad want opposite reassurances. An Indian parent wants to know
 * the figure is the whole figure and what the instalments are. A parent abroad
 * wants to know the billing cycle and how to stop.
 */
export function demoFeeNote(site: Pick<DemoSite, "market" | "country" | "kind">, v: DemoVocabulary): string {
  const intl = demoMarket(site) === "international";
  const school = site.kind === "school";

  if (!intl) {
    return school
      ? `Add your fee structure here: the ${lower(v.termWord)} fee, what it includes, and the instalments you accept. A parent who cannot find the fee assumes the worst number they can imagine.`
      : `Add your course fee here, with the instalments. Say plainly what is included, so nobody discovers a material charge in month two.`;
  }

  return school
    ? `Add your ${lower(v.feeWord)} here, per ${lower(v.termWord)} or per year, with what is included and what is charged separately. Bursaries and sibling discounts go here too, if you offer them.`
    : `Add your ${lower(v.feeWord)} here, per hour or per ${lower(v.groupWord)}, and say how billing works: in advance, monthly, or as you go. Say how a parent stops. That sentence sells more ${lower(v.groupWordPlural)} than a discount does.`;
}

/**
 * What the results section says when the record has none, which is the normal
 * state and the state every demo starts in.
 *
 * "Add your 2026 results here" rather than a table of invented ranks. The
 * difference is not stylistic: a fabricated result on a page carrying a real
 * institute's name is a claim a parent can act on and the institute can be held
 * to, and it is the single clearest way to turn this pitch into a complaint.
 */
export function demoResultsPlaceholder(
  site: Pick<DemoSite, "market" | "country" | "kind">,
  v: DemoVocabulary,
): DemoNote {
  const intl = demoMarket(site) === "international";
  const school = site.kind === "school";
  const year = new Date().getFullYear();

  if (!intl && school) {
    return {
      title: `Add your ${year} board results here`,
      body: `Your Class 10 and Class 12 results, the way you already publish them. Send us the sheet and we will set it out so it reads on a phone. We have not put a single figure here ourselves, because a result belongs to your students and to you.`,
    };
  }
  if (!intl && !school) {
    return {
      title: `Add your ${year} selections here`,
      body: `Ranks, names and the exam, exactly as you publish them. A student's photograph goes up only where you have their consent, and we will ask you for it rather than assume it.`,
    };
  }
  if (intl && school) {
    return {
      title: "Add your outcomes here",
      body: `Examination results, university destinations, or whatever you already publish. We have written nothing here, because a result is a claim about your students and it is yours to make.`,
    };
  }
  return {
    title: "Add a few student outcomes here",
    body: `A grade that moved, an entrance test passed, a child who stopped dreading ${lower(v.termWord)} tests. In this market one specific story is worth more than a table, and it has to be yours: we have not written one.`,
  };
}

/**
 * True when this record would render an international-only section with
 * absolutely nothing in it.
 *
 * Used by the templates to decide whether a section is worth its heading. It
 * exists here rather than in each template so that a section added to the plan
 * above cannot be left out of the emptiness check in one of the two pages,
 * which is how a page ends up with a heading and a blank space under it.
 */
export function demoSectionIsEmpty(id: DemoSectionId, site: DemoSite): boolean {
  switch (id) {
    case "about":
      return blank(site.about) && blank(site.established);
    case "courses":
      return kept(site.courses).length === 0;
    case "results":
      return kept(site.results).length === 0;
    case "faculty":
      return kept(site.faculty).length === 0;
    case "method":
      return kept(site.method).length === 0;
    case "schedule":
      return kept(site.schedule).length === 0 && blank(site.scheduleNote);
    case "trial":
      return blank(site.trial);
    case "contact":
      return blank(site.contact);
    /* Never empty: these render placeholder content that is worth sending, and
       that is the point of them. A school demo with no safeguarding section is
       a school demo a British head teacher does not recognise. */
    case "admissions":
    case "safeguarding":
    case "fees":
      return false;
  }
}

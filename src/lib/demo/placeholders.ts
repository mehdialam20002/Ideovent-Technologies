/**
 * WHAT AN EMPTY FIELD SAYS.
 *
 * This module is the absolute rule of the whole feature turned into strings:
 *
 *   NEVER INVENT A REAL INSTITUTE'S DETAILS. No made-up phone number, email,
 *   address, principal's name, exam result, rank, selection count, student
 *   name, fee, board affiliation or accreditation.
 *
 * The temptation is obvious and it is strong. A demo with nine empty sections
 * looks unfinished, and Mehdi is sending it to win work. Filling those
 * sections with something plausible would make it look finished in about
 * twenty minutes. Every one of those inventions is a live hazard:
 *
 *   An invented helpline is a real stranger's phone ringing, at a number a
 *   parent found on what they believed was a school's own website.
 *
 *   An invented affiliation number is checkable in a public register. A
 *   parent who looks it up and finds it false has found what reasonably looks
 *   to them like fraud, on a page with the school's name at the top.
 *
 *   An invented rank or selection count is a claim about a named child, and
 *   it is the number a family chooses a school on.
 *
 *   An invented admission date sends a parent to the office on the wrong day.
 *
 * So an empty field renders as an OBVIOUS PLACEHOLDER and never as a plausible
 * value. Every string below is written to be unmistakable at a glance and from
 * across a room: each one is an instruction addressed to the institute, in the
 * second person, about a thing they would supply. Nobody reads "Your admission
 * helpline goes here" as a phone number.
 *
 * THEY ARE ALSO A SALES ASSET, WHICH IS WHY THEY ARE WRITTEN AND NOT GENERATED.
 * A director reading their own beautiful website and finding twelve polite
 * blanks is reading a list of exactly what they would need to supply to make
 * it real. That is a much better conversation than an invented page they have
 * to correct. Keep them short, specific and free of apology: a blank that
 * says sorry reads as a defect, and a blank that says "Add your 2026 results"
 * reads as a next step.
 *
 * NOTHING HERE IS EVER RENDERED AS IF IT WERE DATA. `demoValue` returns the
 * flag as well as the text, and every template styles a blank differently
 * from a real value (italic, dimmed) so that the difference survives a
 * screenshot as well as a careful read.
 */

import type { DemoMarket } from "@/lib/cms/types";

/**
 * The blanks that read the same in every market.
 *
 * Keyed by the FIELD, not by the section, so a template that moves a field
 * between sections keeps its wording, and so a reviewer can check this list
 * against the record type field by field.
 */
export const DEMO_BLANK = {
  tagline: "Your one-line description goes here",
  about: "A few sentences about the institute go here, in your own words. This is usually the paragraph you already have on your prospectus.",
  established: "Add the year you were founded",

  principalName: "Add the name of your head",
  principalMessage:
    "The message from your head of institution goes here. We will set it exactly as you write it, signed in their own name.",

  admissionsDates: "Add your admission dates",
  admissionsSteps: "Your admission steps go here: what a parent does first, and what happens next.",
  admissionsDocuments: "The documents you ask families to bring go here.",

  courses: "Your courses and batches go here, with the timings and the fee you publish.",
  faculty: "Your teachers go here, with the subject each one takes.",
  facilities: "Your facilities go here. Only the ones you actually have.",
  gallery: "Photographs of your own campus go here. Send us the files and we will place them.",
  notices: "Your notices and circulars go here. This is the section you would update yourselves.",
  results: "Your published results go here, exactly as you publish them.",

  phone: "Your admission helpline goes here",
  email: "Your enquiry email goes here",
  address: "Your address goes here",
  hours: "Add your office hours",
  map: "Add your map listing",
} as const;

export type DemoBlankKey = keyof typeof DEMO_BLANK;

/**
 * The handful of blanks whose WORDING has to follow the market, because the
 * word for the thing is different and a blank written in the wrong dialect is
 * the tell that the page was assembled from a template.
 *
 * A British or American reader does not say "affiliation" about a school, and
 * an Indian reader does not say "district accreditation". So the blank asks
 * for the thing that reader's institute would actually have.
 */
export function demoBlanks(market: DemoMarket = "india") {
  const intl = market === "international";
  return {
    board: intl
      ? "Add your accreditation or examination board"
      : "Add your board and affiliation number",
    admissions: intl
      ? "Tell us how families apply and we will lay this out properly"
      : "Tell us your admission process and we will lay this out properly",
    results: intl
      ? "Add the results you publish"
      : "Add your board and entrance results",
  };
}

export interface DemoValue {
  /** What to render: the real value, or the placeholder. */
  text: string;
  /**
   * TRUE when `text` is the placeholder. Templates MUST use this to style a
   * blank differently from a value. A placeholder that is indistinguishable
   * from real content is just an invention with extra steps.
   */
  isBlank: boolean;
}

/**
 * A field's value, or its placeholder, with a flag saying which.
 *
 * Whitespace-only counts as empty: a field somebody typed a space into is a
 * field nobody filled in, and treating it as a value would print a blank line
 * where the blank ought to be.
 */
export function demoValue(value: string | undefined | null, blank: string): DemoValue {
  const text = (value || "").trim();
  return text ? { text, isBlank: false } : { text: blank, isBlank: true };
}

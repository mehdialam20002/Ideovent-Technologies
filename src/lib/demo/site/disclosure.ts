/**
 * CBSE MANDATORY PUBLIC DISCLOSURE, modelled on Appendix IX of the Affiliation
 * Bye-Laws as the circulars (03/2021, 09/2021, MPD/2025/0008 and the January
 * 2026 reminder) require it: a menu item reachable from the home page, five
 * sections, printable. The ROW LIST AND LABELS ARE OURS AND LIVE HERE; the
 * record holds only values (`DemoSite.disclosure.rows[id]`).
 *
 * A row with no value prints "To be uploaded" and is never hidden: hiding a
 * required row reads as concealment. Section C's three-year results and
 * section D's staff counts are derived from `boardResults` and
 * `faculty[].group` when their rows are empty.
 */

import type { DemoSite } from "@/lib/cms/types";
import type { Bilingual } from "./bilingual";

export type DisclosureSectionId = "A" | "B" | "C" | "D" | "E";

export interface DisclosureRow {
  id: string;
  label: Bilingual;
  /** "document": the value is a link to a PDF; "text": a typed value. */
  shape: "text" | "document";
}

export interface DisclosureSection {
  id: DisclosureSectionId;
  title: Bilingual;
  rows: DisclosureRow[];
}

const r = (id: string, en: string, hi: string, shape: "text" | "document" = "text"): DisclosureRow => ({
  id,
  label: { en, hi },
  shape,
});

export const APPENDIX_IX: DisclosureSection[] = [
  {
    id: "A",
    title: { en: "General information", hi: "सामान्य जानकारी" },
    rows: [
      r("school-name", "Name of the school", "स्कूल का नाम"),
      r("affiliation-no", "Affiliation number", "Affiliation नंबर"),
      r("school-code", "School code", "School code"),
      r("address", "Complete address with PIN code", "पूरा पता, PIN code के साथ"),
      r("principal", "Principal's name and qualification", "Principal का नाम और योग्यता"),
      r("email", "School email", "School email"),
      r("phone", "Contact number", "संपर्क नंबर"),
    ],
  },
  {
    id: "B",
    title: { en: "Documents and information", hi: "दस्तावेज़ और जानकारी" },
    rows: [
      r("affiliation-letter", "Affiliation or upgradation letter and recent extension", "Affiliation letter और हाल का extension", "document"),
      r("trust-registration", "Society, trust or company registration and its renewal", "Society या trust registration और renewal", "document"),
      r("noc", "No objection certificate from the state government", "राज्य सरकार का NOC", "document"),
      r("rte-recognition", "Recognition certificate under the RTE Act, 2009", "RTE Act 2009 के तहत मान्यता प्रमाणपत्र", "document"),
      r("building-safety", "Building safety certificate", "Building safety प्रमाणपत्र", "document"),
      r("fire-safety", "Fire safety certificate", "Fire safety प्रमाणपत्र", "document"),
      r("self-certification", "DEO certificate or self-certification for affiliation", "DEO प्रमाणपत्र या self-certification", "document"),
      r("water-health", "Water, health and sanitation certificates", "पानी, स्वास्थ्य और स्वच्छता प्रमाणपत्र", "document"),
    ],
  },
  {
    id: "C",
    title: { en: "Result and academics", hi: "Result और पढ़ाई" },
    rows: [
      r("fee-structure", "Fee structure of the school", "School की fee structure", "document"),
      r("academic-calendar", "Annual academic calendar", "सालाना academic calendar", "document"),
      r("smc", "School management committee (SMC) list", "School management committee की सूची", "document"),
      r("pta", "Parent teacher association (PTA) members", "PTA सदस्यों की सूची", "document"),
      r("results-3yr", "Last three years of board results", "पिछले तीन साल के board results", "document"),
    ],
  },
  {
    id: "D",
    title: { en: "Staff (teaching)", hi: "शिक्षक" },
    rows: [
      r("principal-staff", "Principal", "Principal"),
      r("teachers-total", "Total number of teachers", "कुल शिक्षक"),
      r("pgt", "PGT", "PGT"),
      r("tgt", "TGT", "TGT"),
      r("prt", "PRT", "PRT"),
      r("teacher-section-ratio", "Teacher to section ratio", "Teacher और section का अनुपात"),
      r("special-educator", "Details of the special educator", "Special educator की जानकारी"),
      r("counsellor", "Details of the counsellor and wellness teacher", "Counsellor और wellness teacher की जानकारी"),
    ],
  },
  {
    id: "E",
    title: { en: "School infrastructure", hi: "School का infrastructure" },
    rows: [
      r("campus-area", "Total campus area (square metres)", "कुल campus क्षेत्र (वर्ग मीटर)"),
      r("classrooms", "Number and size of classrooms", "Classrooms की संख्या और आकार"),
      r("labs", "Number and size of laboratories, including computer labs", "Labs की संख्या और आकार"),
      r("internet", "Internet facility", "Internet सुविधा"),
      r("girls-toilets", "Number of girls' toilets", "लड़कियों के शौचालय"),
      r("boys-toilets", "Number of boys' toilets", "लड़कों के शौचालय"),
      r("inspection-video", "Link to the YouTube video of the school's inspection", "School inspection के YouTube video का link", "document"),
    ],
  },
];

/** Every row id, for the admin form and the tests. */
export const APPENDIX_IX_ROW_IDS = APPENDIX_IX.flatMap((s) => s.rows.map((row) => row.id));

/** Staff counts derived from `faculty[].group` for section D, when not typed. */
export function derivedStaffCounts(site: Pick<DemoSite, "faculty">): Record<string, string> {
  const count = (g: string) =>
    (site.faculty || []).filter((f) => (f.group || "").trim().toUpperCase() === g).length;
  const out: Record<string, string> = {};
  for (const g of ["PGT", "TGT", "PRT"]) {
    const n = count(g);
    if (n) out[g.toLowerCase()] = String(n);
  }
  const total = (site.faculty || []).filter((f) => /^(PGT|TGT|PRT)$/i.test((f.group || "").trim())).length;
  if (total) out["teachers-total"] = String(total);
  return out;
}

/**
 * True when the page exists: the board is CBSE AND an affiliation number is
 * known (typed in the disclosure, or a run of digits in the board line). So
 * the page can never be a table of nothing but "To be uploaded".
 */
export function isCbseSchool(site: Pick<DemoSite, "boardOrAffiliation" | "disclosure">): boolean {
  const typed = (site.disclosure?.rows?.["affiliation-no"]?.value || "").trim();
  const board = site.boardOrAffiliation || "";
  return /\bCBSE\b/i.test(board) && (!!typed || /\d{5,}/.test(board));
}

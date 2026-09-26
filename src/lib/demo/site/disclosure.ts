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
      r("affiliation-no", "Affiliation number", "संबद्धता नंबर"),
      r("school-code", "School code", "स्कूल कोड"),
      r("address", "Complete address with PIN code", "पिन कोड के साथ पूरा पता"),
      r("principal", "Principal's name and qualification", "प्रिंसिपल का नाम और योग्यता"),
      r("email", "School email", "स्कूल का ईमेल"),
      r("phone", "Contact number", "संपर्क नंबर"),
    ],
  },
  {
    id: "B",
    title: { en: "Documents and information", hi: "दस्तावेज़ और जानकारी" },
    rows: [
      r("affiliation-letter", "Affiliation or upgradation letter and recent extension", "संबद्धता या अपग्रेडेशन पत्र और हाल का विस्तार", "document"),
      r("trust-registration", "Society, trust or company registration and its renewal", "सोसाइटी, ट्रस्ट या कंपनी का पंजीकरण और नवीनीकरण", "document"),
      r("noc", "No objection certificate from the state government", "राज्य सरकार का NOC", "document"),
      r("rte-recognition", "Recognition certificate under the RTE Act, 2009", "RTE Act 2009 के तहत मान्यता प्रमाणपत्र", "document"),
      r("building-safety", "Building safety certificate", "भवन सुरक्षा प्रमाणपत्र", "document"),
      r("fire-safety", "Fire safety certificate", "अग्नि सुरक्षा प्रमाणपत्र", "document"),
      r("self-certification", "DEO certificate or self-certification for affiliation", "संबद्धता के लिए DEO प्रमाणपत्र या स्व-प्रमाणन", "document"),
      r("water-health", "Water, health and sanitation certificates", "पानी, स्वास्थ्य और स्वच्छता प्रमाणपत्र", "document"),
    ],
  },
  {
    id: "C",
    title: { en: "Result and academics", hi: "रिज़ल्ट और पढ़ाई" },
    rows: [
      r("fee-structure", "Fee structure of the school", "स्कूल का फीस ढाँचा", "document"),
      r("academic-calendar", "Annual academic calendar", "सालाना एकेडमिक कैलेंडर", "document"),
      r("smc", "School management committee (SMC) list", "स्कूल प्रबंधन समिति (SMC) की सूची", "document"),
      r("pta", "Parent teacher association (PTA) members", "पैरेंट-टीचर एसोसिएशन (PTA) के सदस्य", "document"),
      r("results-3yr", "Last three years of board results", "पिछले तीन साल के बोर्ड रिज़ल्ट", "document"),
    ],
  },
  {
    id: "D",
    title: { en: "Staff (teaching)", hi: "शिक्षक" },
    rows: [
      r("principal-staff", "Principal", "प्रिंसिपल"),
      r("teachers-total", "Total number of teachers", "कुल शिक्षक"),
      r("pgt", "PGT", "PGT"),
      r("tgt", "TGT", "TGT"),
      r("prt", "PRT", "PRT"),
      r("teacher-section-ratio", "Teacher to section ratio", "शिक्षक और सेक्शन का अनुपात"),
      r("special-educator", "Details of the special educator", "विशेष शिक्षक (स्पेशल एजुकेटर) की जानकारी"),
      r("counsellor", "Details of the counsellor and wellness teacher", "काउंसलर और वेलनेस टीचर की जानकारी"),
    ],
  },
  {
    id: "E",
    title: { en: "School infrastructure", hi: "स्कूल का इंफ्रास्ट्रक्चर" },
    rows: [
      r("campus-area", "Total campus area (square metres)", "कैंपस का कुल क्षेत्रफल (वर्ग मीटर)"),
      r("classrooms", "Number and size of classrooms", "क्लासरूम की संख्या और आकार"),
      r("labs", "Number and size of laboratories, including computer labs", "कंप्यूटर लैब समेत सभी लैब की संख्या और आकार"),
      r("internet", "Internet facility", "इंटरनेट सुविधा"),
      r("girls-toilets", "Number of girls' toilets", "लड़कियों के शौचालय"),
      r("boys-toilets", "Number of boys' toilets", "लड़कों के शौचालय"),
      r("inspection-video", "Link to the YouTube video of the school's inspection", "स्कूल निरीक्षण के YouTube वीडियो का लिंक", "document"),
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

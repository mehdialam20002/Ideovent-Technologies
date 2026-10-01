import type { TemplateId } from "./ids";

/**
 * Which dental template suits a clinic, from whatever words we have about it:
 * its name, a Maps category, a poster's text, a lead's notes. Added 28 Sep
 * 2026 so the CRM, the Lead Finder and the poster import all pick the same
 * way. It is a default, never a verdict: every screen that uses it lets Mehdi
 * choose another template.
 *
 * Order matters. A "kids orthodontic centre" is a children's clinic first; an
 * "implant and cosmetic centre" is an implant centre first; a clinic that says
 * it has branches is a chain whatever else it offers.
 */
const RULES: Array<[RegExp, TemplateId]> = [
  [/\b(branches|chain|clinics across|\d+\s*(clinics|branches|centres|centers))\b/i, "d7-dental-chain"],
  [/\b(kids?|child(ren)?'?s?|paediatric|pediatric|pedodont\w*|paedodont\w*|little teeth|tiny teeth)\b/i, "d6-kids-dental"],
  [/\b(orthodont\w*|aligners?|braces|invisalign)\b/i, "d5-ortho-aligners"],
  [/\b(implants?|implantolog\w*|full[- ]mouth|all[- ]on[- ]?(4|6|four|six)|dentures?|prosthodont\w*)\b/i, "d4-implant-centre"],
  [/\b(cosmetic|aesthetic|smile (design|studio|makeover)|veneers?|whitening)\b/i, "d3-smile-studio"],
  [/\b(multi[- ]?speciality|multi[- ]?specialty|super[- ]?speciality|dental (hospital|centre|center|care centre|care center)|speciality dental)\b/i, "d2-multispeciality"],
];

export const DEFAULT_DENTAL_TEMPLATE: TemplateId = "d1-family-dentist";

/**
 * A lead sheet's segment (DENTAL_KIDS and the rest, kept in a lead's tags)
 * says outright what kind of clinic it is, so it decides before any word in
 * the name does. Without this, "DENTAL_KIDS" never matched the kids rule:
 * "_" is a word character, so \bkids\b has no boundary after DENTAL_.
 */
const SEGMENTS: Record<string, TemplateId> = {
  CHAIN: "d7-dental-chain",
  KIDS: "d6-kids-dental",
  ORTHO: "d5-ortho-aligners",
  IMPLANT: "d4-implant-centre",
  COSMETIC: "d3-smile-studio",
  MULTI: "d2-multispeciality",
  SINGLE: "d1-family-dentist",
};

/** The words, with "_" and "-" read as spaces, so "multi-speciality" and "DENTAL_KIDS" read as words. */
const words = (texts: Array<string | null | undefined>) => texts.filter(Boolean).join(" ").replace(/[_-]+/g, " ");

export function dentalTemplateFor(...texts: Array<string | null | undefined>): TemplateId {
  const segment = texts.filter(Boolean).join(" ").match(/\bDENTAL_(CHAIN|KIDS|ORTHO|IMPLANT|COSMETIC|MULTI|SINGLE)\b/i);
  if (segment) return SEGMENTS[segment[1].toUpperCase()];
  const text = words(texts);
  for (const [re, id] of RULES) if (re.test(text)) return id;
  return DEFAULT_DENTAL_TEMPLATE;
}

/** True when the words describe a dental practice rather than a school, a coaching centre or a hospital. */
export function looksDental(...texts: Array<string | null | undefined>): boolean {
  const text = words(texts);
  return /\b(dental|dentist\w*|dentistry|orthodont\w*|endodont\w*|periodont\w*|prosthodont\w*|pedodont\w*|implantolog\w*|oral (care|surgeon|surgery|health)|tooth|teeth|32\s*(pearls|teeth)|smile (dental|clinic|care))\b/i.test(text);
}

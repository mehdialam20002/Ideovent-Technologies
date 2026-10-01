/**
 * THE DENTAL HALF OF A DEMO SITE, for the /admin/c/demoSites form: the
 * `dental` block (DentalContent in src/lib/cms/types.ts) that only a record
 * of kind "dental" reads. Added 28 Sep 2026, when dental clinics became a
 * lead kind: before this a duplicate of d1 to d7 arrived with the template's
 * doctors, treatments and prices and there was no field to change one.
 *
 * WHAT IS HERE AND WHAT IS NOT. The parts Mehdi fills for a real clinic: the
 * first screen, the doctors, the treatments and their starting prices, the
 * fee table, payment, branches, the emergency line, booking slots and how to
 * reach them. Everything else in the block (technology, before-after cases,
 * the kids page, booking reasons, comparisons, plans, specialty tiles, a
 * treatment's steps and FAQs) is left exactly as it is in the record: a group
 * or a list row in this form changes only the keys it names and keeps the
 * rest (src/admin/fields.tsx), so nothing the template brought is lost.
 *
 * THE RULES THE HELP TEXT REPEATS, from DENTAL-COMPLIANCE.md: no "best",
 * "painless", "guaranteed", "% off" or "free"; a price is a "starting from"
 * amount the clinic itself publishes; a specialist title only for a
 * recognised MDS branch; a phone number only when it is copied from their
 * own site or signboard. HINDI: every text has a "Hindi (optional)" twin, as
 * in ./DemoSitesPagesSchema.ts. Empty shows the English on the Hindi page.
 */

import type { FieldConfig } from "./fields";

const text = (name: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({ name, label, type: "text", ...extra });
const area = (name: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({ name, label, type: "textarea", full: true, ...extra });
const list = (name: string, label: string, help?: string): FieldConfig => ({ name, label, type: "stringlist", full: true, help });
const tags = (name: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({ name, label, type: "tags", full: true, ...extra });
const flag = (name: string, label: string, help?: string): FieldConfig => ({ name, label, type: "boolean", full: true, help });
const hi = (keys: [string, string, ("text" | "textarea")?][]): FieldConfig => ({
  name: "hi", label: "Hindi (optional)", type: "group", full: true,
  help: "The same fields in Hindi. Empty shows the English on the Hindi page.",
  fields: keys.map(([k, l, t]) => ({ name: k, label: l, type: t || "text", full: t === "textarea" })),
});

const COPIED_PHONE =
  "COPIED FROM THEIR OWN SITE OR SIGNBOARD, OR LEFT EMPTY. Never a Practo, Justdial or Lybrate relay number, and never a plausible number: a wrong one rings a real stranger.";

const hero: FieldConfig = {
  name: "hero", label: "First screen", type: "group", full: true,
  help: "A fact in every line. No award, no ranking, no “best”.",
  fields: [
    text("pill", "Small line above the headline", { full: true, placeholder: "Open today, 10 am to 8:30 pm" }),
    text("headline", "Headline", { full: true, placeholder: "Your *smile journey* starts here", help: "One phrase between *stars* is set in the accent colour." }),
    area("lead", "Line under the headline", { help: "Three to five main treatments and the area, so a patient knows in three seconds whether this clinic does what they need." }),
    text("nextSlot", "Card beside the photo", { placeholder: "Evening slots from 5 pm, Mon to Sat", help: "A standing fact. Never a live-looking “free today” claim." }),
    text("credential", "Lead dentist's degree and registration", { placeholder: "BDS, MDS (Prosthodontics)" }),
    hi([["pill", "Small line"], ["headline", "Headline"], ["lead", "Line under the headline", "textarea"], ["nextSlot", "Card"], ["credential", "Degree and registration"]]),
  ],
};

const doctors: FieldConfig = {
  name: "doctors", label: "Doctors", type: "array", full: true,
  help: "Their real dentists, from their own site or signboard. A template's doctors are fictional: replace them or delete them before this demo is sent.",
  itemFields: [
    text("name", "Name", { placeholder: "Dr. Example Name" }),
    text("slug", "Page address", { placeholder: "example-name", help: "Lower case words and hyphens. Empty makes one from the name." }),
    text("qualification", "Degrees", { placeholder: "BDS, MDS (Prosthodontics)", help: "Earned degrees only, copied as they print them." }),
    text("specialisation", "Specialisation", { placeholder: "Prosthodontist", help: "A recognised MDS branch title, or “General dentist”. Never “Implantologist”." }),
    text("experience", "Experience", { placeholder: "12 years in practice" }),
    text("regNo", "Dental council registration", { help: "Copied from their own material, or left empty." }),
    text("focus", "Areas of work", { full: true, placeholder: "Dental implants, full-mouth rehabilitation" }),
    text("days", "Days, for a visiting specialist", { full: true, placeholder: "Tuesdays and Fridays, 5 to 8 pm" }),
    tags("languages", "Languages", { placeholder: "English" }),
    flag("lead", "Lead dentist", "One per site: the first card and the credential on the first screen."),
    flag("visiting", "Visiting specialist"),
    { name: "photo", label: "Photograph", type: "image", full: true },
    flag("photoConsent", "We have written consent for this photograph", "A real dentist's photograph renders only with this on. A stock portrait from the template is a licensed model, not their dentist."),
    area("bio", "Biography", { help: "Paragraphs separated by a blank line. With a biography the doctor gets a page of their own." }),
    text("quote", "A line in their own words", { full: true, help: "Only words they said or wrote. Leave it empty otherwise." }),
    hi([["name", "Name"], ["qualification", "Degrees"], ["specialisation", "Specialisation"], ["experience", "Experience"], ["focus", "Areas of work"], ["days", "Days"], ["bio", "Biography", "textarea"], ["quote", "Their line"]]),
  ],
};

const treatments: FieldConfig = {
  name: "treatments", label: "Treatments", type: "array", full: true,
  help: "What the clinic offers, one row per treatment page. A price only when the clinic publishes one.",
  itemFields: [
    text("name", "Treatment", { placeholder: "Root canal treatment" }),
    text("slug", "Page address", { placeholder: "root-canal-treatment", help: "Required. Lower case words and hyphens. Pages and bookings use it, so keep it once the demo is sent." }),
    text("category", "Group", { placeholder: "Root canal and fillings" }),
    text("fromPrice", "Starting price, digits only", { placeholder: "3,500", help: "As the clinic publishes it. Empty prints “after consultation”. Never a guess and never a discount." }),
    text("priceNote", "Price note", { placeholder: "per tooth" }),
    text("duration", "How long", { placeholder: "2 to 3 visits over 3 to 6 months" }),
    area("summary", "One or two lines for the card"),
    area("what", "What it is"),
    list("symptoms", "Signs you may need it"),
    flag("featured", "Show it large on the home page"),
    hi([["name", "Treatment"], ["category", "Group"], ["priceNote", "Price note"], ["duration", "How long"], ["summary", "Card lines", "textarea"], ["what", "What it is", "textarea"]]),
  ],
};

const fees: FieldConfig = {
  name: "fees", label: "Fee table", type: "array", full: true,
  help: "The Fees page. Starting prices only, as the clinic publishes them. Complex work (implants, full mouth, smile makeovers, aligners) is priced after consultation.",
  itemFields: [
    text("treatment", "Treatment", { placeholder: "Root canal treatment (front tooth)" }),
    text("group", "Group", { placeholder: "General" }),
    text("from", "Starting from, digits only", { placeholder: "3,500", help: "Empty prints “after consultation”." }),
    text("unit", "Per", { placeholder: "per tooth" }),
    text("slug", "Treatment page it links to", { placeholder: "root-canal-treatment" }),
    text("note", "Note"),
    flag("consult", "Cost after consultation and X-ray", "On for implants, full-mouth work, smile makeovers and aligners."),
    hi([["treatment", "Treatment"], ["group", "Group"], ["unit", "Per"], ["note", "Note"]]),
  ],
};

const payment: FieldConfig = {
  name: "payment", label: "Payment, EMI and insurance", type: "group", full: true,
  help: "Only what the clinic confirms. No “0% EMI” and no insurer named unless they name it.",
  fields: [
    text("consultFee", "Consultation fee line", { full: true, placeholder: "Consultation: Rs 300" }),
    area("emi", "EMI line", { placeholder: "EMI options may be available through partner lenders, subject to their approval." }),
    text("emiExample", "EMI example", { full: true, help: "An illustration, and the page labels it as one." }),
    tags("modes", "Ways to pay", { placeholder: "UPI" }),
    tags("partners", "EMI partners"),
    area("insurance", "Insurance"),
    hi([["consultFee", "Consultation fee line"], ["emi", "EMI line", "textarea"], ["emiExample", "EMI example"], ["insurance", "Insurance", "textarea"]]),
  ],
};

const branches: FieldConfig = {
  name: "branches", label: "Branches", type: "array", full: true,
  help: "A chain's clinics, or a second chamber. A duplicate keeps each branch's area name and hours and clears its address, phone, map and access lines.",
  itemFields: [
    text("name", "Area name", { placeholder: "Sector 12" }),
    text("slug", "Page address", { placeholder: "sector-12", help: "Required. Lower case words and hyphens." }),
    text("city", "City"),
    text("hours", "Hours", { placeholder: "Mon to Sat 10 am to 8 pm" }),
    list("addressLines", "Address lines"),
    text("phone", "Phone, as they print it", { help: COPIED_PHONE }),
    text("whatsapp", "WhatsApp number", { help: COPIED_PHONE }),
    text("landmark", "Landmark"),
    text("mapQuery", "Map search", { placeholder: "Example Dental Clinic, Sector 12" }),
    text("mapUrl", "Map link", { full: true }),
    text("access", "Access", { placeholder: "Lift to the first floor" }),
    text("parking", "Parking"),
    text("transit", "Nearest metro or bus", { full: true }),
    hi([["name", "Area name"], ["city", "City"], ["hours", "Hours"], ["landmark", "Landmark"], ["access", "Access"], ["parking", "Parking"], ["transit", "Nearest metro or bus"]]),
  ],
};

const emergency: FieldConfig = {
  name: "emergency", label: "Emergency page", type: "group", full: true,
  help: "The page adds “Same-day slots depend on availability” on its own. Never promise a time.",
  fields: [
    text("headline", "Headline", { full: true, placeholder: "Tooth pain? Same-day emergency appointments" }),
    area("intro", "Opening lines"),
    text("phone", "Emergency phone", { help: COPIED_PHONE + " Empty uses the number in their contact details." }),
    text("whatsapp", "Emergency WhatsApp", { help: COPIED_PHONE }),
    text("hours", "When it is answered", { full: true, placeholder: "Answered 8 am to 10 pm" }),
    list("urgent", "What counts as urgent"),
    list("canWait", "What can wait for a regular visit"),
    hi([["headline", "Headline"], ["intro", "Opening lines", "textarea"], ["hours", "When it is answered"]]),
  ],
};

const booking: FieldConfig = {
  name: "booking", label: "Booking slots", type: "group", full: true,
  help: "The demo's booking sends nothing: it opens WhatsApp with the choice typed in. On a template the slots are sample times.",
  fields: [
    tags("morning", "Morning slots", { placeholder: "10:00 am" }),
    tags("evening", "Evening slots", { placeholder: "5:30 pm" }),
    text("closedNote", "Closed note", { full: true, placeholder: "Closed on Sundays" }),
    hi([["closedNote", "Closed note"]]),
  ],
};

const reach: FieldConfig = {
  name: "reach", label: "How to reach the clinic", type: "group", full: true,
  help: "Cleared on a duplicate, because it belongs to the address. From their own site or listing only.",
  fields: [
    text("transit", "Nearest metro or bus", { full: true }),
    text("parking", "Parking"),
    text("access", "Access", { placeholder: "Ground floor, ramp at the entrance" }),
    hi([["transit", "Nearest metro or bus"], ["parking", "Parking"], ["access", "Access"]]),
  ],
};

/** The whole block, as one group on the demoSites form. */
export const DEMO_SITE_DENTAL_FIELD: FieldConfig = {
  name: "dental", label: "Dental clinic pages (dental demos only)", type: "group", full: true,
  help: "Read only when Kind is Dental clinic; a school or coaching demo ignores it. The clinic's name, city, about, contact details and photos are the shared fields elsewhere on this form.",
  fields: [
    hero, doctors, treatments, fees, payment, branches, emergency, booking, reach,
    text("legalName", "Legal name for the footer", { full: true, help: "As on their own site or registration, or empty. A template's ends in “(sample)”." }),
    hi([["legalName", "Legal name"]]),
  ],
};

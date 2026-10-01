/**
 * THE PHOTO SLOTS OF A DEMO SITE, and where each one lives on the record.
 *
 *   hero            DemoSite.heroImage          the home hero, one photo
 *   faculty         DemoSite.faculty[i].photo   one portrait per teacher
 *   section         DemoSite.sectionPhotos[slot] one photo per section below
 *   gallery         DemoSite.photos[]            the Gallery page, with chips
 *
 * A value is a path: either a stock photo from public/demo/img/ (see
 * ./index.ts) or a file Mehdi uploaded or pasted. The renderer gives a stock
 * path its full srcset; anything else renders as a plain lazy image.
 *
 * `sectionPhotos` is new on DemoSite. It is declared below by module
 * augmentation so this file owns it without editing src/lib/cms/types.ts;
 * fromTemplate's policy table is typed over every DemoSite key, so it had to
 * classify the field (rule "stock").
 */

import type { DemoKind } from "@/lib/cms/types";

/** A section that may carry one photo. Not every section should: rhythm matters. */
export type DemoPhotoSlot =
  | "about"
  | "campus"
  | "academics"
  | "courses"
  | "admissions"
  | "transport"
  | "hostel"
  | "dining"
  | "labs"
  | "library"
  | "sports"
  | "activities"
  | "study";

/** One photo per section slot. Values are paths, as for heroImage. */
export type DemoSectionPhotos = Partial<Record<DemoPhotoSlot, string>>;

declare module "@/lib/cms/types" {
  interface DemoSite {
    /**
     * One photo per section (campus, academics, admissions, transport...).
     * A stock path from a template, or a file Mehdi holds. See
     * src/lib/demo/images/slots.ts.
     */
    sectionPhotos?: DemoSectionPhotos;
  }
}

export interface DemoPhotoSlotDef {
  slot: DemoPhotoSlot;
  label: string;
  labelHi: string;
  /** Where the renderer shows it. Shown as help in the admin. */
  where: string;
  kinds: DemoKind[];
  /** Manifest categories that suit this slot, for the stock picker. */
  categories: string[];
}

export const DEMO_PHOTO_SLOTS: DemoPhotoSlotDef[] = [
  /* "about" and "campus" are read by the dental site too (28 Sep 2026): its
     About page (src/pages/site/dental/AboutPage.tsx), and the clinic photo in
     the home Visit block (dental/home/visit.tsx). No other slot is: a dental
     page takes its photos from the dental block (doctors, treatments). */
  { slot: "about", label: "About", labelHi: "परिचय", where: "About page and the home About block", kinds: ["school", "coaching", "dental"], categories: ["campus", "classroom", "coaching-classroom", "hero-urban-school", "hero-rural-school", "residential", "international", "dental-interior", "dental-hero", "dental-patient"] },
  { slot: "campus", label: "Campus and facilities, or the clinic", labelHi: "परिसर और सुविधाएँ, या क्लिनिक", where: "Facilities page and the home facilities block; on a dental site, the clinic photo in the home Visit block", kinds: ["school", "coaching", "dental"], categories: ["campus", "residential", "classroom", "library", "lab", "dental-interior", "dental-sterile"] },
  { slot: "academics", label: "Academics", labelHi: "पढ़ाई", where: "Academics page and the home academics block", kinds: ["school"], categories: ["classroom", "playschool", "lab", "library", "activities"] },
  { slot: "courses", label: "Courses", labelHi: "कोर्स", where: "Courses page and the home batches block", kinds: ["coaching"], categories: ["coaching-classroom", "classroom", "study-group", "exam-hall"] },
  { slot: "admissions", label: "Admissions (visit us)", labelHi: "दाख़िला", where: "Admissions page, beside the visit step", kinds: ["school", "coaching"], categories: ["campus", "classroom", "playschool", "coaching-classroom", "residential"] },
  { slot: "transport", label: "Transport", labelHi: "परिवहन", where: "Transport page", kinds: ["school"], categories: ["transport"] },
  { slot: "hostel", label: "Hostel and boarding", labelHi: "छात्रावास", where: "Boarding page, or the coaching hostel note", kinds: ["school", "coaching"], categories: ["hostel", "residential"] },
  { slot: "dining", label: "Meals and dining", labelHi: "भोजन", where: "Boarding or student life page", kinds: ["school"], categories: ["dining"] },
  { slot: "labs", label: "Laboratories", labelHi: "प्रयोगशाला", where: "Facilities page, labs row", kinds: ["school", "coaching"], categories: ["lab"] },
  { slot: "library", label: "Library", labelHi: "पुस्तकालय", where: "Facilities page, library row", kinds: ["school", "coaching"], categories: ["library"] },
  { slot: "sports", label: "Sports", labelHi: "खेल", where: "Student life page", kinds: ["school"], categories: ["sports"] },
  { slot: "activities", label: "Activities and trips", labelHi: "गतिविधियाँ", where: "Student life page", kinds: ["school"], categories: ["activities", "playschool", "sports"] },
  { slot: "study", label: "Self study and doubt clearing", labelHi: "सेल्फ़ स्टडी", where: "Method or study-centre block", kinds: ["coaching"], categories: ["study-group", "library", "exam-hall"] },
];

export function photoSlotsFor(kind: DemoKind | undefined): DemoPhotoSlotDef[] {
  return DEMO_PHOTO_SLOTS.filter((d) => !kind || d.kinds.includes(kind));
}

export function isDemoPhotoSlot(v: string): v is DemoPhotoSlot {
  return DEMO_PHOTO_SLOTS.some((d) => d.slot === v);
}

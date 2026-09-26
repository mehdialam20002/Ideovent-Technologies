/**
 * THE STOCK PHOTO LIBRARY FOR DEMO SITES, typed.
 *
 * Files:  public/demo/img/{school,coaching,people}/<name>-<width>.webp
 * Data:   ./data.generated.ts, a trimmed copy of public/demo/img/manifest.json
 *         (run ./sync-manifest.mjs after editing the manifest; the template
 *         test fails when the two drift).
 *
 * WHAT A RECORD STORES. A path, like any other image field: the photo's
 * canonical `src` (its smallest file, so an admin thumbnail is cheap). Any of
 * its size paths, or its manifest id, resolves to the same entry, so a path
 * pasted from the browser still gets the full srcset.
 *
 * WHAT THESE PHOTOS ARE. Licensed stock (Pexels and Unsplash) of real Indian
 * classrooms and teachers, standing in for a fictional institute. The alt
 * text describes the scene and never names an institute. A demo made for a
 * real institute starts with them and should replace the hero before it goes
 * out; `stockPhotoUse` below tells the checklist whether it still has them.
 */

import type { DemoFaculty, DemoSite } from "@/lib/cms/types";
import type { DemoLang } from "../language";
import { STOCK_PHOTO_DATA } from "./data.generated";

export * from "./slots";

type Row = (typeof STOCK_PHOTO_DATA)[number];

/** Every manifest id: "school/hero-rural-girls-writing", "people/teacher-w03". */
export type StockPhotoId = Row["id"];
/** The canonical path of a stock photo. The only kind of path a template may hold. */
export type StockPhotoSrc = Row["src"];
/** A portrait's canonical path (people/*), for faculty. */
export type StockPortraitSrc = Extract<Row, { role: "portrait" }>["src"];
/** A hero-sized photo's canonical path. */
export type StockHeroSrc = Extract<Row, { role: "hero" }>["src"];

export type StockPhotoRole = "hero" | "section" | "portrait";

export interface StockPhotoSize {
  w: number;
  h: number;
  src: string;
}

export interface StockPhoto {
  id: StockPhotoId;
  src: StockPhotoSrc;
  role: StockPhotoRole;
  category: string;
  gender?: string;
  /** Template ids the photo was picked for ("s1", "c3"). */
  suggestedFor: readonly string[];
  /** Largest first. */
  sizes: StockPhotoSize[];
  /** Intrinsic size of the largest file: the width and height attributes. */
  width: number;
  height: number;
  focal: { x: number; y: number };
  /** CSS object-position from the focal point: "55% 45%". */
  objectPosition: string;
  alt: string;
  altHi: string;
}

const BASE = "/demo/img/";

function toPhoto(r: Row): StockPhoto {
  const sizes = r.sizes.map(([w, h]) => ({ w, h, src: `${BASE}${r.id}-${w}.webp` }));
  const [fx, fy] = r.focal;
  return {
    id: r.id,
    src: r.src,
    role: r.role as StockPhotoRole,
    category: r.category,
    gender: "gender" in r ? (r.gender as string) : undefined,
    suggestedFor: r.suggestedFor,
    sizes,
    width: sizes[0].w,
    height: sizes[0].h,
    focal: { x: fx, y: fy },
    objectPosition: `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%`,
    alt: r.alt,
    altHi: r.altHi,
  };
}

export const STOCK_PHOTOS: readonly StockPhoto[] = STOCK_PHOTO_DATA.map(toPhoto);

/* Every way a photo can be named, to its entry: id, canonical src, each size. */
const INDEX = new Map<string, StockPhoto>();
for (const p of STOCK_PHOTOS) {
  INDEX.set(p.id, p);
  INDEX.set(p.src, p);
  for (const s of p.sizes) INDEX.set(s.src, p);
}

/**
 * The stock photo behind a value, or undefined. Accepts a manifest id, any
 * size's path, with or without the leading slash, with a query string, or as
 * an absolute URL on any origin (a path copied from the address bar).
 */
export function getStockPhoto(value: string | undefined | null): StockPhoto | undefined {
  if (!value || typeof value !== "string") return undefined;
  let v = value.trim().split(/[?#]/)[0];
  const direct = INDEX.get(v);
  if (direct) return direct;
  const at = v.indexOf(BASE);
  if (at > 0) v = v.slice(at);
  else if (v.startsWith(BASE.slice(1))) v = "/" + v;
  return INDEX.get(v);
}

export function isStockPhoto(value: string | undefined | null): boolean {
  return Boolean(getStockPhoto(value));
}

/** The canonical path of a stock photo, for a template file. Typed by id. */
export function stockPhoto(id: StockPhotoId): StockPhotoSrc {
  const p = INDEX.get(id);
  if (!p) throw new Error(`No stock photo called ${id}`);
  return p.src;
}

/** "url 1920w, url 1280w, url 800w". */
export function srcSetOf(p: StockPhoto): string {
  return p.sizes.map((s) => `${s.src} ${s.w}w`).join(", ");
}

/** The alt text in the reader's language. Describes the scene, names nobody. */
export function stockAlt(p: StockPhoto, lang: DemoLang | undefined): string {
  return lang === "hi" && p.altHi ? p.altHi : p.alt;
}

/** Photos picked for a template ("s1" or "s1-urban-cbse"), optionally by role. */
export function stockPhotosFor(templateId: string, role?: StockPhotoRole): StockPhoto[] {
  const code = templateId.split("-")[0];
  return STOCK_PHOTOS.filter((p) => p.suggestedFor.includes(code) && (!role || p.role === role));
}

export function stockPhotosByRole(role: StockPhotoRole): StockPhoto[] {
  return STOCK_PHOTOS.filter((p) => p.role === role);
}

/**
 * The photo a faculty card may show, or undefined. A file of a real teacher
 * needs `photoConsent`, as before. A stock portrait is a licensed model, not
 * the institute's teacher, so it needs no consent flag.
 */
export function facultyPhotoSrc(f: Pick<DemoFaculty, "photo" | "photoConsent"> | undefined): string | undefined {
  if (!f?.photo) return undefined;
  if (isStockPhoto(f.photo)) return f.photo;
  return f.photoConsent ? f.photo : undefined;
}

/**
 * Where a record still shows stock photos, for the sample-content checklist:
 * "Photos are stock photos from the template". `hero` is the one that
 * matters most: a real institute's demo should open on its own building.
 */
export interface StockPhotoUse {
  hero: boolean;
  sections: string[];
  faculty: number;
  gallery: number;
  total: number;
}

export function stockPhotoUse(site: Partial<DemoSite>): StockPhotoUse {
  const hero = isStockPhoto(site.heroImage);
  const sections = Object.entries(site.sectionPhotos || {})
    .filter(([, v]) => isStockPhoto(v))
    .map(([k]) => k);
  const faculty = (site.faculty || []).filter((f) => isStockPhoto(f?.photo)).length;
  const gallery =
    (site.photos || []).filter((p) => isStockPhoto(p?.src)).length +
    (site.gallery || []).filter((g) => isStockPhoto(g?.src)).length;
  return { hero, sections, faculty, gallery, total: (hero ? 1 : 0) + sections.length + faculty + gallery };
}

/** The checklist line, in both languages of the admin. */
export const STOCK_PHOTO_CHECKLIST = {
  en: "Photos are stock photos from the template",
  hi: "तस्वीरें टेम्पलेट की स्टॉक तस्वीरें हैं",
} as const;

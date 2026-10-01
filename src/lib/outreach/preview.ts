/**
 * THE PICTURE THAT GOES WITH A FIRST WHATSAPP (1 Oct 2026).
 *
 * Mehdi: "mai chahta hu jab v mai first msz send kr rha hu to ekdm attract krne
 * wala photo jaye coaching school ya dentist ko taki wo turant haan bole". He
 * made one picture per kind: the clinic, school or institute as it is today next
 * to a professional website, ending "We built a sample website for your clinic.
 * Want to see it?". A wa.me link carries text only, so the picture reaches the
 * chat two ways:
 *   1. the link: one static page per kind, /w/dental, /w/school, /w/coaching
 *      (public/w/<kind>/index.html), whose og:image is the picture, so WhatsApp
 *      draws it as the link's card. Mehdi approved a link in the first message
 *      for this one purpose only; their own sample's link still goes after a yes;
 *   2. the picture itself: the CRM's WhatsApp compose shows it under a first
 *      message, with Copy image, Share and Download (admin/outreach/CreativeCard.tsx).
 *
 * Only a message that says the sample is made carries it. The picture says "We
 * built a sample website for your clinic": that is not true for a lead whose
 * demo is not made yet (the "offer" twin), and the pitch-page message offers a
 * note, not a website. A kind without a picture (any other business) gets none.
 *
 * The address is www.ideovent.in, fixed, not MAIN_ORIGIN: each page names its
 * picture by that absolute address (og:image must be absolute), so the link and
 * the card stay on one host, and a Vercel preview or a local build never writes
 * another address into a message.
 */

export const PREVIEW_ORIGIN = "https://www.ideovent.in";

export type PreviewKind = "dental" | "school" | "coaching";
export const PREVIEW_KINDS: readonly PreviewKind[] = ["dental", "school", "coaching"];

export interface PreviewPage {
  kind: PreviewKind;
  /** The page WhatsApp reads for the card: "/w/dental". */
  path: string;
  /** The picture, a JPEG in public/w/: "/w/dental.jpg". */
  image: string;
  /** Its size in pixels, as the page's og:image:width and og:image:height say. */
  width: number;
  height: number;
  /** The name Download and Share give the file. */
  fileName: string;
  /** What the CRM calls the kind: "dental clinic". */
  noun: string;
  /** What the picture shows, for a screen reader. */
  alt: string;
}

const page = (kind: PreviewKind, noun: string, alt: string): PreviewPage => ({
  kind,
  path: `/w/${kind}`,
  image: `/w/${kind}.jpg`,
  width: 1200,
  height: 1097,
  fileName: `ideovent-${kind}-sample-website.jpg`,
  noun,
  alt,
});

export const PREVIEW_PAGES: Record<PreviewKind, PreviewPage> = {
  dental: page("dental", "dental clinic",
    "Your patients are searching for you online. A clinic with only a Google listing, next to a professional website for a dental clinic. We built a sample website for your clinic. Want to see it?"),
  school: page("school", "school",
    "Parents check online before choosing a school. An outdated or missing website, next to a modern website for a school. We built a sample website for your school. Want to see it?"),
  coaching: page("coaching", "coaching institute",
    "Students search online before joining any institute. An old or missing website, next to a modern website for an institute. We built a sample website for your institute. Want to see it?"),
};

/** The picture page for a lead or template kind; undefined for a kind without one ("other", "any"). */
export function previewFor(kind: string | null | undefined): PreviewPage | undefined {
  return kind === "dental" || kind === "school" || kind === "coaching" ? PREVIEW_PAGES[kind] : undefined;
}

/** {previewLink}: "https://www.ideovent.in/w/dental"; "" for a kind without a picture. */
export function previewLinkFor(kind: string | null | undefined): string {
  const p = previewFor(kind);
  return p ? `${PREVIEW_ORIGIN}${p.path}` : "";
}

/** The picture's own absolute address, as the page's og:image gives it. */
export function previewImageUrlFor(kind: string | null | undefined): string {
  const p = previewFor(kind);
  return p ? `${PREVIEW_ORIGIN}${p.image}` : "";
}

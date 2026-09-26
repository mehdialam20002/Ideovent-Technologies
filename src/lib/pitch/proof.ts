/**
 * The work a pitch page is allowed to show, and how it is allowed to show it.
 *
 * This is a narrow, curated view of the `projects` collection, kept separate for
 * one reason: a pitch page makes claims in front of a buyer, so every entry here
 * carries the two things a case-study card does not need and a pitch card cannot
 * do without.
 *
 *   `kind`       Client work or Ideovent's own product. A product of ours shown
 *                as a client is a fabricated client, and it is the single
 *                easiest lie for a prospect to catch. The card prints the
 *                distinction, it is not left to the reader.
 *   `linkState`  Whether the URL actually opens today. HighQ Classes is a real,
 *                paid, named client and its site is unreachable, because it is
 *                served from a subdomain of ideovent.in and that domain is not
 *                resolving. Sending a school principal to a dead address costs
 *                more than showing no link, so the card says so in plain words
 *                instead of pretending.
 *
 * Every slug matches `projects` in the CMS seed, so the description of the work
 * has exactly one home and these two cannot drift apart on the facts.
 */

import type { PitchInstituteType } from "@/lib/cms/types";

const B = import.meta.env.BASE_URL;

/**
 * THREE KINDS, AND THE THIRD ONE IS NOT OPTIONAL.
 *
 * "employer-work" exists because WTFGO was built by Mehdi while EMPLOYED at
 * Witness The Fitness Pvt. Ltd. (_assets/FACTS.md, ATTRIBUTION RULE). It is
 * neither a client project nor Ideovent's own product, and it used to be typed
 * `own-product` on the grounds that the card prints `sector` rather than the
 * literal label. That held only as long as every design chose to print `sector`:
 * the India card printed "Our own product" for the same kind, so the day
 * somebody added WTFGO to `defaultProofOrder` the page would have claimed
 * Ideovent owned another company's product, in a tag, above a sentence saying
 * the opposite. A union member costs nothing and takes that away.
 */
export type ProofKind = "client" | "own-product" | "employer-work";
export type ProofLinkState = "live" | "down" | "behind-login" | "none";

export interface ProofEntry {
  /** Matches `projects[].slug` in the CMS. */
  slug: string;
  name: string;
  /** One line. What it is, in a parent's words, not a developer's. */
  what: string;
  kind: ProofKind;
  sector: string;
  url?: string;
  linkState: ProofLinkState;
  /** Shown instead of a link when `linkState` is not "live". Plain and honest. */
  linkNote?: string;
  /** 800x500 card image from public/work, or absent when none exists. */
  image?: { src: string; width: number; height: number; alt: string };
  /** Why an education buyer should care. Overridden per record by `proof[].why`. */
  relevance: string;
}

const ENTRIES: ProofEntry[] = [
  {
    slug: "highq-classes",
    name: "HighQ Classes",
    what: "A coaching institute website: courses, batches, faculty and an enquiry form one tap from the homepage.",
    kind: "client",
    sector: "Coaching institute",
    linkState: "down",
    linkNote:
      "The site is served from a subdomain of ideovent.in and that domain is not resolving right now, so we have left the link off rather than send you to a dead address. Ask us and we will walk you through it on a call.",
    relevance:
      "The closest thing we have built to what you are asking for: the same visitor, the same phone, the same question.",
  },
  {
    slug: "gym-map",
    name: "GYM MAP",
    what: "A discovery and joining platform: people search, compare and sign up without calling first.",
    kind: "client",
    sector: "Fitness, marketplace",
    url: "https://gym-map-customer-web.vercel.app",
    linkState: "live",
    image: {
      src: `${B}work/gym-map-card.webp`,
      width: 800,
      height: 500,
      alt: "The GYM MAP website, a gym discovery and joining platform",
    },
    relevance:
      "Enquiry to sign-up, built as one flow. It is the same problem as an admission enquiry, in a different industry.",
  },
  {
    slug: "wedart-films",
    name: "WedArt Films",
    what: "A studio site built around photographs and films, so the work loads fast and looks like the work.",
    kind: "client",
    sector: "Wedding photography",
    url: "https://wedart.vercel.app",
    linkState: "live",
    image: {
      src: `${B}work/wedart-films-card.webp`,
      width: 800,
      height: 500,
      alt: "The WedArt Films website, a cinematic wedding photography studio",
    },
    relevance:
      "If your gallery, annual day and sports meet photos matter, this is the build that proves we can carry them without the page crawling.",
  },
  {
    slug: "tamkuhi-bazaar",
    name: "Tamkuhi Bazaar",
    what: "A local delivery marketplace, used on ordinary phones on ordinary connections in a small town.",
    kind: "client",
    sector: "Local commerce",
    url: "https://tamkuhibazaar-online.vercel.app",
    linkState: "live",
    image: {
      src: `${B}work/tamkuhi-bazaar-card.webp`,
      width: 800,
      height: 500,
      alt: "The Tamkuhi Bazaar website, a local delivery marketplace",
    },
    relevance:
      "Built for exactly the network your parents are on. Not a metro-only site that falls over outside a city.",
  },
  {
    slug: "atelier-co",
    name: "Atelier Co.",
    what: "A full storefront: catalogue, product pages, cart and checkout.",
    kind: "client",
    sector: "Retail",
    url: "https://eccom2.vercel.app",
    linkState: "live",
    image: {
      src: `${B}work/atelier-co-card.webp`,
      width: 800,
      height: 500,
      alt: "The Atelier Co. storefront, a clothing e-commerce site",
    },
    relevance:
      "Proof we can take an online payment properly, for the day you want fees or a form charge collected on the site.",
  },
  {
    slug: "hrms-lite",
    name: "HRMS Lite",
    what: "A staff register and a daily attendance record, with a dashboard over the top.",
    kind: "client",
    sector: "Internal tool",
    linkState: "behind-login",
    linkNote:
      "It sits behind a login, like every HR system. There is nothing useful to click, so we show it as a fact rather than a link.",
    relevance:
      "Staff and attendance records are the first thing a school asks for after the website. We have built it before.",
  },
  {
    slug: "lead-crm",
    name: "Lead CRM",
    what: "Every enquiry becomes a row that a named person owns, instead of living in a notebook.",
    kind: "client",
    sector: "Internal tool",
    linkState: "behind-login",
    linkNote:
      "Reachable only with an account. Everything past the login is other people’s contact details.",
    relevance:
      "This is where admission enquiries go when a phone number in a register stops being enough.",
  },
  {
    slug: "aura-orbit",
    name: "Aura Orbit",
    what: "Our own web app, with subscriptions running against a real payment gateway.",
    kind: "own-product",
    sector: "Ideovent product",
    url: "https://goodhabits-teal.vercel.app",
    linkState: "live",
    image: {
      src: `${B}work/aura-orbit-card.webp`,
      width: 800,
      height: 500,
      alt: "Aura Orbit, an Ideovent product",
    },
    relevance:
      "Ours, not a client’s, so you can open it right now with nobody’s permission and see how we build.",
  },
];

/**
 * The tag printed beside a proof card's name, for every design, from the data.
 *
 * ONE RULE, IN ONE PLACE, ON PURPOSE. Both pitch designs used to compute this
 * themselves off `kind === "own-product"`, and they disagreed: the international
 * card printed `sector` and the India card printed the words "Our own product".
 * Two answers to one question about ownership is exactly the kind of drift that
 * ends with a page claiming somebody else's product, so neither design decides
 * it any more.
 *
 * `sector` carries the true answer for both non-client kinds already, because it
 * has to be printable on its own: "Ideovent product" for Aura Orbit,
 * "Founder's employer work" for WTFGO.
 */
export function proofKindLabel(entry: Pick<ProofEntry, "kind" | "sector">): string {
  return entry.kind === "client" ? "Client project" : entry.sector;
}

const BY_SLUG = new Map(ENTRIES.map((e) => [e.slug, e]));

export function proofBySlug(slug: string): ProofEntry | undefined {
  return BY_SLUG.get(slug);
}

/**
 * The default running order when a record does not name its own.
 *
 * HighQ Classes leads for a coaching institute because it IS a coaching
 * institute, even with its link down: the relevance is worth more than the
 * click, and the card is explicit about why there is no click. A school leads
 * with it too, then moves to the builds that answer what a school asks about
 * next, galleries and slow connections.
 */
export function defaultProofOrder(instituteType?: PitchInstituteType): string[] {
  return instituteType === "coaching"
    ? ["highq-classes", "gym-map", "tamkuhi-bazaar", "lead-crm", "atelier-co"]
    : ["highq-classes", "wedart-films", "tamkuhi-bazaar", "hrms-lite", "atelier-co"];
}

/** The entries for a list of slugs, skipping any that do not exist. */
export function proofEntries(slugs: string[]): ProofEntry[] {
  return slugs.map(proofBySlug).filter((e): e is ProofEntry => e !== undefined);
}

export const allProof = ENTRIES;

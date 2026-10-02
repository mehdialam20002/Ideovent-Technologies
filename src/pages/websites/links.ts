import { PLANS, monthlyLine, termLine } from "../../lib/pricing";

/**
 * Links to the five /websites pages, for the header's Services panel
 * (components/layout/navPanels.ts), the footer, /services and the website
 * development service page. SMALL ON PURPOSE: the header and the footer are in
 * the entry chunk every visitor downloads, so this file holds labels and paths
 * only, never the pages' content (that is ./content/, loaded with the page).
 *
 * Built in code rather than read from the CMS navigation singleton, so a
 * navigation row saved in /admin cannot drop them.
 */

export interface WebsiteLink {
  label: string;
  href: string;
  description: string;
}

const s = PLANS.starter;

export const WEBSITES_HEADING = "Websites";

export const WEBSITE_LINKS: WebsiteLink[] = [
  { label: "For dental clinics", href: "/websites/dental-clinic", description: "Treatments, fees, timings and appointment requests on WhatsApp." },
  { label: "For schools", href: "/websites/school", description: "Admissions, notices, the fee structure and the CBSE disclosure page." },
  { label: "For coaching institutes", href: "/websites/coaching-institute", description: "Courses, batch timings, fees and demo class requests." },
  // The monthly figure always travels with its setup fee and its term.
  { label: "On a monthly plan", href: "/websites/899-per-month", description: `${monthlyLine(s)}, ${termLine(s)}.` },
  { label: "For every kind of business", href: "/websites", description: "Shops, salons, gyms and firms too, and both ways to pay." },
];

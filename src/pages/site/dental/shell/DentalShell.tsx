/**
 * THE DENTAL CHROME, around every dental page (28 Sep 2026). Lazy: SiteShell
 * imports it only for a record of kind "dental". It adds, in order:
 *
 *   BookingProvider  one booking sheet per site; any button opens it
 *   TopBar           36px: Open now + area | Emergency, Call, WhatsApp, Book
 *   DentalHeader     sticky: logo, main nav, phone in full, Book now
 *   <main>           the page
 *   DentalFooter     hours, reg. numbers, page groups, legal name
 *   ActionBar        phones and tablets: Call, WhatsApp, Book
 *   BookingSheet     the dialog / bottom sheet
 *
 * The Ideovent ribbon and marker stay in SiteShell, outside all of this.
 * Spec: DENTAL-DESIGN.md section 7. STUB LEVEL: working; the kit builder owns it.
 */

import type { ReactNode } from "react";
import { BookingProvider, BookingSheet } from "@/lib/demo/ui/dental";
import "@/lib/demo/ui/dental/dental.css";
import { ActionBar } from "./ActionBar";
import { DentalFooter } from "./DentalFooter";
import { DentalHeader } from "./DentalHeader";
import { TopBar } from "./TopBar";

export default function DentalChrome({ children }: { children: ReactNode }) {
  return (
    <BookingProvider>
      <TopBar />
      <DentalHeader />
      <main id="ds-main">{children}</main>
      <DentalFooter />
      <ActionBar />
      <BookingSheet />
    </BookingProvider>
  );
}

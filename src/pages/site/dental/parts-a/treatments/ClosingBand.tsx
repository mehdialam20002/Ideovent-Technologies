/**
 * The closing band on the treatment, treatments, kids and emergency pages
 * (28 Sep 2026). On the brand ground the Book button is drawn in the brand /
 * on-brand pair (measured AA in every dental theme), because on some themes
 * the CTA colour IS the brand colour (haven: both teal) and a CTA button
 * would vanish into the band. Calm keeps its sand hero button.
 */

import type { ReactNode } from "react";
import { useSite } from "@/lib/demo/site/context";
import { BandCard, BookButton, CallLink, WhatsAppButton, type BookingPreset } from "@/lib/demo/ui/dental";

export function ClosingBand({ title, lead, preset, book, waText }: {
  title: ReactNode;
  lead?: ReactNode;
  preset?: BookingPreset;
  book?: ReactNode;
  waText?: string;
}) {
  const { family } = useSite();
  const calm = family === "calm";
  return (
    <BandCard title={title} lead={lead}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <BookButton size="lg" tone={calm ? "hero" : "cta"} preset={preset}
          className={calm ? "" : "!bg-[hsl(var(--ds-on-brand))] !text-[hsl(var(--ds-brand))] hover:!bg-[hsl(var(--ds-on-brand)/0.92)]"}>
          {book}
        </BookButton>
        <WhatsAppButton size="lg" text={waText} className="ring-1 ring-[hsl(var(--ds-on-brand)/0.6)]" />
        <CallLink className="px-1 underline-offset-4 hover:underline" />
      </div>
    </BandCard>
  );
}

/**
 * THE DENTAL HERO: seven first screens from Mehdi's reference, one component.
 * Variant: `dental.hero.variant`, else the theme's default (heroVariantOf).
 * Spec: DENTAL-DESIGN.md sections 3 to 6 and DENTAL-IA.md section 7.
 * Above the fold on every variant: clinic name, area and city, 3 to 5
 * treatments, Book + WhatsApp + Call. Text never sits on a photo without its
 * veil. On 390x844 the primary CTA's top is under 600px, so on phones the
 * text comes first and the photo follows (DENTAL-DESIGN.md put the split
 * photo first; with a 56svh photo the CTA could not clear 600px).
 *
 *   luxury-centred   the reference's first example: warm room under a cream
 *                    veil, centred serif, gold accent, trust row, scroll cue
 *   luxury-split     zen.dentist: text left on a linear veil, room on the right
 *   clinical-split   text left, dentist photo right in a 24px frame on a soft
 *                    blob, floating next-slot card and rating chip
 *   clinical-reason  aspendental: text and a wide photo left, "What do you
 *                    need?" card right (booking step 1)
 *   kids-arch        text left, photo in an arch mask on a sky blob, 3 shapes
 *   calm-full        deep teal veil over a wide room, text bottom-left, sand CTA
 *   calm-branch      calm-full plus the clinic picker pill (chains)
 *
 * Luxury sits under the transparent header (DentalHeader turns solid after
 * 24px), so it pulls itself up by the header's height.
 */

import type { ReactNode } from "react";
import type { DentalHeroVariant } from "@/lib/cms/types";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { useSite } from "@/lib/demo/site/context";
import type { SiteTheme } from "@/lib/demo/site/themes";
import { dentalOf } from "./logic";
import {
  BranchPicker, CalmCredential, ClinicalStats, HeroCtas, HeroLead, HeroPill, HeroTitle, KidsLead, KidsShapes,
  LuxTrust, NextSlotCard, RatingChip, ReasonCard, ScrollCue,
} from "./hero-parts";
import "./hero.css";

/** The theme's default first screen. */
export function heroVariantOf(theme: SiteTheme): DentalHeroVariant {
  if (theme.family === "luxury") return theme.variant === "b" ? "luxury-split" : "luxury-centred";
  if (theme.family === "calm") return theme.variant === "b" ? "calm-branch" : "calm-full";
  if (theme.variant === "c") return "kids-arch";
  return theme.variant === "b" ? "clinical-reason" : "clinical-split";
}

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";
/** Where the scroll cue lands: the first section after the hero. */
export const AFTER_HERO = "dn-after-hero";

function Shell({ variant, family, children, className = "", under = false, kids = false }: {
  variant: DentalHeroVariant;
  family: "luxury" | "clinical" | "calm";
  children: ReactNode;
  className?: string;
  under?: boolean;
  kids?: boolean;
}) {
  const { motion } = useSite();
  return (
    <>
      <section data-hero={variant} data-family={family} data-motion={motion} data-under-header={under ? "" : undefined}
        data-kids={kids ? "" : undefined} className={`dn-hero ${className}`}>
        {children}
      </section>
      <div id={AFTER_HERO} className="scroll-mt-[var(--dn-header-h)]" />
    </>
  );
}

/** A full-bleed photo layer (luxury, calm). On a phone the box is taller than
 *  wide, so object-fit cover shows a slice of a 16:9 photo about 2.3 times the
 *  viewport width; "100vw" made the browser pick the 800px file and stretch it
 *  3.4 to 4 times. The sizes hints below (and on the arch and split photos)
 *  describe the cropped width, not the box width. */
function Backdrop({ src, className = "", imgClassName = "" }: { src?: string; className?: string; imgClassName?: string }) {
  return (
    <div aria-hidden="true" className={`dn-hero-photo dn-settle ${className}`}>
      <DemoPhoto src={src} ratio="auto" priority decorative sizes="(max-width: 767px) 250vw, 100vw" className="h-full w-full" imgClassName={imgClassName} />
    </div>
  );
}

export function DentalHero({ variant: forced }: { variant?: DentalHeroVariant }) {
  const { site, theme } = useSite();
  const hero = dentalOf(site).hero || {};
  const variant = forced || hero.variant || heroVariantOf(theme);
  const photo = site.heroImage;

  if (variant === "luxury-centred" || variant === "luxury-split") {
    const centred = variant === "luxury-centred";
    return (
      <Shell variant={variant} family="luxury" under
        className="flex min-h-[620px] flex-col text-[hsl(var(--ds-hero-ink))] lg:min-h-[max(680px,calc(100svh-var(--dn-topbar-h)))]">
        <Backdrop src={photo} />
        <div aria-hidden="true" className={centred ? "dn-veil-lux" : "dn-veil-lux-split"} />
        <div className={`${wrap} flex flex-1 flex-col pb-10 pt-[calc(var(--dn-header-h)+36px)] lg:pb-10 lg:pt-[calc(var(--dn-header-h)+64px)] ${centred ? "items-center text-center" : "items-start"}`}>
          <div className={`flex flex-1 flex-col justify-center ${centred ? "max-w-[760px] items-center" : "max-w-[600px] items-start"}`}>
            <HeroPill tone="lux" />
            <HeroTitle className="max-w-[18ch] text-[clamp(2.5rem,1.5rem+3.9vw,4.5rem)]" />
            <HeroLead className="mt-5 max-w-[50ch] text-[1.0625rem] leading-relaxed text-[hsl(var(--ds-hero-soft))] sm:text-lg" />
            <HeroCtas tone="lux" center={centred} />
            <LuxTrust align={centred ? "center" : "start"} />
          </div>
          <ScrollCue target={AFTER_HERO} className={`mt-8 hidden sm:flex ${centred ? "" : "self-center"}`} />
        </div>
      </Shell>
    );
  }

  if (variant === "calm-full" || variant === "calm-branch") {
    return (
      <Shell variant={variant} family="calm"
        className="flex min-h-[560px] items-end bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))] md:min-h-[max(640px,calc(100svh-var(--dn-topbar-h)-var(--dn-header-h)))]">
        <Backdrop src={photo} imgClassName="!object-[72%_50%] md:!object-center" />
        <div aria-hidden="true" className="dn-veil-calm" />
        <div className={`${wrap} pb-12 pt-14 md:pb-24 md:pt-28`}>
          <div className="max-w-[660px]">
            <HeroPill tone="calm" />
            <HeroTitle className="max-w-[16ch] text-[clamp(2.5rem,1.6rem+3.6vw,4.5rem)]" />
            <HeroLead className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[hsl(var(--ds-hero-soft))]" />
            <HeroCtas tone="calm" />
            {variant === "calm-branch" && <BranchPicker />}
            <CalmCredential />
          </div>
        </div>
      </Shell>
    );
  }

  if (variant === "kids-arch") {
    return (
      <Shell variant={variant} family="clinical" kids className="overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid items-center gap-12 pb-16 pt-8 sm:pt-12 lg:grid-cols-2 lg:gap-16 lg:pb-20 lg:pt-16`}>
          <div>
            <HeroPill tone="kids" />
            <HeroTitle className="max-w-[16ch] text-[clamp(2.25rem,1.4rem+3.4vw,4rem)]" />
            <HeroLead className="mt-5 max-w-[50ch] text-lg leading-relaxed text-[hsl(var(--ds-hero-soft))]" />
            <HeroCtas tone="kids" />
            <KidsLead />
          </div>
          <div className="relative mx-auto w-full max-w-[520px] px-4 sm:px-8">
            <div aria-hidden="true" className="dn-blob -inset-x-2 inset-y-6 !bg-[hsl(var(--ds-surface-2))] sm:-inset-x-4" />
            <div className="dn-settle dn-arch relative aspect-[1/1] overflow-hidden shadow-[var(--dn-shadow-2)] sm:aspect-[4/5]">
              <DemoPhoto src={photo} ratio="auto" priority sizes="(min-width: 1024px) 820px, 160vw" className="h-full w-full" />
            </div>
            <KidsShapes />
          </div>
        </div>
      </Shell>
    );
  }

  if (variant === "clinical-reason") {
    return (
      <Shell variant={variant} family="clinical" className="overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
        <div className={`${wrap} grid gap-x-10 gap-y-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:pb-20 lg:pt-14`}>
          <div className="lg:col-span-7 lg:row-start-1 xl:col-span-8">
            <HeroPill tone="clinical" />
            <HeroTitle className="max-w-[17ch] text-[clamp(2.25rem,1.4rem+3.2vw,3.75rem)]" />
            <HeroLead className="mt-5 max-w-[54ch] text-lg leading-relaxed text-[hsl(var(--ds-hero-soft))]" />
            <HeroCtas tone="clinical" />
            <ClinicalStats />
          </div>
          <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 xl:col-span-4 xl:col-start-9">
            <ReasonCard className="lg:sticky lg:top-[calc(var(--dn-header-h)+24px)]" />
          </div>
          <div className="dn-settle relative aspect-[4/3] overflow-hidden rounded-[24px] shadow-[var(--dn-shadow-2)] sm:aspect-[16/9] lg:col-span-7 lg:row-start-2 lg:aspect-[16/8] xl:col-span-8">
            <DemoPhoto src={photo} ratio="auto" priority sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw" className="h-full w-full" />
          </div>
        </div>
      </Shell>
    );
  }

  /* clinical-split */
  return (
    <Shell variant={variant} family="clinical" className="overflow-hidden bg-[hsl(var(--ds-hero-bg))] text-[hsl(var(--ds-hero-ink))]">
      <div className={`${wrap} grid items-center gap-12 pb-16 pt-8 sm:pt-12 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-16`}>
        <div className="lg:col-span-6">
          <HeroPill tone="clinical" />
          <HeroTitle className="max-w-[16ch] text-[clamp(2.25rem,1.4rem+3.4vw,4rem)]" />
          <HeroLead className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[hsl(var(--ds-hero-soft))]" />
          <HeroCtas tone="clinical" />
          <ClinicalStats />
        </div>
        <div className="relative mx-2 sm:mx-6 lg:col-span-6 lg:mx-0 lg:ml-8">
          <div aria-hidden="true" className="dn-blob -right-6 -top-6 h-[90%] w-[92%] sm:-right-10 sm:-top-8" />
          <div className="dn-settle relative aspect-[4/3] overflow-hidden rounded-[24px] shadow-[var(--dn-shadow-2)] sm:aspect-[5/4] lg:aspect-[4/5]">
            <DemoPhoto src={photo} ratio="auto" priority sizes="(min-width: 1024px) 1120px, 100vw" className="h-full w-full" />
          </div>
          <NextSlotCard className="absolute -left-2 top-4 sm:-left-6 sm:top-8" />
          <RatingChip className="absolute -bottom-5 -right-2 hidden sm:-right-5 sm:bottom-10 sm:flex" />
        </div>
      </div>
    </Shell>
  );
}

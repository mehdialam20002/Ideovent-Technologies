/**
 * HomePage: /. HOME builder, 28 Sep 2026. Spec: DENTAL-IA.md s8 (per
 * template), DENTAL-DESIGN.md s3-6. Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 *
 * The order comes from the family and the variant, and each section renders
 * only when the record has its data, never from the template id: a
 * duplicate of d3 edited into a family clinic still reads sensibly.
 *
 *   luxury    hero > smile journey > signature treatments > before-after >
 *             the dentist > studio band > technology (3 columns) > reviews
 *             (one quote at a time) > fees + EMI > international > band
 *   clinical  hero > quick actions / problem picker > [compare] > [journey] >
 *             team > treatments > sterilisation (navy) > technology >
 *             before-after > reviews > fees > emergency > how to reach >
 *             [guides] > FAQ > band
 *   kids      hero > first visit > age bands > the pedodontist > rooms >
 *             comfort > parent reviews > first aid > FAQ > band
 *   calm      hero > branches (chains) or who this is for > compare /
 *             problem picker > candidate checklist (teal band) > journey
 *             (teal band) > specialties > surgeon or team > technology (dark)
 *             > before-after > reviews > fees + plans > corporate >
 *             international > FAQ > band
 */

import type { ReactNode } from "react";
import type { SitePageProps } from "@/lib/demo/site/context";
import { DentalHero, dentalOf } from "@/lib/demo/ui/dental";
import { H } from "./home/copy";
import { QuickActions, SignatureTreatments, Specialties, TreatmentsSection } from "./home/care";
import { DoctorFeature, TeamSection } from "./home/people";
import {
  AgeBandsSection, BranchesSection, ComfortSection, ComparisonSection, FirstAidSection, FirstVisitSection, GuidesSection, RoomsSection,
} from "./home/special";
import { CasesSection, JourneySection, ReviewsSection, SterilisationSection, TechSection } from "./home/trust";
import {
  BookingBandHome, EmergencySection, FaqSection, FeesSection, InternationalBand, PlansSection, PointsSection, ReachSection, StudioBand,
} from "./home/visit";

export default function HomePage({ site, ctx }: SitePageProps) {
  const d = dentalOf(site);
  const { family, variant } = ctx;
  const chain = (d.branches || []).filter((b) => b.name).length >= 2;
  const doctors = (d.doctors || []).filter((x) => x.name).length;
  let body: ReactNode;

  if (family === "luxury") {
    body = (
      <>
        <JourneySection />
        <SignatureTreatments />
        <CasesSection tone="tint" />
        <DoctorFeature eyebrow={H.dentistEyebrow} />
        <StudioBand />
        <TechSection />
        <ReviewsSection tone="tint" />
        <FeesSection />
        <InternationalBand />
      </>
    );
  } else if (family === "calm") {
    body = (
      <>
        {chain ? <BranchesSection /> : <PointsSection points={d.audience} eyebrow={H.audienceEyebrow} title={H.audienceTitle} />}
        {d.comparison ? <ComparisonSection tone="tint" /> : <QuickActions tone="tint" />}
        <PointsSection points={d.candidate} eyebrow={H.candidateEyebrow} title={H.candidateTitle} lead={H.candidateNote} tone="band" numbered />
        <JourneySection />
        <Specialties />
        {chain || doctors > 2 ? <TeamSection /> : <DoctorFeature eyebrow={H.surgeonEyebrow} />}
        {chain && <PointsSection points={d.trust} eyebrow={H.standardEyebrow} title={H.standardTitle} tone="tint" />}
        <TechSection />
        <CasesSection />
        <ReviewsSection />
        <FeesSection />
        {chain && <PlansSection />}
        <PointsSection points={d.corporate} eyebrow={H.corporateEyebrow} title={H.corporateTitle} />
        <InternationalBand />
        <FaqSection />
      </>
    );
  } else if (variant === "c") {
    body = (
      <>
        <FirstVisitSection />
        <AgeBandsSection />
        <DoctorFeature eyebrow={H.kidsDentistEyebrow} tone="plain" />
        <RoomsSection />
        <ComfortSection />
        <ReviewsSection tone="plain" parents />
        <FirstAidSection />
        <FaqSection tone="tint" />
      </>
    );
  } else {
    body = (
      <>
        <QuickActions title={d.comparison ? H.problemTitle : H.quickTitle} />
        <ComparisonSection tone="tint" />
        <JourneySection />
        <Specialties tone="tint" />
        <TeamSection tone={d.comparison ? "plain" : "tint"} />
        <TreatmentsSection tone={d.comparison ? "tint" : "plain"} />
        <SterilisationSection />
        <TechSection />
        <CasesSection tone="tint" />
        <ReviewsSection />
        <FeesSection />
        <EmergencySection />
        <ReachSection tone="tint" />
        <GuidesSection />
        <FaqSection />
      </>
    );
  }

  return (
    <>
      <DentalHero />
      {body}
      <BookingBandHome />
    </>
  );
}

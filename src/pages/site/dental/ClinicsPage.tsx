/**
 * ClinicsPage: /clinics. Find a clinic first (d7): a lead line, then one card
 * per branch (photo, open status, address, landmark, hours, Book here, Clinic
 * details). Cards come from the kit's BranchCard. Spec: DENTAL-IA.md d7. Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import type { SitePageProps } from "@/lib/demo/site/context";
import { tr, withText } from "@/lib/demo/site/bilingual";
import { H } from "./home/copy";
import { BranchCard, BookingBand, DPageHead, DSection, dentalOf } from "@/lib/demo/ui/dental";

export default function ClinicsPage({ site, ctx }: SitePageProps) {
  const list = withText(dentalOf(site).branches, "name");
  return (
    <>
      <DPageHead title={tr(ctx.page.label, ctx.lang)} lead={tr(H.bandChain, ctx.lang)} />
      <DSection><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((b) => <BranchCard key={b.slug} branch={b} />)}</div></DSection>
      <BookingBand />
    </>
  );
}

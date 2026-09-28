/**
 * InternationalPage: /international. STUB (architecture pass, 28 Sep 2026): composes the
 * dental kit so the preview renders; the page builder (PAGES-B builder) replaces
 * the body. Spec: DENTAL-IA.md s2 tourism folded in (d3, d4). Contract: E:/myagency/_assets/DENTAL-ARCHITECTURE.md.
 */

import type { SitePageProps } from "@/lib/demo/site/context";
import { bi, tr } from "@/lib/demo/site/bilingual";
import type { Bilingual } from "@/lib/demo/site/bilingual";
import { BookingBand, DPageHead, DSection, StepList, dentalOf } from "@/lib/demo/ui/dental";

const T = {
  how: { en: "How it works from abroad", hi: "विदेश से यह कैसे होता है" },
  stay: { en: "How long to plan your stay", hi: "कितने दिन रुकने की योजना बनाएँ" },
} as const satisfies Record<string, Bilingual>;

export default function InternationalPage({ site, ctx }: SitePageProps) {
  const x = dentalOf(site).international;
  return (
    <>
      <DPageHead title={tr(ctx.page.label, ctx.lang)} lead={bi(x, "intro", ctx.lang)} />
      <DSection title={tr(T.how, ctx.lang)}><StepList steps={x?.steps} /></DSection>
      {(x?.stays || []).length > 0 && <DSection tone="tint" title={tr(T.stay, ctx.lang)}><StepList steps={x?.stays} /></DSection>}
      <BookingBand />
    </>
  );
}

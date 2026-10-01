import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { ONE_TIME, PLANS, SEO, inr, monthlyLine, termLine } from "@/lib/pricing";
import { unbreakable } from "@/lib/typography";
import { CHOICES, type Choice } from "./pricing/choice";
import { pricingSchema } from "./pricing/schema";
import MonthlyPlans from "./pricing/MonthlyPlans";
import PlanTerms from "./pricing/PlanTerms";
import StartPlan from "./pricing/StartPlan";
import Compare from "./pricing/Compare";
import OneTime from "./pricing/OneTime";
import CarePlans from "./pricing/CarePlans";
import SeoAbroad from "./pricing/SeoAbroad";
import Included from "./pricing/Included";
import PricingFaq from "./pricing/PricingFaq";
import Policies from "./pricing/Policies";
import { btnOutline, btnPrimary, whatsappHref } from "./pricing/styles";

/**
 * /pricing, rebuilt 1 Oct 2026 for the monthly plans (Mehdi: "pricing ye jo
 * discuss huyi ye daal do ache se, best i want, and paisa Razorpay se lunga").
 *
 * Order: the two monthly plans first, their terms in plain words, the start
 * step, monthly against one-time, the one-time packages exactly as FACTS.md
 * has them, care plans, the SEO add-on and the USD table, the one-time fine
 * print, questions, and who you pay with the policies Razorpay checks for.
 *
 * EVERY FIGURE COMES FROM src/lib/pricing.ts. Nothing on this page types a price.
 * The look follows the 1 Oct brief against the "AI template" kit: no aurora,
 * no grid, no eyebrow pills, no gradient words, no glow, no fade-in on the h1.
 */
const TITLE = "Website Price in India: Monthly Plans & Packages";
const s = PLANS.starter;
const DESCRIPTION =
  `Website from ${inr(s.monthly)}/month + ${inr(s.setup)} setup (${termLine(s)}) or ${inr(ONE_TIME.landing.min)} one-time. ` +
  `Portals from ${inr(ONE_TIME.portal.min)}, software from ${inr(ONE_TIME.software.min)}, local SEO from ${inr(SEO.indiaFrom)}/month.`;

function initialChoice(search: string): Choice {
  const want = new URLSearchParams(search).get("plan");
  return CHOICES.find((c) => c === want) ?? "starter-monthly";
}

export default function Pricing() {
  const contact = useSingleton("contact");
  const location = useLocation();
  const navigate = useNavigate();
  const [choice, setChoice] = useState<Choice>(() => initialChoice(location.search));

  /* A plan button picks the plan and takes the visitor to the start step.
     The hash change goes through ScrollToTop, which scrolls to #start (with
     scroll-margin for the fixed header) on every click, not only the first. */
  const start = useCallback(
    (c: Choice) => {
      setChoice(c);
      navigate({ search: location.search, hash: "#start" }, { replace: true });
      window.setTimeout(() => document.getElementById("start")?.focus({ preventScroll: true }), 80);
    },
    [navigate, location.search],
  );

  const questionWa = whatsappHref(contact.whatsappNumber, "Hello Ideovent, I have a question about your website prices.");

  return (
    <Layout>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/pricing"
        keywords={[
          "website price in India",
          "website on monthly plan",
          "website design charges Delhi",
          "website development cost India",
          "local SEO price per month India",
        ]}
        breadcrumbs={[{ name: "Pricing", path: "/pricing" }]}
        schema={pricingSchema()}
      />

      <MonthlyPlans onStart={start} whatsapp={questionWa} />
      <PlanTerms />
      <StartPlan
        choice={choice}
        onChoose={setChoice}
        whatsappNumber={contact.whatsappNumber}
        phoneHref={contact.phoneHref}
        phoneDisplay={contact.phoneDisplay}
      />
      <Compare />
      <OneTime />
      <CarePlans />
      <SeoAbroad />
      <Included />
      <PricingFaq />
      <Policies />

      {/* Closing band: a gold rule and two buttons, not a second boxed CTA (the
          footer already renders one directly below on every route). */}
      <section className="pb-16 pt-6 md:pb-20 lg:pb-24" aria-labelledby="pricing-close-heading">
        <div className="container-page">
          <div className="rule-gold grid gap-6 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-12">
            <div>
              <h2 id="pricing-close-heading" className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                Start small, or buy it outright
              </h2>
              <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
                Starter is {unbreakable(monthlyLine(s))}, {termLine(s)}. Or tell us what you need and get a written quote.{" "}
                {contact.responseTimePromise || ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end md:pb-1">
              <button type="button" className={btnPrimary} onClick={() => start("starter-monthly")}>
                Start with {inr(s.monthly)}/month
              </button>
              {questionWa && (
                <a className={btnOutline} href={questionWa} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Talk to us on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

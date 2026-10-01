import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton, useCollection, useCms } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Aurora } from "@/components/ui/aurora";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/Reveal";
import FaqSection from "@/components/sections/FaqSection";
import SpecimenCertificate from "@/components/certificate/SpecimenCertificate";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { liveEmail } from "@/lib/mailbox";
import { Honeypot } from "@/components/lead/fields";
// This page is a lazy route, so the delivery half of the lead pipeline can be
// imported directly; EmailJS itself still loads only when Send is pressed.
import {
  APPLICATION_LIMITS,
  normalisePhone,
  submitApplication,
  type LeadResult,
} from "@/lib/leads";

/**
 * /internship. Ideovent LaunchPad.
 *
 * Rewritten against 13-launchpad/LAUNCHPAD-MARKETING.md and PROGRAMME-DESIGN.md.
 * Four things here are load-bearing and must not be softened back:
 *
 *   1. NO JOB AND NO PLACEMENT IS PROMISED, anywhere, at any score. The
 *      "what this is not" panel is on the page, not in a footnote. The page
 *      previously sold "Placement assistance, top performers may receive job
 *      offers"; Ideovent has no placement function, so the words described a
 *      service that does not exist.
 *   2. EXACTLY TWO certificates have ever been issued. They are named, linked
 *      to the live verification page, and the small number is presented as the
 *      reason the certificate is worth anything: not apologised for.
 *   3. NOTHING IS PAYABLE ON APPLYING. The fee is raised only after a place has
 *      been offered in writing. The old flow put "Pay & register" beside the
 *      form and "Complete payment" on the success screen, which takes money
 *      from people who will be rejected.
 *   4. The batch label renders only when `internship.batchLabel` is set, and it
 *      ships blank. "Next batch enrolling now" is false between batches.
 *
 * The application form sends the same fields as the same `applications`
 * record, so the admin screen and the Supabase RLS policy (anonymous insert,
 * no read) are untouched. Since 26 Sep 2026 it sends them through
 * submitApplication() in src/lib/leads.ts (EmailJS, plus a plain INSERT when
 * Supabase is on) and shows "Application received" ONLY when one of those
 * reached us. Before that it wrote to the applicant's own localStorage and
 * said "received" regardless, so every application went nowhere.
 */

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  stream: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  college: "",
  stream: "",
  notes: "",
};

/** Splits a title so the last clause can take the accent-italic gradient. */
function accentTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) return { lead: "", accent: title };
  return { lead: words.slice(0, -3).join(" "), accent: words.slice(-3).join(" ") };
}

export default function Internship() {
  const internship = useSingleton("internship");
  const contact = useSingleton("contact");
  const certificates = useCollection("certificates");
  const { actions } = useCms();

  const formRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [result, setResult] = useState<LeadResult | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(Date.now());
  const failRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const { lead, accent } = accentTitle(internship.title);
  const whatsappNumber = (contact.whatsappNumber || "").replace(/\D/g, "");
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}`: "";
  const email = liveEmail(contact);

  /* The failure path's WhatsApp link, with the application already written in,
     so an applicant whose form did not send does not type it all again. Only
     what they typed goes in. */
  const whatsappApplication = (() => {
    if (!whatsappNumber) return "";
    const parts = ["Hello Ideovent, I would like to apply for the LaunchPad internship."];
    if (form.fullName.trim()) parts.push(`My name is ${form.fullName.trim()}.`);
    if (form.college.trim() || form.stream.trim()) {
      parts.push(`I study ${[form.stream.trim(), form.college.trim()].filter(Boolean).join(" at ")}.`);
    }
    if (form.email.trim()) parts.push(`Email: ${form.email.trim()}.`);
    if (form.notes.trim()) parts.push(form.notes.trim().slice(0, 600));
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(parts.join(" "))}`;
  })();

  /* Only certificates that actually exist in the CMS are linked. An ID listed in
     `certifiedIds` with no matching record would 404 on the one page whose whole
     purpose is to look trustworthy, so the list is intersected, never trusted. */
  const issued = (internship.certifiedIds || [])
.map((id) => certificates.find((c) => c.certificateId === id))
.filter(Boolean) as typeof certificates;

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const setField =
    (key: keyof FormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({...prev, [key]: ev.target.value }));
      setErrors((prev) => ({...prev, [key]: undefined }));
    };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    // The same phone rule as the enquiry forms, so the e-mail carries a
    // number Mehdi can reply to on WhatsApp in one tap.
    const phone = normalisePhone(form.phone);
    if ("error" in phone) e.phone = phone.error;
    if (!form.college.trim()) e.college = "College / institute is required";
    if (!form.stream.trim()) e.stream = "Stream / branch is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    const r = await submitApplication(form, {
      startedAt: startedAt.current,
      honeypot,
      // Local mode only, and only as a record for /admin on this machine. It
      // is never counted as delivery: the applicant's browser is not our inbox.
      saveLocal: (doc) => actions.saveDoc("applications", doc),
    });
    setResult(r);
    if (!r.delivered) {
      // Keep everything they typed. Retyping an application because our form
      // failed is our mistake charged to them.
      setStatus("error");
      requestAnimationFrame(() => failRef.current?.focus());
      return;
    }
    setStatus("done");
    requestAnimationFrame(() => doneRef.current?.focus());
  };

  /*
    `outline-none` is a real class, so it beats the zero-specificity :where()
    focus rule in index.css, and Tailwind implements it as
    `outline: 2px solid transparent` rather than `outline: none`. Measured in
    Chrome with the field keyboard-focused, before this line changed: outline
    2px, colour rgba(0, 0, 0, 0), box-shadow none. The whole application form,
    six fields, signalled focus with a 1px border colour change and nothing
    else, which is WCAG 2.4.7 failed on the one form on this site that a
    candidate has to fill in from top to bottom.

    The same trap was already fixed on the contact form and on the CMS fields;
    this form was missed. The ring is the site's --ring (gold in both themes,
    4.55:1 light / 7.77:1 dark against the page) and the offset is what lifts it
    clear of the 2px border underneath.
  */
  const inputClass = (invalid?: string) =>
    cn(
      "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors",
      "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      invalid ? "border-destructive": "border-input"
);

  return (
    <Layout>
      {/* Title and description: src/lib/seo/pages.ts (PAGE_SEO["/internship"]). */}
      <Seo
        path="/internship"
        breadcrumbs={[{ name: "Internship", path: "/internship" }]}
        /* Course, because that is what this is: a structured 12-week training
         * programme with a published curriculum and a published rubric.
         *
         * Three things are deliberately NOT in this node:
         *   • `hasCourseInstance`. Google wants a courseMode and a workload on
         *     it, and the weekly-hours figure and the next batch date are both
         *     still undecided (13-launchpad blanks WEEKLY_HOURS and
         *     BATCH_START_DATE). A richer result is not worth inventing them.
         *   • `offers`: the programme fee is undecided, and the ₹799 on this
         *     page is a seat-confirmation fee raised only after an offer, not a
         *     price of admission. Marking it up as the price would misstate it.
         *   • `aggregateRating` / `review`, nobody has reviewed this.
         *
         * `occupationalCredentialAwarded` is safe to state because the
         * certificate genuinely exists, is issued only on passing, and can be
         * checked by anyone at /verify. */
        schema={{
          "@type": "Course",
          name: "Ideovent LaunchPad. Web Development Internship",
          description:
            "A 12-week structured web development training programme run by the partners of Ideovent Technologies. Four blocks, foundations, React and UI, full-stack, and a reviewed capstone, assessed against a published 100-mark rubric. It is training, not employment: there is no salary, no placement service and no job promised at any point.",
          url: "/internship",
          inLanguage: "en-IN",
          timeRequired: "P12W",
          educationalLevel: "Beginner to intermediate; JavaScript required before week 1",
          teaches: [
            "Git and pull-request workflow",
            "Semantic HTML, CSS layout and accessibility basics",
            "JavaScript and TypeScript for interfaces",
            "React, hooks and data fetching",
            "REST APIs, Postgres and Supabase",
            "Authentication, environment secrets and deployment",
          ],
          occupationalCredentialAwarded: {
            "@type": "EducationalOccupationalCredential",
            name: "Ideovent LaunchPad Certificate of Completion",
            credentialCategory: "Certificate of completion",
            description:
              "Issued only on passing the published 100-mark rubric, and carries a unique ID and QR code that resolve on www.ideovent.in/verify. Two have been issued since 2024.",
          },
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <Reveal>
                <Eyebrow>{internship.eyebrow}</Eyebrow>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="mt-6 text-balance text-display font-display font-semibold">
                  {lead && <>{lead} </>}
                  <span className="accent-italic text-gradient">{accent}</span>
                </h1>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
                  {internship.subtitle}
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-[color,background-color,transform] duration-200 hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] motion-reduce:active:scale-100"
                  >
                    Apply. It costs nothing
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {issued.length > 0 && (
                    <Link
                      to={`/verify/${issued[issued.length - 1].certificateId}`}
                      className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Try the verification first
                    </Link>
)}
                  {/* Renders only while a batch is genuinely open. */}
                  {internship.batchLabel && (
                    <span className="inline-flex items-center text-sm font-medium text-foreground">
                      {internship.batchLabel}
                    </span>
)}
                </div>
              </Reveal>
            </div>

            {/*
              THIS USED TO BE A REAL PERSON'S CERTIFICATE.

              `internship.certificatePreviewImage` (public/certificates/preview.webp)
              is a crop of Ankit Kumar's ACTUAL certificate. His name, his dates,
              his internship number, Abhishek Tiwari's handwritten signature at
              legible resolution, and an MSME emblem that FACTS.md records as
              unconfirmed. It was the hero image of the page selling the programme.

              It is now a SPECIMEN rendered from the real template, with an
              obviously fictional name and a QR that resolves to the verification
              search page rather than to anybody's record. A prospective applicant
              sees exactly the document they would receive; no named individual's
              credential is the advertisement. See SpecimenCertificate.tsx.

              The CMS field is kept. It is still wired in /admin, and the live
              certificates it points at are still shown lower down the page under
              "Check one yourself", where they are evidence rather than decoration.
            */}
            <Reveal delay={0.15}>
              <div className="relative mx-auto max-w-md lg:ml-auto">
                {/* Flat since 1 Oct 2026: no blurred glow behind it, no tilt,
                    no heavy shadow (the generated-page kit, hero brief). */}
                <div className="rounded-2xl border border-border bg-card p-3">
                  <SpecimenCertificate />
                </div>
                {/* whitespace-nowrap: at 375px this caption wrapped onto two
                    lines, which made the pill tall enough to climb back over
                    the certificate and sit on the QR code: the one part of
                    the image the caption is pointing at. One line fits in
                    343px with room to spare. */}
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  QR-verifiable certificate
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── The two certificates that exist ─────────────────────────────── */}
      {issued.length > 0 && (
        <section className="pb-4">
          <div className="container-page">
            <Reveal>
              <div className="rounded-3xl border border-border bg-card/50 p-8 md:p-10">
                <Eyebrow>Check one yourself</Eyebrow>
                <h2 className="mt-4 font-display text-xl font-semibold md:text-2xl">
                  Every certificate we have ever issued,{" "}
                  <span className="accent-italic text-gradient">listed and linked</span>
                </h2>
                {internship.certifiedNote && (
                  <p className="mt-4 max-w-3xl text-sm text-muted-foreground text-pretty">
                    {internship.certifiedNote}
                  </p>
)}
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {issued.map((c) => (
                    <li key={c.certificateId}>
                      <Link
                        to={`/verify/${c.certificateId}`}
                        className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-5 py-4 transition-colors hover:border-primary/50"
                      >
                        <span>
                          <span className="block font-display text-base font-semibold">
                            {c.internName}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {c.certificateId} · {c.duration}
                          </span>
                        </span>
                        <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
                      </Link>
                    </li>
))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
)}

      {/* ── What you get ─────────────────────────────────────────────────── */}
      {internship.benefits?.length > 0 && (
        <section className="section relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="What you get"
              title={
                <>
                  Twelve weeks of being{" "}
                  <span className="accent-italic text-gradient">corrected properly</span>
                </>
              }
              subtitle="Not a recorded course and not a queue of tickets. A curriculum, a reviewer who reads your code, and proof at the end that somebody can check."
            />

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {internship.benefits.map((benefit) => {
                const Icon = getIcon(benefit.icon);
                return (
                  <motion.div key={benefit.title} variants={fadeUp} className="card-surface p-7">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold">{benefit.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground text-pretty">
                      {benefit.description}
                    </p>
                  </motion.div>
);
              })}
            </motion.div>
          </div>
        </section>
)}

      {/* ── What this is not ─────────────────────────────────────────────── */}
      {internship.notPromised?.length ? (
        <section className="section pt-0">
          <div className="container-page">
            <Reveal>
              <div className="rounded-[2rem] border border-primary/40 bg-primary/5 p-8 md:p-12">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  <ShieldAlert className="h-4 w-4" />
                  Read this before you apply
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
                  {internship.notPromisedHeading || "What this is not"}
                </h2>
                <ul className="mt-7 grid gap-4 md:grid-cols-2">
                  {internship.notPromised.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span className="text-sm text-foreground/85 text-pretty">{item}</span>
                    </li>
))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
): null}

      {/* ── Curriculum ───────────────────────────────────────────────────── */}
      {internship.curriculum?.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="The curriculum"
              title={
                <>
                  Four blocks, twelve{" "}
                  <span className="accent-italic text-gradient">weeks</span>
                </>
              }
              subtitle="Every week has one theme and one thing you ship. Nothing you build touches a client’s live database or a client’s personal data."
            />

            <div className="relative mx-auto mt-14 max-w-3xl">
              <div aria-hidden className="absolute bottom-0 left-4 top-0 w-px bg-border md:left-6" />
              <div className="space-y-8">
                {internship.curriculum.map((step, i) => (
                  <Reveal key={`${step.week}-${i}`} amount={0.3}>
                    <div className="relative pl-14 md:pl-20">
                      <span
                        aria-hidden
                        className="absolute left-4 top-6 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background font-display text-sm font-semibold text-primary md:left-6"
                      >
                        {i + 1}
                      </span>
                      <div className="card-surface p-6">
                        <span className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          {step.week}
                        </span>
                        <h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground text-pretty">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
))}
              </div>
            </div>
          </div>
        </section>
)}

      {/* ── The five artefacts ───────────────────────────────────────────── */}
      {internship.artefacts?.length ? (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="What you walk away with"
              title={
                <>
                  Five things you can{" "}
                  <span className="accent-italic text-gradient">show a recruiter</span>
                </>
              }
              subtitle="This is the honest answer to “what do I get out of it”, and you are told in week 1 which of them is yours."
            />

            <Reveal className="mt-12">
              <div className="overflow-hidden rounded-3xl border border-border bg-card/50">
                <ol className="divide-y divide-border/70">
                  {internship.artefacts.map((a, i) => (
                    <li
                      key={a.title}
                      className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-start sm:gap-6 md:px-8"
                    >
                      <span className="font-display text-sm font-semibold text-primary sm:w-8 sm:shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">
                        <span className="block font-display text-base font-semibold">{a.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground text-pretty">
                          {a.description}
                        </span>
                      </span>
                      <span className="shrink-0 self-start rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {a.ownership}
                      </span>
                    </li>
))}
                </ol>
              </div>
            </Reveal>
          </div>
        </section>
): null}

      {/* ── The rubric ───────────────────────────────────────────────────── */}
      {internship.rubric?.length ? (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="How you are assessed"
              title={
                <>
                  One hundred marks, published in{" "}
                  <span className="accent-italic text-gradient">week one</span>
                </>
              }
              subtitle="An assessment nobody can see in advance is not an assessment. You always know where you stand."
            />

            <Reveal className="mt-12">
              <div className="overflow-x-auto rounded-3xl border border-border bg-card/50">
                <table className="w-full min-w-[40rem] border-collapse text-sm">
                  <caption className="sr-only">
                    The Ideovent LaunchPad assessment rubric, 100 marks across six components
                  </caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="px-6 py-4 text-left font-display text-sm font-semibold">
                        Component
                      </th>
                      <th scope="col" className="px-4 py-4 text-left font-display text-sm font-semibold">
                        Marks
                      </th>
                      <th scope="col" className="px-6 py-4 text-left font-display text-sm font-semibold">
                        Evidence used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {internship.rubric.map((r, i) => (
                      <tr
                        key={r.component}
                        className={cn(
                          "border-b border-border/50 last:border-b-0",
                          i % 2 === 1 && "bg-muted/20"
)}
                      >
                        <th scope="row" className="px-6 py-3 text-left font-medium">
                          {r.component}
                        </th>
                        <td className="px-4 py-3 font-display text-base font-semibold text-primary">
                          {r.marks}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground text-pretty">{r.evidence}</td>
                      </tr>
))}
                    <tr className="bg-muted/40">
                      <th scope="row" className="px-6 py-3 text-left font-display font-semibold">
                        Total
                      </th>
                      <td className="px-4 py-3 font-display text-base font-semibold text-primary">
                        100
                      </td>
                      <td className="px-6 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </Reveal>

            {internship.rubricNote && (
              <Reveal delay={0.05}>
                <p className="mt-6 max-w-3xl text-sm text-muted-foreground text-pretty">
                  {internship.rubricNote}
                </p>
              </Reveal>
)}
          </div>
        </section>
): null}

      {/* ── Who mentors you ──────────────────────────────────────────────── */}
      {internship.mentors?.length ? (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Who reviews your code"
              title={
                <>
                  Named, so you know who is{" "}
                  <span className="accent-italic text-gradient">reading it</span>
                </>
              }
              subtitle="Ideovent Technologies is a partnership firm founded in 2024, based in Saket, New Delhi, building websites, web apps and software for growing businesses."
            />

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              {internship.mentors.map((m) => (
                <motion.div key={m.name} variants={fadeUp} className="card-surface p-7">
                  {/* Initials, never a photograph. */}
                  <span
                    aria-hidden
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted font-display text-lg font-semibold text-foreground/70"
                  >
                    {m.name
.split(/\s+/)
.slice(0, 2)
.map((w) => w[0])
.join("")
.toUpperCase()}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold">{m.name}</h3>
                  <p className="mt-0.5 text-sm font-medium text-primary">{m.role}</p>
                  <p className="mt-3 text-sm text-muted-foreground text-pretty">{m.responsibility}</p>
                </motion.div>
))}
            </motion.div>
          </div>
        </section>
): null}

      {/* ── How selection works ──────────────────────────────────────────── */}
      {internship.selection?.length ? (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="How selection works"
              title={
                <>
                  Read by a partner, not by a{" "}
                  <span className="accent-italic text-gradient">filter</span>
                </>
              }
              subtitle="Five steps, and money enters the conversation only at the last one."
            />

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5"
            >
              {internship.selection.map((s) => (
                <motion.div key={s.step} variants={fadeUp} className="card-surface p-6">
                  <span className="font-display text-sm font-semibold tracking-[0.18em] text-primary">
                    {s.step}
                  </span>
                  <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">{s.description}</p>
                </motion.div>
))}
            </motion.div>
          </div>
        </section>
): null}

      {/* ── Terms ────────────────────────────────────────────────────────── */}
      {internship.terms?.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <Reveal>
              <div className="rounded-[2rem] border border-border bg-card/50 p-8 md:p-12">
                <h2 className="font-display text-2xl font-semibold">
                  Terms & <span className="accent-italic text-gradient">good faith</span>
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  A few clear commitments so everyone knows exactly where they stand.
                </p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {internship.terms.map((term, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground text-pretty">{term}</span>
                    </li>
))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
)}

      {/* ── Apply ────────────────────────────────────────────────────────── */}
      <section id="apply" ref={formRef} className="section relative overflow-hidden scroll-mt-24 pt-0">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page">
          <SectionHeading
            align="left"
            eyebrow="Apply"
            title={
              <>
                Applying costs nothing and commits you to{" "}
                <span className="accent-italic text-gradient">nothing</span>
              </>
            }
            subtitle="Send us your details and your GitHub. A partner reads every application and answers either way."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Left, what happens next, and where the fee sits */}
            <Reveal>
              <div className="space-y-6">
                {internship.checklist?.length > 0 && (
                  <div className="card-surface p-8">
                    <h3 className="font-display text-lg font-semibold">What happens next</h3>
                    <ol className="mt-6 space-y-4">
                      {internship.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground text-pretty">{item}</span>
                        </li>
))}
                    </ol>
                  </div>
)}

                {/* The fee is described, not collected. The payment link is NOT
                    a call to action on this page, nobody should be able to pay
                    before a place has been offered to them in writing. */}
                <div className="rounded-[2rem] border border-border bg-card/50 p-8">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {internship.pricing.label}
                  </div>
                  <div className="mt-2 font-display text-4xl font-semibold text-foreground">
                    {internship.pricing.amount}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{internship.pricing.note}</div>
                  {internship.feeGate && (
                    <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground text-pretty">
                      {internship.feeGate}
                    </p>
)}
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Ask a question on WhatsApp
                    </a>
)}
                </div>
              </div>
            </Reveal>

            {/* Right: the application form */}
            <Reveal delay={0.1}>
              <div className="card-surface p-6 md:p-8">
                {status === "done" ? (
                  <div className="flex h-full min-h-[26rem] flex-col items-center justify-center text-center">
                    <CheckCircle2 className="h-14 w-14 text-primary" />
                    <h3 ref={doneRef} tabIndex={-1} className="mt-4 font-display text-2xl font-semibold focus:outline-none">
                      Application received
                    </h3>
                    <p className="mt-3 max-w-sm text-muted-foreground text-pretty">
                      Thanks, {form.fullName.split(" ")[0] || "there"}. A partner reads every
                      application personally and you will hear from us either way. Nothing is
                      payable now, and nothing will be until a place has been offered to you in
                      writing.
                    </p>
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                      {issued.length > 0 && (
                        <CtaButton
                          cta={{
                            label: "Meanwhile, try the verification",
                            href: `/verify/${issued[issued.length - 1].certificateId}`,
                            variant: "outline",
                          }}
                        />
)}
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Ask a question
                        </a>
)}
                    </div>
                    <button
                      onClick={() => {
                        setForm(EMPTY_FORM);
                        setStatus("idle");
                        startedAt.current = Date.now();
                      }}
                      className="link-underline mt-6 text-sm font-medium text-primary"
                    >
                      Submit another application
                    </button>
                  </div>
): (
                  <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
                    <div>
                      <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
                        Full name <span className="text-primary">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(errors.fullName)}
                        value={form.fullName}
                        onChange={setField("fullName")}
                        maxLength={APPLICATION_LIMITS.fullName}
                        placeholder="Your full name"
                        className={inputClass(errors.fullName)}
                      />
                      {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                          Email <span className="text-primary">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          aria-required="true"
                          aria-invalid={Boolean(errors.email)}
                          value={form.email}
                          onChange={setField("email")}
                          maxLength={APPLICATION_LIMITS.email}
                          placeholder="you@email.com"
                          className={inputClass(errors.email)}
                        />
                        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                      </div>
                      <div>
                        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                          Phone <span className="text-primary">*</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          required
                          aria-required="true"
                          aria-invalid={Boolean(errors.phone)}
                          value={form.phone}
                          onChange={setField("phone")}
                          maxLength={APPLICATION_LIMITS.phone}
                          placeholder="10-digit mobile"
                          className={inputClass(errors.phone)}
                        />
                        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="college" className="mb-1.5 block text-sm font-medium">
                          College / institute <span className="text-primary">*</span>
                        </label>
                        <input
                          id="college"
                          type="text"
                          required
                          aria-required="true"
                          aria-invalid={Boolean(errors.college)}
                          value={form.college}
                          onChange={setField("college")}
                          maxLength={APPLICATION_LIMITS.college}
                          placeholder="Your college name"
                          className={inputClass(errors.college)}
                        />
                        {errors.college && <p className="mt-1 text-xs text-destructive">{errors.college}</p>}
                      </div>
                      <div>
                        <label htmlFor="stream" className="mb-1.5 block text-sm font-medium">
                          Stream / branch <span className="text-primary">*</span>
                        </label>
                        <input
                          id="stream"
                          type="text"
                          required
                          aria-required="true"
                          aria-invalid={Boolean(errors.stream)}
                          value={form.stream}
                          onChange={setField("stream")}
                          maxLength={APPLICATION_LIMITS.stream}
                          placeholder="e.g. B.Tech, CSE"
                          className={inputClass(errors.stream)}
                        />
                        {errors.stream && <p className="mt-1 text-xs text-destructive">{errors.stream}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                        Your GitHub, and anything else{" "}
                        <span className="text-muted-foreground">(optional, but read first)</span>
                      </label>
                      <textarea
                        id="notes"
                        rows={4}
                        value={form.notes}
                        onChange={setField("notes")}
                        maxLength={APPLICATION_LIMITS.notes}
                        placeholder="Your GitHub link, hours a week you can give, one thing you have built…"
                        className={cn("w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors", "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background")}
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        A GitHub account with at least one repository you actually wrote is the
                        strongest thing you can put here. Links only: this form cannot take a
                        file, so share a resume as a Google Drive or GitHub link.
                      </p>
                    </div>

                    <Honeypot idPrefix="apply" value={honeypot} onChange={setHoneypot} />

                    {/* Shown on anything short of delivery. Everything typed stays
                        in the form, and WhatsApp carries it with one tap. */}
                    {status === "error" && (
                      <div
                        ref={failRef}
                        tabIndex={-1}
                        role="alert"
                        className="rounded-2xl bg-destructive/10 p-4 focus:outline-none"
                      >
                        <span className="block text-sm font-medium text-destructive">
                          {result?.blocked === "too-fast"
                            ? "That was sent faster than anyone can type, so it was held back. Please press the button again."
                            : "Your application did not send. The fault is at our end."}
                        </span>
                        <span className="mt-1.5 block text-sm text-muted-foreground text-pretty">
                          Everything you typed is still in the form. The quickest way through is
                          WhatsApp, with your application already written in.
                        </span>
                        {whatsappApplication && (
                          <a
                            href={whatsappApplication}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="link-underline mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            Send it on WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-[color,background-color,transform] duration-200 hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] motion-reduce:active:scale-100 disabled:opacity-70"
                    >
                      {status === "submitting" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                        </>
): (
                        <>
                          {status === "error" ? "Try sending again" : "Submit application"}
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                        </>
)}
                    </button>

                    <p className="text-center text-xs text-muted-foreground text-pretty">
                      No payment is taken here. We store your name, email, phone, college and stream
                      to process this application and nothing else.{" "}
                      {email ? (
                        <>
                          Email{" "}
                          <a href={email.href} className="link-underline text-primary">{email.display}</a>{" "}
                          and we will delete it.
                        </>
                      ) : (
                        <>
                          Message us on WhatsApp
                          {whatsappLink && (
                            <>
                              {" "}at{" "}
                              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="link-underline whitespace-nowrap text-primary">
                                {contact.phoneDisplay}
                              </a>
                            </>
                          )}{" "}
                          and we will delete it.
                        </>
                      )}
                    </p>
                  </form>
)}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <FaqSection category="internship" />
    </Layout>
);
}

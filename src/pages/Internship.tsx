import { useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight, CreditCard, MessageCircle, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton, useCms } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Aurora } from "@/components/ui/aurora";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { getIcon } from "@/lib/icons";
import { nextId } from "@/lib/cms/store";
import { cn } from "@/lib/utils";

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

/** Splits a title into two halves so the final word can be accent-italic gradient. */
function accentTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return { lead: "", accent: title };
  return { lead: words.slice(0, -1).join(" "), accent: words[words.length - 1] };
}

export default function Internship() {
  const internship = useSingleton("internship");
  const contact = useSingleton("contact");
  const { actions } = useCms();

  const formRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  const { lead, accent } = accentTitle(internship.title);
  const whatsappNumber = (contact.whatsappNumber || "").replace(/\D/g, "");
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setField =
    (key: keyof FormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Enter a valid phone number";
    if (!form.college.trim()) e.college = "College / institute is required";
    if (!form.stream.trim()) e.stream = "Stream / branch is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    try {
      await actions.saveDoc("applications", {
        id: nextId("app"),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        college: form.college.trim(),
        stream: form.stream.trim(),
        notes: form.notes.trim(),
        paymentStatus: "pending",
        seatConfirmed: false,
        submittedAt: new Date().toISOString(),
      } as any);
    } catch {
      /* non-fatal — still guide the applicant to payment */
    }
    setStatus("done");
  };

  return (
    <Layout>
      <Seo
        title="Web Development Internship"
        description="Join the Ideovent LaunchPad — a 3-month, project-based web development internship with founder mentorship, live client work and a QR-verifiable certificate."
        path="/internship"
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <Reveal>
                <Eyebrow>{internship.eyebrow}</Eyebrow>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="mt-6 text-hero font-display font-semibold">
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
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-[0_0_40px_-12px_hsl(var(--primary)/0.7)] transition-transform hover:scale-[1.02]"
                  >
                    Apply now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {internship.batchLabel && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {internship.batchLabel}
                    </span>
                  )}
                </div>
              </Reveal>
            </div>

            {internship.certificatePreviewImage && (
              <Reveal delay={0.15}>
                <div className="relative mx-auto max-w-md lg:ml-auto">
                  <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" aria-hidden />
                  <div className="rotate-2 rounded-3xl border border-border bg-card/60 p-3 shadow-2xl transition-transform duration-500 hover:rotate-0">
                    <img
                      src={internship.certificatePreviewImage}
                      alt="Preview of the verified Ideovent internship completion certificate"
                      loading="lazy"
                      className="w-full rounded-2xl"
                    />
                  </div>
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                    QR-verifiable certificate
                  </span>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────── */}
      {internship.benefits?.length > 0 && (
        <section className="section relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
          <div className="container-page">
            <SectionHeading
              eyebrow="What you get"
              title={
                <>
                  Built to make you{" "}
                  <span className="accent-italic text-gradient">job-ready</span>
                </>
              }
              subtitle="Real work, real mentorship and proof of your skills — not another certificate that gathers dust."
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
                  <motion.div
                    key={benefit.title}
                    variants={fadeUp}
                    className="card-surface p-7 hover-lift"
                  >
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold">{benefit.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Curriculum timeline ──────────────────────────── */}
      {internship.curriculum?.length > 0 && (
        <section className="section relative overflow-hidden">
          <div className="container-page">
            <SectionHeading
              eyebrow="The roadmap"
              title={
                <>
                  Twelve weeks, one{" "}
                  <span className="accent-italic text-gradient">transformation</span>
                </>
              }
              subtitle="A structured path from fundamentals to shipping production code on a live project."
            />

            <div className="relative mx-auto mt-16 max-w-3xl">
              <div
                aria-hidden
                className="absolute top-0 bottom-0 left-4 w-px bg-border md:left-6"
              />
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
                      <div className="card-surface p-6 hover-lift">
                        <span className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          {step.week}
                        </span>
                        <h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Terms ────────────────────────────────────────── */}
      {internship.terms?.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <Reveal>
              <div className="rounded-[2rem] border border-border bg-card/50 p-8 md:p-12">
                <h2 className="font-display text-2xl font-semibold">
                  Terms &{" "}
                  <span className="accent-italic text-gradient">good faith</span>
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  A few clear commitments so everyone knows exactly where they stand.
                </p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {internship.terms.map((term, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{term}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Apply ────────────────────────────────────────── */}
      <section id="apply" ref={formRef} className="section relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page">
          <SectionHeading
            eyebrow="Reserve your seat"
            title={
              <>
                Apply and secure your{" "}
                <span className="accent-italic text-gradient">place</span>
              </>
            }
            subtitle="Submit your details, complete the one-time commitment payment, and we'll onboard you within 48 hours."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Left — pricing + checklist + payment + help */}
            <Reveal>
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 bg-spotlight p-8">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {internship.pricing.label}
                  </div>
                  <div className="mt-2 font-display text-5xl font-semibold text-foreground">
                    {internship.pricing.amount}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{internship.pricing.note}</div>

                  {internship.checklist?.length > 0 && (
                    <ul className="mt-7 space-y-3 border-t border-border pt-7">
                      {internship.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <CtaButton
                      cta={{ label: "Pay & register", href: internship.paymentLink }}
                    />
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Ask on WhatsApp
                      </a>
                    )}
                  </div>

                  <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    Secure payment · seat confirmed after verification
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Right — application form */}
            <Reveal delay={0.1}>
              <div className="card-surface p-6 md:p-8">
                {status === "done" ? (
                  <div className="flex h-full min-h-[26rem] flex-col items-center justify-center text-center">
                    <CheckCircle2 className="h-14 w-14 text-primary" />
                    <h3 className="mt-4 font-display text-2xl font-semibold">Application received</h3>
                    <p className="mt-2 max-w-sm text-muted-foreground">
                      Thanks, {form.fullName.split(" ")[0] || "there"}! Your details are saved. To
                      lock in your seat, complete the {internship.pricing.amount}{" "}
                      {internship.pricing.label.toLowerCase()} now.
                    </p>
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                      <CtaButton
                        cta={{ label: "Complete payment", href: internship.paymentLink }}
                      />
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Send payment proof
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setForm(EMPTY_FORM);
                        setStatus("idle");
                      }}
                      className="mt-6 text-sm font-medium text-primary link-underline"
                    >
                      Submit another application
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
                        Full name <span className="text-primary">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={form.fullName}
                        onChange={setField("fullName")}
                        placeholder="Your full name"
                        className={cn(
                          "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary",
                          errors.fullName ? "border-destructive" : "border-input"
                        )}
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
                          value={form.email}
                          onChange={setField("email")}
                          placeholder="you@email.com"
                          className={cn(
                            "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary",
                            errors.email ? "border-destructive" : "border-input"
                          )}
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
                          value={form.phone}
                          onChange={setField("phone")}
                          placeholder="10-digit mobile"
                          className={cn(
                            "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary",
                            errors.phone ? "border-destructive" : "border-input"
                          )}
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
                          value={form.college}
                          onChange={setField("college")}
                          placeholder="Your college name"
                          className={cn(
                            "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary",
                            errors.college ? "border-destructive" : "border-input"
                          )}
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
                          value={form.stream}
                          onChange={setField("stream")}
                          placeholder="e.g. B.Tech — CSE"
                          className={cn(
                            "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary",
                            errors.stream ? "border-destructive" : "border-input"
                          )}
                        />
                        {errors.stream && <p className="mt-1 text-xs text-destructive">{errors.stream}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                        Anything else? <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <textarea
                        id="notes"
                        rows={4}
                        value={form.notes}
                        onChange={setField("notes")}
                        placeholder="Availability, previous projects, questions…"
                        className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-70"
                    >
                      {status === "submitting" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                        </>
                      ) : (
                        <>
                          Submit application
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-muted-foreground">
                      Submitting saves your application — payment confirms your seat.
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </Layout>
  );
}

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import {
  Briefcase, CheckCircle2, TrendingUp, Sparkles, MapPin, Clock,
  ArrowRight, ShieldCheck, MessageCircle, AlertCircle, Loader2,
  Send, Target, Award, DollarSign, Lock, HelpCircle, Upload, FileText, X
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection, useCms } from "@/lib/cms/context";
import type { JobOpeningDoc } from "@/lib/cms/types";
import { DEFAULT_JOB_OPENINGS } from "@/lib/careers/jobs";
import { normalisePhone, submitCareerApplication, type LeadResult } from "@/lib/leads";
import { cn } from "@/lib/utils";

export default function Careers() {
  const { actions } = useCms();
  const cmsJobs = useCollection("jobOpenings");
  const allJobs: JobOpeningDoc[] = cmsJobs && cmsJobs.length > 0 ? cmsJobs : DEFAULT_JOB_OPENINGS;
  const activeJobs = allJobs.filter((j) => j.active !== false);

  const [selectedJobId, setSelectedJobId] = useState<string>(activeJobs[0]?.id || "");
  const currentJob = activeJobs.find((j) => j.id === selectedJobId) || activeJobs[0] || null;

  // Keep selectedJobId in sync if CMS updates or URL hash is present
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const match = activeJobs.find((j) => j.id === hash || j.slug === hash);
      if (match) {
        setSelectedJobId(match.id);
        return;
      }
    }
    if (activeJobs.length > 0 && !activeJobs.some((j) => j.id === selectedJobId)) {
      setSelectedJobId(activeJobs[0].id);
    }
  }, [activeJobs, selectedJobId]);

  // Application Form state
  const formRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number>(Date.now());
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    portfolioUrl: "",
    linkedinUrl: "",
    resumeUrl: "",
    campaignResults: "",
    experienceYears: "1-3 years",
    coverNote: "",
  });

  const handleResumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extOk = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      setResumeError("Please upload a PDF, DOC, or DOCX file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("File size must be under 5 MB. For larger files, paste a Google Drive link below.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setResumeFile(file);
  };

  const clearResumeFile = () => {
    setResumeFile(null);
    setResumeError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scrollToApply = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setResumeError(null);

    const p = normalisePhone(formData.phone);
    if (!p.ok) {
      setPhoneError(p.error);
      return;
    }

    if (!resumeFile && !formData.resumeUrl.trim()) {
      setResumeError("CV / Resume is required. Please upload a PDF/DOC/DOCX file or paste a Google Drive resume link.");
      document.getElementById("career-cv-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const r = await submitCareerApplication(
        {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          jobId: currentJob?.id || "general",
          jobTitle: currentJob?.title || "General Application",
          portfolioUrl: formData.portfolioUrl,
          linkedinUrl: formData.linkedinUrl,
          resumeUrl: formData.resumeUrl,
          resumeFile,
          campaignResults: formData.campaignResults,
          experienceYears: formData.experienceYears,
          coverNote: formData.coverNote,
        },
        {
          startedAt: startedAt.current,
          honeypot,
          saveLocal: (doc) => actions.saveDoc("applications", doc),
        }
      );
      setResult(r);
    } catch {
      setResult({ delivered: false, id: "", routes: { database: "failed", email: "failed" } });
    } finally {
      setSubmitting(false);
    }
  };

  const isMarketingRole = currentJob?.department === "marketing" || currentJob?.id === "pdm-partner";
  const isSalesRole = currentJob?.department === "sales" || currentJob?.id === "bd-partner";

  const jobSchemas = activeJobs.map((job) => ({
    "@type": "JobPosting",
    title: job.title,
    description: [
      job.summary,
      job.responsibilities?.length ? `Responsibilities: ${job.responsibilities.join(" ")}` : "",
      job.qualifications?.length ? `Requirements: ${job.qualifications.join(" ")}` : "",
      job.earningsAndPerks?.length ? `Compensation & Perks: ${job.earningsAndPerks.join(" ")}` : "",
    ].filter(Boolean).join("\n\n"),
    datePosted: "2026-11-18",
    validThrough: "2027-05-18T23:59:59+05:30",
    employmentType: "CONTRACTOR",
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "India" },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Saket",
        addressLocality: "New Delhi",
        addressRegion: "Delhi",
        postalCode: "110017",
        addressCountry: "IN",
      },
    },
    directApply: true,
    url: `/careers#${job.id}`,
  }));

  return (
    <Layout>
      <Seo
        path="/careers"
        breadcrumbs={[{ name: "Careers", path: "/careers" }]}
        schema={jobSchemas}
      />

      <div className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

        <div className="container-page">
          {/* Multiple Active Openings Switcher (Shows rich role cards when 2+ listings are active) */}
          {activeJobs.length > 1 && (
            <div className="mx-auto mb-12 max-w-4xl">
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Open Partner Roles ({activeJobs.length} Active Openings) — Select a Role to View Details
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeJobs.map((job) => {
                  const selected = currentJob?.id === job.id;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={cn(
                        "text-left rounded-2xl border p-4 transition-all",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm"
                          : "border-border bg-card/60 hover:border-primary/40 hover:bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {job.department}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground">{job.workMode}</span>
                      </div>
                      <h2 className="mt-2 font-display text-sm font-bold text-foreground sm:text-base">
                        {job.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-emerald-600 line-clamp-1">
                        {job.compensation}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentJob ? (
            <>
              {/* Header Hero */}
              <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span>We&apos;re Hiring &bull; {currentJob.department.toUpperCase()}</span>
                </div>

                <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                  {currentJob.title}
                </h1>

                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {currentJob.summary}
                </p>

                {/* Quick Metadata Chips */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {currentJob.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <strong>{currentJob.compensation}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {currentJob.engagement}
                  </span>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={scrollToApply}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                  >
                    Apply for this Role
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* TWO SAFETY RULES BANNER (Shown for Performance Marketing Partner role) */}
              {isMarketingRole && (
                <div className="mt-14 mx-auto max-w-4xl rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    How Our Performance Partner Model Works (2 Safety Rules)
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This model gives you complete creative ownership while eliminating personal financial risk:
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-primary">
                        <Lock className="h-4 w-4" />
                        1. Company-Funded Ad Accounts
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        Ads run through Ideovent&apos;s verified company billing with strict daily spending limits. You are granted <strong>Advertiser / Campaign Manager access</strong> so you never spend personal funds on ads.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                        <TrendingUp className="h-4 w-4" />
                        2. Rapid Milestone Commission
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        Your <strong>₹1,500 – ₹2,000 commission</strong> is released via direct UPI / bank transfer immediately as soon as the client signs off and makes the project advance payment. Zero lock-in.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* BD PARTNER HIGHLIGHTS BANNER (Shown for Business Development Partner role) */}
              {isSalesRole && (
                <div className="mt-14 mx-auto max-w-4xl rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    How Our Business Development Partner Model Works
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Zero fixed target pressure, full sales collateral provided, and transparent per-project payouts:
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                        <TrendingUp className="h-4 w-4" />
                        1. Flat ₹2,000 Per Closed Project
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        Earn a flat <strong>₹2,000 commission</strong> on every closed website or software package valued at ₹12,000+. Closing just 5 deals a month earns ₹10,000+ with zero upper cap.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-primary">
                        <Briefcase className="h-4 w-4" />
                        2. Complete Sales Toolkit &amp; Tech Backing
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        You get ready-to-share brochures, live demo websites, and structured pricing sheets. Our technical team joins discovery calls to handle scoping, demos, and delivery.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* FULL JOB SPECIFICATIONS */}
              <div className="mt-12 mx-auto max-w-4xl space-y-6">
                {currentJob.aboutCompany && (
                  <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
                    <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      About Ideovent Technologies
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {currentJob.aboutCompany}
                    </p>
                  </div>
                )}

                {currentJob.responsibilities && currentJob.responsibilities.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
                    <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Key Responsibilities
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {currentJob.responsibilities.map((item, idx) => {
                        const colonIdx = item.indexOf(":");
                        const hasHeading = colonIdx > 0 && colonIdx < 60;
                        return (
                          <div key={idx} className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground leading-relaxed">
                            {hasHeading ? (
                              <>
                                <strong className="block text-sm font-semibold text-foreground mb-1">
                                  {idx + 1}. {item.slice(0, colonIdx)}
                                </strong>
                                {item.slice(colonIdx + 1).trim()}
                              </>
                            ) : (
                              <span>{idx + 1}. {item}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentJob.qualifications && currentJob.qualifications.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
                    <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <Award className="h-5 w-5 text-accent" />
                      Required Skills &amp; Qualifications
                    </h3>
                    <ul className="mt-4 space-y-2.5">
                      {currentJob.qualifications.map((qual, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{qual}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentJob.earningsAndPerks && currentJob.earningsAndPerks.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8">
                    <h3 className="font-display text-xl font-bold text-emerald-600 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Earnings &amp; Partner Perks
                    </h3>
                    <ul className="mt-4 space-y-3">
                      {currentJob.earningsAndPerks.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-2xl text-center py-8">
              <h1 className="font-display text-3xl font-bold text-foreground">Careers at Ideovent Technologies</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We don&apos;t have a specific active role listed right now, but we&apos;re always glad to hear from strong marketers, designers, and engineers. Drop your profile below.
              </p>
            </div>
          )}

          {/* APPLICATION FORM SECTION */}
          <div ref={formRef} className="mt-16 scroll-mt-28">
            <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl shadow-black/5">
              {result?.delivered || result?.routes.database === "local" ? (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    Application Submitted Successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Thank you, <strong>{formData.fullName}</strong>. We have received your application for{" "}
                    <strong>{currentJob?.title || "Ideovent Technologies"}</strong>.
                  </p>

                  <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 max-w-md mx-auto">
                    <p className="text-xs font-semibold text-primary">
                      Fast-Track Your Application on WhatsApp:
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Connect directly with Mehdi Hasan on WhatsApp to share your campaign results or portfolio:
                    </p>
                    <a
                      href={`https://wa.me/917761921786?text=${encodeURIComponent(`Hello Mehdi, I have just submitted my application for ${currentJob?.title || "a role"} on ideovent.in/careers. Looking forward to discussing!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat on WhatsApp (+91 77619 21786)
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Submit another response
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      Application Form
                    </div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      Apply for {currentJob?.title || "Open Role"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentJob?.applyInstructions || "Fill out your details below to submit your profile."}
                    </p>
                  </div>

                  <input
                    type="text"
                    name="website_url_check"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {activeJobs.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Role Applying For *
                      </label>
                      <select
                        value={currentJob?.id || ""}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                      >
                        {activeJobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title} ({job.compensation})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. rahul@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (phoneError) setPhoneError(null);
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                      {phoneError && (
                        <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {phoneError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Current City / Location *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhi NCR / Remote"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Portfolio / Drive / Case Study Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.portfolioUrl}
                        onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* CV / Resume Upload Section (Mandatory) */}
                  <div
                    id="career-cv-section"
                    className={cn(
                      "space-y-3 rounded-2xl border bg-muted/20 p-4 transition-colors",
                      resumeError ? "border-destructive/60 bg-destructive/5" : "border-border"
                    )}
                  >
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Upload CV / Resume (PDF, DOC, DOCX — Max 5 MB) *
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleResumeChange}
                        className="hidden"
                        id="career-cv-upload"
                      />

                      {resumeFile ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{resumeFile.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {(resumeFile.size / 1024).toFixed(0)} KB &bull; Ready to submit
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={clearResumeFile}
                            aria-label="Remove uploaded CV"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="career-cv-upload"
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-background px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5",
                            resumeError ? "border-destructive/60" : "border-border"
                          )}
                        >
                          <Upload className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            Click to upload your CV / Resume (Required)
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PDF, DOC, or DOCX (up to 5 MB)
                          </span>
                        </label>
                      )}

                      {resumeError && (
                        <p className="mt-1.5 text-xs font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          {resumeError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Or paste Google Drive / Resume Link (if not uploading a file)
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={formData.resumeUrl}
                        onChange={(e) => {
                          setFormData({ ...formData, resumeUrl: e.target.value });
                          if (resumeError) setResumeError(null);
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {isMarketingRole
                        ? "Past Campaign Results & Proof (CPL, Monthly Spend, Niches) *"
                        : isSalesRole
                        ? "Past Sales / Outreach Experience & Target Markets *"
                        : "Relevant Work, Projects & Proof *"}
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder={
                        isMarketingRole
                          ? "Share your proven results: e.g. Managed ₹50k/mo on Meta Ads with ₹120 CPL for education/school clients, scaled Google Search ads to 4.2x ROAS, or links to Drive/Loom campaign walk-throughs..."
                          : isSalesRole
                          ? "Share your sales/outreach background: e.g. Local B2B outreach, cold calling, WhatsApp/LinkedIn pitching, or industries you have connections in (schools, clinics, gyms, hotels, retail)..."
                          : "Share links to your best work, live projects, or past measurable outcomes..."
                      }
                      value={formData.campaignResults}
                      onChange={(e) => setFormData({ ...formData, campaignResults: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Brief Note / Strategy
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tell us about your approach, availability, and why you want to work with Ideovent..."
                      value={formData.coverNote}
                      onChange={(e) => setFormData({ ...formData, coverNote: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Application
                        </>
                      )}
                    </button>
                    <p className="mt-2.5 text-center text-xs text-muted-foreground">
                      Zero registration fees. Applications are stored securely and treated confidentially.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Quick FAQ */}
          {isMarketingRole && (
            <div className="mt-16 mx-auto max-w-3xl">
              <h3 className="font-display text-xl font-bold text-center text-foreground mb-6 flex items-center justify-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </h3>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <h4 className="text-sm font-bold text-foreground">
                    1. How is the commission (₹1,500 – ₹2,000) paid?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Commission is released directly to your UPI ID or bank account as soon as the client signs the agreement and pays the 50% project advance.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <h4 className="text-sm font-bold text-foreground">
                    2. Who pays for the ad budget on Meta &amp; Google Ads?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Ideovent Technologies provides the official ad accounts and funds the ad spend. You are assigned Advertiser / Campaign Manager access to create, test, and optimize ads within an agreed daily budget cap.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <h4 className="text-sm font-bold text-foreground">
                    3. Who talks to the leads and closes the deals?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Ideovent&apos;s founding partners handle the technical discovery calls, quotation negotiations, and client closing. Your goal is delivering qualified inbound leads.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSalesRole && (
            <div className="mt-16 mx-auto max-w-3xl">
              <h3 className="font-display text-xl font-bold text-center text-foreground mb-6 flex items-center justify-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions (BD Partner)
              </h3>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <h4 className="text-sm font-bold text-foreground">
                    1. When is the flat ₹2,000 commission paid?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Your ₹2,000 commission is transferred directly via UPI or bank transfer as soon as your referred client signs off on a package valued at ₹12,000+ and pays the project advance.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <h4 className="text-sm font-bold text-foreground">
                    2. What sales materials will Ideovent provide?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    You receive our full sales toolkit: official company brochures, live industry-specific demo websites (schools, clinics, coaching, retail), portfolio case studies, and pricing sheets starting from ₹14,999.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <h4 className="text-sm font-bold text-foreground">
                    3. Do I need technical coding knowledge to pitch?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    No coding is needed. You focus on connecting with business owners and scheduling discovery calls — our engineering team handles technical explanations, scoping, and project delivery.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Footer Banner */}
          <div className="mt-12 text-center text-xs text-muted-foreground">
            Have questions before applying? Chat on WhatsApp at{" "}
            <a href="https://wa.me/917761921786" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
              +91 77619 21786
            </a>{" "}
            or email{" "}
            <a href="mailto:contact@ideovent.in" className="font-semibold text-primary underline">
              contact@ideovent.in
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

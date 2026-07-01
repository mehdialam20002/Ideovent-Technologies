import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  Download,
  Eye,
  X,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock,
  Award,
  MapPin,
  Hash,
  CalendarDays,
  Briefcase,
  Loader2,
} from "lucide-react";

import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection } from "@/lib/cms/context";
import type { Certificate } from "@/lib/cms/types";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fadeUp, staggerContainer } from "@/lib/motion";

/* ─────────────────────────── Shared hero ─────────────────────────── */

function VerifyHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
      <Aurora />
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />
      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 text-hero font-display font-semibold">{title}</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              {subtitle}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Search state (no certId) ─────────────────────────── */

function SearchState() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/verify/${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <VerifyHero
        eyebrow="Certificate Verification"
        title={
          <>
            Verify a <span className="accent-italic text-gradient">certificate</span>
          </>
        }
        subtitle="Enter the unique certificate ID printed on the document to instantly confirm its authenticity, issue date and holder details."
      />

      <section className="section pt-0">
        <div className="container-page">
          <Reveal className="mx-auto max-w-xl">
            <form
              onSubmit={handleSubmit}
              className="card-surface rounded-3xl p-6 md:p-8"
            >
              <label
                htmlFor="cert-id"
                className="mb-3 block text-sm font-medium text-foreground"
              >
                Certificate ID
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cert-id"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g. INT2025A73"
                    autoComplete="off"
                    className="h-12 rounded-full pl-10 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!value.trim()}
                  className="h-12 rounded-full font-medium shadow-[0_0_40px_-12px_hsl(var(--primary)/0.7)]"
                >
                  Verify
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                The ID is case-insensitive. You can also scan the QR code on the
                certificate to open its verification page directly.
              </p>
            </form>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────── Result: shared shell ─────────────────────────── */

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="section pt-0">
      <div className="container-page">
        <div className="mb-8">
          <Button
            asChild
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <Link to="/verify">
              <ArrowLeft className="h-4 w-4" />
              Verify another certificate
            </Link>
          </Button>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────────── Not found ─────────────────────────── */

function NotFoundState({ certId }: { certId: string }) {
  return (
    <>
      <VerifyHero
        eyebrow="Certificate Verification"
        title={
          <>
            Certificate <span className="accent-italic text-gradient">not found</span>
          </>
        }
        subtitle="We couldn't match this ID to any certificate we have issued."
      />
      <ResultShell>
        <Reveal className="mx-auto max-w-xl">
          <div className="card-surface rounded-3xl border-destructive/40 bg-destructive/5 p-8 text-center md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/30">
              <ShieldX className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-display font-semibold">
              No certificate found
            </h2>
            <p className="mt-3 text-muted-foreground">
              No certificate found with ID{" "}
              <span className="font-mono font-semibold text-foreground break-all">
                {certId}
              </span>
              . Please double-check the ID and try again.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 rounded-full font-medium shadow-[0_0_40px_-12px_hsl(var(--primary)/0.7)]"
            >
              <Link to="/verify">Try another ID</Link>
            </Button>
          </div>
        </Reveal>
      </ResultShell>
    </>
  );
}

/* ─────────────────────────── Revoked ─────────────────────────── */

function RevokedState({ cert }: { cert: Certificate }) {
  return (
    <>
      <VerifyHero
        eyebrow="Certificate Verification"
        title={
          <>
            Certificate <span className="accent-italic text-gradient">revoked</span>
          </>
        }
        subtitle="This certificate exists in our records but is no longer valid."
      />
      <ResultShell>
        <Reveal className="mx-auto max-w-xl">
          <div className="card-surface rounded-3xl border-accent/40 bg-accent/5 p-8 text-center md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/30">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-display font-semibold">
              This certificate has been revoked
            </h2>
            <p className="mt-3 text-muted-foreground">
              Certificate{" "}
              <span className="font-mono font-semibold text-foreground break-all">
                {cert.certificateId}
              </span>{" "}
              issued to{" "}
              <span className="font-semibold text-foreground">{cert.internName}</span>{" "}
              is no longer recognised as valid. If you believe this is an error,
              please contact us.
            </p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="mt-8 rounded-full font-medium"
            >
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </Reveal>
      </ResultShell>
    </>
  );
}

/* ─────────────────────────── Valid ─────────────────────────── */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="break-words font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

function ValidState({ cert }: { cert: Certificate }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const handleDownload = async () => {
    if (!cert.certificateImage) {
      setDownloadError("No certificate file is available to download.");
      return;
    }
    setDownloading(true);
    setDownloadError("");
    try {
      const res = await fetch(cert.certificateImage);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (cert.internName || cert.certificateId || "certificate")
        .replace(/[^\w-]+/g, "_")
        .replace(/^_+|_+$/g, "");
      link.download = `${safeName}_Certificate`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError(
        "We couldn't download the certificate. You can still view it in full and save it manually."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <VerifyHero
        eyebrow="Certificate Verification"
        title={
          <>
            Certificate <span className="accent-italic text-gradient">verified</span>
          </>
        }
        subtitle="This is a genuine certificate issued by Ideovent Technologies. Full details are shown below."
      />

      <ResultShell>
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8"
        >
          {/* Left — intern profile card */}
          <motion.div
            variants={fadeUp}
            className="card-surface hover-lift h-fit overflow-hidden rounded-3xl"
          >
            <div className="relative border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-full ring-2 ring-primary/40 ring-offset-4 ring-offset-card">
                {cert.profileImage ? (
                  <img
                    src={cert.profileImage}
                    alt={cert.internName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-display font-semibold text-muted-foreground">
                    {(cert.internName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="mt-5 text-2xl font-display font-semibold">
                {cert.internName}
              </h2>
              {cert.designation && (
                <p className="mt-1 text-muted-foreground">{cert.designation}</p>
              )}
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary">
                <BadgeCheck className="h-4 w-4" />
                Verified
              </div>
            </div>

            <div className="divide-y divide-border/70 p-6 md:p-8">
              <InfoRow icon={Building2} label="Issued By" value={cert.issuedBy} />
              <InfoRow icon={Clock} label="Duration" value={cert.duration} />
              <InfoRow
                icon={Award}
                label="Grade"
                value={cert.grade ? `${cert.grade}%` : undefined}
              />
              <InfoRow icon={MapPin} label="Location" value={cert.location} />
              <InfoRow
                icon={Hash}
                label="Certificate ID"
                value={
                  <span className="font-mono">{cert.certificateId}</span>
                }
              />
              <InfoRow
                icon={CalendarDays}
                label="Issued On"
                value={cert.issuedAt}
              />
              <InfoRow
                icon={Briefcase}
                label="Project Work"
                value={cert.projectWork}
              />
            </div>
          </motion.div>

          {/* Right — certificate image */}
          <motion.div
            variants={fadeUp}
            className="card-surface flex flex-col overflow-hidden rounded-3xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-6 py-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Certificate document</span>
            </div>

            <div className="flex flex-1 items-center justify-center bg-muted/40 p-6 md:p-8">
              {cert.certificateImage ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  aria-label="Open certificate in full screen"
                >
                  <img
                    src={cert.certificateImage}
                    alt={`Certificate for ${cert.internName}`}
                    className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-opacity duration-300 group-hover:bg-background/40 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-sm font-medium backdrop-blur">
                      <Eye className="h-4 w-4" /> View full size
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
                  Certificate image unavailable
                </div>
              )}
            </div>

            <div className="border-t border-border p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => setLightboxOpen(true)}
                  disabled={!cert.certificateImage}
                  className="flex-1 rounded-full font-medium"
                >
                  <Eye className="h-4 w-4" /> View
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleDownload}
                  disabled={!cert.certificateImage || downloading}
                  className="flex-1 rounded-full font-medium shadow-[0_0_40px_-12px_hsl(var(--primary)/0.7)]"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" /> Download
                    </>
                  )}
                </Button>
              </div>
              {downloadError && (
                <p className="mt-3 text-sm text-destructive">{downloadError}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </ResultShell>

      {/* Lightbox */}
      {lightboxOpen && cert.certificateImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm md:p-10"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Certificate preview"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-card md:right-6 md:top-6"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={cert.certificateImage}
            alt={`Certificate for ${cert.internName}`}
            className="max-h-[85vh] max-w-full rounded-2xl border border-border object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function CertificateVerify() {
  const { certId } = useParams();
  const certificates = useCollection("certificates");

  const cert = useMemo(() => {
    if (!certId) return undefined;
    const target = certId.trim().toLowerCase();
    return certificates.find(
      (c) => (c.certificateId || "").toLowerCase() === target
    );
  }, [certId, certificates]);

  let body: React.ReactNode;
  if (!certId) {
    body = <SearchState />;
  } else if (!cert) {
    body = <NotFoundState certId={certId} />;
  } else if (cert.status === "revoked") {
    body = <RevokedState cert={cert} />;
  } else {
    body = <ValidState cert={cert} />;
  }

  return (
    <Layout>
      <Seo
        title="Verify Certificate"
        description="Verify the authenticity of an Ideovent Technologies internship certificate by its unique certificate ID."
        path={certId ? `/verify/${certId}` : "/verify"}
      />
      {body}
    </Layout>
  );
}

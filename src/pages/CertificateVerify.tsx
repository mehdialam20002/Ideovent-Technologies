import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  Download,
  Eye,
  X,
  ArrowLeft,
  Building2,
  Clock,
  MapPin,
  Hash,
  CalendarDays,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  Loader2,
} from "lucide-react";

import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCms, useCollection } from "@/lib/cms/context";
import type { Certificate } from "@/lib/cms/types";
import CertificateTemplate from "@/components/certificate/CertificateTemplate";
import { toArtData } from "@/components/certificate/artwork";
import { canonicalVerifyUrl, canonicalVerifyLabel } from "@/lib/verify";
import type { Json } from "@/lib/seo/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatIssueDate } from "@/components/certificate/artwork";

/**
 * /verify and /verify/: certId
 *
 * WHO ACTUALLY OPENS THIS PAGE
 * ----------------------------
 * Somebody who has just pointed a phone camera at a printed certificate. They are
 * on a phone, often on mobile data, usually a recruiter with thirty seconds. So
 * the answer (verified, revoked, or not found) is the first thing on the page
 * and it fits above the fold at 375px. The details follow. The scan of the
 * document is LAST and explicitly optional, because it is the heaviest thing here
 * and the verification does not depend on it: the record is the proof, the image
 * is a courtesy.
 *
 * WHAT IS NOT ON THIS PAGE ANY MORE
 * ---------------------------------
 * The numeric rubric grade. It used to render as "GRADE nn.n%" against a real
 * person's name. Mehdi confirmed on 24 Sep 2026 that it comes off, and it was not
 * merely hidden, see src/lib/cms/types.ts. What replaces it is the completion
 * status, which is the thing a verifier is actually checking.
 */

/* ─────────────────────────── The seal ─────────────────────────── */

/**
 * The iV mark, from 01-brand/logo/ideovent-mark.svg, used as the "verified by"
 * seal. Inline rather than an <img> so it is part of the first paint and cannot
 * be the one request that fails on a bad connection. Which is exactly what
 * happened to the intern photographs this page used to hotlink.
 */
function IdeoventMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Ideovent Technologies">
      <g transform="translate(0.5 25.285)" fill="currentColor">
        <path d="M0 0 46 19.8 76.35 95.4 57.05 143.8Z M199 0 153 19.8 122.65 95.4 141.95 143.8Z" />
        <path d="M79.4 34.8 99.5 42.9 119.6 34.8 99.5 85.7Z" />
        <path d="M96.04 102.5H102.96Q103.96 102.5 103.96 103.5V148.43Q103.96 149.43 102.96 149.43H96.04Q95.04 149.43 95.04 148.43V103.5Q95.04 102.5 96.04 102.5Z" />
      </g>
    </svg>
);
}

function VerifiedByMark() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <IdeoventMark className="h-7 w-7 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">Verified by Ideovent Technologies</p>
        <p className="text-xs leading-tight text-muted-foreground">
          Checked against the issuing record, not against the document.
        </p>
      </div>
    </div>
);
}

/* ─────────────────────────── Shells ─────────────────────────── */

/**
 * Top padding clears the fixed header (py-4 + h-20 = 112px) and no more. The old
 * hero opened with pt-36/pb-16 plus an aurora and three staggered reveals before
 * the verdict, roughly 480px of decoration above the only sentence that matters,
 * on a page reached by pointing a camera at a piece of paper.
 */
function ResultPage({
  tone,
  icon: Icon,
  headline,
  sub,
  children,
}: {
  tone: "ok" | "warn" | "bad";
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  sub: string;
  children?: React.ReactNode;
}) {
  const toneCls = {
    ok: "border-primary/35 bg-primary/10 text-primary",
    /* --warning, not --accent. Under the retired lime palette --accent was
       coral and read as a warning by accident; --accent is now shadcn's neutral
       hover surface (a lifted navy), so a revoked certificate would have
       rendered in the same grey-blue as a dropdown hover. --warning is #FBBF4E
       at 10.64:1 on the dark ground and #8E5E0B at 5.34:1 on the light one. */
    warn: "border-warning/40 bg-warning/10 text-warning",
    bad: "border-destructive/40 bg-destructive/10 text-destructive",
  }[tone];

  return (
    <section className="pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="container-page">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Certificate verification
          </p>

          {/* The verdict. No reveal animation and no viewport trigger: this is the
              answer, and it renders on first paint whatever the scroll position
              or the motion preference. */}
          <div className={`mt-5 flex items-start gap-4 rounded-2xl border p-5 md:gap-5 md:p-6 ${toneCls}`}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/70 md:h-14 md:w-14">
              <Icon className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold leading-tight text-foreground md:text-2xl">
                {headline}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{sub}</p>
            </div>
          </div>

          {children}

          <div className="mt-8">
            <Button asChild variant="ghost" className="rounded-full text-muted-foreground hover:text-foreground">
              <Link to="/verify">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Verify another certificate
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
);
}

/* ─────────────────────────── Search ─────────────────────────── */

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
    <section className="pb-20 pt-28 md:pb-28 md:pt-36">
      <div className="container-page">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Certificate verification
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight md:text-4xl">
            Check an Ideovent certificate
          </h1>
          <p className="mt-3 text-muted-foreground">
            Enter the ID printed on the certificate, or scan its QR code. Verification is instant and needs no
            account.
          </p>

          <form onSubmit={handleSubmit} className="card-surface mt-8 rounded-3xl p-5 md:p-6">
            <label htmlFor="cert-id" className="mb-2 block text-sm font-medium text-foreground">
              Certificate ID
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="cert-id"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. INT2025A73"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  aria-describedby="cert-id-help"
                  className="h-12 rounded-full pl-10 text-base"
                />
              </div>
              <Button type="submit" size="lg" disabled={!value.trim()} className="h-12 rounded-full font-medium">
                Verify
              </Button>
            </div>
            <p id="cert-id-help" className="mt-4 text-sm text-muted-foreground">
              IDs look like <span className="font-mono text-foreground">INT2025A73</span> and are
              case-insensitive. They never contain the letters I or O or the digits 0 or 1, so if you are reading
              one of those off the paper it is a 1-for-I, 0-for-O misread.
            </p>
          </form>

          <div className="mt-6">
            <VerifiedByMark />
          </div>
        </div>
      </div>
    </section>
);
}

/* ─────────────────────────── Not found ─────────────────────────── */

function NotFoundState({ certId }: { certId: string }) {
  return (
    <ResultPage
      tone="bad"
      icon={ShieldX}
      headline="No certificate with that ID"
      sub="We have no record matching it. That is not the same as saying the document is forged, check the ID first."
    >
      <div className="card-surface mt-6 rounded-3xl p-5 md:p-6">
        <p className="text-sm text-muted-foreground">You searched for</p>
        <p className="mt-1 break-all font-mono text-lg font-semibold text-foreground">{certId}</p>
        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          <li>
            The ID alphabet excludes <span className="font-mono text-foreground">I</span>,{" "}
            <span className="font-mono text-foreground">O</span>, <span className="font-mono text-foreground">0</span>{" "}
            and <span className="font-mono text-foreground">1</span>. If you typed one of those, try its
            look-alike.
          </li>
          <li>The format is INT, then a four-digit year, then three characters.</li>
          <li>If the ID is right and this page still says no, tell us. We would want to know.</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full rounded-full font-medium sm:w-auto">
            <Link to="/verify">Try another ID</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full rounded-full font-medium sm:w-auto">
            <Link to="/contact">Report it</Link>
          </Button>
        </div>
      </div>
    </ResultPage>
);
}

/* ─────────────────────────── Revoked ─────────────────────────── */

function RevokedState({ cert }: { cert: Certificate }) {
  return (
    <ResultPage
      tone="warn"
      icon={ShieldAlert}
      headline="This certificate has been revoked"
      sub="It exists in our records and is no longer valid. It should not be relied on."
    >
      <div className="card-surface mt-6 rounded-3xl p-5 md:p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Certificate ID</dt>
            <dd className="mt-1 break-all font-mono font-semibold">{cert.certificateId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Issued to</dt>
            <dd className="mt-1 font-semibold">{cert.internName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Originally issued</dt>
            <dd className="mt-1 tabular-nums">
              {formatIssueDate(cert.issuedAt) || <span className="text-muted-foreground">Not recorded</span>}
            </dd>
          </div>
          {cert.revokedAt && (
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Revoked on</dt>
              <dd className="mt-1 tabular-nums">{formatIssueDate(cert.revokedAt)}</dd>
            </div>
)}
        </dl>
        {/* The reason is deliberately NOT rendered. It is written for Ideovent's
            own record and can contain things about a named person that a stranger
            with the ID has no business reading. */}
        <p className="mt-5 text-sm text-muted-foreground">
          If you believe this is wrong, contact us with the ID above and we will check the record the same day.
        </p>
        <Button asChild size="lg" variant="outline" className="mt-5 w-full rounded-full font-medium sm:w-auto">
          <Link to="/contact">Contact Ideovent</Link>
        </Button>
      </div>
      <div className="mt-6">
        <VerifiedByMark />
      </div>
    </ResultPage>
);
}

/* ─────────────────────────── Valid ─────────────────────────── */

const COMPLETION_LABEL: Record<string, string> = {
  completed: "Completed",
  "completed-with-distinction": "Completed with distinction",
};

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="break-words font-medium tabular-nums text-foreground">{value}</span>
      </div>
    </div>
);
}

function ValidState({ cert }: { cert: Certificate }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [imageBroken, setImageBroken] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    openerRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      openerRef.current?.focus?.();
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
      // Give the saved file an extension. Without one, what lands in the Downloads
      // folder is a file the operating system cannot open by double-clicking.
      const ext = (
        cert.certificateImage.split("?")[0].match(/\.(png|jpe?g|webp|pdf)$/i)?.[1] ??
        blob.type.split("/")[1] ??
        "png"
).toLowerCase();
      link.download = `${safeName}_${cert.certificateId}_Certificate.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError(
        "We couldn’t download the certificate file. The verification above is unaffected. It comes from our record, not from the image."
);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <ResultPage
        tone="ok"
        icon={ShieldCheck}
        headline="Certificate verified"
        sub="This is a genuine certificate issued by Ideovent Technologies."
      >
        {/* Holder ------------------------------------------------------- */}
        <div className="card-surface mt-6 overflow-hidden rounded-3xl">
          <div className="flex items-center gap-4 border-b border-border bg-gradient-to-b from-primary/10 to-transparent p-5 md:p-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-card md:h-20 md:w-20">
              {/* A photograph renders only if one has been added from /admin with
                  the person's written consent. The default is an initials disc:
                  a verifier needs the ID, the name, the designation and the
                  dates, not a face. The two photographs this page used to show
                  were WhatsApp pictures of real people on a free image host, and
                  one of them had already stopped loading. */}
              {cert.profileImage && !imageBroken ? (
                <img
                  src={cert.profileImage}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImageBroken(true)}
                />
): (
                <InitialsAvatar name={cert.internName || "?"} className="h-full w-full text-xl md:text-2xl" />
)}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold leading-tight md:text-2xl">{cert.internName}</h2>
              {cert.designation && <p className="mt-0.5 text-sm text-muted-foreground">{cert.designation}</p>}
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {COMPLETION_LABEL[cert.completion ?? "completed"] ?? "Completed"}
              </span>
            </div>
          </div>

          <div className="divide-y divide-border/70 px-5 py-1 md:px-6">
            <Detail icon={Hash} label="Certificate ID" value={<span className="font-mono">{cert.certificateId}</span>} />
            <Detail icon={GraduationCap} label="Programme" value={cert.programme || "Ideovent LaunchPad"} />
            <Detail icon={Building2} label="Issued by" value={cert.issuedBy} />
            <Detail icon={CalendarDays} label="Date of issue" value={formatIssueDate(cert.issuedAt)} />
            <Detail icon={Clock} label="Duration" value={cert.duration} />
            <Detail icon={MapPin} label="Location" value={cert.location} />
            <Detail icon={Briefcase} label="Project work" value={cert.projectWork} />
          </div>

          <p className="border-t border-border px-5 py-4 text-xs text-muted-foreground md:px-6">
            A completion certificate does not expire. Ideovent Technologies accredits nothing and certifies only
            what is stated above: that this person completed this programme, on these dates.
          </p>
        </div>

        <div className="mt-6">
          <VerifiedByMark />
        </div>

        {/*
          No uploaded scan: draw the certificate from the record instead.

          Only the two certificates issued before this system existed have a
          `certificateImage`, because those were made by hand and hosted
          elsewhere. Everything issued from /admin/certificates has an empty
          one, and this page used to fall through to text only, so a freshly
          issued certificate had no certificate on its own verification page.

          The same drawing routine the admin previews and exports from runs
          here, so the page and the PDF in the intern's hand can never show
          different wording.
        */}
        {!cert.certificateImage && (
          <div className="card-surface mt-6 overflow-hidden rounded-3xl">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4 md:px-6">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">The certificate document</span>
            </div>
            <div className="bg-muted/40 p-4 md:p-6">
              <CertificateTemplate
                data={toArtData(cert, false, canonicalVerifyLabel(cert.certificateId))}
                verifyUrl={canonicalVerifyUrl(cert.certificateId)}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* An uploaded scan, for the two certificates that predate this system. */}
        {cert.certificateImage && (
          <div className="card-surface mt-6 overflow-hidden rounded-3xl">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4 md:px-6">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">The certificate document</span>
            </div>
            <div className="bg-muted/40 p-4 md:p-6">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group relative block w-full overflow-hidden rounded-2xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                aria-label="Open the certificate document full screen"
              >
                {/* Intrinsic size declared so the card does not reflow when the
                    scan arrives. Both issued scans are 1131x800. */}
                <img
                  src={cert.certificateImage}
                  alt={`Certificate document for ${cert.internName}`}
                  width={1131}
                  height={800}
                  className="h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-0 hidden items-center justify-center bg-background/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:flex">
                  <span className="inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-sm font-medium backdrop-blur">
                    <Eye className="h-4 w-4" aria-hidden="true" /> View full size
                  </span>
                </span>
              </button>
            </div>
            <div className="border-t border-border p-5 md:p-6">
              {/* `w-full sm: flex-1`, not a bare `flex-1`. In a flex-COLUMN
                  container flex-basis governs height, so `flex: 1 1 0%` overrode
                  the Button's h-11 and both collapsed to their line box, 
                  measured 275x22 and 275x20 at 375px wide. */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => setLightboxOpen(true)}
                  className="w-full rounded-full font-medium sm:flex-1"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" /> View
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full rounded-full font-medium sm:flex-1"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Preparing…
                    </>
): (
                    <>
                      <Download className="h-4 w-4" aria-hidden="true" /> Download
                    </>
)}
                </Button>
              </div>
              {downloadError && (
                <p role="status" className="mt-3 text-sm text-destructive">
                  {downloadError}
                </p>
)}
            </div>
          </div>
)}
      </ResultPage>

      {lightboxOpen && cert.certificateImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm md:p-10"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Certificate preview"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-card md:right-6 md:top-6"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={cert.certificateImage}
            alt={`Certificate document for ${cert.internName}`}
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
  const { loading } = useCms();

  const cert = useMemo(() => {
    if (!certId) return undefined;
    const target = certId.trim().toLowerCase();
    return certificates.find((c) => (c.certificateId || "").toLowerCase() === target);
  }, [certId, certificates]);

  /* An EducationalOccupationalCredential node, so a machine reading the page gets
     the same answer a person does.

     It is emitted on BOTH states, and the reason is the difference between them:
     /verify is the page that is actually indexed, and without a node it is, to a
     crawler, an unexplained text box. Only /verify/<ID> can name a specific
     certificate, so only it carries `identifier` and `dateCreated`: a revoked or
     unknown ID falls back to describing the credential in general rather than
     asserting that one was issued.

     THREE THINGS ARE DELIBERATELY ABSENT and must stay absent:
       • the intern's NAME. The credential is the subject here, not the person,
         and /verify/<ID> is noindex precisely to keep a real individual's record
         out of search results, restating their name in a machine-readable graph
         works against that.
       • the numeric GRADE, for the same reason the visible page carries none
         (PHASE5-SPEC.md §B.2). It is not even on the Certificate type any more.
       • any count, rating or review. Two certificates have been issued, and
         nobody has reviewed the programme.

     URLs here are SITE-RELATIVE on purpose. Seo resolves them against
     settings.defaultSeo.canonicalHost, so the node's @id always matches the
     page's own <link rel="canonical">. canonicalVerifyUrl() is the PRINTED
     origin (lib/verify.ts). It is www.ideovent.in today, like the canonical
     host, but it is set separately (VITE_PUBLIC_URL overrides it, and it was
     once the bare apex), so feeding it in here could put a second, different
     URL for this page into the graph, which is the exact split signal the
     rest of this head fix exists to remove. */
  const schema = useMemo<Json>(() => {
    const issued = cert && cert.status === "active" ? cert: undefined;
    const path = certId ? `/verify/${certId}`: "/verify";
    const node: Json = {
      "@type": "EducationalOccupationalCredential",
      "@id": path,
      url: path,
      name: issued
        ? `${issued.programme || "Ideovent LaunchPad"} · ${issued.designation || "Internship"}`
: "Ideovent LaunchPad Certificate of Completion",
      description:
        "A certificate of completion for the Ideovent LaunchPad web development internship, issued by Ideovent Technologies against a published rubric. Every certificate carries a unique ID and a QR code that resolve on this page, so anyone holding one can confirm it is genuine.",
      credentialCategory: "Certificate of completion",
      educationalLevel: "Internship / entry level",
      inLanguage: "en-IN",
      recognizedBy: { "@type": "Organization", name: "Ideovent Technologies" },
    };
    if (issued) {
      node.identifier = issued.certificateId;
      if (issued.issuedAt) node.dateCreated = issued.issuedAt;
    }
    return node;
  }, [cert, certId]);

  let body: React.ReactNode;
  if (!certId) body = <SearchState />;
  // A certificate issued in /admin lives only in the store's rows. Until load()
  // answers, "not found" would be the same verdict a forgery gets, shown to
  // whoever scanned a real one. Say nothing until the store has answered.
  else if (!cert && loading) body = <div className="min-h-[50vh]" aria-busy="true" />;
  else if (!cert) body = <NotFoundState certId={certId} />;
  else if (cert.status === "revoked") body = <RevokedState cert={cert} />;
  else body = <ValidState cert={cert} />;

  return (
    <Layout>
      {/* /verify is the public entry point and is indexed. /verify/<ID> is NOT:
          each one renders a named intern's certificate, and the URL already
          travels on a printed QR code and a LinkedIn credential link, so it needs
          to be REACHABLE, not indexable. noindex keeps it working for anyone
          holding the ID while keeping a real person's record out of search
          results. The sitemap omits them for the same reason (see
          scripts/generate-sitemap.mjs). */}
      <Seo
        title={certId ? `Verify certificate ${certId}`: "Verify a certificate"}
        description={
          certId
            ? "Check an Ideovent Technologies internship certificate by its certificate ID."
: "Check whether an Ideovent Technologies internship certificate is genuine. Enter the certificate ID printed on it, or scan its QR code."
        }
        path={certId ? `/verify/${certId}`: "/verify"}
        noindex={Boolean(certId)}
        keywords={[
          "verify Ideovent internship certificate",
          "internship certificate verification India",
        ]}
        breadcrumbs={[{ name: "Verify a certificate", path: "/verify" }]}
        schema={schema}
      />
      {body}
    </Layout>
);
}

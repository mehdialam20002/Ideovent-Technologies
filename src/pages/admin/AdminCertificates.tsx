import { useCallback, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, X, Save, Search, ShieldCheck, ShieldX, QrCode,
  FileText, ImageIcon, AlertTriangle, Lock, Loader2, RotateCcw, Eye,
} from "lucide-react";

import type { Certificate, CertificateGrade } from "@/lib/cms/types";
import { useCollection, useCms } from "@/lib/cms/context";
import { ImageInput } from "@/admin/fields";
import QRGenerator from "@/components/QR/QRGenerator";
import CertificateTemplate, { type CertificateHandle } from "@/components/certificate/CertificateTemplate";
import { certificateFilename, downloadCertificatePdf, downloadCertificatePng } from "@/components/certificate/exportCertificate";
import type { CertificateArtData, DrawReport } from "@/components/certificate/artwork";
import { toArtData } from "@/components/certificate/artwork";
import { nextCertificateId } from "@/lib/certificateId";
import { CANONICAL_ORIGIN, PERMANENT_ORIGIN, canonicalVerifyLabel, canonicalVerifyUrl, isPreviewOrigin, printsNonPermanentUrl, verifyUrl } from "@/lib/verify";
import { cn } from "@/lib/utils";

/* `outline-none` beats the zero-specificity :where() focus rule in index.css
   AND Tailwind writes it as `outline: 2px solid transparent`, so every field in
   here signalled focus with a border colour alone. Same fix, same ring, as the
   CMS fields in src/admin/fields.tsx. */
const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors " +
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const emptyCert = (id: string): Certificate => ({
  id,
  certificateId: id,
  internName: "",
  designation: "Web Developer Intern",
  issuedBy: "Ideovent Technologies",
  programme: "Ideovent LaunchPad",
  duration: "",
  location: "",
  projectWork: "",
  profileImage: "",
  certificateImage: "",
  completion: "completed",
  status: "active",
  issuedAt: new Date().toISOString().slice(0, 10),
});

/** What the artwork needs, derived from the record being edited. */

export default function AdminCertificates() {
  const certs = useCollection("certificates");
  const grades = useCollection("certificateGrades");
  const { actions, mode } = useCms();

  const [editing, setEditing] = useState<Certificate | null>(null);
  const [gradeDraft, setGradeDraft] = useState<{ grade: string; note: string }>({ grade: "", note: "" });
  const [isNew, setIsNew] = useState(false);
  const [qrFor, setQrFor] = useState<Certificate | null>(null);
  const [revoking, setRevoking] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "revoked">("all");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"" | "png" | "pdf">("");
  const [exportNote, setExportNote] = useState("");
  const [report, setReport] = useState<(DrawReport & { missingFonts: string[] }) | null>(null);

  const certRef = useRef<CertificateHandle>(null);

  const existingIds = useMemo(() => certs.map((c) => c.certificateId).filter(Boolean), [certs]);
  const gradeFor = useCallback(
    (id: string) => (grades as CertificateGrade[]).find((g) => g.id === id),
    [grades]
);

  const filtered = certs.filter((c) => {
    const needle = q.trim().toLowerCase();
    const matchesQ =
      !needle ||
      [c.internName, c.certificateId, c.designation].some((v) => (v || "").toLowerCase().includes(needle));
    const matchesF = filter === "all" || c.status === filter;
    return matchesQ && matchesF;
  });

  const openNew = () => {
    const { id } = nextCertificateId(existingIds);
    setEditing(emptyCert(id));
    setGradeDraft({ grade: "", note: "" });
    setIsNew(true);
    setExportNote("");
  };

  const openEdit = (c: Certificate) => {
    const g = gradeFor(c.certificateId);
    setEditing({...c });
    setGradeDraft({ grade: g?.grade ?? "", note: g?.note ?? "" });
    setIsNew(false);
    setExportNote("");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await actions.saveDoc("certificates", {...editing, id: editing.certificateId });
      // The grade is written to its own collection, not onto the certificate.
      const trimmed = gradeDraft.grade.trim();
      if (trimmed || gradeDraft.note.trim()) {
        await actions.saveDoc("certificateGrades", {
          id: editing.certificateId,
          grade: trimmed,
          note: gradeDraft.note.trim(),
        } as CertificateGrade);
      } else if (gradeFor(editing.certificateId)) {
        await actions.removeDoc("certificateGrades", editing.certificateId);
      }
      setEditing(null);
      setIsNew(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmRevoke = async () => {
    if (!revoking) return;
    await actions.saveDoc("certificates", {
...revoking,
      status: "revoked",
      revokedReason: revokeReason.trim(),
      revokedAt: new Date().toISOString().slice(0, 10),
    });
    setRevoking(null);
    setRevokeReason("");
  };

  const reactivate = async (c: Certificate) => {
    await actions.saveDoc("certificates", {...c, status: "active", revokedReason: "", revokedAt: "" });
  };

  const download = async (kind: "png" | "pdf") => {
    if (!editing || !certRef.current) return;
    setBusy(kind);
    setExportNote("");
    try {
      const canvas = await certRef.current.renderTo();
      const base = certificateFilename(editing.internName, editing.certificateId);
      const res =
        kind === "png"
          ? await downloadCertificatePng(canvas, base)
: await downloadCertificatePdf(canvas, base, {
              title: `${editing.internName || "Certificate"} · ${editing.certificateId}`,
            });
      setExportNote(
        `${res.filename} · ${res.widthPx}×${res.heightPx} px at ${res.dpi} DPI · ${(res.bytes / 1024 / 1024).toFixed(2)} MB`
);
    } catch (e) {
      setExportNote(`Export failed: ${e instanceof Error ? e.message: String(e)}`);
    } finally {
      setBusy("");
    }
  };

  const field = (label: string, key: keyof Certificate, placeholder = "", full = false, help?: string) => (
    <div className={cn(full && "sm:col-span-2")}>
      <label htmlFor={`cert-${key}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`cert-${key}`}
        className={inputCls}
        value={((editing as Certificate)[key] as string) ?? ""}
        placeholder={placeholder}
        onChange={(e) => setEditing({...(editing as Certificate), [key]: e.target.value })}
      />
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
    </div>
);

  /* Memoised, and it matters. Built inline, this object had a new identity on
     every render; the template's paint callback depends on it, the template
     reports its geometry back into state here, and that state update re-rendered
     this component: a loop React stops with "Maximum update depth exceeded".
     See the note in CertificateTemplate.tsx. */
  const previewData = useMemo(() => (editing ? toArtData(editing, false, canonicalVerifyLabel(editing.certificateId)): null), [editing]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Certificates &amp; QR</h1>
            <p className="text-sm text-muted-foreground">
              {certs.length} issued · {certs.filter((c) => c.status === "revoked").length} revoked · verify at /verify/: id
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Issue certificate
        </button>
      </div>

      {/* The warning that actually matters, and it is about the paper rather than
          about this browser tab. A QR is permanent: if what it encodes is a host
          name Ideovent does not own, every certificate printed today dies the day
          that host stops answering, and there is no quiet way to re-issue one that
          is already in somebody's hand. This is deliberately above the issue
          button rather than beside it. */}
      {printsNonPermanentUrl() && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/5 p-3.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Every QR printed now encodes{" "}
              <span className="font-mono">{CANONICAL_ORIGIN}</span></span>, which is not{" "}
              <span className="font-mono text-foreground">{PERMANENT_ORIGIN}</span>. That address belongs
              to the host, not to Ideovent. If the project is ever renamed, moved or deleted, every
              certificate already in somebody's hand stops verifying, and a printed QR cannot be
              re-issued quietly.
            </p>
            <p className="mt-2">
              Before printing a batch, do one of two things: point{" "}
              <span className="font-mono text-foreground">VITE_PUBLIC_URL</span> at the real domain once
              it resolves, or accept it and keep this deployment's address alive permanently. Issuing
              is not blocked, because for a certificate you are only going to email, it does not matter.
            </p>
          </div>
        </div>
      )}

      {/* Where this session is running, which is a smaller question. The QR is
          canonical whatever machine renders it, so a localhost admin can no
          longer print a localhost QR; this only reminds you to scan one on
          mobile data before sending it out. */}
      {isPreviewOrigin() && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-warning/5 p-3.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-muted-foreground">
            This admin session is not on the public site. QR codes are still generated against{" "}
            <span className="font-mono text-foreground">{CANONICAL_ORIGIN}</span>, never this origin. But{" "}
            <span className="font-medium text-foreground">that domain must actually resolve</span> before a
            printed certificate is worth anything. Scan one with a phone on mobile data before you send it.
          </p>
        </div>
)}

      {mode === "local" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-border bg-muted/40 p-3.5 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">
            Local mode: everything you save lives in <span className="font-mono">localStorage</span> in this
            browser only. Nobody else can verify a certificate issued here. Wire Supabase before issuing a real
            one, see <span className="font-mono">SUPABASE_SETUP.md</span>.
          </p>
        </div>
)}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="cert-search"
            aria-label="Search certificates by name, ID or designation"
            className={cn(inputCls, "pl-9")}
            placeholder="Search by name, ID or designation"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter certificates by status"
          className={cn(inputCls, "sm:w-56")}
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="revoked">Revoked only</option>
        </select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No certificates found.
          </div>
)}
        {filtered.map((c) => {
          const g = gradeFor(c.certificateId);
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.internName || "Unnamed"}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.designation} · <span className="font-mono">{c.certificateId}</span> · issued {c.issuedAt || ", "}
                  {g?.grade && (
                    <>
                      {" · "}
                      <span className="text-foreground" title="Admin only, never shown on the verification page">
                        rubric {g.grade}
                      </span>
                    </>
)}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs",
                  c.status === "active" ? "bg-success/15 text-success": "bg-destructive/15 text-destructive"
)}
              >
                {c.status}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQrFor(c)}
                  aria-label={`Show the QR code for ${c.certificateId}`}
                  title="QR"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                </button>
                {c.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRevoking(c);
                      setRevokeReason("");
                    }}
                    aria-label={`Revoke ${c.certificateId}`}
                    title="Revoke"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-destructive/50"
                  >
                    <ShieldX className="h-4 w-4" aria-hidden="true" />
                  </button>
): (
                  <button
                    type="button"
                    onClick={() => reactivate(c)}
                    aria-label={`Reinstate ${c.certificateId}`}
                    title="Reinstate"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
)}
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  aria-label={`Edit ${c.certificateId}`}
                  title="Edit"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <a
                  href={verifyUrl(c.certificateId)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open the verification page for ${c.certificateId}`}
                  title="Open verify page"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
);
        })}
      </div>

      {/* There is deliberately NO delete control.
          Two reasons, and both are load-bearing. A deleted certificate returns
          "not found" on /verify, which is exactly what a forgery returns, unfair
          to a holder whose record simply went missing. And the ID generator
          derives the next number from the records that exist, so deleting the
          highest one makes the next issue reuse its ID. Revoke instead. */}
      <p className="mt-4 text-xs text-muted-foreground">
        Certificates are never deleted, revoking keeps the record and shows an explicit revoked state on the
        verification page. See 13-launchpad/CERTIFICATE-SYSTEM.md §5.
      </p>

      {/* ── QR modal ─────────────────────────────────────── */}
      {qrFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setQrFor(null)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 font-display text-lg font-semibold">{qrFor.internName}</h3>
            <p className="mb-4 font-mono text-sm text-muted-foreground">{qrFor.certificateId}</p>
            <QRGenerator id={qrFor.certificateId} />
            <p className="mt-3 break-all text-xs text-muted-foreground">
              Encodes <span className="font-mono text-foreground">{canonicalVerifyUrl(qrFor.certificateId)}</span>
            </p>
          </div>
        </div>
)}

      {/* ── Revoke dialog ────────────────────────────────── */}
      {revoking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRevoking(null)}>
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold">Revoke {revoking.certificateId}?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The record stays. <span className="font-medium text-foreground">/verify/{revoking.certificateId}</span>{" "}
              will show an explicit &ldquo;this certificate has been revoked&rdquo; state instead of the holder&rsquo;s
              details. {revoking.internName || "The holder"} should be told the same day, and why.
            </p>
            <label htmlFor="revoke-reason" className="mt-4 mb-1 block text-sm font-medium">
              Reason (kept in the record, shown to nobody)
            </label>
            <textarea
              id="revoke-reason"
              className={cn(inputCls, "min-h-[72px]")}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Issued against the wrong rubric total; replaced by INT2026A76."
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={confirmRevoke}
                className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 font-medium text-destructive-foreground hover:opacity-90"
              >
                <ShieldX className="h-4 w-4" /> Revoke
              </button>
              <button onClick={() => setRevoking(null)} className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
)}

      {/* ── Issue / edit drawer ──────────────────────────── */}
      {editing && previewData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div
            className="h-full w-full max-w-4xl overflow-y-auto border-l border-border bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">{isNew ? "Issue": "Edit"} certificate</h2>
                <p className="text-sm text-muted-foreground">
                  ID <span className="font-mono text-foreground">{editing.certificateId}</span>
                  {isNew && " · generated, not typed"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close the certificate editor"
                title="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Live preview: the same drawing routine the export uses. */}
            <div className="mb-6">
              <CertificateTemplate
                ref={certRef}
                data={previewData}
                verifyUrl={canonicalVerifyUrl(editing.certificateId)}
                onReport={setReport}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => download("png")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/50 disabled:opacity-60"
                >
                  {busy === "png" ? <Loader2 className="h-4 w-4 animate-spin" />: <ImageIcon className="h-4 w-4" />}
                  PNG · 300 DPI
                </button>
                <button
                  type="button"
                  onClick={() => download("pdf")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary/50 disabled:opacity-60"
                >
                  {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" />: <FileText className="h-4 w-4" />}
                  PDF · A4 landscape
                </button>
                {report && (
                  <span className="text-xs text-muted-foreground">
                    QR {report.qrCodeMm.toFixed(1)} mm code · {report.qrModuleMm.toFixed(2)} mm module · level H
                  </span>
)}
              </div>
              {report?.missingFonts.length ? (
                <p className="mt-2 text-xs text-destructive">
                  These faces did not load and the artwork fell back to a system font:{" "}
                  {report.missingFonts.join(", ")}. Do not print this.
                </p>
): null}
              {exportNote && <p className="mt-2 text-xs text-muted-foreground">{exportNote}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* The ID is generated and then frozen. Editing it used to create a
                  SECOND record rather than renaming the first, because saveDoc
                  keys on it. So a typo silently orphaned the certificate whose
                  QR was already printed. */}
              <div>
                <label htmlFor="cert-id-display" className="mb-1 block text-sm font-medium">
                  Certificate ID
                </label>
                <input
                  id="cert-id-display"
                  className={cn(inputCls, "font-mono")}
                  value={editing.certificateId}
                  readOnly
                  aria-describedby="cert-id-help"
                />
                <p id="cert-id-help" className="mt-1.5 text-xs text-muted-foreground">
                  Auto-incremented from the highest ID already issued, so two certificates can never collide. It
                  cannot be edited: the ID is the record key and the thing printed on the paper.
                </p>
              </div>

              <div>
                <label htmlFor="cert-completion" className="mb-1 block text-sm font-medium">
                  Completion
                </label>
                <select
                  id="cert-completion"
                  className={inputCls}
                  value={editing.completion ?? "completed"}
                  onChange={(e) => setEditing({...editing, completion: e.target.value as Certificate["completion"] })}
                  aria-describedby="cert-completion-help"
                >
                  <option value="completed">Completed</option>
                  <option value="completed-with-distinction">Completed with distinction</option>
                </select>
                <p id="cert-completion-help" className="mt-1.5 text-xs text-muted-foreground">
                  This is what the public verification page shows, in place of the numeric grade.
                </p>
              </div>

              {field("Intern name", "internName", "Exactly as they spell it, ask, do not guess", true)}
              {field("Designation", "designation", "Web Developer Intern")}
              {field("Programme", "programme", "Ideovent LaunchPad")}
              {field("Issued by", "issuedBy")}
              {field("Duration", "duration", "June 2025 - August 2025")}
              {field("Issued on", "issuedAt", "YYYY-MM-DD")}
              {field("Location", "location", "Delhi, India", false, "Optional. Leave blank rather than guessing a city.")}

              <div className="sm:col-span-2">
                <label htmlFor="cert-project-work" className="mb-1 block text-sm font-medium">
                  Project work
                </label>
                <textarea
                  id="cert-project-work"
                  className={cn(inputCls, "min-h-[80px]")}
                  value={editing.projectWork}
                  onChange={(e) => setEditing({...editing, projectWork: e.target.value })}
                  aria-describedby="cert-project-help"
                />
                <p id="cert-project-help" className="mt-1.5 text-xs text-muted-foreground">
                  One factual sentence about what they actually built. Never name a client unless that client has
                  agreed in writing. Two lines fit on the certificate; longer text is trimmed in the artwork.
                </p>
              </div>

              {/* ── ADMIN ONLY ───────────────────────────── */}
              <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Admin only: never published</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Stored in the <span className="font-mono">certificateGrades</span> collection, which
                  <span className="font-mono"> supabase/migrations/0002</span> excludes from the public read
                  policy. It is not on the certificate record, not in{" "}
                  <span className="font-mono">public/certificates.json</span>, and not in the JS bundle. Confirmed
                  by Mehdi, 24 Sep 2026: numeric grades do not appear on the verification page.
                </p>
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <div>
                    <label htmlFor="cert-grade" className="mb-1 block text-sm font-medium">
                      Rubric total / 100
                    </label>
                    <input
                      id="cert-grade"
                      className={inputCls}
                      inputMode="decimal"
                      value={gradeDraft.grade}
                      placeholder="e.g. 82.5"
                      onChange={(e) => setGradeDraft({...gradeDraft, grade: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="cert-grade-note" className="mb-1 block text-sm font-medium">
                      Note
                    </label>
                    <input
                      id="cert-grade-note"
                      className={inputCls}
                      value={gradeDraft.note}
                      placeholder="Band, who scored it, anything worth remembering"
                      onChange={(e) => setGradeDraft({...gradeDraft, note: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="cert-profile-image" className="mb-1.5 block text-sm font-medium">
                  Profile photo
                </label>
                <ImageInput
                  id="cert-profile-image"
                  describedBy="cert-profile-image-help"
                  value={editing.profileImage}
                  onChange={(v) => setEditing({...editing, profileImage: v })}
                />
                <p id="cert-profile-image-help" className="mt-1.5 text-xs text-muted-foreground">
                  Optional, and empty by default. The verification page shows an initials disc when there is no
                  photo. Only add a photograph the person has agreed <em>in writing</em> to have published, see
                  the consent line in CERTIFICATE-SYSTEM.md §6. And never one taken from a chat.
                </p>
              </div>

              <div>
                <label htmlFor="cert-certificate-image" className="mb-1.5 block text-sm font-medium">
                  Certificate scan (optional)
                </label>
                <ImageInput
                  id="cert-certificate-image"
                  describedBy="cert-certificate-image-help"
                  value={editing.certificateImage}
                  onChange={(v) => setEditing({...editing, certificateImage: v })}
                />
                <p id="cert-certificate-image-help" className="mt-1.5 text-xs text-muted-foreground">
                  Only needed for certificates produced before this template existed. New ones are generated
                  above. Must be a file on Ideovent&rsquo;s own domain or in the Supabase media bucket: never a
                  free image host.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={save}
                disabled={saving || !editing.internName.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving…": isNew ? "Save & issue": "Save"}
              </button>
              <button onClick={() => setEditing(null)} className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted">
                Cancel
              </button>
              {!editing.internName.trim() && (
                <span className="self-center text-xs text-muted-foreground">An intern name is required.</span>
)}
            </div>
          </div>
        </div>
)}
    </div>
);
}

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Search, ShieldCheck, ShieldX, QrCode } from "lucide-react";
import type { Certificate } from "@/lib/cms/types";
import { useCollection, useCms } from "@/lib/cms/context";
import { ImageInput } from "@/admin/fields";
import QRGenerator from "@/components/QR/QRGenerator";
import { verifyUrl } from "@/lib/verify";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function newCertId(existing: string[]): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 50; attempt++) {
    let s = "";
    for (let i = 0; i < 3; i++) s += chars[Math.floor(Math.random() * chars.length)];
    const id = `INT${year}${s}`;
    if (!existing.includes(id)) return id;
  }
  return `INT${year}${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

const emptyCert = (existing: string[]): Certificate => {
  const id = newCertId(existing);
  return {
    id, certificateId: id, internName: "", designation: "", issuedBy: "Ideovent Technologies",
    duration: "", grade: "", location: "", projectWork: "", profileImage: "", certificateImage: "",
    status: "active", issuedAt: new Date().toISOString().slice(0, 10),
  };
};

export default function AdminCertificates() {
  const certs = useCollection("certificates");
  const { actions } = useCms();
  const [editing, setEditing] = useState<Certificate | null>(null);
  const [qrFor, setQrFor] = useState<Certificate | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [saving, setSaving] = useState(false);

  const designations = useMemo(() => ["All", ...Array.from(new Set(certs.map((c) => c.designation).filter(Boolean)))], [certs]);
  const filtered = certs.filter((c) => {
    const matchesQ = [c.internName, c.certificateId, c.designation].some((v) => v?.toLowerCase().includes(q.toLowerCase()));
    const matchesF = filter === "All" || c.designation === filter;
    return matchesQ && matchesF;
  });

  const existingIds = certs.map((c) => c.certificateId);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await actions.saveDoc("certificates", { ...editing, id: editing.certificateId });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };
  const toggleRevoke = async (c: Certificate) => {
    await actions.saveDoc("certificates", { ...c, status: c.status === "active" ? "revoked" : "active" });
  };
  const remove = async (c: Certificate) => {
    if (confirm(`Delete certificate ${c.certificateId}?`)) await actions.removeDoc("certificates", c.id);
  };

  const field = (label: string, key: keyof Certificate, placeholder = "", full = false) => (
    <div className={cn(full && "sm:col-span-2")}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input className={inputCls} value={(editing as any)[key] ?? ""} placeholder={placeholder} onChange={(e) => setEditing({ ...(editing as Certificate), [key]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Certificates & QR</h1>
            <p className="text-sm text-muted-foreground">{certs.length} issued · verify at /verify/:id</p>
          </div>
        </div>
        <button onClick={() => setEditing(emptyCert(existingIds))} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Issue certificate
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={cn(inputCls, "pl-9")} placeholder="Search by name, ID or designation" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={cn(inputCls, "sm:w-64")} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {designations.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No certificates found.</div>}
        {filtered.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
            <img src={c.profileImage || "/placeholder.svg"} alt="" className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.internName || "Unnamed"}</p>
              <p className="truncate text-sm text-muted-foreground">{c.designation} · {c.certificateId}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs", c.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{c.status}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setQrFor(c)} title="QR" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"><QrCode className="h-4 w-4" /></button>
              <button onClick={() => toggleRevoke(c)} title={c.status === "active" ? "Revoke" : "Reactivate"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50">{c.status === "active" ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</button>
              <button onClick={() => setEditing({ ...c })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(c)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* QR modal */}
      {qrFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setQrFor(null)}>
          <div className="w-full max-w-xs rounded-3xl border border-border bg-background p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-display text-lg font-semibold">{qrFor.internName}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{qrFor.certificateId}</p>
            <QRGenerator id={qrFor.certificateId} />
            <a href={verifyUrl(qrFor.certificateId)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary link-underline">Open verify page →</a>
          </div>
        </div>
      )}

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">{existingIds.includes(editing.certificateId) && certs.find((x) => x.certificateId === editing.certificateId) ? "Edit" : "Issue"} certificate</h2>
              <button onClick={() => setEditing(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("Certificate ID", "certificateId", "INT2025ABC")}
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                  <option value="active">active</option>
                  <option value="revoked">revoked</option>
                </select>
              </div>
              {field("Intern name", "internName", "Full name", true)}
              {field("Designation", "designation", "Web Developer Intern")}
              {field("Issued by", "issuedBy")}
              {field("Duration", "duration", "June 2025 - August 2025")}
              {field("Grade (%)", "grade", "86.2")}
              {field("Location", "location", "Deoria, India")}
              {field("Issued on", "issuedAt", "YYYY-MM-DD")}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Project work</label>
                <textarea className={cn(inputCls, "min-h-[80px]")} value={editing.projectWork} onChange={(e) => setEditing({ ...editing, projectWork: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Profile photo</label>
                <ImageInput value={editing.profileImage} onChange={(v) => setEditing({ ...editing, profileImage: v })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Certificate image</label>
                <ImageInput value={editing.certificateImage} onChange={(v) => setEditing({ ...editing, certificateImage: v })} />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(null)} className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

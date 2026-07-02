import { Trash2, Mail, Phone, GraduationCap, Check } from "lucide-react";
import { useCollection, useCms } from "@/lib/cms/context";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  verified: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
};

export default function AdminApplications() {
  const apps = [...useCollection("applications")].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  const { actions } = useCms();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Internship applications</h1>
          <p className="text-sm text-muted-foreground">{apps.length} total</p>
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No applications yet.</div>
      ) : (
        <div className="grid gap-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.fullName}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", statusStyle[a.paymentStatus])}>{a.paymentStatus}</span>
                    {a.seatConfirmed && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase text-primary">seat confirmed</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.college} · {a.stream}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" /> {a.email}</a>
                    <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" /> {a.phone}</a>
                  </div>
                  {a.notes && <p className="mt-2 rounded-xl bg-muted/40 p-2.5 text-sm">{a.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <select
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    value={a.paymentStatus}
                    onChange={(e) => actions.saveDoc("applications", { ...a, paymentStatus: e.target.value as any })}
                  >
                    <option value="pending">pending</option>
                    <option value="verified">verified</option>
                    <option value="failed">failed</option>
                  </select>
                  <button onClick={() => actions.saveDoc("applications", { ...a, seatConfirmed: !a.seatConfirmed })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:border-primary/50">
                    <Check className="h-3 w-3" /> {a.seatConfirmed ? "Unconfirm" : "Confirm seat"}
                  </button>
                  <button onClick={() => confirm("Delete this application?") && actions.removeDoc("applications", a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(a.submittedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

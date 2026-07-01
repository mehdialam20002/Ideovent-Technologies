import { Trash2, Mail, Phone, Inbox } from "lucide-react";
import { useCollection, useCms } from "@/lib/cms/context";
import { cn } from "@/lib/utils";

export default function AdminSubmissions() {
  const subs = [...useCollection("submissions")].sort((a, b) => (b.receivedAt || "").localeCompare(a.receivedAt || ""));
  const { actions } = useCms();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Inbox className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Contact leads</h1>
          <p className="text-sm text-muted-foreground">{subs.length} total</p>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No messages yet.</div>
      ) : (
        <div className="grid gap-3">
          {subs.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", s.status === "new" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{s.status}</span>
                    <span className="text-xs text-muted-foreground">· {s.sourcePage}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" /> {s.email}</a>
                    {s.phone && <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" /> {s.phone}</a>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === "new" && <button onClick={() => actions.saveDoc("submissions", { ...s, status: "read" })} className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/50">Mark read</button>}
                  <button onClick={() => confirm("Delete this lead?") && actions.removeDoc("submissions", s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm">{s.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(s.receivedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

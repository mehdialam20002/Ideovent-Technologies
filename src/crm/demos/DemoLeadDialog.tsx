import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link2, Search, UserPlus } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import { demoContact, leadKindForDemo, matchLeadForDemo } from "@/lib/outreach/demoLead";
import type { LeadKind, OutreachLead } from "@/lib/outreach/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KIND_LABEL, LEAD_KINDS, prettyPhone } from "@/admin/outreach/ui";
import { searchLeads } from "../GlobalSearch";
import { crm, StatusDot } from "../ui";
import { cn } from "@/lib/utils";
import type { NewLeadFromDemo } from "./useDemoActions";

export type DemoLeadMode = "create" | "link";

/**
 * "Create lead" and "Link to lead" for one demo, in one dialog.
 *
 * Create is prefilled from the demo: name, kind, city, and the institute's
 * phone and email ONLY when the demo record carries them (a template copy
 * has its contact cleared, so it usually does not). If the institute already
 * looks like a lead (same name and city, or same contact), the dialog says so
 * and offers to link instead, so nobody gets messaged twice.
 */
export function DemoLeadDialog({
  demo, mode, leads, onMode, onClose, onCreate, onLink,
}: {
  demo: DemoSite;
  mode: DemoLeadMode;
  leads: OutreachLead[];
  onMode: (m: DemoLeadMode) => void;
  onClose: () => void;
  onCreate: (v: NewLeadFromDemo) => Promise<void>;
  onLink: (lead: OutreachLead) => Promise<void>;
}) {
  const c = demoContact(demo);
  const [v, setV] = useState<NewLeadFromDemo>({
    instituteName: demo.instituteName || "",
    // A dental demo's lead starts as a dental lead (leadKindForDemo maps "dental" since 28 Sep 2026).
    kind: leadKindForDemo(demo.kind),
    city: demo.city || "",
    phone: c.phone || c.whatsapp || "",
    email: c.email || "",
  });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const match = useMemo(() => matchLeadForDemo(leads, { ...demo, instituteName: v.instituteName, city: v.city }), [leads, demo, v.instituteName, v.city]);
  const results = useMemo(() => (q.trim() ? searchLeads(leads, q, 30) : leads.slice(0, 30)), [leads, q]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message || "That did not save.");
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.instituteName.trim()) return setErr(v.kind === "dental" ? "Type the clinic's name." : "Type the institute's name.");
    void run(() => onCreate(v));
  };
  const set = (k: keyof NewLeadFromDemo) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-xl p-5">
        <DialogHeader>
          <DialogTitle className="text-base">{mode === "create" ? "Create a lead for this demo" : "Link this demo to a lead"}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {demo.instituteName} · /site/{demo.slug}
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex w-fit rounded-lg bg-muted p-1" role="tablist" aria-label="Create or link">
          {(["create", "link"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => onMode(m)}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium", mode === m ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {m === "create" ? <UserPlus className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {m === "create" ? "New lead" : "Existing lead"}
            </button>
          ))}
        </div>

        {mode === "create" ? (
          <form onSubmit={submit} className="grid gap-3" data-testid="demo-create-lead">
            {match && match.by !== "demo" && (
              <div role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-[13px]">
                <p>
                  <span className="font-medium">{match.lead.instituteName}</span> is already a lead
                  {match.by === "name" ? " with this name" : " with this phone or email"}.
                </p>
                <button type="button" className={cn(crm.btn, "mt-2")} disabled={busy} onClick={() => void run(() => onLink(match.lead))}>
                  <Link2 className="h-4 w-4" aria-hidden="true" /> Link to {match.lead.instituteName} instead
                </button>
              </div>
            )}
            <L id="dl-name" label={v.kind === "dental" ? "Clinic name" : "Institute name"}><input id="dl-name" className={crm.input} value={v.instituteName} onChange={set("instituteName")} required /></L>
            <div className="grid grid-cols-2 gap-3">
              <L id="dl-kind" label="Kind">
                <select id="dl-kind" className={crm.input} value={v.kind} onChange={(e) => setV((x) => ({ ...x, kind: e.target.value as LeadKind }))}>
                  {LEAD_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </L>
              <L id="dl-city" label="City"><input id="dl-city" className={crm.input} value={v.city} onChange={set("city")} /></L>
            </div>
            <L id="dl-contact" label="Contact person (optional)"><input id="dl-contact" className={crm.input} value={v.contactName || ""} onChange={set("contactName")} /></L>
            <div className="grid grid-cols-2 gap-3">
              <L id="dl-phone" label="Phone"><input id="dl-phone" className={crm.input} inputMode="tel" value={v.phone} onChange={set("phone")} placeholder={c.phone || c.whatsapp ? "" : "Not on the demo"} /></L>
              <L id="dl-email" label="Email"><input id="dl-email" className={crm.input} inputMode="email" value={v.email} onChange={set("email")} placeholder={c.email ? "" : "Not on the demo"} /></L>
            </div>
            {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={crm.btn} onClick={onClose} disabled={busy}>Cancel</button>
              <button type="submit" className={crm.btnPrimary} disabled={busy}>{busy ? "Saving..." : "Create lead"}</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-2" data-testid="demo-link-lead">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="dl-search" className="sr-only">Search leads</label>
              <input id="dl-search" autoFocus className={cn(crm.input, "pl-9")} placeholder="Search by name, city, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
              {results.map((l) => (
                <li key={l.id}>
                  <button type="button" disabled={busy} onClick={() => void run(() => onLink(l))}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                    <StatusDot status={l.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.instituteName}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {[l.city, prettyPhone(l.phone) || l.email, l.demoSlug ? `has /site/${l.demoSlug}` : ""].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="text-[12px] text-primary">Link</span>
                  </button>
                </li>
              ))}
              {!results.length && <li className="px-3 py-3 text-[13px] text-muted-foreground">No lead matches. Use New lead instead.</li>}
            </ul>
            {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[12px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

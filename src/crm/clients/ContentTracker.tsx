import { useState } from "react";
import type { ContentRow, CrmProject } from "@/lib/clients/types";
import { fmtDate } from "@/lib/clients/numbering";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { useClients } from "./useClients";
import { errText, inputCls, Problem } from "./shared";

const STATUS: { value: ContentRow["status"]; label: string }[] = [
  { value: "not_started", label: "Not started" }, { value: "in_progress", label: "In progress" }, { value: "delivered", label: "Delivered" },
  { value: "approved", label: "Approved" }, { value: "not_available", label: "Not available (decided)" },
];

/** The global assets of Content-Collection-Checklist section 3, adapted by kind (registration details only where they may lawfully be shown). */
export function standardRows(kind: string): ContentRow[] {
  const rows: [string, string, string?][] = [
    ["logo_vector", "Logo in vector form (.ai, .svg, .eps or .pdf)", "vector"],
    ["logo_variants", "Logo variants (light, dark, icon)"],
    ["colours", "Brand colours as hex codes, or written permission for Ideovent to choose"],
    ["fonts", "Fonts, with the licence for any paid font"],
    ["business", "Business details (name, address, phone, e-mail, hours)"],
    ...(kind === "school" || kind === "coaching" ? [["registration", "Registration or affiliation details, as they may lawfully be shown"] as [string, string]] : []),
    ["photos", "Photographs (own, recent), 1600px or wider, with the right to use them"],
    ["consent_people", "Consent for identifiable people in photographs"],
    ["testimonials", "Testimonials (only real, with written consent)"],
    ["video", "Video (if any)"],
    ["references", "Two or three reference sites they like and one they dislike, with why"],
  ];
  return rows.map(([id, label, format]) => ({ id, label, format, status: "not_started", group: "global" }));
}

/**
 * THE CONTENT TRACKER (client-process-spec 4.5; Content-Collection-Checklist): one row per global asset
 * and per page of SOW section 6, each with an owner on their side, a due date and a status. Rows chase
 * themselves through the content ladder (11.3). After the cut-off: "New content now comes through a
 * change request".
 */
export function ContentTracker({ project }: { project: CrmProject }) {
  const { saveProject, today, data } = useClients();
  const client = data.clients.find((c) => c.id === project.clientId);
  const [page, setPage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rows = project.content || [];
  const save = async (next: ContentRow[], detail: string) => {
    setErr(null);
    try {
      await saveProject(project.id, (p) => ({ ...p, content: next }), { type: "item", detail, data: { panel: "content" } });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const update = (id: string, patch: Partial<ContentRow>) => {
    const row = rows.find((r) => r.id === id);
    const moved = patch.status && patch.status !== row?.status ? { movedAt: new Date().toISOString() } : {};
    void save(rows.map((r) => (r.id === id ? { ...r, ...patch, ...moved } : r)), `Content: ${row?.label}${patch.status ? `, ${STATUS.find((s) => s.value === patch.status)?.label}` : ""}`);
  };
  const cutoffPassed = project.dates.contentCutoff && project.dates.contentCutoff < today;
  return (
    <div className="space-y-2" data-testid="content-tracker">
      {cutoffPassed && <p className="text-[12px] font-medium">New content now comes through a change request (cut-off {fmtDate(project.dates.contentCutoff!)}).</p>}
      {!rows.length && (
        <button type="button" className={crm.btnPrimary} onClick={() => void save(standardRows(client?.kind || "other"), "Content tracker: the standard rows added")} data-testid="content-standard">Add the standard rows</button>
      )}
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="grid gap-1.5 rounded-lg border border-border p-2 text-[12px] sm:grid-cols-[minmax(0,1fr)_140px_130px_150px]" data-testid="content-row" data-row={r.id}>
            <span className="self-center">{r.label}{r.group === "page" && <span className="text-muted-foreground"> (page)</span>}</span>
            <input aria-label={`Owner: ${r.label}`} className={cn(inputCls, "h-8")} placeholder="Owner on their side" defaultValue={r.owner || ""} onBlur={(e) => e.target.value !== (r.owner || "") && update(r.id, { owner: e.target.value })} />
            <input aria-label={`Due: ${r.label}`} type="date" className={cn(inputCls, "h-8")} defaultValue={r.due || ""} onBlur={(e) => e.target.value !== (r.due || "") && update(r.id, { due: e.target.value || undefined })} />
            <select aria-label={`Status: ${r.label}`} className={cn(inputCls, "h-8")} value={r.status} onChange={(e) => update(r.id, { status: e.target.value as ContentRow["status"] })} data-testid="content-status">
              {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {r.status === "not_available" && (
              <input aria-label={`Decision: ${r.label}`} className={cn(inputCls, "h-8 sm:col-span-4")} placeholder="The decision: a change request for paid copywriting, or the page leaves the scope" defaultValue={r.decision || ""} onBlur={(e) => update(r.id, { decision: e.target.value })} />
            )}
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (page.trim()) { void save([...rows, { id: `page_${Date.now().toString(36)}`, label: page.trim(), status: "not_started", group: "page" }], `Content: page ${page.trim()} added`); setPage(""); } }}>
        <input aria-label="A page of SOW section 6" className={inputCls} value={page} onChange={(e) => setPage(e.target.value)} placeholder="A page of SOW section 6 (text and images)" />
        <button type="submit" className={crm.btn}>Add page</button>
      </form>
      <Problem text={err} />
    </div>
  );
}

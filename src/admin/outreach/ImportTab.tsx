import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import { leadImportTemplateCsv, mapCsvRow, parseCsv, sameContact } from "@/lib/outreach/store";
import { downloadText } from "@/admin/downloadFile";
import type { ImportResult, LeadInput, OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { KIND_LABEL, btnPrimary, btnSecondary, cardCls, prettyPhone, textareaCls } from "./ui";
import { cn } from "@/lib/utils";

type PreviewRow =
  | { row: number; kind: "ok"; lead: LeadInput }
  | { row: number; kind: "dup"; lead: LeadInput; existing: string }
  | { row: number; kind: "skip"; reason: string };

/**
 * IMPORT: a CSV file or pasted text, previewed before anything is saved.
 *
 * Accepts the sales kit's LEAD-SHEET-TEMPLATE.csv columns and a plain sheet
 * (name, phone, email, city, type). The preview marks each row as new,
 * duplicate (same phone or email as a lead already here, or as an earlier
 * row) or skipped with the reason. Duplicates are skipped by default; "fill
 * empty fields" merges without ever overwriting what is already there.
 *
 * The whole file is saved in ONE write (see planImport in the store): leaving
 * the page mid-import cannot leave half of it behind. While it saves, the
 * browser asks before closing or reloading the tab.
 */

/** Guidance in the name itself: CSV has nowhere to put a note. */
const TEMPLATE_FILE = "ideovent-leads-import-template-replace-example-row.csv";
export function ImportTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { leads, importLeads } = useOutreach();
  const [text, setText] = useState("");
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "merge">("skip");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => (text.trim() ? parseCsv(text) : []), [text]);
  const preview = useMemo<PreviewRow[]>(() => {
    const seen: OutreachLead[] = [];
    return rows.map((r, i) => {
      const row = i + 2; // header is line 1
      const m = mapCsvRow(r);
      if ("skip" in m) return { row, kind: "skip", reason: m.skip };
      const q = { phone: m.lead.phone || m.lead.whatsapp, email: m.lead.email };
      const q2 = { phone: m.lead.whatsapp, email: undefined };
      const hit =
        leads.find((l) => sameContact(l, q) || (q2.phone && sameContact(l, q2))) ||
        seen.find((l) => sameContact(l, q) || (q2.phone && sameContact(l, q2)));
      seen.push({ ...(m.lead as OutreachLead), id: `row${row}` });
      if (hit) return { row, kind: "dup", lead: m.lead, existing: hit.id.startsWith("row") ? `row ${hit.id.slice(3)} of this file` : hit.instituteName };
      return { row, kind: "ok", lead: m.lead };
    });
  }, [rows, leads]);

  const counts = {
    ok: preview.filter((p) => p.kind === "ok").length,
    dup: preview.filter((p) => p.kind === "dup").length,
    skip: preview.filter((p) => p.kind === "skip").length,
  };

  const toWrite = counts.ok + (onDuplicate === "merge" ? counts.dup : 0);

  /* One write, but it still takes a moment on a slow line: ask before the tab closes. */
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await importLeads(rows, { onDuplicate });
      setResult(r);
      setText("");
    } catch (e) {
      setErr("Import failed, nothing was saved. Reason: " + ((e as Error).message || "unknown error") + ". Your list is still here; try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <h2 className="font-display text-lg font-semibold">Import leads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV or paste it below. The first line must be the column names. Works with the sales kit's
          LEAD-SHEET-TEMPLATE.csv, or a simple sheet with <code>name, phone, email, city, type</code>. Every row needs a
          name and a phone or email. Not sure of the columns? Download the import template: it has every column the
          importer reads and one example row (Example Public School) to replace with your own leads.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" aria-hidden="true" /> Choose CSV file
          </button>
          <button
            type="button"
            className={btnSecondary}
            data-testid="download-lead-template"
            onClick={() => downloadText(TEMPLATE_FILE, leadImportTemplateCsv(), "text/csv;charset=utf-8")}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download import template
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            aria-label="CSV file to import"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                setResult(null);
                setText(await f.text());
              }
              e.target.value = "";
            }}
          />
        </div>
        <label htmlFor="csv-text" className="mt-3 block text-sm font-medium">Or paste CSV</label>
        <textarea
          id="csv-text"
          rows={6}
          className={textareaCls + " font-mono text-xs sm:text-xs"}
          placeholder={"name,phone,email,city,type\nSunrise Public School,98100 12345,office@sunrise.example,Patna,school"}
          value={text}
          onChange={(e) => {
            setResult(null);
            setText(e.target.value);
          }}
        />
      </div>

      {result && (
        <div role="status" className="rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            Imported {result.added.length} {result.added.length === 1 ? "lead" : "leads"}.
            {result.duplicates.length > 0 && ` ${result.duplicates.length} duplicate${result.duplicates.length === 1 ? "" : "s"} ${onDuplicate === "merge" ? "merged" : "skipped"}.`}
            {result.skipped.length > 0 && ` ${result.skipped.length} skipped.`}
          </p>
          {result.skipped.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {result.skipped.map((s) => <li key={s.row}>Row {s.row}: {s.reason}</li>)}
            </ul>
          )}
          {result.added.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {result.added.slice(0, 12).map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => onOpen(l.id)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/50">
                    {l.instituteName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {err && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}

      {preview.length > 0 && (
        <div className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium" data-testid="import-summary">
              {preview.length} rows: {counts.ok} new, {counts.dup} duplicate, {counts.skip} skipped
            </p>
            <fieldset className="flex flex-wrap gap-3 text-sm">
              <legend className="sr-only">Duplicates</legend>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input type="radio" name="dup" checked={onDuplicate === "skip"} onChange={() => setOnDuplicate("skip")} /> Skip duplicates
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input type="radio" name="dup" checked={onDuplicate === "merge"} onChange={() => setOnDuplicate("merge")} /> Fill their empty fields
              </label>
            </fieldset>
          </div>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {preview.map((p) => (
              <li key={p.row} className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3 text-sm">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">Row {p.row}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    p.kind === "ok" ? "bg-success/15 text-success" : p.kind === "dup" ? "bg-warning/20 text-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {p.kind === "ok" ? "New" : p.kind === "dup" ? "Duplicate" : "Skipped"}
                </span>
                {p.kind === "skip" ? (
                  <span className="min-w-0 flex-1 text-muted-foreground">{p.reason}</span>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{p.lead.instituteName}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {[KIND_LABEL[p.lead.kind || "other"], p.lead.city, prettyPhone(p.lead.phone || p.lead.whatsapp), p.lead.email].filter(Boolean).join(" · ")}
                    </span>
                    {p.kind === "dup" && <span className="block text-xs text-muted-foreground">Same contact as {p.existing}</span>}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className={btnPrimary + " mt-4 w-full sm:w-auto"} disabled={busy || toWrite === 0} onClick={run}>
            <Upload className="h-4 w-4" aria-hidden="true" />{" "}
            {busy ? `Saving ${toWrite} ${toWrite === 1 ? "lead" : "leads"}...` : `Import ${counts.ok} new ${counts.ok === 1 ? "lead" : "leads"}`}
          </button>
          {busy && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              Saving all {toWrite} in one go. Please stay on this page until it finishes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

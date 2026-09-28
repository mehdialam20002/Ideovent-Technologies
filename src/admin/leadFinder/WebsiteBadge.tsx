import { Loader2 } from "lucide-react";
import type { AuditVerdict, SiteAudit } from "@/lib/leadFinder/client";
import { cn } from "@/lib/utils";

export type AuditState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "error"; message: string }
  | { state: "done"; audit: SiteAudit };

const LABEL: Record<AuditVerdict, string> = { none: "None", broken: "Broken", poor: "Poor", ok: "OK" };
const TONE: Record<AuditVerdict, string> = {
  none: "border-destructive/40 bg-destructive/10 text-destructive",
  broken: "border-destructive/40 bg-destructive/10 text-destructive",
  poor: "border-warning/50 bg-warning/15 text-warning",
  ok: "border-success/40 bg-success/10 text-success",
};
const MEANING: Record<AuditVerdict, string> = {
  none: "No website",
  broken: "Website broken",
  poor: "Website poor",
  ok: "Website OK",
};

/**
 * The website verdict. Hover shows the evidence (title); a click unfolds it,
 * which is the way on a phone. None and Broken are the best leads: they need
 * a site. Poor needs theirs fixed. OK is shown plainly, not hidden.
 */
export function WebsiteBadge({ st }: { st: AuditState }) {
  if (st.state === "idle") return <span className="text-xs text-muted-foreground">Not checked</span>;
  if (st.state === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking
      </span>
    );
  }
  if (st.state === "error") return <span className="text-xs text-destructive" title={st.message}>Check failed</span>;
  const { audit } = st;
  const v = audit.verdict;
  const lines = audit.evidence.map((e) => e.text);
  const hover = lines.length ? `${MEANING[v]}: ${lines.join("; ")}` : MEANING[v];
  return (
    <details className="group min-w-0 max-w-full" data-verdict={v}>
      <summary
        title={hover}
        aria-label={`${MEANING[v]}. Show why`}
        className={cn(
          "inline-flex cursor-pointer list-none items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold [&::-webkit-details-marker]:hidden",
          TONE[v],
        )}
      >
        {LABEL[v]}
      </summary>
      <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
        {lines.length === 0 && <li>Opens fine on a phone, over HTTPS, with contact details.</li>}
        {lines.map((l, i) => (
          <li key={i} className="break-words">{l}</li>
        ))}
        {audit.ms !== null && v !== "none" && <li>Loaded in {(audit.ms / 1000).toFixed(1)} s</li>}
        {(audit.phones.length > 0 || audit.emails.length > 0) && (
          <li className="break-words">
            On their site: {[...audit.phones, ...audit.emails].join(", ")}
          </li>
        )}
      </ul>
    </details>
  );
}

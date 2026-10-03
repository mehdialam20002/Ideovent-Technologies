import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Megaphone } from "lucide-react";
import { loadStatus, type MetaStatusResult } from "@/lib/meta/client";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { fmtIstShort, type LineState } from "./metaUi";

/** The connection in one line, for the card on Settings. */
export function cardLine(r: MetaStatusResult | null): [LineState, string] {
  if (!r) return ["todo", "Checking..."];
  if (r.kind === "local") return ["todo", "Local mode: try one here with Simulate"];
  if (r.kind === "error") return [r.noApi ? "todo" : "warn", r.noApi ? "Runs on Vercel: nothing to check in the local dev server" : `Could not check: ${r.message}`];
  if (r.kind === "missing") return ["todo", r.needs0011 ? "Not set up yet: 0011 and 0012 are not run" : "Not set up yet: 0012 is not run"];
  const s = r.status;
  const stuck = s.counts.failedToken + s.counts.failedPermission;
  if (!s.connected) return ["todo", "Not connected yet: open to set it up"];
  if (!s.current) return ["warn", "The App Secret changed in Vercel: press Connect again"];
  if (r.pageMatches === false) return ["warn", "The Page id in Vercel is not the Page you connected"];
  if (stuck) return ["warn", `${stuck} ${stuck === 1 ? "lead is" : "leads are"} waiting: open to see why`];
  return ["done", s.lastLeadAt ? `Connected · last lead ${fmtIstShort(s.lastLeadAt)}` : "Connected · no lead yet"];
}

/**
 * Settings' first card (meta-leads-spec 6.1): what Meta Lead Ads is, its state
 * in one line, and Open. The check is the cheap GET (no call to Meta); local
 * mode makes no call at all.
 */
export function MetaSettingsCard() {
  const [r, setR] = useState<MetaStatusResult | null>(null);
  useEffect(() => {
    let live = true;
    loadStatus().then((x) => live && setR(x)).catch(() => live && setR({ kind: "error", message: "unknown" }));
    return () => {
      live = false;
    };
  }, []);
  const [state, line] = cardLine(r);
  return (
    <section data-testid="meta-settings-card" aria-labelledby="meta-card-h" className={cn(crm.panel, crm.panelPad, "flex flex-wrap items-center gap-3")}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Megaphone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="meta-card-h" className="text-[14px] font-semibold">Meta Lead Ads</h2>
        <p className="text-[13px] text-muted-foreground">Leads from your Facebook and Instagram forms arrive here by themselves.</p>
        <p data-testid="meta-card-state" data-state={state}
          className={cn("mt-0.5 text-[13px]", state === "done" ? "text-emerald-700 dark:text-emerald-300" : state === "warn" ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
          {line}
        </p>
      </div>
      <Link to={CRM.metaLeads} data-testid="meta-card-open" className={cn(crm.btn, "max-md:h-11 max-md:w-full")}>
        Open <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

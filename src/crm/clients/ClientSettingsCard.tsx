import { Link } from "react-router-dom";
import { ChevronRight, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useOptionalClients } from "./context";

/**
 * The card on /settings (10.5): what Client process is, how many documents are waiting on a Settings
 * field or a wording, and Open. Mehdi only, and only with the client files' provider mounted.
 */
export function ClientSettingsCard() {
  const clients = useOptionalClients();
  if (!clients) return null;
  const s = clients.data.settings;
  const missing = [
    !s.billing.signatory && "who signs",
    !s.billing.firmPan && "the firm's PAN",
    !s.billing.bankName && "the bank",
  ].filter(Boolean) as string[];
  const line = clients.status === "needs0014" ? "Not set up yet: 0014 is not run"
    : clients.status !== "ready" ? "Checking..."
      : missing.length ? `Still blank: ${missing.join(", ")}. Documents that print them cannot be issued yet.` : "The firm's details are in.";
  return (
    <section data-testid="client-settings-card" aria-labelledby="cs-card-h" className={cn(crm.panel, crm.panelPad, "flex flex-wrap items-center gap-3")}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FileSignature className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="cs-card-h" className="text-[14px] font-semibold">Client process</h2>
        <p className="text-[13px] text-muted-foreground">Billing details, policy numbers, number series and the wording to approve for client files.</p>
        <p className={cn("mt-0.5 text-[13px]", missing.length || clients.status !== "ready" ? "text-amber-800 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")} data-testid="client-settings-card-state">{line}</p>
      </div>
      <Link to={CRM.clientSettings} data-testid="client-settings-open" className={cn(crm.btn, "max-md:h-11 max-md:w-full")}>
        Open <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

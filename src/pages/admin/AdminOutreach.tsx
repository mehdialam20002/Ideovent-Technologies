import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ADMIN_DEVICE_KEY } from "@/lib/demo/opens";
import { AlertTriangle, Plus } from "lucide-react";
import { OutreachProvider, useOutreach } from "@/admin/outreach/useOutreach";
import { TodayTab } from "@/admin/outreach/TodayTab";
import { LeadsTab } from "@/admin/outreach/LeadsTab";
import { ImportTab } from "@/admin/outreach/ImportTab";
import { SettingsTab } from "@/admin/outreach/SettingsTab";
import { NewLeadForm } from "@/admin/outreach/NewLeadForm";
import { LeadPage } from "@/admin/outreach/LeadPage";
import { dueCount } from "@/admin/outreach/derive";
import { btnPrimary } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";

/**
 * OUTREACH, at /admin/outreach.
 *
 * Mehdi's cold outreach in one place: a lead goes in (phone and/or email),
 * a demo gets attached (existing or made from a template right here), a
 * ready-made message is picked, and one tap opens his own Gmail or WhatsApp
 * with it typed. He presses Send there. Nothing is sent from this app.
 *
 * One route, and the screen is chosen by the query string so the browser's
 * back button walks between a lead and the list:
 *   ?tab=today|leads|import|settings   the four tabs (today is the default)
 *   ?lead=<id>                         one lead, with the compose panel
 *   ?new=1                             the new lead form
 *
 * Leads live in their own store (src/lib/outreach/store.ts), never in the
 * CMS content, so they are not in the Export button's JSON either.
 */
const TABS = [
  { id: "today", label: "Today" },
  { id: "leads", label: "Leads" },
  { id: "import", label: "Import" },
  { id: "settings", label: "Settings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminOutreach() {
  // This browser is Mehdi's: his own demo opens from it never send an alert.
  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_DEVICE_KEY, "1");
    } catch {
      /* storage blocked: the alert's other admin checks still apply */
    }
  }, []);
  return (
    <OutreachProvider>
      <OutreachScreen />
    </OutreachProvider>
  );
}

function OutreachScreen() {
  const [params, setParams] = useSearchParams();
  const { loading, error, leads, mode } = useOutreach();
  const leadId = params.get("lead");
  const isNew = params.get("new") === "1";
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "today") as TabId;
  const due = dueCount(leads);

  const go = (next: Record<string, string>) => setParams(next);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">Outreach</h1>
          {/* One short line at most: the tabs and the list are what this screen is
              for. How sending works is said once, next to the Send button. */}
          {mode === "local" && <p className="text-xs text-muted-foreground">Leads stay in this browser (local mode).</p>}
        </div>
        {!isNew && (
          <button type="button" className={btnPrimary + " shrink-0"} onClick={() => go({ new: "1" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New lead
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : isNew ? (
        <NewLeadForm onCancel={() => go({ tab: "leads" })} onCreated={(id) => go({ lead: id })} onOpen={(id) => go({ lead: id })} />
      ) : leadId ? (
        // key: a new lead is a new screen. Nothing typed for one lead may survive into another.
        <LeadPage key={leadId} leadId={leadId} onBack={() => go({ tab: "leads" })} onOpen={(id) => go({ lead: id })} />
      ) : (
        <>
          <div role="tablist" aria-label="Outreach views" className="mb-5 flex gap-1 overflow-x-auto border-b border-border/70">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => go({ tab: t.id })}
                  className={cn(
                    "-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {t.id === "today" && due > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">{due}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div role="tabpanel">
            {tab === "today" && <TodayTab onOpen={(id) => go({ lead: id })} />}
            {tab === "leads" && <LeadsTab onOpen={(id) => go({ lead: id })} />}
            {tab === "import" && <ImportTab onOpen={(id) => go({ lead: id })} />}
            {tab === "settings" && <SettingsTab />}
          </div>
        </>
      )}
    </div>
  );
}

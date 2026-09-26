import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ADMIN_DEVICE_KEY } from "@/lib/demo/opens";
import { AlertTriangle, CalendarClock, List, Plus, Send, Settings, Upload } from "lucide-react";
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
  { id: "today", label: "Today", icon: CalendarClock },
  { id: "leads", label: "Leads", icon: List },
  { id: "import", label: "Import", icon: Upload },
  { id: "settings", label: "Settings", icon: Settings },
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
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Outreach</h1>
            <p className="text-sm text-muted-foreground">
              Lead, demo, message, one tap to Gmail or WhatsApp. You press Send.
              {mode === "local" && " Local mode: leads stay in this browser."}
            </p>
          </div>
        </div>
        {!isNew && (
          <button type="button" className={btnPrimary} onClick={() => go({ new: "1" })}>
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
        <LeadPage leadId={leadId} onBack={() => go({ tab: "leads" })} />
      ) : (
        <>
          <div role="tablist" aria-label="Outreach views" className="mb-5 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card/40 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => go({ tab: t.id })}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-medium sm:flex-row sm:gap-2 sm:text-sm",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {t.label}
                    {t.id === "today" && due > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{due}</span>
                    )}
                  </span>
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

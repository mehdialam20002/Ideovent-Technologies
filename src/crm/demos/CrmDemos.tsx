import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { useCrmData } from "../useCrmData";
import { useOpenLead } from "../nav";
import { MainSiteLink } from "../MainSiteLink";
import { crm, EmptyState, PageHeader } from "../ui";
import { cn } from "@/lib/utils";
import { DEMO_VIEWS, inView, sortItems, toItems, type DemoItem, type DemoSort, type DemoSortKey, type DemoView } from "./model";
import { DemoCards, DemoTable } from "./DemoTable";
import { DemoLeadDialog, type DemoLeadMode } from "./DemoLeadDialog";
import { useDemoActions } from "./useDemoActions";
import type { RowHandlers } from "./DemoActionsCell";

/**
 * /crm/demos: EVERY real demo, however it was made (template duplicate,
 * poster upload, the demo-sites editor, the Lead Finder), with where it came
 * from, its status, its opens and the lead it belongs to. A demo with no lead
 * is the "I made it and cannot track it" case (Mehdi, 28 Sep 2026), so that
 * view opens first while there are any, and every such row offers Create
 * lead and Link to lead.
 */
export default function CrmDemos() {
  const { metrics, slots, leads, loading, updateLead, addEvent } = useCrmData();
  const { createLead, linkLead, markSent, copyLink, refresh } = useDemoActions();
  const openLead = useOpenLead();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState<DemoSort>({ key: "created", dir: "desc" });
  const [dialog, setDialog] = useState<{ item: DemoItem; mode: DemoLeadMode } | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const all = useMemo(() => toItems(metrics.demos, slots), [metrics.demos, slots]);
  const unlinked = metrics.unlinkedDemos;
  const view = (params.get("view") as DemoView) || (unlinked > 0 ? "nolead" : "all");
  const q = params.get("q") || "";
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => Object.fromEntries(DEMO_VIEWS.map((v) => [v.id, all.filter((r) => inView(r, v.id)).length])) as Record<DemoView, number>, [all]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = all.filter((r) => inView(r, view) && (!n || `${r.demo.instituteName} ${r.demo.slug} ${r.demo.city || ""} ${r.lead?.instituteName || ""}`.toLowerCase().includes(n)));
    return sortItems(list, sort);
  }, [all, view, q, sort]);

  const onSort = (key: DemoSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "institute" || key === "lead" || key === "source" || key === "kind" || key === "status" ? "asc" : "desc" }));

  const say = (text: string, bad = false) => setMsg({ text, bad });
  const h: RowHandlers = {
    onCopy: async (i) => {
      const ok = await copyLink(i.demo.slug);
      say(ok ? `Link copied: /site/${i.demo.slug}${i.status !== "sent" ? ". It opens once the demo is marked sent." : ""}` : "Could not copy. Select the link and copy it by hand.", !ok);
      return ok;
    },
    onMarkSent: async (i) => {
      try {
        await markSent(i.demo, i.lead);
        say(`${i.demo.instituteName} is marked sent. Its link is live.`);
      } catch (e) {
        say(`Not marked sent: ${(e as Error).message || "unknown error"}`, true);
      }
    },
    onLead: (item, mode) => setDialog({ item, mode }),
  };

  const doLink = async (item: DemoItem, lead: OutreachLead) => {
    // One demo, one lead: moving it off a lead clears that lead's link.
    if (item.lead && item.lead.id !== lead.id) {
      await updateLead(item.lead.id, { demoId: undefined, demoSlug: undefined });
      await addEvent({ leadId: item.lead.id, type: "note", detail: `Demo /site/${item.demo.slug} moved to ${lead.instituteName}` });
    }
    await linkLead(item.demo, lead);
    setDialog(null);
    say(`/site/${item.demo.slug} is linked to ${lead.instituteName}.`);
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Demos"
        subtitle={`${all.length} ${all.length === 1 ? "demo" : "demos"}, ${unlinked} without a lead. Every demo shows here, however it was made.`}
        actions={
          <button type="button" className={crm.btn} onClick={() => void doRefresh()} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" /> Refresh
          </button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Demo views">
          {DEMO_VIEWS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => setParam("view", v.id)}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium", view === v.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
              {v.label} <span className={cn(crm.num, "text-[12px] text-muted-foreground", v.id === "nolead" && counts.nolead > 0 && "text-destructive")}>{counts[v.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="demo-q" className="sr-only">Search demos</label>
          <input id="demo-q" className={cn(crm.input, "pl-9")} placeholder="Search demos" value={q} onChange={(e) => setParam("q", e.target.value)} />
        </div>
      </div>

      <p aria-live="polite" className={cn("min-h-5 text-[13px]", msg?.bad ? "text-destructive" : "text-muted-foreground")}>{msg?.text}</p>

      {loading && !all.length ? (
        <EmptyState title="Loading demos..." />
      ) : !all.length ? (
        <EmptyState
          title="No demos yet."
          body="Make one from a template or a poster in the admin (Templates). It shows here with a lead, so you can track who opened it."
          action={<MainSiteLink path="/admin/templates" newTab className={crm.btn}>Open Templates</MainSiteLink>}
        />
      ) : !shown.length ? (
        <EmptyState title="No demo in this view." body={q ? "Clear the search, or pick another view." : "Pick another view above."} />
      ) : (
        <>
          <DemoTable items={shown} sort={sort} onSort={onSort} h={h} />
          <DemoCards items={shown} h={h} />
        </>
      )}

      {dialog && (
        <DemoLeadDialog
          demo={dialog.item.demo}
          mode={dialog.mode}
          leads={leads}
          onMode={(mode) => setDialog((d) => (d ? { ...d, mode } : d))}
          onClose={() => setDialog(null)}
          onLink={(lead) => doLink(dialog.item, lead)}
          onCreate={async (v) => {
            const lead = await createLead(dialog.item.demo, v);
            setDialog(null);
            openLead(lead.id);
          }}
        />
      )}
    </div>
  );
}

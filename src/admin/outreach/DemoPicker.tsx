import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ExternalLink, Files, Link2Off, Search, Send } from "lucide-react";
import type { DemoSite, DemoSiteSlot, PitchPage } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { demoStatus, demoPreviewPath } from "@/lib/demo/record";
import { TEMPLATES, loadTemplate, templateMeta, type TemplateId } from "@/lib/demo/templates";
import { fromTemplate, type DuplicateIdentity } from "@/lib/demo/templates/fromTemplate";
import { DuplicateTemplateDialog } from "@/admin/DuplicateTemplateDialog";
import { demoLinkFor, pitchLinkFor } from "@/lib/outreach/engine";
import type { OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { btnSecondary, inputCls } from "./ui";
import { cn } from "@/lib/utils";

type Mode = "existing" | "template" | "pitch";

/**
 * Step 1 of compose: which page does this lead get?
 *   - an existing demo (search by name or slug),
 *   - a new demo made from a template right here (the same Duplicate dialog
 *     the Templates tab uses, prefilled with the lead's name and city; the new
 *     draft is linked to the lead and we stay on this screen),
 *   - or a pitch page.
 * A demo's public link only works once it is marked Sent, so a draft gets a
 * one-tap "Mark sent to <lead>" here, which writes the same slot record the
 * Demo sites screen writes.
 */
export function DemoPicker({ lead }: { lead: OutreachLead }) {
  const { data, actions } = useCms();
  const { saveLead, addEvent } = useOutreach();
  const sites = ((data.demoSites as DemoSite[]) || []).filter((s) => !(s as any).isExample);
  const pitches = (data.pitchPages as PitchPage[]) || [];
  const slots = ((data as any).demoSiteSlots as DemoSiteSlot[]) || [];
  const [mode, setMode] = useState<Mode>(lead.pitchSlug && !lead.demoId ? "pitch" : "existing");
  const [q, setQ] = useState("");
  const [tpl, setTpl] = useState<TemplateId | "">("");
  const [asking, setAsking] = useState<TemplateId | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const demo = lead.demoId ? sites.find((s) => s.id === lead.demoId) : undefined;
  const demoState = demo ? demoStatus(demo) : null;

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = n
      ? sites.filter((s) => `${s.instituteName} ${s.slug} ${s.city || ""}`.toLowerCase().includes(n))
      : sites.filter((s) => (lead.kind === "other" ? true : s.kind === lead.kind));
    return list.slice(0, 8);
  }, [q, sites, lead.kind]);

  const templates = TEMPLATES.filter((t) => lead.kind === "other" || t.kind === lead.kind);

  const link = async (site: DemoSite) => {
    await saveLead({ ...lead, demoId: site.id, demoSlug: site.slug });
    await addEvent({ leadId: lead.id, type: "note", detail: `Demo linked: /site/${site.slug}` });
    setQ("");
  };

  const create = async (id: TemplateId, who: DuplicateIdentity) => {
    setBusy(true);
    setErr(null);
    try {
      const template = await loadTemplate(id);
      if (!template) throw new Error(`There is no template called ${id}.`);
      const copy = fromTemplate(template, { sites: (data.demoSites as DemoSite[]) || [], pitchPages: pitches }, who);
      await actions.saveDoc("demoSites", copy);
      await saveLead({ ...lead, demoId: copy.id, demoSlug: copy.slug });
      await addEvent({ leadId: lead.id, type: "note", detail: `Demo created from template ${templateMeta(id)?.label || id}: /site/${copy.slug}` });
      setAsking(null);
      setMode("existing");
    } catch (e) {
      setErr(`The demo was not made: ${(e as Error).message || "unknown error"}. Nothing was saved.`);
    } finally {
      setBusy(false);
    }
  };

  const markSent = async () => {
    if (!demo) return;
    const slot = slots.find((s) => s.id === demo.id) || { id: demo.id };
    await actions.saveDoc("demoSites", { ...demo, status: "sent" });
    await actions.saveDoc("demoSiteSlots", {
      ...slot,
      id: demo.id,
      sentTo: [lead.contactName, lead.instituteName].filter(Boolean).join(", "),
      sentAt: new Date().toISOString(),
    });
    await addEvent({ leadId: lead.id, type: "note", detail: `Demo /site/${demo.slug} marked sent` });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1" role="tablist" aria-label="Page to send">
        {([
          ["existing", "Demo site"],
          ["template", "New from template"],
          ["pitch", "Pitch page"],
        ] as const).map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={cn("min-h-11 rounded-lg px-1 text-xs font-medium sm:text-sm", mode === m ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {label}
          </button>
        ))}
      </div>

      {/* Current choice */}
      {(demo || lead.demoSlug) && (
        <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm" data-testid="linked-demo">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{demo?.instituteName || lead.demoSlug}</span>
            {demoState && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs", demoState === "sent" ? "bg-success/15 text-success" : "bg-warning/20")}>
                {demoState === "sent" ? "Sent: link is live" : `${demoState}: link shows a 404 until marked sent`}
              </span>
            )}
          </div>
          <p className="mt-1 break-all text-xs text-muted-foreground">{demoLinkFor(demo?.slug || lead.demoSlug)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {demo && demoState !== "sent" && (
              <button type="button" className={btnSecondary} onClick={() => void markSent()}>
                <Send className="h-4 w-4" aria-hidden="true" /> Mark sent to {lead.instituteName}
              </button>
            )}
            {demo && (
              <Link to={demoPreviewPath(demo.slug)} target="_blank" className={btnSecondary}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview
              </Link>
            )}
            {demo && (
              <Link to={`/admin/c/demoSites?edit=${encodeURIComponent(demo.id)}`} className={btnSecondary}>Edit demo</Link>
            )}
            <button type="button" className={btnSecondary} onClick={() => void saveLead({ ...lead, demoId: undefined, demoSlug: undefined })}>
              <Link2Off className="h-4 w-4" aria-hidden="true" /> Unlink
            </button>
          </div>
        </div>
      )}

      {mode === "existing" && (
        <div className="mt-3">
          <div className="relative">
            <label htmlFor="demo-search" className="sr-only">Search demo sites</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="demo-search" className={inputCls + " pl-9"} placeholder="Search demos by name or slug" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="mt-2 space-y-1.5">
            {matches.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => void link(s)} disabled={s.id === lead.demoId}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:border-primary/50 disabled:opacity-60">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.instituteName}</span>
                    <span className="block truncate text-xs text-muted-foreground">/site/{s.slug} · {demoStatus(s)}{s.city ? ` · ${s.city}` : ""}</span>
                  </span>
                  {s.id === lead.demoId ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <span className="text-xs text-primary">Use</span>}
                </button>
              </li>
            ))}
            {!matches.length && <li className="text-sm text-muted-foreground">No demo matches. Make one from a template.</li>}
          </ul>
        </div>
      )}

      {mode === "template" && (
        <div className="mt-3 space-y-2">
          <label htmlFor="tpl-pick" className="block text-sm font-medium">Template</label>
          <select id="tpl-pick" className={inputCls} value={tpl} onChange={(e) => setTpl(e.target.value as TemplateId)}>
            <option value="">Choose a template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.id.slice(0, 2).toUpperCase()} · {t.label}</option>
            ))}
          </select>
          {tpl && <p className="text-xs text-muted-foreground">{templateMeta(tpl)?.description}</p>}
          <button type="button" className={btnSecondary} disabled={!tpl} onClick={() => tpl && setAsking(tpl)}>
            <Files className="h-4 w-4" aria-hidden="true" /> Create demo for {lead.instituteName}
          </button>
        </div>
      )}

      {mode === "pitch" && (
        <div className="mt-3">
          <label htmlFor="pitch-pick" className="block text-sm font-medium">Pitch page</label>
          <select id="pitch-pick" className={inputCls} value={lead.pitchSlug || ""}
            onChange={(e) => void saveLead({ ...lead, pitchSlug: e.target.value || undefined })}>
            <option value="">None</option>
            {pitches.map((p) => (
              <option key={p.id} value={p.slug}>{p.instituteName} (/{p.slug}, {p.status})</option>
            ))}
          </select>
          {lead.pitchSlug && <p className="mt-1 break-all text-xs text-muted-foreground">{pitchLinkFor(lead.pitchSlug)}</p>}
        </div>
      )}

      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      {asking && (
        <DuplicateTemplateDialog
          templateLabel={templateMeta(asking)?.label || asking}
          busy={busy}
          error={err}
          initial={{ name: lead.instituteName, city: lead.city || "" }}
          onCancel={() => setAsking(null)}
          onSubmit={(who) => void create(asking, who)}
        />
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Check, ExternalLink, Files, Link2Off, Pencil, Search, Send } from "lucide-react";
import type { DemoSite, DemoSiteSlot, PitchPage } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { demoStatus, demoPreviewPath } from "@/lib/demo/record";
import { TEMPLATES, loadTemplate, templateMeta, type TemplateId } from "@/lib/demo/templates";
import { fromTemplate, type DuplicateIdentity } from "@/lib/demo/templates/fromTemplate";
import { dentalTemplateFor, looksDental } from "@/lib/demo/templates/dentalPick";
import { DuplicateTemplateDialog } from "@/admin/DuplicateTemplateDialog";
import { MainSiteLink } from "@/crm/MainSiteLink";
import { demoLinkFor, pitchLinkFor } from "@/lib/outreach/engine";
import type { OutreachLead } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { demosForPicker, markDemoSent } from "./demoActions";
import { KIND_LABEL, btnGhost, btnPrimary, btnSecondary, inputCls } from "./ui";
import { cn } from "@/lib/utils";

type Mode = "template" | "existing" | "pitch";

/** The demo record behind a lead: by id, else by slug (imported leads carry only the slug). */
export function leadDemo(lead: OutreachLead, sites: DemoSite[]): DemoSite | undefined {
  return (lead.demoId && sites.find((s) => s.id === lead.demoId)) || (lead.demoSlug ? sites.find((s) => s.slug === lead.demoSlug) : undefined);
}

/**
 * The template a lead's demo starts from: for a dental lead (or an "Other"
 * lead whose name says dental) the one dentalTemplateFor picks from its name,
 * notes, observation and tags (the CSV import keeps the sheet's segment, e.g.
 * DENTAL_KIDS, as a tag, and a segment decides first); for everyone else
 * nothing, so Mehdi chooses.
 */
export function dentalDefault(lead: Pick<OutreachLead, "kind" | "instituteName" | "notes" | "observation" | "tags">): TemplateId | "" {
  const words = [lead.instituteName, lead.notes, lead.observation];
  if (lead.kind === "dental" || (lead.kind === "other" && looksDental(...words))) return dentalTemplateFor(...words, ...(lead.tags || []));
  return "";
}

/**
 * STEP 1, DEMO: which page does this lead get?
 *
 * When one is linked, the step is one line: its name, its link, Open and
 * Change. Change (or no demo yet) shows the three ways to get one: make it
 * from a template right here (the Templates tab's Duplicate dialog,
 * prefilled with the lead's name and city), use an existing demo, or send a
 * pitch page. A demo's public link only works once it is marked Sent, so a
 * draft gets a one-tap "Mark sent", which writes the same slot record the
 * Demo sites screen writes.
 *
 * A dental clinic is offered the seven dental templates (d1 to d7), starting
 * on the one dentalTemplateFor picks from its name, notes and observation,
 * and "Use existing" lists the dental demos first. Open and Edit demo lead to
 * the main site (MainSiteLink), which is another origin once the CRM has its
 * own subdomain.
 */
export function DemoPicker({ lead }: { lead: OutreachLead }) {
  const { data, actions } = useCms();
  const { saveLead, addEvent } = useOutreach();
  const sites = ((data.demoSites as DemoSite[]) || []).filter((s) => !(s as DemoSite & { isExample?: boolean }).isExample);
  const pitches = (data.pitchPages as PitchPage[]) || [];
  const slots = (data as unknown as { demoSiteSlots?: DemoSiteSlot[] }).demoSiteSlots || [];
  const demo = leadDemo(lead, sites);
  const demoState = demo ? demoStatus(demo) : null;
  const slug = demo?.slug || lead.demoSlug;
  const hasPage = Boolean(slug || lead.pitchSlug);

  const [open, setOpen] = useState(!hasPage);
  const [mode, setMode] = useState<Mode>("template");
  const [q, setQ] = useState("");
  // A dental clinic starts on the dental template its own words point to (a kids' clinic on d6, an
  // implant centre on d4, else d1). Only a default, and it follows the lead (a kind changed to Dental
  // clinic under Edit) until Mehdi picks a template himself; every template of the kind stays listed.
  const suggested = dentalDefault(lead);
  const [picked, setTpl] = useState<TemplateId | "" | null>(null);
  const tpl = picked ?? suggested;
  const [asking, setAsking] = useState<TemplateId | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Every real demo, the lead's kind first, newest first; the list scrolls.
  const matches = useMemo(() => demosForPicker(sites, lead.kind, q), [q, sites, lead.kind]);

  const templates = TEMPLATES.filter((t) => lead.kind === "other" || t.kind === lead.kind);

  const link = async (site: DemoSite) => {
    await saveLead({ ...lead, demoId: site.id, demoSlug: site.slug });
    await addEvent({ leadId: lead.id, type: "note", detail: `Demo linked: /site/${site.slug}` });
    setQ("");
    setOpen(false);
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
      setOpen(false);
    } catch (e) {
      setErr(`The demo was not made: ${(e as Error).message || "unknown error"}. Nothing was saved.`);
    } finally {
      setBusy(false);
    }
  };

  const markSent = async () => {
    if (!demo) return;
    await markDemoSent(actions.saveDoc, demo, slots, [lead.contactName, lead.instituteName].filter(Boolean).join(", "));
    await addEvent({ leadId: lead.id, type: "note", detail: `Demo /site/${demo.slug} marked sent` });
  };

  const unlink = async () => {
    await saveLead({ ...lead, demoId: undefined, demoSlug: undefined });
    setOpen(true);
  };

  return (
    <div>
      {/* CURRENT */}
      {slug ? (
        <div data-testid="linked-demo" className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium">{demo?.instituteName || slug}</span>
            {demoState === "sent" && <span className="text-xs text-success">Sent: link is live</span>}
            {demoState && demoState !== "sent" && <span className="text-xs text-warning">{demoState}: link shows a 404 until marked sent</span>}
          </p>
          <p className="mt-0.5 break-all text-xs text-muted-foreground">{demoLinkFor(slug)}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {demo && demoState !== "sent" && (
              <button type="button" className={btnPrimary} onClick={() => void markSent()}>
                <Send className="h-4 w-4" aria-hidden="true" /> Mark sent to {lead.instituteName}
              </button>
            )}
            {demo ? (
              <MainSiteLink path={demoPreviewPath(demo.slug)} newTab className={btnGhost} data-testid="demo-open">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open
              </MainSiteLink>
            ) : (
              <a href={demoLinkFor(slug)} target="_blank" rel="noreferrer" className={btnGhost}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open
              </a>
            )}
            <button type="button" className={btnGhost} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Change
            </button>
          </div>
        </div>
      ) : lead.pitchSlug ? (
        <div className="min-w-0">
          <p className="text-sm font-medium">Pitch page</p>
          <p className="mt-0.5 break-all text-xs text-muted-foreground">{pitchLinkFor(lead.pitchSlug)}</p>
          <button type="button" className={btnGhost + " mt-1"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Change
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No demo yet. Make one from a template, it takes a minute.</p>
      )}

      {/* CHOOSER */}
      {open && (
        <div className="mt-3 rounded-xl bg-muted/40 p-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="How to get a page">
            {([
              ["template", "Create demo"],
              ["existing", "Use existing"],
              ["pitch", "Pitch page"],
            ] as const).map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={cn("min-h-11 rounded-full px-3 text-sm font-medium", mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>

          {mode === "template" && (
            <div className="mt-3 space-y-2">
              <label htmlFor="tpl-pick" className="block text-sm font-medium">Template</label>
              <select id="tpl-pick" className={inputCls + " mt-0"} value={tpl} onChange={(e) => setTpl(e.target.value as TemplateId)}>
                <option value="">Choose a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.id.slice(0, 2).toUpperCase()} · {t.label}{t.id === suggested ? " (suggested)" : ""}</option>
                ))}
              </select>
              {tpl && <p className="text-xs text-muted-foreground">{templateMeta(tpl)?.description}</p>}
              <button type="button" className={btnSecondary} disabled={!tpl} onClick={() => tpl && setAsking(tpl)}>
                <Files className="h-4 w-4" aria-hidden="true" /> Create demo for {lead.instituteName}
              </button>
            </div>
          )}

          {mode === "existing" && (
            <div className="mt-3">
              <div className="relative">
                <label htmlFor="demo-search" className="sr-only">Search demo sites</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input id="demo-search" className={inputCls + " mt-0 pl-9"} placeholder="Search demos by name or slug" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <ul className="mt-2 max-h-72 divide-y divide-border/60 overflow-y-auto overscroll-contain" data-testid="demo-existing-list">
                {matches.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => void link(s)} disabled={s.id === demo?.id}
                      className="flex min-h-11 w-full items-center justify-between gap-2 px-1 py-2 text-left text-sm hover:text-primary disabled:opacity-60">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.instituteName}</span>
                        <span className="block truncate text-xs text-muted-foreground">/site/{s.slug} · {KIND_LABEL[s.kind] || s.kind} · {demoStatus(s)}{s.city ? ` · ${s.city}` : ""}</span>
                      </span>
                      {s.id === demo?.id ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <span className="text-xs text-primary">Use</span>}
                    </button>
                  </li>
                ))}
                {!matches.length && <li className="py-2 text-sm text-muted-foreground">No demo matches. Create one from a template.</li>}
              </ul>
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
            </div>
          )}

          {(demo || slug) && (
            <div className="mt-3 flex flex-wrap gap-1 border-t border-border/60 pt-2">
              {demo && (
                <MainSiteLink path={`/admin/c/demoSites?edit=${encodeURIComponent(demo.id)}`} newTab className={btnGhost} data-testid="demo-edit">
                  Edit demo
                </MainSiteLink>
              )}
              <button type="button" className={btnGhost} onClick={() => void unlink()}>
                <Link2Off className="h-4 w-4" aria-hidden="true" /> Unlink demo
              </button>
            </div>
          )}
        </div>
      )}

      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      {asking && (
        <DuplicateTemplateDialog
          templateLabel={templateMeta(asking)?.label || asking}
          /* A dental template asks for the clinic's name, as the Templates tab's Duplicate does. */
          kind={templateMeta(asking)?.kind}
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

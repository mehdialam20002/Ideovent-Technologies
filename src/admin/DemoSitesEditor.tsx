import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Archive, Check, Copy, ExternalLink, Eye, Files, MonitorSmartphone,
  Pencil, Plus, Save, Search, Star, Trash2, X,
} from "lucide-react";
import type {
  DemoSite, DemoSiteSlot, DemoSiteOpen, DemoStatus, DemoKind, PitchPage,
} from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { nextId } from "@/lib/cms/store";
import {
  DEMO_SLUG_MAX, DEMO_STATUSES, DEMO_STATUS_HELP, DEMO_STATUS_LABEL,
  demoSitePath, demoSiteUrl, demoSlugify, demoStatus, isDemoExpired,
} from "@/lib/demo/record";
/* Imported straight from the guard, not through ./record or ./index: that
   module reaches the pitch guard, which holds the text of App.tsx and
   vercel.json so the reserved list IS the real route table. The admin is the
   only thing that validates a slug, and the admin is behind a lazy route, so
   the route table never lands in a chunk an institute downloads. */
import { demoSlugIssue, uniqueDemoSlug } from "@/lib/demo/reservedRoutes";
import {
  EMPTY_FILTERS, type DemoFilters, demoOpenStats, duplicatedSlot, editLockReason,
  editedLabel, matchesFilters, openLabel, slotFor, slotIndex, sortDemoSites,
} from "@/lib/demo/slots";
/* Meta and loaders only; no template content is imported here. */
import { templateMeta } from "@/lib/demo/templates";
import { hasProvisionalTemplateSlug } from "@/lib/demo/templates/fromTemplate";
import { AdminField } from "./fields";
import type { CollectionSchema } from "./schemas";
import { cn } from "@/lib/utils";

/**
 * The demo-site editor.
 *
 * Its own screen rather than the generic CollectionEditor, for the same reason
 * the pitch pages have one and then three more on top of it. What this
 * collection does that no other one does:
 *
 *   DUPLICATE IS THE PRIMARY VERB, NOT DELETE AND NOT EDIT. The second demo is
 *   the first demo with a different name on it, so duplicating is the thing
 *   Mehdi does most and it is the only row action with its own label and its
 *   own colour. It is also the escape route offered by the edit lock. The
 *   whole screen is arranged to make copying easier than reusing, because
 *   reusing a sent record is the failure this feature was built around: see
 *   the header of src/lib/demo/slots.ts for how that one goes wrong.
 *
 *   THE EDIT LOCK. A record whose status is Sent does not open straight into
 *   the form. It opens a dialog naming who has the link and when it went, and
 *   offering Duplicate first. A director who opens a link that has silently
 *   become another school's website does not complain, they just stop
 *   replying, so the warning has to arrive at the only moment it can still
 *   change anything.
 *
 *   MARKING IT SENT ASKS WHO. Not bookkeeping: `sentTo` and `sentAt` are what
 *   the edit lock reads. A publish button that did not ask would leave the
 *   lock with nothing to say, and the lock is the feature.
 *
 *   SEARCH AND THREE FILTERS, because at thirty rows the reason a record gets
 *   reused is that the free one could not be found.
 *
 *   A SLUG CHECKED AGAINST THE ROUTE TABLE AND AGAINST EVERY PITCH SLUG. The
 *   demo at /site/holy-cross and the pitch at /holy-cross are two different
 *   pages sent in two different conversations, and the wrong paste is a
 *   mistake nobody notices until the reply is strange.
 *
 *   COPY LINK gives the whole https:// address, because the next thing that
 *   happens after a save is a paste into WhatsApp.
 *
 * The FORM is the schema in ./schemas.ts, rendered with the same AdminField as
 * every other collection, so a field added there appears here with no work.
 * Only `slug`, `status` and `kind` are drawn by this component, and each for a
 * stated reason: the slug is validated, the status asks a question, and the
 * kind picks which of the two templates renders with no safe default.
 */

const STATUS_STYLES: Record<DemoStatus, string> = {
  free: "border-border text-muted-foreground",
  draft: "border-border text-muted-foreground",
  sent: "border-success/40 text-success",
  closed: "border-warning/40 text-warning",
};

const KIND_LABEL: Record<DemoKind, string> = {
  school: "School",
  coaching: "Coaching",
};

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DemoSitesEditor({ schema }: { schema: CollectionSchema }) {
  const { data, actions, mode } = useCms();

  /**
   * TRUE when no Supabase project is wired up, so every document lives in THIS
   * browser's localStorage and nowhere else.
   *
   * It matters more here than on any other collection, and more than it does
   * on the pitch pages. Everywhere else, local mode means an edit does not
   * reach the live site. Here it means the one thing this screen exists to do
   * fails silently: Mehdi builds a demo, the admin says it saved, Copy link
   * hands him a real https:// address, he pastes it into WhatsApp, and the
   * director opens the site's 404, on their phone, with nothing to tell him it
   * happened. It also makes the open counter meaningless, because an open is
   * written into the READER's browser. So the screen says both, at the top,
   * before the list.
   */
  const localOnly = mode !== "supabase";

  const sites = (data.demoSites as DemoSite[]) || [];
  const slots = (data.demoSiteSlots as DemoSiteSlot[]) || [];
  const opens = (data.demoSiteOpens as DemoSiteOpen[]) || [];
  const pitchPages = (data.pitchPages as PitchPage[]) || [];
  const host = data.settings?.defaultSeo?.canonicalHost || "";

  const slotsById = useMemo(() => slotIndex(slots), [slots]);

  const [filters, setFilters] = useState<DemoFilters>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<DemoSite | null>(null);
  const [draftSlot, setDraftSlot] = useState<DemoSiteSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  /** The record whose edit lock is being shown, if any. See slots.ts. */
  const [locked, setLocked] = useState<DemoSite | null>(null);
  /** The record being marked Sent, which asks who it is going to first. */
  const [sending, setSending] = useState<DemoSite | null>(null);
  const [sentTo, setSentTo] = useState("");

  const visible = useMemo(() => {
    const kept = sites.filter((s) => matchesFilters(s, slotFor(s.id, slots), filters));
    return sortDemoSites(kept, slotsById);
  }, [sites, slots, slotsById, filters]);

  const isNew = editing ? !sites.some((s) => s.id === editing.id) : false;
  const slugError = editing
    ? demoSlugIssue(editing.slug, { sites, pitchPages, currentId: editing.id })
    : null;
  const nameError =
    editing && !(editing.instituteName || "").trim()
      ? "An institute name is required. It is the masthead of what they will read as their own website."
      : null;

  /* ── Opening records ──────────────────────────────────────────────────── */

  const openForEdit = (site: DemoSite) => {
    setEditing({ ...site });
    setDraftSlot({ ...slotFor(site.id, slots) });
    setLocked(null);
  };

  /**
   * Edit goes through the lock. A Sent record opens the dialog instead of the
   * form; everything else opens straight into it, because a draft has gone
   * nowhere and a closed demo's link no longer works.
   */
  const requestEdit = (site: DemoSite) => {
    const lock = editLockReason(
      site,
      slotFor(site.id, slots),
      demoOpenStats(site.id, opens, mode),
    );
    if (lock) setLocked(site);
    else openForEdit(site);
  };

  /**
   * `?edit=<id>` opens that record, through the lock like any other Edit.
   * It is how the Templates tab hands over a demo it has just duplicated: the
   * copy is saved there, and the next thing Mehdi does is type the real name,
   * so it opens here in the form rather than as one more row to find. The
   * parameter is removed once used, so a reload does not reopen the form.
   */
  const [params, setParams] = useSearchParams();
  const editParam = params.get("edit");
  useEffect(() => {
    if (!editParam) return;
    const target = sites.find((s) => s.id === editParam);
    if (!target) return;
    requestEdit(target);
    setParams(
      (p) => {
        p.delete("edit");
        return p;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, sites]);

  const startNew = () => {
    setEditing(schema.defaults() as DemoSite);
    setDraftSlot(null);
  };

  /**
   * THE BUTTON THIS SCREEN IS ARRANGED AROUND.
   *
   * Copies everything except the slug, the status and the parts of the slot
   * that belong to a conversation the copy is not part of. The copy lands in
   * Draft so it cannot go out half-edited, and its name gets "(copy)" so the
   * two are never confused in the list. It opens immediately in the form,
   * because the next thing that happens is always renaming it.
   */
  const duplicate = (site: DemoSite) => {
    const id = nextId("ds");
    const copy: DemoSite = {
      ...site,
      id,
      status: "draft",
      isExample: false,
      instituteName: `${site.instituteName} (copy)`,
      slug: "",
      order: sites.length,
      /* Stamped fresh rather than inherited: a copy was built today, and the
         date is printed on the page. Expiry does not carry either, because it
         belonged to the original's conversation. */
      preparedOn: new Date().toISOString().slice(0, 10),
      expiresAt: "",
      createdAt: undefined,
      updatedAt: undefined,
    };
    copy.slug = uniqueDemoSlug(copy.instituteName, { sites, pitchPages, currentId: id });
    setEditing(copy);
    setDraftSlot(duplicatedSlot(slotFor(site.id, slots), id));
    setLocked(null);
  };

  /* ── Writing ──────────────────────────────────────────────────────────── */

  const save = async () => {
    if (!editing || slugError || nameError) return;
    setSaving(true);
    try {
      await actions.saveDoc("demoSites", editing);
      // The slot is a separate document in an admin-only collection, so it is
      // saved separately. Only when it holds something, so an untouched record
      // does not litter the private collection with empty rows.
      const s = draftSlot;
      const hasContent =
        s && (s.internalName || s.internalNotes || s.important || s.sentTo || s.sentAt);
      if (hasContent) await actions.saveDoc("demoSiteSlots", { ...s, id: editing.id });
      setEditing(null);
      setDraftSlot(null);
    } finally {
      setSaving(false);
    }
  };

  /** Status changes that need no question: anything that is not Sent. */
  const setStatus = async (site: DemoSite, status: DemoStatus) => {
    await actions.saveDoc("demoSites", { ...site, status });
  };

  /** Marking Sent records WHO and WHEN, because the edit lock reads both. */
  const confirmSend = async () => {
    if (!sending) return;
    const slot = slotFor(sending.id, slots);
    await actions.saveDoc("demoSites", { ...sending, status: "sent" });
    await actions.saveDoc("demoSiteSlots", {
      ...slot,
      id: sending.id,
      sentTo: sentTo.trim(),
      sentAt: new Date().toISOString(),
    });
    setSending(null);
    setSentTo("");
  };

  const toggleImportant = async (site: DemoSite) => {
    const slot = slotFor(site.id, slots);
    await actions.saveDoc("demoSiteSlots", { ...slot, id: site.id, important: !slot.important });
  };

  const remove = async (site: DemoSite) => {
    if (!confirm(`Delete the demo site for ${site.instituteName}? This cannot be undone.`)) return;
    await actions.removeDoc("demoSites", site.id);
    if (slots.some((s) => s.id === site.id)) await actions.removeDoc("demoSiteSlots", site.id);
  };

  const copyLink = async (site: DemoSite) => {
    const url = demoSiteUrl(site.slug, host);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(site.id);
      window.setTimeout(() => setCopied((c) => (c === site.id ? null : c)), 2000);
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. A prompt is ugly and it always works.
      window.prompt("Copy this link:", url);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */

  const liveCount = sites.filter((s) => demoStatus(s) === "sent").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MonitorSmartphone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Demo sites</h1>
            <p className="text-sm text-muted-foreground">
              {sites.length} {sites.length === 1 ? "demo" : "demos"} · {liveCount} sent
            </p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> New demo site
        </button>
      </div>

      {localOnly && (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">
              Do not send these links yet. This site has no database connected.
            </p>
            <p className="mt-1 text-muted-foreground">
              Every demo you build here is saved in{" "}
              <strong className="text-foreground">this browser only</strong>. It is not on the live
              site, so the link will open the ordinary 404 for the institute, on their phone, with
              nothing to tell you it did. Clearing this browser’s data deletes the demos too.
            </p>
            <p className="mt-2 text-muted-foreground">
              The open counter is meaningless in this mode for the same reason: an open is recorded
              in the reader’s own browser, so it can never reach yours.
            </p>
            <p className="mt-2 text-muted-foreground">
              To fix it, set <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> in Vercel, run
              the migrations in <code className="rounded bg-muted px-1">supabase/migrations/</code>{" "}
              (including <code className="rounded bg-muted px-1">0004_demo_sites.sql</code>, which
              is what keeps the slot notes private and lets a reader’s open be counted), and
              redeploy. See SUPABASE_SETUP.md.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How these work</p>
        <p className="mt-1">
          One demo per institute, at <code className="rounded bg-muted px-1">/site/their-name</code>
          . It is their own website with their name on it, not a proposal: the pitch page at{" "}
          <code className="rounded bg-muted px-1">/their-name</code> is the one that argues and
          quotes a price. Only a demo set to{" "}
          <strong className="text-foreground">Sent</strong> opens. Free, Draft and Closed all show
          the ordinary 404, so nothing half-built can be read by somebody who guesses the name.
          Use <strong className="text-foreground">Preview</strong> to read a draft yourself: it is
          behind this login.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Starting from a ready design?</strong> The ten fixed
          designs are in{" "}
          <Link to="/admin/templates" className="text-primary underline underline-offset-2">
            Templates
          </Link>
          . Duplicating one lands here as a draft with the example institute’s facts cleared.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Duplicate rather than reuse.</strong> Editing a demo
          that has already gone out changes what that institute sees the next time they open the
          link, and they are not told. That is why the Edit button on a sent demo asks first.
        </p>
        <p className="mt-2">
          Every demo is <code className="rounded bg-muted px-1">noindex, nofollow</code> and the
          host sends the same as a real HTTP header on{" "}
          <code className="rounded bg-muted px-1">/site/*</code>, so a demo cannot turn up in a
          search for the institute’s name. It is private, not secret: anyone with the link can open
          it.
        </p>
        <p className="mt-2">
          A phone number, an email or an address goes on a record{" "}
          <strong className="text-foreground">only if you copied it from their own site</strong>.
          Never a plausible one. A wrong number is published on a page a parent believes is the
          school’s, and a real stranger takes the calls.
        </p>
      </div>

      {/* ── Search and filters ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            aria-label="Search demo sites by name, city, link or internal name"
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Search name, city, link or your own label"
            value={filters.query || ""}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          />
        </div>
        <select
          aria-label="Filter by kind"
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          value={filters.kind || "all"}
          onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value as DemoFilters["kind"] }))}
        >
          <option value="all">Every kind</option>
          <option value="school">School</option>
          <option value="coaching">Coaching</option>
        </select>
        <select
          aria-label="Filter by market"
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          value={filters.market || "all"}
          onChange={(e) =>
            setFilters((f) => ({ ...f, market: e.target.value as DemoFilters["market"] }))
          }
        >
          <option value="all">Every market</option>
          <option value="india">India</option>
          <option value="international">International</option>
        </select>
        <select
          aria-label="Filter by status"
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          value={filters.status || "all"}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value as DemoFilters["status"] }))
          }
        >
          <option value="all">Every status</option>
          {DEMO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {DEMO_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* ── The list ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {sites.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No demo sites yet. Click "New demo site".
          </div>
        )}
        {sites.length > 0 && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nothing matches that search. Clear the filters to see all {sites.length}.
          </div>
        )}

        {visible.map((site) => {
          const slot = slotFor(site.id, slots);
          const status = demoStatus(site);
          const url = demoSiteUrl(site.slug, host);
          const place = [site.city, site.state].filter(Boolean).join(", ");
          const issue = demoSlugIssue(site.slug, { sites, pitchPages, currentId: site.id });
          const stats = demoOpenStats(site.id, opens, mode);
          const expired = isDemoExpired(site);

          return (
            <div key={site.id} className="rounded-2xl border border-border bg-card/60 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleImportant(site)}
                      aria-label={
                        slot.important
                          ? `Unpin ${site.instituteName} from the top of the list`
                          : `Pin ${site.instituteName} to the top of the list`
                      }
                      aria-pressed={Boolean(slot.important)}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-secondary"
                    >
                      <Star
                        className={cn("h-4 w-4", slot.important && "fill-current text-secondary")}
                        aria-hidden="true"
                      />
                    </button>
                    <p className="truncate font-medium">{site.instituteName || "Untitled"}</p>
                    <Chip className={STATUS_STYLES[status]}>{DEMO_STATUS_LABEL[status]}</Chip>
                    <Chip className="border-border text-muted-foreground">
                      {KIND_LABEL[site.kind] || site.kind}
                    </Chip>
                    {site.market === "international" && (
                      <Chip className="border-border text-muted-foreground">International</Chip>
                    )}
                    {expired && status === "sent" && (
                      <Chip className="border-warning/40 text-warning">Expired</Chip>
                    )}
                    {site.isExample && (
                      <Chip className="border-warning/40 text-warning">Example, delete me</Chip>
                    )}
                    {site.templateId && (
                      <Chip className="border-border text-muted-foreground">
                        From template: {templateMeta(site.templateId)?.label || site.templateId}
                      </Chip>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    <code className="rounded bg-muted px-1">{demoSitePath(site.slug)}</code>
                    {place ? ` · ${place}` : ""}
                    {slot.internalName ? ` · ${slot.internalName}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {editedLabel(site)}
                    {status === "sent" ? ` · ${openLabel(stats)}` : ""}
                    {slot.sentTo ? ` · sent to ${slot.sentTo}` : ""}
                  </p>
                  {issue && <p className="mt-1 text-xs text-destructive">{issue}</p>}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {/* DUPLICATE FIRST AND LABELLED. It is the most-used action on
                      this screen and the one that prevents the failure the whole
                      feature is built around, so it is never an unlabelled icon
                      and it never collapses on a narrow screen. */}
                  <button
                    type="button"
                    onClick={() => duplicate(site)}
                    aria-label={`Duplicate the demo for ${site.instituteName}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    <Files className="h-4 w-4" aria-hidden="true" /> Duplicate
                  </button>

                  <button
                    type="button"
                    onClick={() => copyLink(site)}
                    aria-label={`Copy the link for ${site.instituteName}`}
                    title={url}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"
                  >
                    {copied === site.id ? (
                      <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {copied === site.id ? "Copied" : "Copy link"}
                    </span>
                  </button>

                  {/* Preview always works, because it is behind this login. It
                      is what makes it safe for the public route to refuse a
                      draft outright. */}
                  <a
                    href={`/admin/preview/site/${site.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Preview the demo for ${site.instituteName}`}
                    title="Preview, including drafts"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </a>

                  {status === "sent" ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open the live demo for ${site.instituteName} in a new tab`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span
                      title="Mark it Sent first. Free, Draft and Closed all show the 404."
                      aria-label="The public link does not open until this demo is marked Sent"
                      className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-border opacity-40"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}

                  {status === "sent" ? (
                    <button
                      type="button"
                      onClick={() => setStatus(site, "closed")}
                      aria-label={`Close the demo for ${site.instituteName}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-warning/50"
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Close</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSending(site);
                        setSentTo(slotFor(site.id, slots).sentTo || "");
                      }}
                      aria-label={`Mark the demo for ${site.instituteName || "an unnamed institute"} as sent`}
                      disabled={Boolean(issue) || !(site.instituteName || "").trim()}
                      title={
                        issue ||
                        (!(site.instituteName || "").trim()
                          ? "Give it the institute's name first. A fresh duplicate of a template has none."
                          : undefined)
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-success/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Mark sent</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => requestEdit(site)}
                    aria-label={`Edit the demo for ${site.instituteName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(site)}
                    aria-label={`Delete the demo for ${site.instituteName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── The edit lock ──────────────────────────────────────────────── */}
      {locked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setLocked(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-lock-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="demo-lock-title" className="font-display text-lg font-semibold">
              {locked.instituteName} already has this link
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {
                editLockReason(
                  locked,
                  slotFor(locked.id, slots),
                  demoOpenStats(locked.id, opens, mode),
                )?.message
              }
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {openLabel(demoOpenStats(locked.id, opens, mode))}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => duplicate(locked)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
              >
                <Files className="h-4 w-4" aria-hidden="true" /> Duplicate instead
              </button>
              <button
                onClick={() => openForEdit(locked)}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Edit it anyway
              </button>
              <button
                onClick={() => setLocked(null)}
                className="rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Marking it sent, which asks who ────────────────────────────── */}
      {sending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSending(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-send-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="demo-send-title" className="font-display text-lg font-semibold">
              Who are you sending it to?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is the only thing the warning can say if you ever come back to edit this demo,
              so a name here is worth the four seconds. It is stored in the admin-only slot beside
              the record and is never on the page.
            </p>
            <label htmlFor="demo-sent-to" className="mt-4 block text-sm font-medium">
              Recipient
            </label>
            <input
              id="demo-sent-to"
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Mrs Rao, principal, by WhatsApp"
              value={sentTo}
              onChange={(e) => setSentTo(e.target.value)}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={confirmSend}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> Mark it sent
              </button>
              <button
                onClick={() => setSending(null)}
                className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── The form ───────────────────────────────────────────────────── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                {isNew ? "New" : "Edit"} demo site
              </h2>
              <div className="flex items-center gap-2">
                {!isNew && (
                  <button
                    type="button"
                    onClick={() => duplicate(editing)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    <Files className="h-4 w-4" aria-hidden="true" /> Duplicate
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close the editor"
                  onClick={() => setEditing(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {editing.isExample && (
              <div className="mb-5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <p className="font-medium">This is an example record. Delete it.</p>
                <p className="mt-1 text-muted-foreground">
                  The institute does not exist. It ships with the site so the route can be opened
                  and the two templates have something to render. Once a real demo is live, delete
                  it.
                </p>
              </div>
            )}

            {editing.templateId && (
              <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="font-medium">
                  Made from the {templateMeta(editing.templateId)?.label || editing.templateId} template
                </p>
                <p className="mt-1 text-muted-foreground">
                  Every fact about the example institute was cleared: name, city, contact details,
                  principal, results, fees, dates, teachers, notices and the about text. Kept: the
                  look, the course and batch structure with fees blank, the facilities, the admission
                  steps and documents, and the general questions. Type this institute’s own details,
                  and check each kept line against their own material before you send it.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name and link, wired together and validated. */}
              <div className="sm:col-span-2">
                <AdminField
                  field={schema.fields[0]}
                  value={editing.instituteName}
                  onChange={(v) => {
                    // The link follows the name only while it has not been
                    // hand-edited and the demo has not gone out: changing the
                    // address of a demo whose link is already in somebody's
                    // WhatsApp breaks it silently.
                    const wasAuto =
                      !editing.slug ||
                      editing.slug === demoSlugify(editing.instituteName) ||
                      /* A fresh duplicate's "draft-<template>" link was
                         never chosen by hand, so it follows the name too. */
                      hasProvisionalTemplateSlug(editing);
                    const next: DemoSite = { ...editing, instituteName: v };
                    if (wasAuto && demoStatus(editing) !== "sent") {
                      next.slug = uniqueDemoSlug(v, { sites, pitchPages, currentId: editing.id });
                    }
                    setEditing(next);
                  }}
                />
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="demo-slug" className="text-sm font-medium">
                  Link
                </label>
                <p className="text-xs text-muted-foreground">
                  Generated from the name. Edit it if you want. A name that belongs to a real page
                  on this site, or to a pitch page, is refused here rather than becoming a link you
                  send by mistake.
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="shrink-0 text-sm text-muted-foreground">/site/</span>
                  <input
                    id="demo-slug"
                    className={cn(
                      "w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      slugError ? "border-destructive" : "border-input focus:border-primary",
                    )}
                    value={editing.slug}
                    maxLength={DEMO_SLUG_MAX}
                    aria-invalid={Boolean(slugError)}
                    aria-describedby={slugError ? "demo-slug-error" : undefined}
                    onChange={(e) => setEditing({ ...editing, slug: demoSlugify(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        slug: uniqueDemoSlug(editing.instituteName, {
                          sites,
                          pitchPages,
                          currentId: editing.id,
                        }),
                      })
                    }
                    className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"
                  >
                    From name
                  </button>
                </div>
                {slugError ? (
                  <p id="demo-slug-error" className="mt-1 text-xs text-destructive">
                    {slugError}
                  </p>
                ) : (
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {demoSiteUrl(editing.slug, host)}
                  </p>
                )}
              </div>

              {/* Kind. Drawn here because it decides which of the two templates
                  renders and there is no safe default to fall back on. */}
              <div>
                <label htmlFor="demo-kind" className="text-sm font-medium">
                  What they are
                </label>
                <p className="text-xs text-muted-foreground">
                  Chooses the template. A school sells admission and trust; a coaching institute
                  sells results and batches.
                </p>
                <select
                  id="demo-kind"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as DemoKind })}
                >
                  <option value="school">School</option>
                  <option value="coaching">Coaching institute</option>
                </select>
              </div>

              <div>
                <label htmlFor="demo-status" className="text-sm font-medium">
                  Status
                </label>
                <p className="text-xs text-muted-foreground">
                  Only Sent opens. Use the Mark sent button in the list instead, so the recipient
                  is recorded.
                </p>
                <select
                  id="demo-status"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={demoStatus(editing)}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as DemoStatus })
                  }
                >
                  {DEMO_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DEMO_STATUS_LABEL[s]}, {DEMO_STATUS_HELP[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* The rest of the form, straight from the schema. */}
              {schema.fields.slice(1).map((f) => (
                <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                  <AdminField
                    field={f}
                    value={(editing as unknown as Record<string, unknown>)[f.name]}
                    onChange={(v) => setEditing({ ...editing, [f.name]: v } as DemoSite)}
                  />
                </div>
              ))}

              {/* ── The private slot. Never rendered, never published. ──── */}
              <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">Just for you</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stored in an admin-only collection, not on the demo’s own record, so none of it
                  reaches the page or the institute. "Delhi schools, batch 2" is the sort of thing
                  that belongs here and nowhere else.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="demo-internal-name" className="text-sm font-medium">
                      Your label for it
                    </label>
                    <input
                      id="demo-internal-name"
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Delhi schools, batch 2"
                      value={draftSlot?.internalName || ""}
                      onChange={(e) =>
                        setDraftSlot({
                          ...(draftSlot || { id: editing.id }),
                          internalName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="demo-sent-to-field" className="text-sm font-medium">
                      Sent to
                    </label>
                    <input
                      id="demo-sent-to-field"
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Mrs Rao, principal, by WhatsApp"
                      value={draftSlot?.sentTo || ""}
                      onChange={(e) =>
                        setDraftSlot({
                          ...(draftSlot || { id: editing.id }),
                          sentTo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="demo-internal-notes" className="text-sm font-medium">
                      Notes
                    </label>
                    <textarea
                      id="demo-internal-notes"
                      className="mt-1.5 min-h-[90px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Where the facts came from, what is still a placeholder, who to chase."
                      value={draftSlot?.internalNotes || ""}
                      onChange={(e) =>
                        setDraftSlot({
                          ...(draftSlot || { id: editing.id }),
                          internalNotes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 bg-background pt-4">
              <button
                onClick={save}
                disabled={saving || Boolean(slugError) || Boolean(nameError)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DemoSitesEditor;

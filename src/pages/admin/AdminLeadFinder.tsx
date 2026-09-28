import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPinned, Plus, RefreshCw } from "lucide-react";
import {
  AUDIT_BATCH, auditSites, placeDetails, searchPlaces, type FinderPlace, type SiteAudit,
} from "@/lib/leadFinder/client";
import {
  NO_FILTERS, findExisting, kindForPlace, leadFromPlace, passes, savedPhonePatch, templateForPlace,
  type FinderFilters,
} from "@/lib/leadFinder/leads";
import { getOutreachStore } from "@/lib/outreach/store";
import type { OutreachLead } from "@/lib/outreach/types";
import { templateMeta } from "@/lib/demo/templates";
import { SearchBar, type SearchInput } from "@/admin/leadFinder/SearchBar";
import { Filters } from "@/admin/leadFinder/Filters";
import { ResultRow, ROW_GRID, type RowProps } from "@/admin/leadFinder/ResultRow";
import type { AuditState } from "@/admin/leadFinder/WebsiteBadge";
import { useCreateDemo } from "@/admin/leadFinder/useCreateDemo";
import { btn, btnPrimary } from "@/admin/leadFinder/styles";
import { cn } from "@/lib/utils";

/*
  LEAD FINDER: type a city and a type, get the list from Google Maps, see
  whose website is missing, broken or poor on a phone, and send the good ones
  to Outreach in one click, with a demo if wanted.

  GOOGLE'S TERMS, the one rule on this page: Google's phone, address and
  rating are shown live and never saved by the page on its own. A lead keeps
  the place ID, the name and the city, what the website check found, and the
  phones and emails on the institute's OWN website. "Save this number" copies
  Google's phone into a lead only when Mehdi clicks it.
*/

/** How many audit requests run at once (each carries AUDIT_BATCH sites). */
const AUDIT_PARALLEL = 2;

type RowBusy = RowProps["busy"];

export default function AdminLeadFinder() {
  const [ctx, setCtx] = useState<SearchInput | null>(null);
  const [places, setPlaces] = useState<FinderPlace[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [audits, setAudits] = useState<Record<string, AuditState>>({});
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [filters, setFilters] = useState<FinderFilters>(NO_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowBusy, setRowBusy] = useState<Record<string, RowBusy>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState<"new" | "more" | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const createDemo = useCreateDemo();
  /* Bumped on every new search, so audits of an old list never land on a new one. */
  const generation = useRef(0);

  const reloadLeads = useCallback(async () => {
    try {
      setLeads(await getOutreachStore().listLeads());
    } catch (e) {
      setError(`Could not read Outreach leads, so the duplicate check is off: ${(e as Error).message}`);
    }
  }, []);
  useEffect(() => void reloadLeads(), [reloadLeads]);

  /** Audit these places a few at a time; each row fills in as its batch returns. */
  const runAudits = useCallback(async (list: FinderPlace[]) => {
    if (!list.length) return;
    const gen = generation.current;
    setAuditing(true);
    setAudits((a) => ({ ...a, ...Object.fromEntries(list.map((p) => [p.placeId, { state: "checking" } as AuditState])) }));
    const batches: FinderPlace[][] = [];
    for (let i = 0; i < list.length; i += AUDIT_BATCH) batches.push(list.slice(i, i + AUDIT_BATCH));
    let next = 0;
    const worker = async () => {
      while (next < batches.length) {
        const batch = batches[next++];
        let patch: Record<string, AuditState>;
        try {
          const res = await auditSites(batch.map((p) => p.website));
          patch = Object.fromEntries(batch.map((p, i) => [p.placeId, { state: "done", audit: res[i] } as AuditState]));
        } catch (e) {
          const message = (e as Error).message;
          patch = Object.fromEntries(batch.map((p) => [p.placeId, { state: "error", message } as AuditState]));
        }
        if (gen !== generation.current) return;
        setAudits((a) => ({ ...a, ...patch }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(AUDIT_PARALLEL, batches.length) }, worker));
    if (gen === generation.current) setAuditing(false);
  }, []);

  const search = async (q: SearchInput, more = false) => {
    setError(null);
    setNotice(null);
    setSearching(more ? "more" : "new");
    if (!more) {
      generation.current++;
      setPlaces([]);
      setAudits({});
      setSelected(new Set());
      setRowError({});
      setNextToken(null);
      setAuditing(false);
      setCtx(q);
    }
    try {
      const res = await searchPlaces({ type: q.type, city: q.city, pageToken: more ? nextToken : null });
      const known = new Set(more ? places.map((p) => p.placeId) : []);
      const fresh = res.places.filter((p) => !known.has(p.placeId));
      setPlaces((prev) => (more ? [...prev, ...fresh] : fresh));
      setNextToken(res.nextPageToken);
      if (!more && !fresh.length) setNotice("Google Maps found nothing for this. Try another type or a nearby bigger city.");
      void runAudits(fresh);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(null);
    }
  };

  const auditOf = (p: FinderPlace) => {
    const a = audits[p.placeId];
    return a?.state === "done" ? a.audit : undefined;
  };
  const existingFor = (p: FinderPlace) => (ctx ? findExisting(leads, p, ctx.city, auditOf(p)) : undefined);
  const kindOf = (p: FinderPlace) => kindForPlace(p.name, ctx?.type || "", ctx?.preset);
  const templateOf = (p: FinderPlace) => templateForPlace(p.name, ctx?.type || "", kindOf(p));

  const withRow = async (p: FinderPlace, what: RowBusy, fn: () => Promise<void>) => {
    setRowBusy((b) => ({ ...b, [p.placeId]: what }));
    setRowError((e) => ({ ...e, [p.placeId]: "" }));
    try {
      await fn();
    } catch (e) {
      setRowError((r) => ({ ...r, [p.placeId]: (e as Error).message }));
    } finally {
      setRowBusy((b) => ({ ...b, [p.placeId]: null }));
    }
  };

  /*
    Added before its website check came back? Check it now, so the lead still
    gets its pitch and observation (nothing fills them in later). A failed
    check saves the lead without them rather than blocking the add.
  */
  const auditNow = async (p: FinderPlace) => {
    const have = auditOf(p);
    if (have) return have;
    try {
      const [a] = await auditSites([p.website]);
      if (a) setAudits((s) => ({ ...s, [p.placeId]: { state: "done", audit: a } }));
      return a;
    } catch {
      return undefined;
    }
  };

  /** Save the lead (or return the one it already is). Never copies Google's phone. */
  /** checked: the audit already in hand; null saves without one (bulk add checked already). */
  const addLead = async (p: FinderPlace, checked?: SiteAudit | null): Promise<OutreachLead> => {
    const have = existingFor(p);
    if (have) return have;
    const audit = checked === undefined ? await auditNow(p) : checked ?? undefined;
    const lead = await getOutreachStore().upsertLead(
      leadFromPlace(p, { city: ctx?.city || "", kind: kindOf(p), audit, typeLabel: ctx?.typeLabel }),
    );
    setLeads((l) => [lead, ...l.filter((x) => x.id !== lead.id)]);
    return lead;
  };

  const onAdd = (p: FinderPlace) => withRow(p, "add", async () => {
    await addLead(p);
    setSelected((s) => { const n = new Set(s); n.delete(p.placeId); return n; });
  });

  const onAddDemo = (p: FinderPlace) => withRow(p, "demo", async () => {
    const tpl = templateOf(p);
    if (!tpl) throw new Error("No demo template fits this kind of business.");
    const lead = await addLead(p);
    const demo = await createDemo(tpl, { name: p.name, city: ctx?.city || "" });
    const linked = await getOutreachStore().upsertLead({ ...lead, demoId: demo.id, demoSlug: demo.slug });
    setLeads((l) => [linked, ...l.filter((x) => x.id !== linked.id)]);
    setNotice(`Draft demo made for ${p.name} and linked to the lead. Fill its contact details from their own website before sending.`);
  });

  const onGetPhone = (p: FinderPlace) => withRow(p, "phone", async () => {
    const d = await placeDetails(p.placeId);
    if (!d.phone && !d.phoneIntl) throw new Error("Google has no phone number for this place.");
    setPlaces((list) => list.map((x) => (x.placeId === p.placeId
      ? { ...x, phone: d.phone, phoneIntl: d.phoneIntl, website: x.website || d.website, address: x.address || d.address } : x)));
  });

  const onSavePhone = (p: FinderPlace) => withRow(p, "save", async () => {
    const lead = existingFor(p);
    if (!lead) return;
    const patch = savedPhonePatch(lead, p);
    if (!patch) return;
    const saved = await getOutreachStore().upsertLead({ ...lead, ...patch });
    setLeads((l) => l.map((x) => (x.id === saved.id ? saved : x)));
  });

  const onBulkAdd = async () => {
    setBulkBusy(true);
    setError(null);
    let added = 0;
    const failed: string[] = [];
    const picked = places.filter((x) => selected.has(x.placeId) && !existingFor(x));
    /* Check the unchecked ones together first, in the same batches as the list. */
    const pending = picked.filter((x) => !auditOf(x));
    const checked: Record<string, SiteAudit> = {};
    const batches: FinderPlace[][] = [];
    for (let i = 0; i < pending.length; i += AUDIT_BATCH) batches.push(pending.slice(i, i + AUDIT_BATCH));
    await Promise.all(batches.map(async (b) => {
      try {
        const res = await auditSites(b.map((x) => x.website));
        b.forEach((x, i) => { if (res[i]) checked[x.placeId] = res[i]; });
      } catch { /* these are saved without a pitch, not blocked */ }
    }));
    if (Object.keys(checked).length) {
      setAudits((s) => ({ ...s, ...Object.fromEntries(Object.entries(checked).map(([id, a]) => [id, { state: "done", audit: a } as AuditState])) }));
    }
    for (const p of picked) {
      try {
        await addLead(p, checked[p.placeId] ?? auditOf(p) ?? null);
        added++;
      } catch (e) {
        failed.push(`${p.name}: ${(e as Error).message}`);
      }
    }
    setSelected(new Set());
    setBulkBusy(false);
    setNotice(`${added} lead${added === 1 ? "" : "s"} added to Outreach.`);
    if (failed.length) setError(`Not added: ${failed.join("; ")}`);
  };

  const shown = useMemo(
    () => places.filter((p) => passes(p, auditOf(p), filters)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, audits, filters],
  );
  const selectable = shown.filter((p) => !existingFor(p));
  const allSelected = selectable.length > 0 && selectable.every((p) => selected.has(p.placeId));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.placeId)));
  const counts = useMemo(() => {
    const c = { none: 0, broken: 0, poor: 0, ok: 0 };
    for (const a of Object.values(audits)) if (a.state === "done") c[a.audit.verdict]++;
    return c;
  }, [audits]);

  return (
    <div className="min-w-0 max-w-6xl">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">Lead finder</h1>
          <p className="text-sm text-muted-foreground">Businesses from Google Maps, with their website checked. One click sends one to Outreach.</p>
        </div>
      </div>

      <SearchBar busy={searching !== null} onSearch={(q) => void search(q)} />

      <p className="mt-2 text-xs text-muted-foreground">
        Google's terms: phone, address and rating are shown live, not saved. A lead keeps the place ID, name, city and what their own website publishes; "Save this number" is your choice.
      </p>

      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-sm">{notice}</p>}

      {ctx && (places.length > 0 || searching) && (
        <section aria-label="Results" className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium">{places.length}</span> found for {ctx.typeLabel} in {ctx.city}
              {shown.length !== places.length && <span className="text-muted-foreground">, {shown.length} shown</span>}
              {counts.none + counts.broken + counts.poor + counts.ok > 0 && (
                <span className="text-muted-foreground">. Websites: {counts.none} none, {counts.broken} broken, {counts.poor} poor, {counts.ok} OK</span>
              )}
            </p>
            <button type="button" className={btn} disabled={auditing || !places.length} onClick={() => void runAudits(places)}>
              {auditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              {auditing ? "Checking websites" : "Check websites"}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Filters value={filters} onChange={setFilters} />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!selectable.length} className="h-4 w-4" />
                Select all shown
              </label>
              <button type="button" className={btnPrimary} disabled={!selected.size || bulkBusy} onClick={() => void onBulkAdd()}>
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                Add {selected.size || ""} to Outreach
              </button>
            </div>
          </div>

          <div className={cn("hidden border-b border-border px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", ROW_GRID)} aria-hidden="true">
            <span />
            <span>Name and address</span>
            <span>Rating</span>
            <span>Phone (live)</span>
            <span>Website</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="space-y-3 lg:space-y-0">
            {shown.map((p) => {
              const tpl = templateOf(p);
              return (
                <ResultRow
                  key={p.placeId}
                  place={p}
                  audit={audits[p.placeId] || { state: "idle" }}
                  existing={existingFor(p)}
                  selected={selected.has(p.placeId)}
                  busy={rowBusy[p.placeId] ?? null}
                  error={rowError[p.placeId] || undefined}
                  templateLabel={tpl ? `${tpl.split("-")[0]}, ${templateMeta(tpl)?.label || tpl}` : null}
                  onToggle={() => setSelected((s) => { const n = new Set(s); if (n.has(p.placeId)) n.delete(p.placeId); else n.add(p.placeId); return n; })}
                  onAdd={() => void onAdd(p)}
                  onAddDemo={() => void onAddDemo(p)}
                  onGetPhone={() => void onGetPhone(p)}
                  onSavePhone={() => void onSavePhone(p)}
                />
              );
            })}
          </ul>
          {searching === "new" && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching Google Maps</p>
          )}
          {places.length > 0 && shown.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No result passes these filters. Turn one off to see more.</p>
          )}
          {nextToken && (
            <button type="button" className={cn(btn, "mt-4")} disabled={searching !== null} onClick={() => void search(ctx, true)}>
              {searching === "more" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Load more
            </button>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            Results from Google Maps. Added leads are in <Link to="/admin/outreach" className="text-primary hover:underline">Outreach</Link>.
          </p>
        </section>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPinned, Plus, RefreshCw } from "lucide-react";
import {
  AUDIT_BATCH, OSM_ATTRIBUTION, auditSites, isOsm, placeDetails, searchPlaces, type FinderPlace, type SearchResult, type SiteAudit,
} from "@/lib/leadFinder/client";
import {
  NO_FILTERS, auditBatches, auditKindForPlace, findExisting, kindForPlace, leadFromPlace, mergeSources, passes, savedPhonePatch,
  searchedTypeForTemplate, templateForPlace, withoutRatingFilters, type AuditKind, type FinderFilters,
} from "@/lib/leadFinder/leads";
import { FREE_USAGE, FREE_USAGE_TEXT } from "@/lib/leadFinder/freeUsage";
import { getOutreachStore } from "@/lib/outreach/store";
import type { OutreachLead } from "@/lib/outreach/types";
import { templateMeta, templatesOfKind, type TemplateId } from "@/lib/demo/templates";
import { mainSiteIsCrossOrigin } from "@/lib/host";
import { CRM } from "@/crm/nav";
import { MainSiteLink } from "@/crm/MainSiteLink";
import { SearchBar, type SearchInput } from "@/admin/leadFinder/SearchBar";
import { Filters } from "@/admin/leadFinder/Filters";
import { ResultRow, ROW_GRID, type RowProps, type TemplateChoice } from "@/admin/leadFinder/ResultRow";
import type { AuditState } from "@/admin/leadFinder/WebsiteBadge";
import { useCreateDemo } from "@/admin/leadFinder/useCreateDemo";
import { btn, btnPrimary } from "@/admin/leadFinder/styles";
import { cn } from "@/lib/utils";

/*
  LEAD FINDER: type a city and a type, get the list from OpenStreetMap (free,
  no key: the default since 4 Oct 2026) and, when "Also use Google" is ticked
  and a key works, from Google Maps too; see whose website is missing, broken
  or poor on a phone, and add the good ones to the CRM's leads in one click,
  with a demo if wanted. (It said "Outreach" until 30 Sep 2026; the CRM calls
  them leads, and so does this page now.) Dental clinics (28 Sep 2026) have
  their own presets, become "dental" leads and get a d1 to d7 demo.

  TWO REQUESTS, NEVER ONE WAITING FOR THE OTHER. The free search is its own
  request and never reads a key. With "Also use Google" ticked a second
  request goes to Google at the same moment; its rows join the list when they
  come (after the free ones, without the businesses the free list already
  has: mergeSources), and if no key works the page says why in one line and
  the free list stands as it is.

  GOOGLE'S TERMS, the one rule on this page: Google's phone, address and
  rating are shown live and never saved by the page on its own. A lead keeps
  the place ID, the name and the city, what the website check found, and the
  phones and emails on the institute's OWN website. "Save this number" copies
  Google's phone into a lead only when Mehdi clicks it. OpenStreetMap's data
  is ODbL: a lead may keep its phone, with the credit in the lead's notes, and
  the list always shows "© OpenStreetMap contributors".

  TWO HOMES. This page is /admin/lead-finder and, mounted as it is, the CRM's
  Lead finder screen (src/crm/finder/CrmFinder.tsx), which moves to its own
  subdomain once VITE_CRM_URL is set. So a link to a lead is CRM.lead() (a
  CRM screen), and a link to an admin page is a MainSiteLink (a plain <a>
  to the main site when this runs on the CRM host). No "/crm/..." path is
  written here by hand, and no "/admin/..." path reaches a router <Link>
  except through MainSiteLink.
*/

/** How many audit requests run at once (each carries AUDIT_BATCH sites). */
const AUDIT_PARALLEL = 2;

/** "d5, Orthodontic and aligner clinic": the id's short name, then the registry's label. */
const choice = (id: TemplateId): TemplateChoice => ({ id, label: `${id.split("-")[0]}, ${templateMeta(id)?.label || id}` });

type RowBusy = RowProps["busy"];
/** What the free (OpenStreetMap) list's answer says about itself: credit, counts, area, notes. */
type SourceInfo = Omit<SearchResult, "places" | "nextPageToken" | "textQuery">;
/** The Google side of a search: not asked, asking, answered, or why no key worked. */
type GoogleState = { status: "off" } | { status: "searching" } | { status: "ok" } | { status: "error"; message: string };
type Tokens = { osm: string | null; google: string | null };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * "Found 33 in OpenStreetMap within 5 km of Saket: 15 with a phone, 4 with a website. Small towns have fewer listings."
 * Nothing found: "Nothing in OpenStreetMap inside the Gopalganj district boundary (Bihar)." (the status line says what to try).
 */
function foundLine(s: SourceInfo): string {
  const where = s.area?.label ? ` ${s.area.label}` : "";
  if (s.total === 0) return `Nothing in OpenStreetMap${where}.`;
  const counts = s.counts ? `: ${s.counts.withPhone} with a phone, ${s.counts.withWebsite} with a website` : "";
  return `Found ${s.total ?? 0} in OpenStreetMap${where}${counts}. Small towns have fewer listings.`;
}

export default function AdminLeadFinder() {
  const [ctx, setCtx] = useState<SearchInput | null>(null);
  const [src, setSrc] = useState<SourceInfo | null>(null);
  const [google, setGoogle] = useState<GoogleState>({ status: "off" });
  const [osmPlaces, setOsmPlaces] = useState<FinderPlace[]>([]);
  const [googlePlaces, setGooglePlaces] = useState<FinderPlace[]>([]);
  const [tokens, setTokens] = useState<Tokens>({ osm: null, google: null });
  const [audits, setAudits] = useState<Record<string, AuditState>>({});
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [filters, setFilters] = useState<FinderFilters>(NO_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowBusy, setRowBusy] = useState<Record<string, RowBusy>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  /* A template Mehdi picked for a row instead of the default, by place ID. */
  const [tplPick, setTplPick] = useState<Record<string, TemplateId>>({});
  const [searching, setSearching] = useState<"new" | "more" | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const createDemo = useCreateDemo();
  /* Bumped on every new search, so audits and answers of an old list never land on a new one. */
  const generation = useRef(0);
  /* Website checks still running for this list: the free list's and Google's run side by side. */
  const auditRuns = useRef(0);
  /* The two lists as they are right now, for the two requests that fill them at once. */
  const osmNow = useRef<FinderPlace[]>([]);
  const googleNow = useRef<FinderPlace[]>([]);
  const putOsm = (list: FinderPlace[]) => { osmNow.current = list; setOsmPlaces(list); };
  const putGoogle = (list: FinderPlace[]) => { googleNow.current = list; setGooglePlaces(list); };

  /* The free rows first, then Google's rows that are not already in it. */
  const places = useMemo(() => mergeSources(osmPlaces, googlePlaces), [osmPlaces, googlePlaces]);
  const googleShown = places.length - osmPlaces.length;

  const reloadLeads = useCallback(async () => {
    try {
      setLeads(await getOutreachStore().listLeads());
    } catch (e) {
      setError(`Could not read your leads, so the duplicate check is off: ${(e as Error).message}`);
    }
  }, []);
  useEffect(() => void reloadLeads(), [reloadLeads]);

  /**
   * Audit these places a few at a time; each row fills in as its batch
   * returns. kindOf says which places get the dental checks (a dental search,
   * or a dentist found by any search); a batch never mixes the two.
   */
  const runAudits = useCallback(async (list: FinderPlace[], kindOf: (p: FinderPlace) => AuditKind) => {
    if (!list.length) return;
    const gen = generation.current;
    auditRuns.current++;
    setAuditing(true);
    setAudits((a) => ({ ...a, ...Object.fromEntries(list.map((p) => [p.placeId, { state: "checking" } as AuditState])) }));
    const batches = auditBatches(list, kindOf, AUDIT_BATCH);
    let next = 0;
    const worker = async () => {
      while (next < batches.length) {
        const { kind, items: batch } = batches[next++];
        let patch: Record<string, AuditState>;
        try {
          const res = await auditSites(batch.map((p) => p.website), kind);
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
    if (gen !== generation.current) return;
    auditRuns.current = Math.max(0, auditRuns.current - 1);
    if (!auditRuns.current) setAuditing(false);
  }, []);

  const search = async (q: SearchInput, more = false) => {
    setError(null);
    setNotice(null);
    setSearching(more ? "more" : "new");
    if (!more) {
      generation.current++;
      putOsm([]);
      putGoogle([]);
      setAudits({});
      setSelected(new Set());
      setRowError({});
      setTplPick({});
      setTokens({ osm: null, google: null });
      auditRuns.current = 0;
      setAuditing(false);
      setCtx(q);
      setSrc(null);
      setGoogle(q.google ? { status: "searching" } : { status: "off" });
      /* No Google rows, no ratings: the rating filters are off (and hidden) on a free list. */
      if (!q.google) setFilters(withoutRatingFilters);
    }
    const gen = generation.current;
    const asked = { type: q.type, city: q.city, preset: q.preset?.id };
    const kindOf = (p: FinderPlace) => auditKindForPlace(p, q.type, q.preset);
    let freeFailed = false;

    /* The free search: OpenStreetMap, no key. Its own request, never waiting for Google. */
    const free = async () => {
      if (more && !tokens.osm) return;
      try {
        const res = await searchPlaces({ ...asked, radiusKm: q.radiusKm, pageToken: more ? tokens.osm : null });
        if (gen !== generation.current) return;
        const known = new Set(osmNow.current.map((p) => p.placeId));
        const fresh = res.places.filter((p) => !known.has(p.placeId));
        putOsm(more ? [...osmNow.current, ...fresh] : fresh);
        setTokens((t) => ({ ...t, osm: res.nextPageToken }));
        const { places: _p, nextPageToken: _n, textQuery: _t, ...info } = res;
        setSrc(info);
        void runAudits(fresh, kindOf);
      } catch (e) {
        if (gen !== generation.current) return;
        freeFailed = true;
        setError((e as Error).message);
      }
    };

    /* Google Maps, only when ticked: a second request at the same moment. A failing key is one line, never an error box. */
    const alsoGoogle = async () => {
      if (!q.google || (more && !tokens.google)) return;
      try {
        const res = await searchPlaces({ ...asked, google: true, pageToken: more ? tokens.google : null });
        if (gen !== generation.current) return;
        const known = new Set(googleNow.current.map((p) => p.placeId));
        const fresh = res.places.filter((p) => !known.has(p.placeId));
        putGoogle(more ? [...googleNow.current, ...fresh] : fresh);
        setTokens((t) => ({ ...t, google: res.nextPageToken }));
        setGoogle({ status: "ok" });
        /* Only the rows that show: a business the free list already has is not checked twice. */
        const shown = new Set(mergeSources(osmNow.current, fresh).map((p) => p.placeId));
        void runAudits(fresh.filter((p) => shown.has(p.placeId)), kindOf);
      } catch (e) {
        if (gen !== generation.current) return;
        setTokens((t) => ({ ...t, google: null }));
        /* Its first page came, its next did not: the rows stay, and the line says Google was used. */
        if (more) setNotice(`Google Maps could not give its next page: ${(e as Error).message}`);
        else setGoogle({ status: "error", message: (e as Error).message });
      }
    };

    await Promise.all([free(), alsoGoogle()]);
    if (gen !== generation.current) return;
    setSearching(null);
    /* The found line already says nothing was found, and where: this line says what to try. */
    if (!more && !freeFailed && osmNow.current.length + googleNow.current.length === 0) {
      setNotice(q.radiusKm === 25
        ? "Small towns have few listings on OpenStreetMap, even 25 km around: try another type, or a nearby bigger city."
        : "Small towns have few listings on OpenStreetMap: try Area \"25 km around it\", another type, or a nearby bigger city.");
    }
  };

  const auditOf = (p: FinderPlace) => {
    const a = audits[p.placeId];
    return a?.state === "done" ? a.audit : undefined;
  };
  const existingFor = (p: FinderPlace) => (ctx ? findExisting(leads, p, ctx.city, auditOf(p)) : undefined);
  const kindOf = (p: FinderPlace) => kindForPlace(p.name, ctx?.type || "", ctx?.preset, p.primaryType);
  /*
    The default: dentalTemplateFor(name, category, type searched) for a clinic,
    the type left out when OSM broadened the list (for OSM's rows only: Google
    was asked for the type itself); chooseTemplate for a school or coaching
    centre. Mehdi's pick for the row wins.
  */
  const templateOf = (p: FinderPlace): TemplateId | null =>
    tplPick[p.placeId] || templateForPlace(p.name, searchedTypeForTemplate(ctx?.type || "", isOsm(p) ? src?.broadened : null), kindOf(p), p.primaryType);
  const templateOptionsOf = (p: FinderPlace): TemplateChoice[] => {
    const kind = kindOf(p);
    return kind === "other" ? [] : templatesOfKind(kind).map((t) => choice(t.id));
  };
  /* The dental checks run for a dental search, or for one dental place found by another search. */
  const auditKind = (p: FinderPlace): AuditKind => auditKindForPlace(p, ctx?.type || "", ctx?.preset);

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
      const [a] = await auditSites([p.website], auditKind(p));
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
    // A new lead is an INSERT (spec 9.3): never an upsert over a lead that has the same id.
    const lead = await getOutreachStore().createLead(
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
    // Only the demo keys change, merged on the server (whoever works the lead is told "Demo ready").
    const linked = await getOutreachStore().patchLead(lead.id, { demoId: demo.id, demoSlug: demo.slug });
    setLeads((l) => [linked, ...l.filter((x) => x.id !== linked.id)]);
    setNotice(`Draft demo made for ${p.name} and linked to the lead. Fill its contact details from their own website${isOsm(p) ? " or the OpenStreetMap entry" : ""} before sending.`);
  });

  const onGetPhone = (p: FinderPlace) => withRow(p, "phone", async () => {
    const d = await placeDetails(p.placeId);
    if (!d.phone && !d.phoneIntl) throw new Error("Google has no phone number for this place.");
    putGoogle(googleNow.current.map((x) => (x.placeId === p.placeId
      ? { ...x, phone: d.phone, phoneIntl: d.phoneIntl, website: x.website || d.website, address: x.address || d.address } : x)));
  });

  const onSavePhone = (p: FinderPlace) => withRow(p, "save", async () => {
    const lead = existingFor(p);
    if (!lead) return;
    const patch = savedPhonePatch(lead, p);
    if (!patch) return;
    const saved = await getOutreachStore().patchLead(lead.id, patch);
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
    await Promise.all(auditBatches(pending, auditKind, AUDIT_BATCH).map(async ({ kind, items: b }) => {
      try {
        const res = await auditSites(b.map((x) => x.website), kind);
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
    setNotice(`${added} lead${added === 1 ? "" : "s"} added.`);
    if (failed.length) setError(`Not added: ${failed.join("; ")}`);
  };

  const anyGoogleRows = googleShown > 0;
  /* Ratings exist only on Google's rows: with none on the list, the rating filters are off (and hidden). */
  const active = useMemo(() => (anyGoogleRows ? filters : withoutRatingFilters(filters)), [filters, anyGoogleRows]);
  const shown = useMemo(
    () => places.filter((p) => passes(p, auditOf(p), active)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, audits, active],
  );
  const selectable = shown.filter((p) => !existingFor(p));
  const allSelected = selectable.length > 0 && selectable.every((p) => selected.has(p.placeId));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.placeId)));
  const counts = useMemo(() => {
    const c = { none: 0, broken: 0, poor: 0, ok: 0, unchecked: 0 };
    for (const a of Object.values(audits)) if (a.state === "done") c[a.audit.verdict]++;
    return c;
  }, [audits]);
  /* "3 of 4": the free list's total (OpenStreetMap says it), plus the Google rows on show. */
  const total = src?.total != null ? src.total + googleShown : null;

  return (
    <div data-testid="lead-finder" className="min-w-0 max-w-6xl">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">Lead finder</h1>
          <p className="text-sm text-muted-foreground">Businesses from OpenStreetMap, free and with no key (and from Google Maps too, if you turn it on), with their website checked. One click adds one to your leads.</p>
        </div>
      </div>

      <SearchBar busy={searching !== null} onSearch={(q) => void search(q)} />

      <p className="mt-2 text-xs text-muted-foreground">
        Google's terms: phone, address and rating are shown live, not saved. A lead keeps the place ID, name, city and what their own website publishes; "Save this number" is your choice.
        OpenStreetMap data may be kept, with its credit.
      </p>

      {!ctx && (
        <section aria-label="What it costs" className="mt-4 rounded-2xl border border-border bg-card/60 p-4 text-sm">
          <p className="font-medium">Free: no key needed</p>
          <p className="mt-1 text-muted-foreground">
            {FREE_USAGE.free} It lists fewer businesses and fewer phone numbers than Google Maps, and small towns have fewer listings.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {FREE_USAGE.optional} {FREE_USAGE_TEXT} Keys:{" "}
            <MainSiteLink path="/admin/ai-keys" newTab={mainSiteIsCrossOrigin()} className="text-primary hover:underline">AI keys</MainSiteLink>, under Lead Finder.
          </p>
        </section>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-sm">{notice}</p>}

      {src && (
        <div data-source="osm" className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-sm">
          <p>
            <span className="font-medium">Free search (OpenStreetMap): no key needed</span>{" "}
            <a href={src.attributionUrl || "https://www.openstreetmap.org/copyright"} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              {src.attribution || OSM_ATTRIBUTION}
            </a>
            <span className="text-xs text-muted-foreground"> (ODbL)</span>
          </p>
          <p data-testid="osm-found" className="mt-1 text-xs">{foundLine(src)}</p>
          {src.placeNote && <p data-testid="osm-place-note" className="mt-1 text-xs">{src.placeNote}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{src.note}</p>
          {src.capped && <p className="mt-1 text-xs">There are more here than one search can carry, so some are left out: pick a smaller area (or a part of the city) for the full list.</p>}
          {src.broadened && <p className="mt-1 text-xs">{src.broadened}</p>}
          {src.caveat && <p className="mt-1 text-xs">{src.caveat}</p>}
        </div>
      )}
      {google.status !== "off" && (
        <p data-source="google" className="mt-2 text-xs text-muted-foreground">
          {google.status === "searching" && <>Also asking Google Maps.</>}
          {google.status === "ok" && (
            <>
              <span className="font-medium text-foreground">Source: Google Maps</span>, too: {plural(googleShown, "more place")}
              {googlePlaces.length > googleShown && `, and ${plural(googlePlaces.length - googleShown, "place")} the free list already has (shown once)`}.
            </>
          )}
          {google.status === "error" && (
            <>
              Google Maps was not used: {google.message}{" "}
              <MainSiteLink path="/admin/ai-keys" newTab={mainSiteIsCrossOrigin()} className="text-primary hover:underline">AI keys</MainSiteLink>
            </>
          )}
        </p>
      )}

      {ctx && (places.length > 0 || searching) && (
        <section aria-label="Results" className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium">{places.length}</span>{total != null && total > places.length ? ` of ${total}` : ""} found for {ctx.typeLabel} in {ctx.city}
              {shown.length !== places.length && <span className="text-muted-foreground">, {shown.length} shown</span>}
              {counts.none + counts.broken + counts.poor + counts.ok + counts.unchecked > 0 && (
                <span className="text-muted-foreground">
                  . Websites: {counts.none} none, {counts.broken} broken, {counts.poor} poor, {counts.ok} OK
                  {counts.unchecked > 0 && `, ${counts.unchecked} could not be checked`}
                </span>
              )}
            </p>
            <button type="button" className={btn} disabled={auditing || !places.length} onClick={() => void runAudits(places, auditKind)}>
              {auditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              {auditing ? "Checking websites" : "Check websites"}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Filters value={active} onChange={setFilters} ratings={anyGoogleRows} />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!selectable.length} className="h-4 w-4" />
                Select all shown
              </label>
              <button type="button" className={btnPrimary} disabled={!selected.size || bulkBusy} onClick={() => void onBulkAdd()}>
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                Add {selected.size || ""} to leads
              </button>
            </div>
          </div>

          <div className={cn("hidden border-b border-border px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", ROW_GRID)} aria-hidden="true">
            <span />
            <span>Name and address</span>
            <span>Rating</span>
            <span>{anyGoogleRows && !osmPlaces.length ? "Phone (live)" : "Phone"}</span>
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
                  template={tpl ? choice(tpl) : null}
                  templateOptions={templateOptionsOf(p)}
                  onTemplate={(id) => setTplPick((m) => ({ ...m, [p.placeId]: id }))}
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
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {src ? "Still asking Google Maps" : `Searching OpenStreetMap (free; a big city can take up to a minute)${ctx.google ? ", and Google Maps" : ""}`}
            </p>
          )}
          {places.length > 0 && shown.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No result passes these filters. Turn one off to see more.</p>
          )}
          {(tokens.osm || tokens.google) && (
            <button type="button" className={cn(btn, "mt-4")} disabled={searching !== null} onClick={() => void search(ctx, true)}>
              {searching === "more" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Load more
            </button>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            {src && osmPlaces.length > 0 && (
              <>
                Results from OpenStreetMap: <a href={src.attributionUrl || "https://www.openstreetmap.org/copyright"} target="_blank" rel="noreferrer" className="text-primary hover:underline">{src.attribution || OSM_ATTRIBUTION}</a> (ODbL)
                {anyGoogleRows ? ", and from Google Maps where a row links there." : "."}{" "}
              </>
            )}
            {anyGoogleRows && !osmPlaces.length && <>Results from Google Maps.{" "}</>}
            Added leads are in the CRM, under <Link to={CRM.leads} className="text-primary hover:underline">Leads</Link>.
          </p>
        </section>
      )}
    </div>
  );
}

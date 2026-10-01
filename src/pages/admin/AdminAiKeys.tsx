import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, KeyRound, Loader2, PlugZap, AlertTriangle, CheckCircle2, XCircle, Plus, MapPin } from "lucide-react";
import {
  PROVIDERS, aiKeysAvailable, listKeys, addKey, replaceKey, updateKey, removeKey, saveProviderOrder, saveKeyOrder,
  usageToday, testKeys, needsMigration, providerInfo, isPosterProvider, GOOGLE_MAPS_ID,
  type ProviderId, type KeyProviderId, type ProviderKeyRow, type Usage, type UsageCount, type TestResult,
} from "@/lib/ai/keys";
import { FREE_USAGE } from "@/lib/leadFinder/freeUsage";
import { cn } from "@/lib/utils";

/*
  AI KEYS: the keys /api/poster uses to read a school or coaching poster.

  One card per provider, in the order providers are tried, and inside each
  card that provider's keys, in the order THEY are tried. The poster reader
  walks every key of the first provider top to bottom, then the next
  provider's. A key that reports a limit is parked until tomorrow on its own,
  so the next key takes over; when every key fails the poster flow opens the
  template for manual filling, so an empty page here never blocks a demo.

  Two orders, two sets of arrows: the arrows on a card's header move the
  PROVIDER, the arrows on a key move the key inside its provider. They never
  mix, because a key of one provider cannot run between two keys of another.

  The page never holds a whole key. The list comes from a masked view that
  returns the last four characters (0008); a pasted key goes straight to the
  database and the input is cleared.
*/

const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";
const btnCls =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:border-primary/50 disabled:opacity-50";
const iconBtn = cn(btnCls, "w-9 px-0");

interface AddDraft { key: string; label: string; model: string }

/** Providers in the order their keys are tried, then the ones with no key yet. */
function providerOrderOf(rows: ProviderKeyRow[]): ProviderId[] {
  const seen: ProviderId[] = [];
  for (const r of rows) if (isPosterProvider(r.provider) && !seen.includes(r.provider)) seen.push(r.provider);
  return [...seen, ...PROVIDERS.map((p) => p.id).filter((id) => !seen.includes(id))];
}

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/** Same rule as /api/poster: a "limit:" error from today (India) parks the key. */
function parkedToday(row: ProviderKeyRow): boolean {
  if (!row.lastError?.startsWith("limit:") || !row.lastErrorAt) return false;
  const ist = (ms: number) => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);
  return ist(Date.parse(row.lastErrorAt)) === ist(Date.now());
}

function usageLine(u: UsageCount | undefined): string {
  const ok = u?.ok ?? 0;
  const parts = [`${ok} read${ok === 1 ? "" : "s"}`];
  if (u && u.limit > 0) parts.push(`${u.limit} limit hit${u.limit === 1 ? "" : "s"}`);
  if (u && u.error > 0) parts.push(`${u.error} error${u.error === 1 ? "" : "s"}`);
  return `Today: ${parts.join(", ")}`;
}

/** "Key 3" for the next key of a provider, skipping names already taken. */
function nextLabel(keys: ProviderKeyRow[]): string {
  let n = keys.length + 1;
  while (keys.some((k) => k.label.toLowerCase() === `key ${n}`)) n++;
  return `Key ${n}`;
}

export default function AdminAiKeys() {
  if (!aiKeysAvailable) return <LocalNotice />;
  return <AiKeysLive />;
}

function Header() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold">AI keys</h1>
        <p className="text-sm text-muted-foreground">Keys the poster reader and the Lead Finder use. Tried from top to bottom.</p>
      </div>
    </div>
  );
}

/* LOCAL mode: nothing else renders. There is no server-side place to keep a key
   here, and a key in the browser's storage is exactly what this page avoids. */
function LocalNotice() {
  return (
    <div>
      <Header />
      <div role="status" className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm">
        <p className="font-medium">AI keys need the live Supabase site.</p>
        <p className="mt-1 text-muted-foreground">
          This admin is in Local mode, so there is nowhere safe to store a key. Open the admin on the live site,
          sign in, and add the keys there. The poster reader also runs only on the live site.
        </p>
        <p data-testid="maps-free-usage" className="mt-2 text-muted-foreground">
          Lead Finder (Google Maps key): {FREE_USAGE.google} {FREE_USAGE.cap} {FREE_USAGE.capCaveat} {FREE_USAGE.card} {FREE_USAGE.osm}
        </p>
      </div>
    </div>
  );
}

function AiKeysLive() {
  const [rows, setRows] = useState<ProviderKeyRow[]>([]);
  const [order, setOrder] = useState<ProviderId[]>(PROVIDERS.map((p) => p.id));
  const [adding, setAdding] = useState<Partial<Record<KeyProviderId, AddDraft>>>({});
  const [usage, setUsage] = useState<Usage>({ byProvider: {}, byKey: {} });
  const [legacy, setLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await listKeys();
      setRows(list);
      setOrder(providerOrderOf(list));
      setLegacy(needsMigration());
      setError(null);
    } catch (e) {
      setError("Could not load the keys: " + (e as Error).message);
    }
    // Usage is a nice-to-have: a failure here must not hide the keys.
    try {
      setUsage(await usageToday());
    } catch {
      setUsage({ byProvider: {}, byKey: {} });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* Every write goes through here: one busy flag, one error line, then a reload
     so the page shows what the database holds rather than what we hoped it holds. */
  const run = async (tag: string, fn: () => Promise<void>): Promise<boolean> => {
    setBusy(tag);
    try {
      await fn();
      await reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const keysOf = (id: KeyProviderId) => rows.filter((r) => r.provider === id);
  /* Google Maps keys sit in the same table but never in the poster order. */
  const posterRows = rows.filter((r) => isPosterProvider(r.provider));

  const moveProvider = (id: ProviderId, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    void run(`move-${id}`, () => saveProviderOrder(next, posterRows));
  };

  const moveKey = (row: ProviderKeyRow, dir: -1 | 1) => {
    const list = keysOf(row.provider);
    const i = list.findIndex((k) => k.id === row.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    void run(`kmove-${row.id}`, () => saveKeyOrder(next));
  };

  const openAdd = (id: KeyProviderId) => {
    const list = keysOf(id);
    setAdding((a) => ({ ...a, [id]: { key: "", label: nextLabel(list),
      model: list[list.length - 1]?.model || providerInfo(id).defaultModel } }));
  };
  const closeAdd = (id: KeyProviderId) => setAdding((a) => ({ ...a, [id]: undefined }));

  const onAdd = (id: KeyProviderId) => {
    const d = adding[id];
    if (!d) return;
    const list = keysOf(id);
    // A new key goes to the bottom of its provider. A provider's first key
    // takes the provider's current place on the page.
    const providerPriority = list[0]?.providerPriority
      ?? (isPosterProvider(id) ? (order.indexOf(id) + 1) * 10 : 900);
    const priority = (list.length ? Math.max(...list.map((k) => k.priority)) : 0) + 10;
    void run(`add-${id}`, async () => {
      await addKey(id, { apiKey: d.key, label: d.label, model: d.model, priority, providerPriority });
      closeAdd(id);
    });
  };

  const onRemove = (row: ProviderKeyRow) => {
    const name = `${providerInfo(row.provider).label} ${row.label} (ending ${row.last4})`;
    const who = isPosterProvider(row.provider) ? "The poster reader" : "The Lead Finder";
    if (!confirm(`Remove ${name}? ${who} stops using this key.`)) return;
    void run(`remove-${row.id}`, () => removeKey(row));
  };

  const onTest = async () => {
    setBusy("test");
    setTests(null);
    setTestError(null);
    try {
      setTests(await testKeys());
    } catch (e) {
      setTestError((e as Error).message);
    } finally {
      setBusy(null);
      void reload();
    }
  };

  /* What every card needs, poster provider or Google Maps. */
  const cardProps = (id: KeyProviderId) => ({
    id,
    keys: keysOf(id),
    usage,
    busy,
    canAddMore: !legacy || keysOf(id).length === 0,
    draft: adding[id],
    testFor,
    onOpenAdd: () => openAdd(id),
    onCloseAdd: () => closeAdd(id),
    onDraft: (p: Partial<AddDraft>) => setAdding((a) => ({ ...a, [id]: { ...(a[id] as AddDraft), ...p } })),
    onAdd: () => onAdd(id),
    onMoveKey: moveKey,
    onRemove,
    onReplace: (row: ProviderKeyRow, key: string) => run(`replace-${row.id}`, () => replaceKey(row, key)),
    onUpdate: (row: ProviderKeyRow, patch: Patch, tag: string) => run(`${tag}-${row.id}`, () => updateKey(row, patch)),
  });

  const testFor = (row: ProviderKeyRow) =>
    tests?.find((t) => (t.keyId ? t.keyId === row.id : t.provider === row.provider));

  return (
    <div className="max-w-3xl">
      <Header />

      <div className="mb-5 space-y-2 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <p>
          Keys are tried top to bottom; when one hits its limit the next is used. Using several accounts to multiply
          a provider's free limit can break that provider's terms and get the accounts suspended.
        </p>
        <p>
          Keys are stored in the live database, readable only by an admin, and this page only ever shows their last
          four characters. When every key fails, the poster flow opens the template for you to fill by hand.
        </p>
      </div>

      {legacy && (
        <p role="status" className="mb-5 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          To keep more than one key per provider, run <code className="font-mono text-xs">supabase/migrations/0008_ai_keys_multi.sql</code>{" "}
          in the Supabase SQL editor. Until then each provider holds one key, and the saved ones keep working.
        </p>
      )}

      <div className="mb-5 rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Test keys</p>
            <p className="text-xs text-muted-foreground">Sends a tiny text prompt to every switched-on key.</p>
          </div>
          <button type="button" onClick={onTest} disabled={busy !== null || posterRows.length === 0} className={btnCls}>
            {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlugZap className="h-4 w-4" aria-hidden="true" />}
            Test keys
          </button>
        </div>
        {testError && <p role="alert" className="mt-3 text-sm text-destructive">{testError}</p>}
        {tests && (
          <ul aria-label="Test results" className="mt-3 space-y-1.5">
            {tests.length === 0 && <li className="text-sm text-muted-foreground">No key was tested.</li>}
            {tests.map((t, i) => (
              <li key={t.keyId ?? `${t.provider}-${i}`} className="flex items-start gap-2 text-sm">
                {t.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span className="min-w-0 break-words">
                  <span className="font-medium">
                    {PROVIDERS.find((p) => p.id === t.provider)?.label ?? t.provider}{t.label ? `, ${t.label}` : ""}
                  </span>{" "}
                  <span className="text-muted-foreground">({t.model})</span>: {t.ok ? "works" : t.error || "failed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading keys</div>
      ) : (
        <ol className="space-y-3">
          {order.map((id, i) => (
            <ProviderCard key={id} {...cardProps(id)} position={i} count={order.length} onMove={(dir) => moveProvider(id, dir)} />
          ))}
        </ol>
      )}

      {!loading && (
        <section aria-labelledby="maps-key-title" className="mt-8">
          <h2 id="maps-key-title" className="flex items-center gap-2 font-display text-lg font-semibold">
            <MapPin className="h-5 w-5 text-primary" aria-hidden="true" /> Lead Finder
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Not an AI key and never used for posters. The Lead Finder searches Google Maps with it. Keys are tried top to bottom.
          </p>
          <div data-testid="maps-free-usage" className="mb-3 mt-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
            <p className="font-medium">Free, if you cap it</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
              <li>{FREE_USAGE.google}</li>
              <li>{FREE_USAGE.cap} {FREE_USAGE.capCaveat}</li>
              <li>{FREE_USAGE.card}</li>
              <li>{FREE_USAGE.osm} It lists fewer businesses and fewer phone numbers than Google Maps.</li>
            </ul>
          </div>
          <ol>
            <ProviderCard {...cardProps(GOOGLE_MAPS_ID)} position={0} count={1} standalone onMove={() => undefined} />
          </ol>
        </section>
      )}
    </div>
  );
}

type Patch = Partial<{ model: string; enabled: boolean; label: string }>;

interface CardProps {
  id: KeyProviderId;
  position: number;
  /** Google Maps: no place number, no provider arrows, no model, no poster usage. */
  standalone?: boolean;
  count: number;
  keys: ProviderKeyRow[];
  usage: Usage;
  busy: string | null;
  canAddMore: boolean;
  draft: AddDraft | undefined;
  testFor: (row: ProviderKeyRow) => TestResult | undefined;
  onMove: (dir: -1 | 1) => void;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onDraft: (p: Partial<AddDraft>) => void;
  onAdd: () => void;
  onMoveKey: (row: ProviderKeyRow, dir: -1 | 1) => void;
  onRemove: (row: ProviderKeyRow) => void;
  onReplace: (row: ProviderKeyRow, key: string) => Promise<boolean>;
  onUpdate: (row: ProviderKeyRow, patch: Patch, tag: string) => void;
}

function ProviderCard(props: CardProps) {
  const { id, position, count, keys, usage, busy, canAddMore, draft, onMove, onOpenAdd, standalone } = props;
  const info = providerInfo(id);
  const disabled = busy !== null;
  const anyOn = keys.some((k) => k.enabled);
  const total = usage.byProvider[id];

  return (
    <li aria-label={info.label} className={cn("rounded-2xl border bg-card/60 p-4", anyOn ? "border-border" : "border-dashed border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {!standalone && <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-label={`Tried ${ordinal(position + 1)}`}>{position + 1}</span>}
            <h2 className="font-medium">{info.label}</h2>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", info.free || standalone ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {/* Google Maps: free up to 7,000 a month each on India pricing; the quotas keep it there. */}
              {info.free ? "Free tier" : standalone ? "Free with quotas" : "Paid"}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
              {keys.length === 0 ? "No key" : `${keys.length} key${keys.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {info.where}{" "}
            <a href={info.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">Open</a>
          </p>
        </div>
        {!standalone && <div className="flex shrink-0 gap-1">
          <button type="button" aria-label={`Move ${info.label} up`} disabled={disabled || position === 0} onClick={() => onMove(-1)} className={iconBtn}>
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Move ${info.label} down`} disabled={disabled || position === count - 1} onClick={() => onMove(1)} className={iconBtn}>
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>}
      </div>

      {keys.length > 0 && (
        <ol aria-label={`${info.label} keys`} className="mt-4 space-y-2">
          {keys.map((row, i) => (
            <KeyItem
              key={row.id}
              row={row}
              providerLabel={info.label}
              defaultModel={info.defaultModel}
              first={i === 0}
              last={i === keys.length - 1}
              single={keys.length === 1}
              standalone={standalone}
              usage={usage.byKey[row.id] ?? (row.legacy ? total : undefined)}
              test={props.testFor(row)}
              busy={busy}
              onMove={(dir) => props.onMoveKey(row, dir)}
              onRemove={() => props.onRemove(row)}
              onReplace={(key) => props.onReplace(row, key)}
              onUpdate={(patch, tag) => props.onUpdate(row, patch, tag)}
            />
          ))}
        </ol>
      )}

      {draft ? (
        <AddKeyForm id={id} providerLabel={info.label} defaultModel={info.defaultModel} draft={draft} busy={busy} noModel={standalone}
          onDraft={props.onDraft} onAdd={props.onAdd} onCancel={props.onCloseAdd} />
      ) : canAddMore ? (
        <button type="button" onClick={onOpenAdd} disabled={disabled} className={cn(btnCls, "mt-3")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {keys.length === 0 ? "Add a key" : "Add another key"}
        </button>
      ) : null}
    </li>
  );
}

interface KeyProps {
  row: ProviderKeyRow;
  providerLabel: string;
  defaultModel: string;
  first: boolean;
  last: boolean;
  single: boolean;
  standalone?: boolean;
  usage: UsageCount | undefined;
  test: TestResult | undefined;
  busy: string | null;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onReplace: (key: string) => Promise<boolean>;
  onUpdate: (patch: Patch, tag: string) => void;
}

function KeyItem({ row, providerLabel, defaultModel, first, last, single, standalone, usage, test, busy, onMove, onRemove, onReplace, onUpdate }: KeyProps) {
  const [model, setModel] = useState(row.model);
  const [label, setLabel] = useState(row.label);
  const [replacing, setReplacing] = useState<string | null>(null);
  // Follow the database after a reload, e.g. when another tab changed it.
  useEffect(() => setModel(row.model), [row.model]);
  useEffect(() => setLabel(row.label), [row.label]);

  const disabled = busy !== null;
  const name = `${providerLabel} ${row.label}`;
  const parked = parkedToday(row);
  const uid = `ai-${row.id}`;

  // Model and name are written on blur or Enter, and only when they changed.
  const commitModel = () => {
    const m = model.trim();
    if (m && m !== row.model) onUpdate({ model: m }, "model");
  };
  const commitLabel = () => {
    const l = label.trim();
    if (!l) setLabel(row.label);
    else if (l !== row.label && !row.legacy) onUpdate({ label: l }, "label");
  };
  const saveReplace = async () => {
    if (replacing && (await onReplace(replacing))) setReplacing(null);
  };

  return (
    <li aria-label={`${name}, ending ${row.last4}`} className={cn("rounded-xl border border-border p-3", !row.enabled && "bg-muted/30")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <input
            aria-label={`Name of ${name}`}
            value={label}
            readOnly={row.legacy}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => e.key === "Enter" && commitLabel()}
            className="w-24 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:border-border focus:border-primary/60"
          />
          <code aria-label={`Key ending in ${row.last4}`} className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs">
            ••••••••{row.last4}
          </code>
          {parked && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] uppercase text-warning">Limit hit, back tomorrow</span>}
          {test && (
            <span className={cn("inline-flex items-center gap-1 text-xs", test.ok ? "text-success" : "text-destructive")}>
              {test.ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
              {test.ok ? "Works" : "Test failed"}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch on={row.enabled} label={`Use ${name}`} disabled={disabled} onToggle={() => onUpdate({ enabled: !row.enabled }, "toggle")} />
          {!single && (
            <>
              <button type="button" aria-label={`Move ${name} up`} disabled={disabled || first} onClick={() => onMove(-1)} className={iconBtn}>
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label={`Move ${name} down`} disabled={disabled || last} onClick={() => onMove(1)} className={iconBtn}>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        {!standalone && <div className="min-w-0 flex-1 basis-48">
          <label htmlFor={`${uid}-model`} className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
          <input id={`${uid}-model`} spellCheck={false} value={model} placeholder={defaultModel}
            onChange={(e) => setModel(e.target.value)} onBlur={commitModel}
            onKeyDown={(e) => e.key === "Enter" && commitModel()} className={cn(inputCls, "font-mono")} />
        </div>}
        {replacing === null && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setReplacing("")} disabled={disabled} className={btnCls}>Replace</button>
            <button type="button" onClick={onRemove} disabled={disabled} className={cn(btnCls, "hover:border-destructive/50 hover:text-destructive")}>Remove</button>
          </div>
        )}
      </div>

      {replacing !== null && (
        <div className="mt-2 flex gap-2">
          <KeyInput id={`${uid}-new`} label={`New key for ${name}`} value={replacing} onChange={setReplacing} placeholder="Paste the new key" />
          <button type="button" onClick={saveReplace} disabled={disabled || !replacing.trim()} className={cn(btnCls, "shrink-0 border-primary/50 text-primary")}>
            {busy === `replace-${row.id}` && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Save
          </button>
          <button type="button" onClick={() => setReplacing(null)} disabled={disabled} className={cn(btnCls, "shrink-0")}>Cancel</button>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{row.enabled ? (standalone ? "On" : usageLine(usage)) : "Off, skipped"}</p>

      {(row.lastError || (test && !test.ok)) && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {test && !test.ok
              ? `Test: ${test.error || "failed"}`
              : `Last error${row.lastErrorAt ? ` (${when(row.lastErrorAt)})` : ""}: ${row.lastError}`}
          </span>
        </p>
      )}
    </li>
  );
}

/* type=password so the key is not shown over a shoulder or in a screen share.
   autocomplete new-password, not off: Chrome ignores "off" on password fields
   and would autofill the saved /admin login password here, which one click on
   Save would store and send to a provider as a key. */
function KeyInput({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <input
      id={id}
      aria-label={label}
      type="password"
      autoComplete="new-password"
      data-1p-ignore
      data-lpignore="true"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function AddKeyForm({ id, providerLabel, defaultModel, draft, busy, noModel, onDraft, onAdd, onCancel }: {
  id: KeyProviderId; providerLabel: string; defaultModel: string; draft: AddDraft; busy: string | null; noModel?: boolean;
  onDraft: (p: Partial<AddDraft>) => void; onAdd: () => void; onCancel: () => void;
}) {
  const disabled = busy !== null;
  return (
    <div role="group" aria-label={`New ${providerLabel} key`} className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
        <div className="min-w-0">
          <label htmlFor={`add-${id}-label`} className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
          <input id={`add-${id}-label`} value={draft.label} maxLength={40} onChange={(e) => onDraft({ label: e.target.value })} className={inputCls} />
        </div>
        <div className="min-w-0">
          <label htmlFor={`add-${id}-key`} className="mb-1 block text-xs font-medium text-muted-foreground">API key</label>
          <KeyInput id={`add-${id}-key`} label={`${providerLabel} API key`} value={draft.key} onChange={(v) => onDraft({ key: v })} placeholder="Paste the key" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        {!noModel && <div className="min-w-0 flex-1 basis-48">
          <label htmlFor={`add-${id}-model`} className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
          <input id={`add-${id}-model`} spellCheck={false} value={draft.model} placeholder={defaultModel}
            onChange={(e) => onDraft({ model: e.target.value })} className={cn(inputCls, "font-mono")} />
        </div>}
        <div className="flex gap-2">
          <button type="button" onClick={onAdd} disabled={disabled || !draft.key.trim()} className={cn(btnCls, "border-primary/50 text-primary")}>
            {busy === `add-${id}` && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Save key
          </button>
          <button type="button" onClick={onCancel} disabled={disabled} className={btnCls}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Switch({ on, label, disabled, onToggle }: { on: boolean; label: string; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn("relative mr-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60", on ? "bg-primary" : "bg-muted-foreground/30")}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-background shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

function ordinal(n: number): string {
  return ["first", "second", "third", "fourth"][n - 1] ?? `number ${n}`;
}

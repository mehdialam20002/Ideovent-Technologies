import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, KeyRound, Loader2, PlugZap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  PROVIDERS, aiKeysAvailable, listKeys, saveKey, updateKey, removeKey, saveOrder, usageToday, testKeys,
  type ProviderId, type ProviderKeyRow, type UsageCount, type TestResult,
} from "@/lib/ai/keys";
import { cn } from "@/lib/utils";

/*
  AI KEYS: the keys /api/poster uses to read a school or coaching poster.

  One card per provider, in the order they are tried. The poster reader walks
  this list top to bottom and moves to the next card when a provider fails, is
  rate-limited or has used up its quota; when every card fails the poster flow
  opens the template for manual filling, so an empty page here never blocks a
  demo, it only means "fill by hand".

  ONE KEY PER PROVIDER, and the page says why. Several free accounts rotated to
  multiply a free limit is against every one of these providers' terms, and a
  ban would land on the Google account that also runs the site's mail and leads.
  The table's primary key is the provider, so a second key replaces the first.
*/

const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";
const btnCls =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:border-primary/50 disabled:opacity-50";

interface Draft { key: string; model: string; replacing: boolean }

function initialOrder(rows: ProviderKeyRow[]): ProviderId[] {
  const saved = [...rows].sort((a, b) => a.priority - b.priority).map((r) => r.provider);
  return [...saved, ...PROVIDERS.map((p) => p.id).filter((id) => !saved.includes(id))];
}

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
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
        <p className="text-sm text-muted-foreground">Keys the poster reader uses. Tried from top to bottom.</p>
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
      </div>
    </div>
  );
}

function AiKeysLive() {
  const [rows, setRows] = useState<Partial<Record<ProviderId, ProviderKeyRow>>>({});
  const [order, setOrder] = useState<ProviderId[]>(PROVIDERS.map((p) => p.id));
  const [drafts, setDrafts] = useState<Record<ProviderId, Draft>>(
    () => Object.fromEntries(PROVIDERS.map((p) => [p.id, { key: "", model: p.defaultModel, replacing: false }])) as Record<ProviderId, Draft>,
  );
  const [usage, setUsage] = useState<Record<string, UsageCount>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await listKeys();
      setRows(Object.fromEntries(list.map((r) => [r.provider, r])));
      setOrder(initialOrder(list));
      // A saved key's model shows in its field; unsaved cards keep the default.
      setDrafts((d) => {
        const next = { ...d };
        for (const r of list) next[r.provider] = { ...next[r.provider], model: r.model, key: "", replacing: false };
        return next;
      });
      setError(null);
    } catch (e) {
      setError("Could not load the keys: " + (e as Error).message);
    }
    // Usage is a nice-to-have: a failure here must not hide the keys.
    try {
      setUsage(await usageToday());
    } catch {
      setUsage({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* Every write goes through here: one busy flag, one error line, then a reload
     so the page shows what the database holds rather than what we hoped it holds. */
  const run = async (tag: string, fn: () => Promise<void>) => {
    setBusy(tag);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setDraft = (id: ProviderId, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const savedIds = order.filter((id) => rows[id]);

  const move = (id: ProviderId, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    void run(`move-${id}`, () => saveOrder(next, savedIds));
  };

  const onSave = (id: ProviderId) =>
    run(`save-${id}`, () =>
      saveKey(id, {
        apiKey: drafts[id].key,
        model: drafts[id].model,
        priority: (order.indexOf(id) + 1) * 10,
        enabled: rows[id]?.enabled ?? true,
      }),
    );

  const onRemove = (id: ProviderId, label: string) => {
    if (!confirm(`Remove the ${label} key? The poster reader will skip ${label} until a new key is added.`)) return;
    void run(`remove-${id}`, () => removeKey(id));
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

  return (
    <div className="max-w-3xl">
      <Header />

      <div className="mb-5 space-y-2 rounded-2xl border border-border bg-card/60 p-4 text-sm">
        <p>
          <span className="font-medium">One key per provider.</span>{" "}
          <span className="text-muted-foreground">
            Using several accounts to multiply a free limit breaks the provider's terms and can get every account banned,
            including your main Google account. Add one key each, and the next provider takes over when one runs out.
          </span>
        </p>
        <p className="text-muted-foreground">
          Keys are stored in the live database, readable only by an admin. They are never in the site's code, the
          browser's storage or the content Export. When every key fails, the poster flow opens the template for you to
          fill by hand.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Test keys</p>
            <p className="text-xs text-muted-foreground">Sends a tiny text prompt to every switched-on key.</p>
          </div>
          <button type="button" onClick={onTest} disabled={busy !== null || savedIds.length === 0} className={btnCls}>
            {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlugZap className="h-4 w-4" aria-hidden="true" />}
            Test keys
          </button>
        </div>
        {testError && <p role="alert" className="mt-3 text-sm text-destructive">{testError}</p>}
        {tests && (
          <ul aria-label="Test results" className="mt-3 space-y-1.5">
            {tests.length === 0 && <li className="text-sm text-muted-foreground">No key was tested.</li>}
            {tests.map((t) => (
              <li key={t.provider} className="flex items-start gap-2 text-sm">
                {t.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span className="min-w-0 break-words">
                  <span className="font-medium">{PROVIDERS.find((p) => p.id === t.provider)?.label ?? t.provider}</span>{" "}
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
            <ProviderCard
              key={id}
              id={id}
              position={i}
              count={order.length}
              row={rows[id]}
              draft={drafts[id]}
              usage={usage[id]}
              busy={busy}
              onDraft={(p) => setDraft(id, p)}
              onMove={(dir) => move(id, dir)}
              onSave={() => onSave(id)}
              onRemove={(label) => onRemove(id, label)}
              onUpdate={(patch, tag) => run(`${tag}-${id}`, () => updateKey(id, patch))}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

interface CardProps {
  id: ProviderId;
  position: number;
  count: number;
  row: ProviderKeyRow | undefined;
  draft: Draft;
  usage: UsageCount | undefined;
  busy: string | null;
  onDraft: (p: Partial<Draft>) => void;
  onMove: (dir: -1 | 1) => void;
  onSave: () => void;
  onRemove: (label: string) => void;
  onUpdate: (patch: Partial<{ model: string; enabled: boolean }>, tag: string) => void;
}

function ProviderCard({ id, position, count, row, draft, usage, busy, onDraft, onMove, onSave, onRemove, onUpdate }: CardProps) {
  const info = PROVIDERS.find((p) => p.id === id)!;
  const saved = Boolean(row);
  const showKeyInput = !saved || draft.replacing;
  const disabled = busy !== null;
  const keyId = `ai-key-${id}`;
  const modelId = `ai-model-${id}`;
  const on = row?.enabled ?? false;

  // A saved key's model is written on blur, and only when it actually changed.
  const commitModel = () => {
    const m = draft.model.trim();
    if (row && m && m !== row.model) onUpdate({ model: m }, "model");
  };

  return (
    <li aria-label={info.label} className={cn("rounded-2xl border bg-card/60 p-4", saved && on ? "border-border" : "border-dashed border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-label={`Tried ${ordinal(position + 1)}`}>{position + 1}</span>
            <h2 className="font-medium">{info.label}</h2>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", info.free ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {info.free ? "Free tier" : "Paid"}
            </span>
            {!saved && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">No key</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {info.where}{" "}
            <a href={info.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">Open</a>
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label={`Move ${info.label} up`} disabled={disabled || position === 0} onClick={() => onMove(-1)} className={cn(btnCls, "w-9 px-0")}>
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Move ${info.label} down`} disabled={disabled || position === count - 1} onClick={() => onMove(1)} className={cn(btnCls, "w-9 px-0")}>
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={showKeyInput ? keyId : undefined} className="mb-1 block text-xs font-medium text-muted-foreground">API key</label>
          {showKeyInput ? (
            <div className="flex gap-2">
              {/* type=password so the key is not shown over a shoulder or in a screen
                  share. autocomplete new-password, not off: Chrome ignores "off" on
                  password fields and would autofill the saved /admin login password
                  here, which one click on Save would store and send to a provider as a key. */}
              <input
                id={keyId}
                type="password"
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                spellCheck={false}
                placeholder={saved ? "Paste the new key" : "Paste the key"}
                value={draft.key}
                onChange={(e) => onDraft({ key: e.target.value })}
                className={inputCls}
              />
              <button type="button" onClick={onSave} disabled={disabled || !draft.key.trim()} className={cn(btnCls, "shrink-0 border-primary/50 text-primary")}>
                {busy === `save-${id}` && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Save
              </button>
              {saved && (
                <button type="button" onClick={() => onDraft({ replacing: false, key: "" })} disabled={disabled} className={cn(btnCls, "shrink-0")}>Cancel</button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <code aria-label={`Saved key ending in ${row!.last4}`} className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">
                ••••••••{row!.last4}
              </code>
              <button type="button" onClick={() => onDraft({ replacing: true, key: "" })} disabled={disabled} className={btnCls}>Replace</button>
              <button type="button" onClick={() => onRemove(info.label)} disabled={disabled} className={cn(btnCls, "hover:border-destructive/50 hover:text-destructive")}>Remove</button>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor={modelId} className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
          <input
            id={modelId}
            spellCheck={false}
            value={draft.model}
            placeholder={info.defaultModel}
            onChange={(e) => onDraft({ model: e.target.value })}
            onBlur={commitModel}
            onKeyDown={(e) => e.key === "Enter" && commitModel()}
            className={cn(inputCls, "font-mono")}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className={cn("inline-flex items-center gap-2 text-sm", !saved && "opacity-60")}>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={`Use ${info.label}`}
            disabled={disabled || !saved}
            onClick={() => onUpdate({ enabled: !on }, "toggle")}
            className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed", on ? "bg-primary" : "bg-muted-foreground/30")}
          >
            <span className={cn("inline-block h-4 w-4 rounded-full bg-background shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
          </button>
          <span>{saved ? (on ? "On" : "Off, skipped") : "Save a key to switch it on"}</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Today: {usage?.ok ?? 0} read{usage && usage.limit > 0 ? `, ${usage.limit} limit hit${usage.limit === 1 ? "" : "s"}` : ""}
          {usage && usage.error > 0 ? `, ${usage.error} error${usage.error === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      {row?.lastError && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            Last error{row.lastErrorAt ? ` (${when(row.lastErrorAt)})` : ""}: {row.lastError}
          </span>
        </p>
      )}
    </li>
  );
}

function ordinal(n: number): string {
  return ["first", "second", "third", "fourth"][n - 1] ?? `number ${n}`;
}

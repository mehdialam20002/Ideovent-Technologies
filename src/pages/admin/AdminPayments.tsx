import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CreditCard, Link2, RefreshCw, Trash2 } from "lucide-react";
import { fetchPayStatus, type PayStatus } from "@/lib/payments/client";
import {
  connectWebhook, deleteTestEvents, loadConnection, loadPaymentEvents,
  type Connection, type Loaded, type PaymentEventRow,
} from "@/lib/payments/admin";
import { money, paymentsOf, subscriptionsOf, type PaymentView, type SubscriptionView } from "@/lib/payments/events";
import { cn } from "@/lib/utils";

/*
  PAYMENTS.

  The subscriptions and payments Razorpay has reported to
  /api/razorpay/webhook, newest first, read from public.payment_events
  (migration 0010) with the admin's own session. The Razorpay Dashboard is the
  full record (refunds, settlements, invoices); this is the short list.

  The top card says whether online payment is on and what is missing, in the
  order GO-LIVE-IDEOVENT-IN.md section 10 sets it up. No secret is typed,
  shown or sent here: the server reports yes/no, and "Connect" makes the
  server store a one-way fingerprint of the webhook secret it already holds.
*/

const WEBHOOK_URL = `${String(import.meta.env.VITE_PUBLIC_URL || "https://www.ideovent.in").replace(/\/+$/, "")}/api/razorpay/webhook`;
const EVENTS = "subscription.authenticated, .activated, .charged, .pending, .halted, .cancelled, .completed, .paused, .resumed; payment.failed; order.paid; payment_link.paid";

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
const PLAN_NAMES: Record<string, string> = { starter: "Starter, monthly", growth: "Growth, monthly", "starter-yearly": "Starter, yearly" };

function Yes({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[14px] leading-6">
      <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", ok === null ? "bg-muted-foreground/40" : ok ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

/** The line about the webhook's link to the database, and whether "Connect" can do anything now. */
function linkLine(c: Connection | null): { ok: boolean | null; text: string; canConnect: boolean } {
  if (c === null) return { ok: null, text: "checking...", canConnect: false };
  if (c.kind === "missing") return { ok: false, text: "run supabase/migrations/0010_payments.sql first", canConnect: false };
  if (c.kind === "error") return { ok: false, text: c.message, canConnect: false };
  if (!c.webhookSecret) return { ok: false, text: "set RAZORPAY_WEBHOOK_SECRET in Vercel and redeploy, then connect", canConnect: false };
  if (c.connected && c.current) return { ok: true, text: `connected ${when(c.connectedAt)}`, canConnect: true };
  if (c.connected) return { ok: false, text: "the webhook secret in Vercel changed after you connected: connect again", canConnect: true };
  return { ok: false, text: "not connected yet", canConnect: true };
}

function StatusCard({ status, link, onConnected }: { status: PayStatus | null; link: Connection | null; onConnected: (c: Connection) => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const line = linkLine(link);
  const connected = link?.kind === "ok" && link.connected && link.current;

  const connect = async () => {
    setBusy(true);
    setMsg("");
    const c = await connectWebhook();
    setBusy(false);
    if (c.kind === "ok" && c.connected) {
      setMsg("Connected. Razorpay's events are now saved here. If you ever change the webhook secret in Vercel, press Connect again.");
      onConnected(c);
    } else {
      setMsg(c.kind === "missing" ? "Run supabase/migrations/0010_payments.sql in Supabase first." : c.kind === "error" ? c.message : "Not connected.");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="pay-setup">
      <h2 id="pay-setup" className="font-display text-lg font-semibold">Online payment</h2>
      <ul className="mt-3 grid gap-1">
        <Yes ok={status ? status.enabled : null}>
          Razorpay keys on the server: {status === null ? "checking..." : status.enabled ? `yes, ${status.mode === "live" ? "LIVE mode" : "TEST mode (no real money)"}` : "not set (the site shows the WhatsApp fallback)"}
        </Yes>
        <Yes ok={status ? Boolean(status.plans.starter) : null}>Starter monthly plan id (RAZORPAY_PLAN_STARTER_MONTHLY): {status?.plans.starter ? "set" : "not set"}</Yes>
        <Yes ok={status ? Boolean(status.plans.growth) : null}>Growth monthly plan id (RAZORPAY_PLAN_GROWTH_MONTHLY): {status?.plans.growth ? "set" : "not set"}</Yes>
        <Yes ok={status ? Boolean(status.webhook) : null}>Webhook secret in Vercel (RAZORPAY_WEBHOOK_SECRET): {status?.webhook ? "set" : "not set"}</Yes>
        <Yes ok={line.ok}>Webhook connected to the database: {line.text}</Yes>
      </ul>
      <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
        Webhook URL for Razorpay: <span className="break-all font-mono">{WEBHOOK_URL}</span>
        <br />
        Events to tick: {EVENTS}.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !line.canConnect} onClick={() => void connect()} data-testid="connect-webhook"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
          <Link2 className="h-4 w-4" aria-hidden="true" />
          {busy ? "Connecting..." : connected ? "Connect again" : "Connect the webhook to the database"}
        </button>
        <p className="min-w-0 flex-1 basis-64 text-[13px] leading-5 text-muted-foreground">
          The server stores a one-way fingerprint of its webhook secret in Supabase, so the database accepts events from our
          webhook and from nobody else. The secret itself stays in Vercel; it is never typed or shown here.
        </p>
      </div>
      {msg && <p role="status" className="mt-2 text-[13px] leading-5">{msg}</p>}
    </section>
  );
}

type Tab = "subscriptions" | "payments" | "events";

export default function AdminPayments() {
  const [status, setStatus] = useState<PayStatus | null>(null);
  const [link, setLink] = useState<Connection | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    const [s, c, rows] = await Promise.all([fetchPayStatus(), loadConnection(), loadPaymentEvents()]);
    setStatus(s);
    setLink(c);
    setLoaded(rows);
    setBusy(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = loaded?.kind === "ok" ? loaded.rows : [];
  const subs = subscriptionsOf(rows);
  const pays = paymentsOf(rows);
  const testRows = rows.filter((r) => r.mode === "test").length;

  const clearTest = async () => {
    if (!confirm(`Delete the ${testRows} test-mode events? Live events are not touched.`)) return;
    try {
      await deleteTestEvents();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
    void reload();
  };

  const tabs: [Tab, string, number][] = [
    ["subscriptions", "Subscriptions", subs.length],
    ["payments", "Payments", pays.length],
    ["events", "All events", rows.length],
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">What Razorpay has reported: monthly plans, one-time payments and Payment Links.</p>
        </div>
        <button type="button" onClick={() => void reload()} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
          <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} /> Refresh
        </button>
      </div>

      <StatusCard status={status} link={link} onConnected={setLink} />

      <div className="mt-6">
        {loaded === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : loaded.kind === "local" ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Payments are stored in Supabase. This admin runs in local mode (no Supabase settings), so there is nothing to list here.
          </p>
        ) : loaded.kind === "missing" ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            The payments table does not exist yet. Run supabase/migrations/0010_payments.sql in Supabase, SQL Editor (GO-LIVE-IDEOVENT-IN.md, 10.4).
          </p>
        ) : loaded.kind === "error" ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 p-6 text-sm">Could not read payments: {loaded.message}</p>
        ) : (
          <Lists tab={tab} setTab={setTab} rows={rows} subs={subs} pays={pays} testRows={testRows} tabs={tabs} clearTest={clearTest} />
        )}
      </div>
    </div>
  );
}

function Lists({
  tab, setTab, rows, subs, pays, testRows, tabs, clearTest,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  rows: PaymentEventRow[];
  subs: SubscriptionView[];
  pays: PaymentView[];
  testRows: number;
  tabs: [Tab, string, number][];
  clearTest: () => Promise<void>;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Payments view">
        {tabs.map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("h-9 rounded-lg border px-3 text-sm", tab === id ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted")}>
            {label} ({n})
          </button>
        ))}
        {testRows > 0 && (
          <button type="button" onClick={() => void clearTest()} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted">
            <Trash2 className="h-4 w-4" /> Delete {testRows} test events
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No payments yet.</div>
      ) : (
        <div className="mt-4 grid gap-3" role="tabpanel">
          {tab === "subscriptions" && subs.map((s) => (
            <Card key={s.id} mode={s.mode} title={s.business || s.name || "Unnamed customer"} right={s.status || ""}>
              <Line>{[PLAN_NAMES[s.plan || ""] || s.plan, s.paid !== null && s.total ? `${s.paid} of ${s.total} payments made` : null].filter(Boolean).join(" · ")}</Line>
              <Line>{[s.name, s.phone, s.email].filter(Boolean).join(" · ")}</Line>
              <Line muted>{s.lastEvent} · {when(s.lastAt)} · {s.id}</Line>
            </Card>
          ))}
          {tab === "payments" && pays.map((p) => (
            <Card key={p.id} mode={p.mode} title={`${money(p.amount, p.currency)} ${p.business || p.name || ""}`.trim()} right={p.status || ""}>
              <Line>{[PLAN_NAMES[p.plan || ""] || p.plan, p.method, p.phone].filter(Boolean).join(" · ")}</Line>
              {p.error && <Line>Failed: {p.error}</Line>}
              <Line muted>{when(p.at)} · {[p.id, p.subscriptionId, p.orderId, p.linkId].filter(Boolean).join(" · ")}</Line>
            </Card>
          ))}
          {tab === "events" && rows.map((r) => (
            <Card key={r.event_id} mode={r.mode} title={r.event} right={r.subscription_status || r.payment_status || ""}>
              <Line>{[r.business || r.customer_name, money(r.amount, r.currency)].filter(Boolean).join(" · ")}</Line>
              <Line muted>{when(r.event_at || r.received_at)} · {[r.subscription_id, r.payment_id, r.order_id, r.payment_link_id].filter(Boolean).join(" · ")}</Line>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Card({ title, right, mode, children }: { title: string; right: string; mode: "test" | "live" | null; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 break-words font-medium">
          {title}
          {mode === "test" && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">test</span>}
        </p>
        {right && <span className="rounded-full border border-border px-2 py-0.5 text-xs">{right}</span>}
      </div>
      <div className="mt-1 grid gap-0.5">{children}</div>
    </div>
  );
}

function Line({ muted, children }: { muted?: boolean; children: ReactNode }) {
  if (children === "" || children === null) return null;
  return <p className={cn("break-words text-sm", muted ? "text-xs text-muted-foreground" : "text-foreground/85")}>{children}</p>;
}


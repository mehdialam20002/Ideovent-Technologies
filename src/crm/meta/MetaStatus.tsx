import { Link } from "react-router-dom";
import { DownloadCloud, Link2, RefreshCw } from "lucide-react";
import type { MetaIntakeStatus, MetaStatusResult } from "@/lib/meta/client";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { fmtIstDate, fmtIstShort, fmtIstWhen, StateLine, type LineState } from "./metaUi";
import { stepNumber } from "./MetaChecklist";

/* The checklist below (MetaChecklist) numbers its steps 1 to 14: a line names the step there. */
const TOKEN_STEP = `step ${stepNumber("token")}`;
const LEADS_ACCESS_STEP = `step ${stepNumber("leadsaccess")}`;

/** The daily check runs once a day (09:15 India time on Vercel's Hobby plan); later than this, something is wrong. */
const DAILY_GAP_MS = 26 * 3600e3;

export interface Line {
  row: string;
  state: LineState;
  label: string;
  text: string;
  /** A lead to open from the line. */
  leadId?: string | null;
  testId?: string;
}

/**
 * The status lines (meta-leads-spec 6.1, section 1), pure so the words can be
 * tested: connection, token, Page, the last lead, what is waiting, the daily
 * check, today's limit and the token's reach.
 */
export function statusLines(s: MetaIntakeStatus, pageMatches: boolean | null, accessTokenSet: boolean, now = new Date()): Line[] {
  const out: Line[] = [];
  const t = now.getTime();
  out.push(
    !s.connected ? { row: "connection", state: "todo", label: "Connection", text: "Not connected: press Connect" }
    : !s.current ? { row: "connection", state: "warn", label: "Connection", text: "The App Secret changed in Vercel: press Connect again" }
    : { row: "connection", state: "done", label: "Connection", text: `Connected ${fmtIstShort(s.connectedAt)}`.trim() },
  );
  if (s.relayConnected && !s.relayCurrent) {
    out.push({ row: "relay", state: "warn", label: "Make relay", text: "META_RELAY_SECRET changed in Vercel: press Connect again" });
  }
  const tk = s.token;
  const exp = tk.expiresAt ? Date.parse(tk.expiresAt) : NaN;
  out.push(
    !accessTokenSet ? { row: "token", state: "todo", label: "Token", text: `Not set in Vercel yet (${TOKEN_STEP})` }
    : !tk.set || tk.valid === null ? { row: "token", state: "todo", label: "Token", text: "Set in Vercel: press Check again" }
    : tk.valid === false
      ? { row: "token", state: "warn", label: "Token", text: `Not valid${tk.error ? ` (${tk.error})` : ""}: make a new one (${TOKEN_STEP}), put it in Vercel, Redeploy, then press Check again` }
    : tk.missing.length ? { row: "token", state: "warn", label: "Token", text: `Missing permissions: ${tk.missing.join(", ")}` }
    : !Number.isFinite(exp) ? { row: "token", state: "done", label: "Token", text: "Valid, never expires" }
    : exp - t < 10 * 864e5 ? { row: "token", state: "warn", label: "Token", text: `Valid until ${fmtIstDate(tk.expiresAt)}: make a new one before then (${TOKEN_STEP})` }
    : { row: "token", state: "done", label: "Token", text: `Valid until ${fmtIstDate(tk.expiresAt)}` },
  );
  if (accessTokenSet && tk.extra.length) {
    out.push({ row: "reach", state: "warn", label: "Token reach", text: `It can do more than read leads (${tk.extra.join(", ")}): make one without them (${TOKEN_STEP})` });
  }
  out.push(
    /* Before Connect the server's pageMatches is false too (no Page is stored yet): that is "not yet", not a changed Page id. */
    !s.connected ? { row: "page", state: "todo", label: "Page", text: "Connect stores the Page set as META_PAGE_ID in Vercel" }
    : pageMatches === false ? { row: "page", state: "warn", label: "Page", text: "The Page id in Vercel is not the Page you connected: press Connect" }
    : s.page.subscribed === true ? { row: "page", state: "done", label: "Page", text: `${s.page.name || "Your Page"}, subscribed to leads` }
    : !accessTokenSet || !tk.set ? { row: "page", state: "todo", label: "Page", text: "Check again subscribes it once the token is in Vercel" }
    : s.page.subscribed === false ? { row: "page", state: "warn", label: "Page", text: "Not subscribed: press Check again" }
    : { row: "page", state: "todo", label: "Page", text: "Not checked yet: press Check again" },
  );
  const last = [
    s.lastReceivedAt && `last notification ${fmtIstShort(s.lastReceivedAt)}`,
    s.lastLeadAt && `last lead ${fmtIstShort(s.lastLeadAt)}`,
    `today ${s.counts.today}, this week ${s.counts.week}`,
  ].filter(Boolean).join(" · ");
  out.push({ row: "leads", state: s.lastLeadAt ? "done" : "todo", label: "Leads", text: s.lastLeadAt ? last : `No lead yet · ${last}`, leadId: s.lastLeadId });
  const c = s.counts;
  const waiting = [
    c.failedToken && `${c.failedToken} ${c.failedToken === 1 ? "lead is" : "leads are"} waiting: the access token stopped working. Make a new one (${TOKEN_STEP}), Redeploy, then press Check again.`,
    c.failedPermission && `Meta will not show us ${c.failedPermission} ${c.failedPermission === 1 ? "lead" : "leads"}: check Leads access (${LEADS_ACCESS_STEP}) and the token's Page.`,
    c.pending && `${c.pending} waiting to be fetched: they come in by themselves, or press Fetch missed leads now.`,
    c.failedOther && `${c.failedOther} could not be read (Meta sent something unusable): see the log.`,
  ].filter(Boolean) as string[];
  out.push(waiting.length
    ? { row: "waiting", state: "warn", label: "Waiting", text: waiting.join(" "), testId: "meta-pending" }
    : { row: "waiting", state: "done", label: "Waiting", text: "Nothing is waiting", testId: "meta-pending" });
  const ran = s.lastCatchupAt ? Date.parse(s.lastCatchupAt) : NaN;
  const since = s.connectedAt ? Date.parse(s.connectedAt) : NaN;
  out.push(
    Number.isFinite(ran) && t - ran < DAILY_GAP_MS ? { row: "daily", state: "done", label: "Daily check", text: `Ran ${fmtIstWhen(s.lastCatchupAt, now)}`, testId: "meta-daily-check" }
    /* The daily check skips its run until Connect (api/meta/catchup.js), so before it nothing is late. */
    : !s.connected ? { row: "daily", state: "todo", label: "Daily check", text: "Runs every morning once you press Connect", testId: "meta-daily-check" }
    : !Number.isFinite(ran) && Number.isFinite(since) && t - since < DAILY_GAP_MS
      ? { row: "daily", state: "todo", label: "Daily check", text: "First run tomorrow at about 09:15 India time", testId: "meta-daily-check" }
      : { row: "daily", state: "warn", label: "Daily check", text: "The daily check has not run: is CRON_SECRET set in Vercel?", testId: "meta-daily-check" },
  );
  out.push(s.overCapToday > 0
    ? { row: "limit", state: "warn", label: "Today's limit", text: `Today's limit of ${s.dailyCap} is reached: ${s.overCapToday} more ${s.overCapToday === 1 ? "is" : "are"} waiting at Meta. Raise the limit below if they are real.` }
    : { row: "limit", state: "done", label: "Today's limit", text: `Under ${s.dailyCap} new leads a day` });
  return out;
}

export interface LocalNumbers {
  today: number;
  week: number;
  total: number;
  lastAt: string | null;
}

/**
 * Section 1 of the Meta page: one line per item, and Connect / Check again
 * and Fetch missed leads now. Local mode says where real leads come in and
 * shows what Simulate made; the buttons never show there (no /api to call).
 */
export function MetaStatus({ result, local, busy, message, onConnect, onFetch }: {
  result: MetaStatusResult | null;
  local: LocalNumbers;
  busy: "connect" | "fetch" | null;
  message: { text: string; bad?: boolean } | null;
  onConnect: () => void;
  onFetch: () => void;
}) {
  const now = new Date();
  const ok = result?.kind === "ok" ? result : null;
  const connected = Boolean(ok?.status.connected);
  return (
    <section data-testid="meta-status" aria-labelledby="meta-status-h" className={cn(crm.panel, crm.panelPad)}>
      <h2 id="meta-status-h" className={crm.label}>Status</h2>
      {result === null ? (
        <p className="mt-2 text-[13px] text-muted-foreground" role="status">Checking...</p>
      ) : result.kind === "local" ? (
        <>
          <p data-testid="meta-local-note" className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px]">
            Local mode: Meta leads come in on the live CRM only. Try one here with Simulate.
          </p>
          <ul className="mt-1 divide-y divide-border/60">
            <StateLine row="leads" state={local.total ? "done" : "todo"} label="Simulated leads">
              {local.total ? `today ${local.today}, this week ${local.week}, last ${fmtIstShort(local.lastAt)}` : "None yet: use Simulate below"}
            </StateLine>
          </ul>
        </>
      ) : result.kind === "error" ? (
        <p role={result.noApi ? undefined : "alert"} data-testid={result.noApi ? "meta-no-api" : "meta-status-error"}
          className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-200">
          {result.message}
        </p>
      ) : result.kind === "missing" ? (
        <ul className="mt-1 divide-y divide-border/60">
          <StateLine row="database" state="warn" label="Database" testId="meta-needs-sql">
            {result.needs0011 ? "Run 0011, then 0012, in Supabase: see the steps" : "Run 0012 in Supabase: see the steps"}
          </StateLine>
        </ul>
      ) : (
        <ul className="mt-1 divide-y divide-border/60">
          {statusLines(result.status, result.pageMatches, result.env.META_ACCESS_TOKEN === "set", now).map((l) => (
            <StateLine key={l.row} row={l.row} state={l.state} label={l.label} testId={l.testId}>
              {l.text}
              {l.leadId && (
                <>
                  {" "}
                  <Link to={CRM.lead(l.leadId)} className="font-medium text-primary underline-offset-2 hover:underline">Open</Link>
                </>
              )}
            </StateLine>
          ))}
        </ul>
      )}
      {result && result.kind !== "local" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="meta-connect" className={cn(crm.btnPrimary, "max-md:h-11 max-md:flex-1")}
            disabled={busy !== null || result.kind === "missing" || (result.kind === "error" && result.noApi)} onClick={onConnect}>
            {busy === "connect" ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
            {connected ? "Check again" : "Connect"}
          </button>
          <button type="button" data-testid="meta-fetch-now" className={cn(crm.btn, "max-md:h-11 max-md:flex-1")}
            disabled={busy !== null || !connected} title={connected ? undefined : "Connect first"} onClick={onFetch}>
            {busy === "fetch" ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <DownloadCloud className="h-4 w-4" aria-hidden="true" />}
            Fetch missed leads now
          </button>
        </div>
      )}
      <div aria-live="polite">
        {message && (
          <p data-testid="meta-action-result" role={message.bad ? "alert" : undefined}
            className={cn("mt-2 rounded-lg border px-3 py-2 text-[13px]", message.bad ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted/40")}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import type { EnvState, MetaEnvName, MetaStatusResult } from "@/lib/meta/client";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { CopyValue, MakeOne, META_WEBHOOK_URL } from "./metaUi";

/** The values the intake cannot work without (the token has its own step; the last two are optional). */
const CORE_ENV: readonly MetaEnvName[] = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ID", "CRON_SECRET"];
const ENV_WORD: Record<EnvState, string> = { set: "set", unset: "not set", short: "too short" };
const DAY_MS = 26 * 3600e3;

type StepState = "done" | "todo" | "manual";

interface Step {
  id: string;
  title: string;
  state: StepState;
  how: ReactNode;
}

function EnvList({ names, env }: { names: readonly MetaEnvName[]; env: Record<MetaEnvName, EnvState> | null }) {
  return (
    <ul className="mt-1.5 space-y-1">
      {names.map((n) => (
        <li key={n} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <CopyValue value={n} label={n} />
          {env && <span className={cn("text-[12px]", env[n] === "set" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300")}>{ENV_WORD[env[n]]}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The steps of "Set up, step by step", in the order the page numbers them (1 to 14). The status lines name a step
 * by its number here (stepNumber), never by the spec's section 8 numbering (crm-fixes-1004 item 15: the token line
 * said "step 9", which on this page is The daily check ran; the token is step 6).
 */
export const CHECKLIST_IDS = [
  "vercel", "database", "connected", "webhook", "test", "token", "subscribed", "testlead", "daily",
  "require-secret", "publish", "leadsaccess", "forms", "audience",
] as const;
export type ChecklistId = (typeof CHECKLIST_IDS)[number];

/** The number this page shows for a step of the checklist (1-based). */
export function stepNumber(id: ChecklistId): number {
  return CHECKLIST_IDS.indexOf(id) + 1;
}

/** Every step of section 8, with its state where the system can know it (meta-leads-spec 6.1, section 3). In CHECKLIST_IDS order. */
export function checklistSteps(result: MetaStatusResult | null, now = new Date()): Step[] {
  const env = result && (result.kind === "ok" || result.kind === "missing") ? result.env : null;
  const s = result?.kind === "ok" ? result.status : null;
  const t = now.getTime();
  const is = (v: boolean | null | undefined): StepState => (v ? "done" : "todo");
  return [
    {
      id: "vercel",
      title: "Values in Vercel",
      state: is(env && CORE_ENV.every((n) => env[n] === "set")),
      how: (
        <>
          Make the Meta app Ideovent Leads first (developers.facebook.com/apps/creation). Then Vercel &gt; Settings &gt; Environment Variables, Production: each name
          below, the secrets ticked Sensitive, then Redeploy.
          <EnvList names={CORE_ENV} env={env} />
          <MakeOne name="META_VERIFY_TOKEN" />
          <MakeOne name="CRON_SECRET" where="in Vercel only" />
        </>
      ),
    },
    {
      id: "database",
      title: "Database: 0011, then 0012",
      state: is(result?.kind === "ok"),
      how: "Only once the release with Meta leads is live and you are told to: Supabase > SQL Editor, run 0011_crm_team.sql, then 0012_meta_leads.sql.",
    },
    { id: "connected", title: "Connected", state: is(s?.connected && s.current), how: "Press Connect above. It says Connected; the token comes later." },
    {
      id: "webhook",
      title: "Meta verified the webhook",
      state: is(Boolean(s?.lastVerifiedAt)),
      how: (
        <>
          App dashboard &gt; Webhooks &gt; Page. Callback URL <CopyValue value={META_WEBHOOK_URL} testId="meta-webhook-url" label="the webhook URL" />{" "}
          and the same verify token as META_VERIFY_TOKEN, then Verify and save, and Subscribe to leadgen.
        </>
      ),
    },
    { id: "test", title: "The dashboard's Test arrived", state: is(Boolean(s?.lastTestAt)), how: "Press Test next to leadgen: the log below shows a signed test from Meta's dashboard." },
    {
      id: "token",
      title: "Token valid, every permission",
      state: is(env?.META_ACCESS_TOKEN === "set" && s?.token.valid === true && s.token.missing.length === 0),
      how: (
        <>
          Business settings &gt; System users &gt; ideovent-crm-server: a token that never expires, with leads_retrieval, pages_show_list,
          pages_read_engagement, pages_manage_metadata, pages_manage_ads and ads_management only. Put it in Vercel, Redeploy, press Check again.
          <EnvList names={["META_ACCESS_TOKEN"]} env={env} />
        </>
      ),
    },
    { id: "subscribed", title: "Page subscribed to leads", state: is(s?.page.subscribed === true), how: "Check again subscribes the Page to the app by itself." },
    { id: "testlead", title: "A Testing Tool lead arrived", state: is((s?.counts.testLeadsSeen || 0) > 0), how: "Lead Ads Testing Tool > Create lead: it shows here once, then delete it here and at Meta." },
    {
      id: "daily",
      title: "The daily check ran",
      state: is(Boolean(s?.lastCatchupAt) && t - Date.parse(s?.lastCatchupAt || "") < DAY_MS),
      how: "Vercel runs it every morning (about 09:15 India time) with CRON_SECRET. It fetches whatever the webhook missed.",
    },
    { id: "require-secret", title: "Require App Secret on", state: "manual", how: "App settings > Advanced > Security, once the token works. Then press Check again: it must stay green." },
    { id: "publish", title: "App published", state: "manual", how: "App dashboard > Publish. This is not App Review: real leads need a published app." },
    { id: "leadsaccess", title: "Leads access checked", state: "manual", how: "Business settings > Integrations > Leads access. If it was customised: assign the system user, and Ideovent Leads under CRMs." },
    {
      id: "forms",
      title: "Forms: privacy link and consent tick",
      state: "manual",
      how: "Every instant form links https://www.ideovent.in/privacy and has the tick \"Ideovent may contact me on WhatsApp and phone about this enquiry\", not required.",
    },
    { id: "audience", title: "Ad audiences 18 and over", state: "manual", how: "Each ad set's audience: age 18 and over (a child's data needs a parent's consent)." },
  ];
}

const STATE_WORD: Record<StepState, string> = { done: "Done", todo: "Not yet", manual: "In Meta" };

/** Section 3 of the Meta page: set up, step by step. */
export function MetaChecklist({ result }: { result: MetaStatusResult | null }) {
  const steps = checklistSteps(result);
  return (
    <section aria-labelledby="meta-checklist-h" className={cn(crm.panel, crm.panelPad)}>
      <h2 id="meta-checklist-h" className={crm.label}>Set up, step by step</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">
        About an hour, all in your own accounts. Values you copy go into Vercel and Meta's dashboard only, never into the CRM or a chat.
      </p>
      <ol data-testid="meta-checklist" className="mt-2 divide-y divide-border/60">
        {steps.map((st, i) => (
          <li key={st.id} data-step={st.id} data-state={st.state} className="flex gap-2.5 py-2.5">
            <span className={cn(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
              st.state === "done" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
            )}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 text-[13px] leading-snug">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{st.title}</span>
                <span className={cn("text-[11px] font-medium", st.state === "done" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                  {STATE_WORD[st.state]}
                </span>
              </p>
              <div className="mt-0.5 break-words text-muted-foreground">{st.how}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

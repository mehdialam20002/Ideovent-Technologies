import type { ReactNode } from "react";
import { BadgeCheck, CircleAlert, EyeOff } from "lucide-react";
import type { CrmTargets } from "@/lib/outreach/team";
import { DEFAULT_SENDER_PHONE, DEFAULT_SIGNATURE } from "@/lib/outreach/engine";
import { teamDemoUrl } from "@/lib/demo/opens";
import { demoStatus } from "@/lib/demo/record";
import { prettyPhone } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { PageHeader, crm } from "../ui";
import { PasswordForm } from "../auth/FirstPassword";
import { SignOutButton } from "../auth/AccessOff";
import { PhoneSetup } from "./PhoneSetup";
import { composedSignature } from "./identity";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", member: "Team member" } as const;

const TARGETS: { key: keyof CrmTargets; label: string }[] = [
  { key: "firstMessagesPerDay", label: "First messages a day" },
  { key: "callsPerDay", label: "Calls a day" },
  { key: "repliesPerWeek", label: "Replies a week" },
  { key: "handoffsPerWeek", label: "Hand-overs a week" },
];

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2 text-[13px] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Panel({ title, id, children, className }: { title: string; id: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn(crm.panel, crm.panelPad, className)}>
      <h2 id={id} className={crm.label}>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * ME (spec 10.5): a person's own page. Their profile and what Mehdi set for
 * them (read only: he changes it on the Team page), the name, number and
 * signature their messages carry, their targets, Set up this phone (always
 * reachable here), their password, and Sign out.
 *
 * MEHDI'S OWN PAGE (4 Oct 2026, crm-fixes-1004 item 17) speaks to him: his
 * messages carry the phone and signature of Settings (engine.ts: no company
 * number of his own is needed), his number counts as checked, nothing tells
 * him to ask himself, and "Your own demo opens" keeps his phone's looks at a
 * live demo out of the numbers.
 */
export default function CrmMePage() {
  const { me, mode } = useCrmMe();
  const { settings, demos } = useCrmData();
  const role = me.role ? ROLE_LABEL[me.role] : "";
  const sender = me.senderName || me.displayName;
  const member = me.role === "member";
  const owner = me.role === "owner";
  // What Mehdi's own messages carry (ComposePanel renders his with the signature of Settings and no sender phone,
  // so {senderPhone} is engine.ts DEFAULT_SENDER_PHONE).
  const ownerPhone = DEFAULT_SENDER_PHONE;
  const ownerSignature = me.signature || (settings.signature || "").trim() || DEFAULT_SIGNATURE;
  // A live demo to open as a team preview (?team=1), which marks the browser it opens in.
  const liveDemo = demos.find((d) => !(d as { isExample?: boolean }).isExample && demoStatus(d) === "sent");
  const limit = me.waDailyLimit;
  const targets = TARGETS.filter((t) => typeof me.targets?.[t.key] === "number");
  return (
    <div data-testid="crm-me-page" className="mx-auto max-w-5xl">
      <PageHeader title="Me" subtitle={[me.displayName, role].filter(Boolean).join(" · ")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile" id="me-profile">
          <dl className="divide-y divide-border/60">
            <Row k="Name">{me.displayName || "-"}</Row>
            {me.email && <Row k="Login">{me.email}</Row>}
            <Row k="Role">{role || "-"}</Row>
            {member && (
              <>
                <Row k="See all leads">{me.viewAll ? "On: every lead, read only, without contact details" : "Off: your own leads only"}</Row>
                <Row k="Can add leads">{me.canAddLeads ? "Yes" : "No"}</Row>
                <Row k="May cold-call">{me.mayColdCall ? "Yes" : "No: calls only to people who replied or opened a demo"}</Row>
                <Row k="First WhatsApp a day">{limit === null ? "No limit" : limit === 0 ? "None for now" : limit}</Row>
                <Row k="New leads you may hold">{me.newLeadCap}</Row>
              </>
            )}
          </dl>
          {member && <p className="mt-2 text-[12px] text-muted-foreground">Mehdi sets these on the Team page. Ask him to change one.</p>}
        </Panel>

        <Panel title="Your messages say" id="me-sender">
          {owner ? (
            <dl className="divide-y divide-border/60" data-testid="me-sender-owner">
              <Row k="Name">{sender || "-"}</Row>
              <Row k="Phone">{prettyPhone(ownerPhone) || ownerPhone}</Row>
              <Row k="Number checked">
                <span className="inline-flex items-center gap-1 text-success">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Your own number
                </span>
              </Row>
              <Row k="E-mail signature">
                <span className="whitespace-pre-line">{ownerSignature}</span>
              </Row>
            </dl>
          ) : (
            <dl className="divide-y divide-border/60">
              <Row k="Name">{sender || "-"}</Row>
              <Row k="Company phone">{me.senderPhone ? prettyPhone(me.senderPhone) : "Not set yet: Mehdi adds it"}</Row>
              <Row k="Number checked">
                {me.senderChecked ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <CircleAlert className="h-4 w-4" aria-hidden="true" /> Not yet: send Mehdi the test below
                  </span>
                )}
              </Row>
              <Row k="E-mail signature">
                <span className="whitespace-pre-line">{me.signature || composedSignature(sender || "Your name", me.senderPhone)}</span>
              </Row>
            </dl>
          )}
          {owner && <p className="mt-2 text-[12px] text-muted-foreground">Change the signature in Settings, Sender signature.</p>}
        </Panel>

        <Panel title="Targets" id="me-targets">
          {targets.length ? (
            <dl className="divide-y divide-border/60">
              {targets.map((t) => (
                <Row key={t.key} k={t.label}>
                  <span className={crm.num}>{me.targets[t.key]}</span>
                </Row>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] text-muted-foreground">No targets set yet. Mehdi sets them on the Team page.</p>
          )}
          {member && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Hand-overs Mehdi accepts are the number that counts. Activity counts are for coaching.
            </p>
          )}
        </Panel>

        <Panel title={mode === "local" ? "Password (local mode)" : "Change password"} id="me-password">
          <PasswordForm onSaved={() => undefined} submitLabel="Change password" />
          <div className="mt-4 border-t border-border pt-4">
            <SignOutButton />
          </div>
        </Panel>

        <Panel title="Your own demo opens" id="me-own-opens" className="lg:col-span-2">
          <div className="flex items-start gap-3 text-[13px]" data-testid="me-own-opens">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 space-y-1.5">
              <p>
                A live demo opened from the CRM (its Open and Open live link buttons) is never counted as the prospect's
                open, and the browser it opens in is marked, so its later opens are never counted either. An open from
                before a lead's link went to them is never counted anywhere.
              </p>
              {liveDemo ? (
                <p>
                  On a phone where you only tap links in WhatsApp, open{" "}
                  <a href={teamDemoUrl(liveDemo.slug)} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-2 hover:underline" data-testid="me-mark-device">
                    this link
                  </a>{" "}
                  once in that phone's browser: it marks the phone the same way.
                </p>
              ) : (
                <p className="text-muted-foreground">Once a demo is live, a link here marks a phone that only taps links in WhatsApp.</p>
              )}
            </div>
          </div>
        </Panel>

        <div id="phone-setup" className="lg:col-span-2">
          <PhoneSetup always />
        </div>
      </div>
    </div>
  );
}

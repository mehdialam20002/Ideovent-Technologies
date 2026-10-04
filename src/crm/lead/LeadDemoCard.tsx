import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { demoPreviewPath, demoStatus } from "@/lib/demo/record";
import { teamDemoUrl, teamPreviewUrl } from "@/lib/demo/opens";
import { mainSiteUrl } from "@/lib/host";
import { demoLinkFor } from "@/lib/outreach/engine";
import { can, crmErrorText } from "@/lib/outreach/access";
import { teamTurnOnReason } from "@/lib/outreach/linkChoice";
import { useCms } from "@/lib/cms/context";
import { markDemoSent } from "@/admin/outreach/demoActions";
import { allOpens, leadOpens, linkSentAt, opensSinceContact } from "@/admin/outreach/derive";
import { fmtDate, fmtDateTime } from "@/admin/outreach/ui";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

/**
 * The lead's demo in numbers: status (the link only works once it is sent),
 * opens in all, opens since the last contact, the last open, and a 14-day
 * strip of opens so a burst is visible at a glance.
 *
 * SENT IS THE LEAD'S HISTORY (4 Oct 2026, crm-fixes-1004 items 2 and 3). A
 * demo's status "sent" only means its link is live; it was SENT when a message
 * in this lead's history carried the link (derive.ts linkSentAt). Live with no
 * such message reads "Live, not sent yet". The numbers are the lead's own opens
 * (derive.ts leadOpens: after the link went to them); a look at the live link
 * before that (often Mehdi's own check) is counted nowhere and said in one line.
 * Mehdi's Open on a live demo is a team preview (?team=1), so his look is never
 * recorded and his browser is marked on the main site (lib/demo/opens.ts).
 *
 * Anyone but Mehdi (spec 10.7) turns a draft's link on through the database
 * (crm_publish_lead_demo; they cannot write the CMS), and opens the public page
 * marked as a team visit, so their look never counts as the prospect's open.
 * A demo only Mehdi can mend first (a Free slot, expired, an example, a
 * provisional link, the template's toppers, another name: linkChoice.ts
 * teamDemoFix) gets no Turn on the link, only why.
 */
export function LeadDemoCard({ lead }: { lead: OutreachLead }) {
  const { demoForLead, opens, slots, addEvent, now, me, publishLeadDemo, openCtx } = useCrmData();
  const manages = !me.role || can(me, "demos.manage");
  const { actions } = useCms();
  const demo = demoForLead(lead);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // The lead's own opens (after its link went to them), every recorded one, and those since the last contact.
  const mine = useMemo(() => (demo ? leadOpens(lead, opens, openCtx) : []), [demo, lead, opens, openCtx]);
  const every = useMemo(() => (demo ? allOpens(lead, opens, openCtx) : []), [demo, lead, opens, openCtx]);
  const fresh = useMemo(() => (demo ? opensSinceContact(lead, opens, openCtx).length : 0), [demo, lead, opens, openCtx]);
  const sentAt = demo ? linkSentAt(lead.id, openCtx.events) : undefined;
  const notCounted = every.length - mine.length;
  const days = useMemo(() => {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + DAY;
    const out = Array.from({ length: 14 }, (_, i) => ({ start: end - (14 - i) * DAY, n: 0 }));
    for (const o of mine) {
      const t = Date.parse(o.at);
      const d = out.find((x) => t >= x.start && t < x.start + DAY);
      if (d) d.n++;
    }
    return out;
  }, [mine, now]);
  const peak = Math.max(1, ...days.map((d) => d.n));

  if (!demo) {
    return (
      <section className={cn(crm.panel, crm.panelPad)} aria-label="Demo">
        <p className={crm.label}>Demo</p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {lead.demoSlug
            ? `Linked to /site/${lead.demoSlug}, but that demo is not in the CMS any more.`
            : manages ? "No demo yet. Make or pick one in step 1, Demo." : "No demo yet. Ask Mehdi for one in step 1, Demo."}
        </p>
      </section>
    );
  }
  const status = demoStatus(demo);
  // Anyone but Mehdi: a demo that waits for him first is never turned on from here.
  const mehdisFirst = manages ? "" : teamTurnOnReason(demo, lead, now);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(demoLinkFor(demo.slug));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("Could not copy the link.");
    }
  };
  const markSent = async () => {
    setErr(null);
    const sentTo = [lead.contactName, lead.instituteName].filter(Boolean).join(", ");
    try {
      if (!manages) {
        await publishLeadDemo(lead.id, sentTo);
        return;
      }
      await markDemoSent(actions.saveDoc, demo, slots, sentTo, new Date(), actions.loadDemo);
      await addEvent({ leadId: lead.id, type: "note", detail: `Demo /site/${demo.slug} marked sent` });
    } catch (e) {
      setErr(manages ? (e as Error).message || "Not marked sent." : crmErrorText(e));
    }
  };

  return (
    <section className={cn(crm.panel, crm.panelPad, "space-y-3")} aria-label="Demo" data-testid="lead-demo-card">
      <div className="flex items-center justify-between gap-2">
        <p className={crm.label}>Demo</p>
        <span className={cn("text-[12px] font-medium", status === "sent" ? (sentAt ? "text-success" : "text-muted-foreground") : "text-warning")} data-testid="lead-demo-state">
          {status === "sent"
            ? sentAt ? `Sent ${fmtDate(sentAt)}, link is live` : "Live, not sent yet"
            : `${status.charAt(0).toUpperCase()}${status.slice(1)}, link is off`}
        </span>
      </div>
      <p className="break-all text-[13px]">/site/{demo.slug}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat n={mine.length} label="opens" />
        <Stat n={fresh} label="since contact" hot={fresh > 0} />
        <div className="rounded-lg bg-muted/50 px-2 py-2">
          <p className="text-[12px] font-medium leading-tight">{mine[0] ? fmtDateTime(mine[0].at) : "Never"}</p>
          <p className="text-[11px] text-muted-foreground">last open</p>
        </div>
      </div>
      <div aria-label={`Opens in the last 14 days: ${days.reduce((a, d) => a + d.n, 0)}`} role="img" className="flex h-10 items-end gap-[3px]">
        {days.map((d) => (
          <span key={d.start} title={`${new Date(d.start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: ${d.n}`}
            className={cn("flex-1 rounded-[2px]", d.n ? "bg-primary" : "bg-muted")} style={{ height: `${d.n ? Math.max(18, (d.n / peak) * 100) : 8}%` }} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Opens per day, last 14 days</p>
      {notCounted > 0 && (
        <p className="text-[11px] text-muted-foreground" data-testid="lead-demo-not-counted">
          {notCounted === 1 ? "1 open" : `${notCounted} opens`} from before its link went to them {notCounted === 1 ? "is" : "are"} not counted (often your own check of the link).
        </p>
      )}
      {mehdisFirst && <p className="text-[12px] text-warning" data-testid="lead-demo-needs-mehdi">{mehdisFirst}</p>}
      <div className="flex flex-wrap gap-1.5">
        {status !== "sent" && status !== "closed" && !mehdisFirst && (
          <button type="button" className={crm.btnPrimary} onClick={() => void markSent()} data-testid="lead-demo-turn-on">
            <Send className="h-4 w-4" aria-hidden="true" /> {manages ? "Mark sent" : "Turn on the link"}
          </button>
        )}
        <button type="button" className={crm.btn} onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
        </button>
        {/* The preview is on the main site: relative today, absolute from the CRM's own subdomain. A live demo opens
            as a team visit (?team=1) for everyone, Mehdi too, so a look from here is never recorded as the prospect's
            open and marks this browser on the main site (4 Oct 2026); Mehdi's draft opens in the admin preview. */}
        {manages && status !== "sent" ? (
          <a className={crm.btn} href={mainSiteUrl(demoPreviewPath(demo.slug))} target="_blank" rel="noopener noreferrer" data-testid="lead-demo-open"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open</a>
        ) : manages && status === "sent" ? (
          <a className={crm.btn} href={teamDemoUrl(demo.slug)} target="_blank" rel="noopener noreferrer" data-testid="lead-demo-open"
            title="The page the prospect gets. Opening it from here never counts as their open."><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open</a>
        ) : status === "sent" ? (
          <a className={crm.btn} href={teamPreviewUrl(demoLinkFor(demo.slug))} target="_blank" rel="noopener noreferrer" data-testid="lead-demo-open"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open</a>
        ) : null}
      </div>
      {err && <p role="alert" className="text-[12px] text-destructive">{err}</p>}
    </section>
  );
}

function Stat({ n, label, hot }: { n: number; label: string; hot?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2">
      <p className={cn(crm.num, "text-lg font-semibold leading-tight", hot && "text-primary")}>{n}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

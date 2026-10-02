import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { demoPreviewPath, demoStatus } from "@/lib/demo/record";
import { teamPreviewUrl } from "@/lib/demo/opens";
import { mainSiteUrl } from "@/lib/host";
import { demoLinkFor } from "@/lib/outreach/engine";
import { can, crmErrorText } from "@/lib/outreach/access";
import { useCms } from "@/lib/cms/context";
import { markDemoSent } from "@/admin/outreach/demoActions";
import { fmtDateTime } from "@/admin/outreach/ui";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

/**
 * The lead's demo in numbers: status (the link only works once it is sent),
 * opens in all, opens since the last contact, the last open, and a 14-day
 * strip of opens so a burst is visible at a glance.
 *
 * Anyone but Mehdi (spec 10.7) turns a draft's link on through the database
 * (crm_publish_lead_demo; they cannot write the CMS), and opens the public page
 * marked as a team visit, so their look never counts as the prospect's open.
 */
export function LeadDemoCard({ lead }: { lead: OutreachLead }) {
  const { demoForLead, opens, slots, addEvent, now, me, publishLeadDemo } = useCrmData();
  const manages = !me.role || can(me, "demos.manage");
  const { actions } = useCms();
  const demo = demoForLead(lead);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mine = useMemo(
    () => (demo ? opens.filter((o) => o.demoId === demo.id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : []),
    [demo, opens],
  );
  const since = lead.lastContactedAt ? Date.parse(lead.lastContactedAt) : 0;
  const fresh = mine.filter((o) => Date.parse(o.at) > since).length;
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
      await markDemoSent(actions.saveDoc, demo, slots, sentTo);
      await addEvent({ leadId: lead.id, type: "note", detail: `Demo /site/${demo.slug} marked sent` });
    } catch (e) {
      setErr(manages ? (e as Error).message || "Not marked sent." : crmErrorText(e));
    }
  };

  return (
    <section className={cn(crm.panel, crm.panelPad, "space-y-3")} aria-label="Demo" data-testid="lead-demo-card">
      <div className="flex items-center justify-between gap-2">
        <p className={crm.label}>Demo</p>
        <span className={cn("text-[12px] font-medium", status === "sent" ? "text-success" : "text-warning")}>
          {status === "sent" ? "Sent, link is live" : `${status.charAt(0).toUpperCase()}${status.slice(1)}, link is off`}
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
      <div className="flex flex-wrap gap-1.5">
        {status !== "sent" && status !== "closed" && (
          <button type="button" className={crm.btnPrimary} onClick={() => void markSent()} data-testid="lead-demo-turn-on">
            <Send className="h-4 w-4" aria-hidden="true" /> {manages ? "Mark sent" : "Turn on the link"}
          </button>
        )}
        <button type="button" className={crm.btn} onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
        </button>
        {/* The preview is on the main site: relative today, absolute from the CRM's own subdomain. Anyone but
            Mehdi opens the public page as a team visit (/admin is his), once its link is live. */}
        {manages ? (
          <a className={crm.btn} href={mainSiteUrl(demoPreviewPath(demo.slug))} target="_blank" rel="noopener noreferrer" data-testid="lead-demo-open"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open</a>
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

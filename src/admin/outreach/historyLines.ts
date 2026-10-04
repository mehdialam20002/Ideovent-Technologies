import type { DemoSiteOpen } from "@/lib/cms/types";
import type { OutreachEvent, OutreachLead } from "@/lib/outreach/types";
import { allOpens, leadOpens, type OpensCtx } from "./derive";

/** The open's id at the end of a "Demo opened" line ("... [dso_...]"): the line's own, never shown. */
export const OPEN_ID_RE = /\s*\[([^\]]+)\]$/;

/** How a recorded open that is NOT the lead's own reads (derive.ts leadOpens): before their link went, so not counted. */
export const OPEN_NOT_COUNTED = "Demo opened, before its link went to them (not counted)";

export interface HistoryLine {
  key: string;
  at: string;
  /** A history line, one of the lead's own opens, an open from before its link went (not counted), or "Lead added". */
  kind: "event" | "open" | "open_uncounted" | "created";
  event?: OutreachEvent;
  text: string;
  actorId?: string;
}

function eventText(e: OutreachEvent): string {
  if (e.detail) return e.detail;
  switch (e.type) {
    case "sent":
      return `${e.channel === "whatsapp" ? "WhatsApp" : "Email"} opened ready to send${e.templateId ? ` (${e.templateId})` : ""}`;
    case "replied":
      return "They replied";
    case "call":
      return "Call";
    case "demo_opened":
      return "Demo opened";
    default:
      return e.type;
  }
}

/**
 * The lines a lead's history shows, newest first (4 Oct 2026, crm-fixes-1004
 * item 18): its own history lines (a "Demo opened" line without the open's
 * id), every recorded open of its demo not already written as a line, and
 * "Lead added". An open from before its demo link went to them is listed as
 * not counted (derive.ts leadOpens). The History fold's count is the length of
 * this list, so it never says "0 entries" over a "Lead added" line. Pure.
 */
export function historyLines(lead: OutreachLead, events: OutreachEvent[], opens: DemoSiteOpen[], ctx: OpensCtx): HistoryLine[] {
  const own = events.filter((e) => e.leadId === lead.id);
  const logged = new Set(own.filter((e) => e.type === "demo_opened").map((e) => OPEN_ID_RE.exec(e.detail || "")?.[1]).filter(Boolean));
  const counted = new Set(leadOpens(lead, opens, ctx).map((o) => o.id));
  const lines: HistoryLine[] = [
    ...own.map((e): HistoryLine => ({ key: e.id, at: e.at, kind: "event", event: e, text: eventText(e).replace(OPEN_ID_RE, ""), actorId: e.actorId })),
    ...allOpens(lead, opens, ctx)
      .filter((o) => !logged.has(o.id))
      .map((o): HistoryLine => (counted.has(o.id)
        ? { key: o.id, at: o.at, kind: "open", text: "Demo opened" }
        : { key: o.id, at: o.at, kind: "open_uncounted", text: OPEN_NOT_COUNTED })),
    { key: "created", at: lead.createdAt, kind: "created", text: `Lead added${lead.source ? ` (${lead.source})` : ""}` },
  ];
  return lines.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

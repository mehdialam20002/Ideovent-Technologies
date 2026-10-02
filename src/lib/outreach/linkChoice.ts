/**
 * THE LINK IN THE FIRST MESSAGE (2 Oct 2026). Mehdi: "mail pe to first msz pe hi link send krwa do",
 * and for WhatsApp "first msz pe link bhejne wala and ek nhi bhejne wla dono templete bana do".
 *
 * Every first message that says the sample is made has a twin with their sample's own link
 * (templates.ts LINK_TEMPLATES, link "demo"), and every "made" follow-up a twin for a lead whose first
 * message carried the link (afterLink: it points back to the link and never offers it again). The
 * compose screen lists and ranks the bases; this file says which version goes, whether the lead's demo
 * link would open for them (demoReach), whether it may go to someone who has not replied yet
 * (coldLinkReason), and what a thread on two channels needs to be told.
 *
 * Pure: no React, no I/O. ComposePanel, useDemoLink, useOutreach and
 * scripts/test-outreach-send-links.mjs read the same answers. engine.ts does not import this file.
 */

import { afterLinkTwinOf, getTemplate, linkTwinOf, type MessageTemplate, type TemplateChannel } from "./templates";
import type { OutreachEvent, OutreachLead } from "./types";
import type { DemoSite } from "@/lib/cms/types";
import { demoStatus, isDemoExpired } from "@/lib/demo/record";
import { showSampleLine } from "@/lib/demo/site/sample";
import { hasProvisionalTemplateSlug } from "@/lib/demo/templates/fromTemplate";

export type LinkChoiceValue = "with" | "without";

/** The message that goes: the picked one, or its twin with their sample's link, or the follow-up for after the link. */
export function sendVariant(picked: MessageTemplate, o: { withLink: boolean; linkWent: boolean }): MessageTemplate {
  if (picked.stage === "first") return (o.withLink ? linkTwinOf(picked) : undefined) ?? picked;
  return (o.linkWent ? afterLinkTwinOf(picked) : undefined) ?? picked;
}

/** True when a first message on this channel carried their sample's link (its template is a twin with link "demo"). */
export function linkWentOn(
  leadId: string,
  channel: TemplateChannel,
  events: Pick<OutreachEvent, "leadId" | "type" | "channel" | "templateId">[],
): boolean {
  return events.some((e) => e.leadId === leadId && e.type === "sent" && e.channel === channel && getTemplate(e.templateId)?.link === "demo");
}

/**
 * True when the LATEST message that carried the demo link was a cold first message (not the link after a yes).
 * One rule in one place: access.ts holds it, because the team's cold-call gate (isEngaged) reads it too.
 */
export { linkWentCold } from "./access";

/**
 * True when the text carries this lead's own demo link, matched by its PATH, /site/<slug>, as a whole
 * segment and on any host or scheme (so "www.ideovent.in/site/abc" typed without https still gets the
 * draft and 404 checks, as the old line 253 did): followed by anything that cannot go on with a slug
 * (the end, a space, a stop, a subpage "/admissions", a "#", a quote, WhatsApp's * _ ~ around it),
 * never by more of a slug ("/site/abc-2" is another demo). A slug is a-z, 0-9 and "-" (lib/slug.ts).
 */
export function carriesDemoLink(text: string, lead: Pick<OutreachLead, "demoSlug">): boolean {
  const slug = (lead.demoSlug || "").trim();
  return Boolean(slug) && new RegExp(`/site/${slug.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![a-z0-9-])`, "i").test(text);
}

/**
 * Every /site/<slug> in the text that is not this lead's own demo (lower-cased, each once). A warning
 * in ComposePanel, never a blocker: in a first message the engine already blocks every link but the
 * allowed one, and after a yes Mehdi may paste one of the site's example demos on purpose.
 */
export function foreignDemoSlugs(text: string, lead: Pick<OutreachLead, "demoSlug">): string[] {
  const own = (lead.demoSlug || "").trim().toLowerCase();
  return [...new Set([...text.matchAll(/\/site\/([a-z0-9-]+)/gi)].map((m) => m[1].toLowerCase()))].filter((s) => s !== own);
}

/** A message that offers their sample's link, or to show the sample, without carrying it: a "made" first message or follow-up. */
export function offersLink(t: Pick<MessageTemplate, "promises" | "link" | "afterLink" | "body">): boolean {
  return t.promises === "demo" && !t.link && !t.afterLink && !t.body.includes("{demoLink}");
}

/** True when the demo carries the lead's name (letters and digits only, one containing the other): "made in your name" holds. */
export function demoNamedFor(demo: Pick<DemoSite, "instituteName">, lead: Pick<OutreachLead, "instituteName">): boolean {
  const n = (s: string | undefined) => (s || "").toLowerCase().replace(/[^\u0900-\u097Fa-z0-9]/g, "");
  const a = n(demo.instituteName);
  const b = n(lead.instituteName);
  return !a || !b || a.includes(b) || b.includes(a);
}

export type DemoReachState = "none" | "loading" | "missing" | "mismatch" | "free" | "closed" | "expired" | "draft" | "live";
export interface DemoReach {
  state: DemoReachState;
  /** The link may go: the demo is live, or this send can put it on the website (Mehdi's send only). */
  ok: boolean;
  /** A draft demo, and only a draft, on Mehdi's send: the send puts it on the website first. */
  needsPublish: boolean;
  /** Why it may not go, in plain words; "" when ok. */
  reason: string;
}

/** A draft demo on a team member's send: the CRM team's own words for it (their step 1 turns the link on). */
export const MEMBER_DRAFT_REASON = "The demo's link is off, so it shows a 404. Tap Turn on the link in step 1 first.";

/**
 * Will the lead's demo link open for them? From the demo record the CRM can read (useDemoLink). In
 * order: no demo, still loading (whether or not a record was found: while the CMS loads its data is
 * the seed, with example demos, and `me` is pending until the CRM data has loaded), no record for the
 * link, a record now at another link, a Free slot, closed, expired, live, a draft. Only a draft is
 * ever put on the website by a send, and only by Mehdi's (canPublish): anyone else's draft blocks,
 * and they turn its link on themselves in step 1 (CRM team, "Turn on the link": crm_publish_lead_demo).
 */
export function demoReach({ lead, demo, loading = false, canPublish = true, now = new Date() }: {
  lead: Pick<OutreachLead, "demoSlug">;
  demo?: Pick<DemoSite, "slug" | "status" | "expiresAt"> | null;
  /** The CMS or the CRM data is still loading. */
  loading?: boolean;
  /** May this sender's send put a draft on the website? Mehdi (owner) only: the team turns a link on in step 1. */
  canPublish?: boolean;
  now?: Date;
}): DemoReach {
  const slug = (lead.demoSlug || "").trim();
  const no = (state: DemoReachState, reason: string): DemoReach => ({ state, ok: false, needsPublish: false, reason });
  if (!slug) return no("none", "No demo yet: make one in step 1, then the message can carry its link.");
  if (loading) return no("loading", "Checking the demo...");
  if (!demo) {
    return no("missing", `No demo on the website has this lead's link (/site/${slug}), so it would open a 404. Pick its demo or create one in step 1 (if the demos did not load, reload the page).`);
  }
  // The public route compares lower-cased (record.ts resolveDemoSite), so this does too.
  if ((demo.slug || "").trim().toLowerCase() !== slug.toLowerCase()) {
    return no("mismatch", `This lead's link is /site/${slug}, but its demo is now at /site/${demo.slug}: pick the demo again in step 1.`);
  }
  const status = demoStatus(demo);
  if (status === "free") {
    return no("free", "This lead's demo is a Free slot, an empty page. Build it and mark it sent in step 1, or pick another demo, before its link can go.");
  }
  if (status === "closed") return no("closed", "This lead's demo is closed. Open it again in Admin > Demo sites before you send its link.");
  if (isDemoExpired(demo, now)) {
    return no("expired", `This lead's demo expired on ${String(demo.expiresAt).slice(0, 10)}. Change Expires on in Edit demo before you send its link.`);
  }
  if (status === "sent") return { state: "live", ok: true, needsPublish: false, reason: "" };
  if (canPublish) return { state: "draft", ok: true, needsPublish: true, reason: "" };
  // Anyone else (the CRM team): their step 1 has "Turn on the link" (DemoPicker's TeamDemoStep), so the words are the team's own.
  return no("draft", MEMBER_DRAFT_REASON);
}

/**
 * A follow-up that points back to the link they got ("Its link is in my first e-mail"): why that link
 * would not open now, "" when it would (or when there is nothing to check yet).
 */
export function pointBackReason(reach: DemoReach): string {
  if (reach.state === "live" || reach.state === "loading" || reach.state === "none") return "";
  const why = reach.reason || "This lead's demo is a draft again, so the link they got shows a 404. Mark it sent in step 1.";
  return `This follow-up points them to the link in your first message, and that link would not open now. ${why}`;
}

/** A coaching demo still showing the template's results and toppers (the approved coaching rule): the reason, else "". */
export function sampleToppersReason(demo?: Partial<DemoSite> | null): string {
  return demo?.kind === "coaching" && showSampleLine(demo, "results")
    ? "This demo still shows the template's results and toppers. Take them off in Edit demo first: a real institute's name must never sit next to toppers it did not give us."
    : "";
}

/**
 * Why their sample's link must not go to someone who has not replied yet, though it would open: "" when it may.
 * The With link switch is off for these. On any other message that carries the link they BLOCK when this send
 * would publish the demo (a draft: the send is the act that makes it public) and are warnings on a demo that is
 * already live (Mehdi published it himself; today's after-yes flow is unchanged).
 */
export function coldLinkReason(demo?: Partial<DemoSite> | null): string {
  if (!demo) return "";
  if (demo.isExample) return "This lead's link is one of the site's example demos, not a sample made in their name: make their own in step 1.";
  if (hasProvisionalTemplateSlug({ slug: demo.slug || "", templateId: demo.templateId })) {
    // A draft's link follows its name (DemoSitesEditor); a sent demo's link stays, so the advice differs.
    return `This demo is still on its provisional link (/site/${demo.slug}), which WhatsApp's card shows instead of their name.${
      demoStatus({ status: demo.status }) === "sent" ? "" : " Type their name in Edit demo, which moves a draft's link to their name, then pick the demo again in step 1."}`;
  }
  return sampleToppersReason(demo);
}

/** One line under the switch. The WhatsApp one says where its starting point comes from, so the memory is never a surprise. */
export function linkHint(channel: TemplateChannel, hasPicture: boolean): string {
  if (channel === "email") return "With link, they can open their sample from this first e-mail. E-mail always starts With link.";
  const risk = "A first WhatsApp with a link, from a number they do not know, gets reported more often. This switch starts on the version you sent last in this browser.";
  return hasPicture ? `With link, their own sample goes in place of the picture. ${risk}` : risk;
}

/** The reason With link is off for anyone but Mehdi (useDemoLink().owner false). */
export const TEAM_LINK_REASON = "With link is for Mehdi's own messages until the team's wording for it is approved.";

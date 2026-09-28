/**
 * EVERY NEW DEMO GETS A LEAD (Mehdi, 28 Sep 2026: "the new demo sites I
 * create by upload do not show in Outreach, I cannot track them").
 *
 * When a demo is made from a template duplicate or a poster import, this adds
 * an outreach lead for it (source "demo-created", status New, demoId and
 * demoSlug set), or, when the institute is already a lead (same name and
 * city, or same phone or email), links the demo to that lead instead. The
 * CRM Demos page uses the same matcher for "Create lead" and "Link to lead".
 *
 * It talks to the outreach store directly, because the Templates tab and the
 * demo-sites editor that make demos are not inside the Outreach provider. A
 * failure here never undoes the demo: callers catch and carry on.
 */
import type { DemoSite } from "@/lib/cms/types";
import { normalizeEmail, normalizePhone, outreachStore, type OutreachStore } from "./store";
import type { LeadKind, OutreachLead } from "./types";

export const DEMO_LEAD_SOURCE = "demo-created";

/** The window event the Outreach provider and nav badges re-read on. */
const OUTREACH_CHANGED = "ideovent:outreach-changed";

/** A demo's own contact details, only when the record carries them. */
export function demoContact(demo: Pick<DemoSite, "contact">): { phone?: string; whatsapp?: string; email?: string } {
  const c = demo.contact || {};
  return {
    phone: normalizePhone(c.phone),
    whatsapp: normalizePhone(c.whatsapp ? (c.whatsapp.startsWith("+") ? c.whatsapp : `+${c.whatsapp}`) : undefined),
    email: normalizeEmail(c.email),
  };
}

export function leadKindForDemo(kind: unknown): LeadKind {
  return kind === "school" || kind === "coaching" ? kind : "other";
}

const norm = (s?: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, " ")
    .trim();

/**
 * The lead this demo belongs to, if there is one: already linked (demoId or
 * slug), else the same institute name in the same city (or no city on
 * either side), else the same phone, WhatsApp or email.
 */
export function matchLeadForDemo(
  leads: OutreachLead[],
  demo: Pick<DemoSite, "id" | "slug" | "instituteName" | "city" | "contact">,
): { lead: OutreachLead; by: "demo" | "name" | "contact" } | null {
  const linked = leads.find((l) => l.demoId === demo.id) || leads.find((l) => l.demoSlug && l.demoSlug === demo.slug);
  if (linked) return { lead: linked, by: "demo" };
  const name = norm(demo.instituteName);
  const city = norm(demo.city);
  if (name) {
    const same = leads.find((l) => norm(l.instituteName) === name && (norm(l.city) === city || !city || !l.city));
    if (same) return { lead: same, by: "name" };
  }
  const c = demoContact(demo);
  const phones = [c.phone, c.whatsapp].filter(Boolean) as string[];
  const byContact = leads.find(
    (l) =>
      phones.some((p) => normalizePhone(l.phone) === p || normalizePhone(l.whatsapp) === p) ||
      Boolean(c.email && normalizeEmail(l.email) === c.email),
  );
  return byContact ? { lead: byContact, by: "contact" } : null;
}

export type DemoOrigin = "template" | "poster";

export interface AddDemoResult {
  lead: OutreachLead;
  created: boolean;
}

/**
 * Adds or links the lead for a demo that was just saved.
 * `force` true/false overrides the "Add every new demo to the CRM" setting
 * (the poster screen's own checkbox); undefined follows the setting.
 * Resolves to null when it was switched off.
 */
export async function addDemoToCrm(
  demo: DemoSite,
  origin: DemoOrigin,
  opts: { force?: boolean; store?: OutreachStore } = {},
): Promise<AddDemoResult | null> {
  const store = opts.store || outreachStore;
  if (opts.force === false) return null;
  if (opts.force === undefined) {
    const settings = await store.getSettings();
    if (settings.autoAddDemos === false) return null;
  }
  const how = origin === "poster" ? "a poster" : demo.templateId ? `template ${demo.templateId}` : "a template";
  const match = matchLeadForDemo(await store.listLeads(), demo);
  let result: AddDemoResult;
  if (match) {
    const was = match.lead.demoSlug && match.lead.demoSlug !== demo.slug ? ` (was /site/${match.lead.demoSlug})` : "";
    const lead =
      match.by === "demo" && match.lead.demoId === demo.id
        ? match.lead
        : await store.upsertLead({ ...match.lead, demoId: demo.id, demoSlug: demo.slug });
    await store.addEvent({ leadId: lead.id, type: "note", detail: `Demo made from ${how} and linked: /site/${demo.slug}${was}` });
    result = { lead, created: false };
  } else {
    const c = demoContact(demo);
    const lead = await store.upsertLead({
      instituteName: demo.instituteName || demo.slug,
      kind: leadKindForDemo(demo.kind),
      city: demo.city,
      state: demo.state,
      website: demo.officialWebsite,
      ...c,
      source: DEMO_LEAD_SOURCE,
      status: "new",
      demoId: demo.id,
      demoSlug: demo.slug,
    });
    await store.addEvent({ leadId: lead.id, type: "note", detail: `Lead created from demo /site/${demo.slug} (made from ${how})` });
    result = { lead, created: true };
  }
  try {
    window.dispatchEvent(new Event(OUTREACH_CHANGED));
  } catch {
    /* no window (tests) */
  }
  return result;
}

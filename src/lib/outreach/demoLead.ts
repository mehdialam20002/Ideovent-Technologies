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

/** A demo's kind as a lead kind. A dental demo makes a dental lead (28 Sep 2026; it used to become "other"). */
export function leadKindForDemo(kind: unknown): LeadKind {
  return kind === "school" || kind === "coaching" || kind === "dental" ? kind : "other";
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
    /* A lead whose kind was never set ("other") takes the demo's kind, so a
       dental demo linked to an unsorted lead makes it a dental lead. A kind
       someone chose (school, coaching, dental) is never overwritten. */
    const kind = leadKindForDemo(demo.kind);
    const takeKind = (!match.lead.kind || match.lead.kind === "other") && kind !== "other";
    const alreadyLinked = match.by === "demo" && match.lead.demoId === demo.id;
    /* Only the demo keys (and the kind) travel, merged on the server: the database then tells whoever
       works the lead "Demo ready" (spec 9.3). */
    const lead =
      alreadyLinked && !takeKind
        ? match.lead
        : await store.patchLead(match.lead.id, { demoId: demo.id, demoSlug: demo.slug, ...(takeKind ? { kind } : {}) });
    const kindNote = takeKind ? `, kind set to ${kind}` : "";
    await store.addEvent({ leadId: lead.id, type: "note", detail: `Demo made from ${how} and linked: /site/${demo.slug}${was}${kindNote}` });
    result = { lead, created: false };
  } else {
    const c = demoContact(demo);
    // A new lead: an INSERT, never an upsert over a lead with the same id (spec 9.3).
    const lead = await store.createLead({
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

import type { DemoSite, DemoSiteSlot } from "@/lib/cms/types";

/**
 * Demo writes shared by the lead's Demo step (DemoPicker) and the CRM Demos
 * page, so "Mark sent" is one path wherever it is pressed.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SaveDoc = (collection: "demoSites" | "demoSiteSlots", doc: { id: string } & Record<string, any>) => Promise<unknown>;

/**
 * Marks a demo sent: the public link only works for a `sent` demo, so this is
 * the same action as turning the link on. Writes the demo's status and the
 * PRIVATE slot beside it (who it went to, and when), as the Demo sites
 * screen does.
 */
export async function markDemoSent(
  saveDoc: SaveDoc,
  demo: DemoSite,
  slots: DemoSiteSlot[],
  sentTo: string,
  now = new Date(),
): Promise<void> {
  const slot = slots.find((s) => s.id === demo.id) || { id: demo.id };
  await saveDoc("demoSites", { ...(demo as unknown as Record<string, unknown>), id: demo.id, status: "sent" });
  await saveDoc("demoSiteSlots", {
    ...(slot as unknown as Record<string, unknown>),
    id: demo.id,
    sentTo: sentTo || (slot as DemoSiteSlot).sentTo || "",
    sentAt: now.toISOString(),
  });
}

function when(d: DemoSite): number {
  const t = Date.parse(d.createdAt || d.updatedAt || "");
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Every real demo for the "Use existing" list: the lead's kind first, then
 * newest first. No cap and no kind filter, so a poster demo whose kind
 * differs from the lead's still shows (it used to be hidden, which is how
 * uploaded demos went missing).
 */
export function demosForPicker(sites: DemoSite[], kind: string | undefined, q: string): DemoSite[] {
  const n = q.trim().toLowerCase();
  const list = n ? sites.filter((s) => `${s.instituteName} ${s.slug} ${s.city || ""}`.toLowerCase().includes(n)) : sites.slice();
  const mine = (s: DemoSite) => (kind && kind !== "other" && s.kind === kind ? 0 : 1);
  return list.sort((a, b) => mine(a) - mine(b) || when(b) - when(a));
}

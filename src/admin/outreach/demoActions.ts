import type { DemoSite, DemoSiteSlot } from "@/lib/cms/types";
import { isDemoSummary } from "@/lib/cms/demoSummary";

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
 *
 * The demo is written whole. On the CRM's own host the lists hold summaries
 * (lib/cms/demoSummary.ts): `loadDemo` (useCms().actions.loadDemo) reads the
 * whole record first, and without it a summary is refused here before
 * anything is written (the store refuses one too).
 */
export async function markDemoSent(
  saveDoc: SaveDoc,
  given: DemoSite,
  slots: DemoSiteSlot[],
  sentTo: string,
  now = new Date(),
  loadDemo?: (id: string) => Promise<DemoSite | null>,
): Promise<void> {
  const demo = isDemoSummary(given) ? (loadDemo ? await loadDemo(given.id) : null) : given;
  if (!demo || isDemoSummary(demo)) throw new Error("The whole demo could not be read, so nothing was written. Reload the page and try again.");
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

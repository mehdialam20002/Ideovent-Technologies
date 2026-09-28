import type { DemoSite, DemoSiteSlot } from "@/lib/cms/types";
import { demoStatus } from "@/lib/demo/record";
import { LEAD_FINDER_SOURCE, type OutreachLead } from "@/lib/outreach/types";
import type { DemoRow } from "../metrics";

/**
 * Pure helpers behind /crm/demos: where a demo came from, the views, and the
 * sort. No React, so the page and a reader of this file agree.
 */

export type DemoSource = "poster" | "template" | "lead-finder" | "manual";

export const SOURCE_LABEL: Record<DemoSource, string> = {
  poster: "Poster",
  template: "Template",
  "lead-finder": "Lead finder",
  manual: "Manual",
};

/**
 * From the records themselves: a poster import leaves `poster` provenance on
 * the private slot; a template duplicate (and a poster, which is one) sets
 * `templateId`; the Lead Finder makes its demo for a lead it added. Anything
 * else was made by hand in the demo-sites editor.
 */
export function demoSource(demo: DemoSite, slot: DemoSiteSlot | undefined, lead: OutreachLead | undefined): DemoSource {
  if (slot && (slot as { poster?: unknown }).poster) return "poster";
  if (lead?.source === LEAD_FINDER_SOURCE && demo.templateId) return "lead-finder";
  if (demo.templateId) return "template";
  return "manual";
}

export type DemoView = "all" | "nolead" | "opened" | "never";

export const DEMO_VIEWS: { id: DemoView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "nolead", label: "No lead" },
  { id: "opened", label: "Opened" },
  { id: "never", label: "Never opened" },
];

export function inView(r: DemoRow, v: DemoView): boolean {
  if (v === "nolead") return !r.lead;
  if (v === "opened") return r.opens > 0;
  if (v === "never") return r.opens === 0;
  return true;
}

export type DemoSortKey = "institute" | "status" | "source" | "kind" | "created" | "lead" | "opens" | "fresh" | "lastOpen";
export interface DemoSort {
  key: DemoSortKey;
  dir: "asc" | "desc";
}

export interface DemoItem extends DemoRow {
  source: DemoSource;
  status: ReturnType<typeof demoStatus>;
  created?: string;
  slot?: DemoSiteSlot;
}

const t = (iso?: string) => {
  const n = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(n) ? 0 : n;
};

export function toItems(rows: DemoRow[], slots: DemoSiteSlot[]): DemoItem[] {
  const slotBy = new Map(slots.map((s) => [s.id, s]));
  return rows.map((r) => {
    const slot = slotBy.get(r.demo.id);
    return {
      ...r,
      slot,
      source: demoSource(r.demo, slot, r.lead),
      status: demoStatus(r.demo),
      created: r.demo.createdAt || r.demo.updatedAt,
    };
  });
}

export function sortItems(items: DemoItem[], s: DemoSort): DemoItem[] {
  const val = (i: DemoItem): string | number => {
    switch (s.key) {
      case "institute":
        return (i.demo.instituteName || i.demo.slug).toLowerCase();
      case "status":
        return i.status;
      case "source":
        return i.source;
      case "kind":
        return String(i.demo.kind || "");
      case "created":
        return t(i.created);
      case "lead":
        return i.lead ? i.lead.instituteName.toLowerCase() : "";
      case "opens":
        return i.opens;
      case "fresh":
        return i.freshOpens;
      case "lastOpen":
        return t(i.lastOpenAt);
    }
  };
  const k = s.dir === "asc" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return (x < y ? -1 : x > y ? 1 : 0) * k || t(b.created) - t(a.created);
  });
}

/** Label for a DemoKind, including kinds added later (e.g. dental). */
export function kindLabel(kind: unknown): string {
  const k = String(kind || "");
  return k ? k.charAt(0).toUpperCase() + k.slice(1) : "-";
}

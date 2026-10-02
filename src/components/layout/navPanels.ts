import { useMemo } from "react";
import { useCollection } from "@/lib/cms/context";
import type { NavItem } from "@/lib/cms/types";
import { WEBSITES_HEADING, WEBSITE_LINKS } from "@/pages/websites/links";

/**
 * Turns the navigation singleton into the panels the header renders.
 *
 * The point of this file is that nothing in it is a list of services or a list of
 * projects. A header item says WHICH COLLECTION fills its panel (`panel:
 * "services"`, `panel: "projects"`) and the rows are read from that collection on
 * render, so a service added in the admin appears in the menu with its own
 * one-line description and a project renamed there is renamed here. The only
 * hand-written entries are the Company panel's, whose pages are singletons and
 * routes rather than collection documents, and those live in seed.ts with the
 * rest of the navigation, not in this file.
 *
 * Everything is memoised against the collection identity, so hovering a trigger
 * re-renders the header and recomputes nothing.
 */

export interface PanelLink {
  label: string;
  href: string;
  /** The one line under the label. */
  description?: string;
}

export interface PanelGroup {
  heading: string;
  links: PanelLink[];
}

export interface ResolvedPanel {
  groups: PanelGroup[];
  /** The row along the bottom: overview page, price, and so on. */
  footer: NavItem[];
}

export interface ResolvedNavItem {
  item: NavItem;
  /** A stable id used for the trigger, the panel and aria-controls. */
  key: string;
  panel?: ResolvedPanel;
}

/*
  The project bands, and their headings, are the ones /work already uses
  (src/pages/Work.tsx, BANDS). A visitor who opens the panel and then lands on the
  page must not be told the work is organised two different ways, and, more
  importantly, "Client projects" and "Experience" are the distinction that keeps
  the portfolio honest: employer work is never folded into the paid-client list.
*/
const PROJECT_BANDS: { key: string; heading: string }[] = [
  // First since 2 Oct 2026, as on /work (Mehdi: "project me wtfgos.com ko phle
  // dikhao"). Each item's line still names the employer: employerLine() below.
  { key: "employer work", heading: "Experience" },
  { key: "web", heading: "Client projects" },
  { key: "product", heading: "Our own products" },
];

/**
 * _assets/FACTS.md, ATTRIBUTION RULE: work the founder did while employed
 * somewhere else carries the employer's name in the same card, every time it is
 * shown. The panel is a card, so the attribution is built into the line the card
 * prints rather than left to a heading three inches away.
 */
function employerLine(clientName: string): string {
  const company = (clientName.split(",")[0] || clientName).trim();
  return company ? `Built by Mehdi Alam at ${company}.` : "";
}

export function useResolvedNav(items: NavItem[]): ResolvedNavItem[] {
  const services = useCollection("services");
  const projects = useCollection("projects");

  return useMemo(() => {
    const servicePanel = (): PanelGroup[] => {
      // Grouped by the service's own `category`, in the order the categories
      // first appear in the collection, so reordering services in the admin
      // reorders the panel and no category list has to be maintained here.
      const order: string[] = [];
      const byCategory = new Map<string, PanelLink[]>();
      for (const s of services) {
        const cat = (s.category || "More").trim() || "More";
        if (!byCategory.has(cat)) {
          byCategory.set(cat, []);
          order.push(cat);
        }
        byCategory.get(cat)!.push({
          label: s.title,
          href: `/services/${s.slug}`,
          description: s.shortDescription,
        });
      }
      const groups = order.map((heading) => ({ heading, links: byCategory.get(heading)! }));
      // The /websites pages (2 Oct 2026), from code rather than the CMS, so a
      // services list edited in /admin cannot drop them. Last, after the
      // services themselves. Labels only: src/pages/websites/links.ts.
      groups.push({ heading: WEBSITES_HEADING, links: WEBSITE_LINKS.map((l) => ({ ...l })) });
      return groups;
    };

    const projectPanel = (): PanelGroup[] => {
      const known = new Set(PROJECT_BANDS.map((b) => b.key));
      const groups: PanelGroup[] = PROJECT_BANDS.map((band) => ({
        heading: band.heading,
        links: projects
          .filter((p) => (p.category || "").toLowerCase() === band.key)
          .map((p) => ({
            label: p.title,
            href: `/work/${p.slug}`,
            description:
              band.key === "employer work"
                ? [p.sector, employerLine(p.clientName)].filter(Boolean).join(". ").replace("..", ".")
                : p.sector || p.clientName,
          })),
      })).filter((g) => g.links.length > 0);

      // A project whose category is not one of the three bands still has to be
      // reachable, the same way /work keeps it rather than dropping it.
      const rest = projects.filter((p) => !known.has((p.category || "").toLowerCase()));
      if (rest.length) {
        groups.push({
          heading: "More",
          links: rest.map((p) => ({
            label: p.title,
            href: `/work/${p.slug}`,
            description: p.sector || p.clientName,
          })),
        });
      }
      return groups;
    };

    return items.map((item, i) => {
      const key = `${item.href}-${i}`.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
      if (!item.panel) return { item, key };

      let groups: PanelGroup[] = [];
      if (item.panel === "services") groups = servicePanel();
      else if (item.panel === "projects") groups = projectPanel();
      else if (item.panel === "links")
        groups = (item.panelGroups || []).map((g) => ({
          heading: g.heading,
          links: g.links.map((l) => ({ label: l.label, href: l.href, description: l.description })),
        }));

      groups = groups.filter((g) => g.links.length > 0);
      // A panel that resolved to nothing (an emptied collection, a mistyped
      // `panel` value) must degrade to the plain link it was, not to a trigger
      // that opens an empty box.
      if (!groups.length) return { item, key };

      return { item, key, panel: { groups, footer: item.panelFooter || [] } };
    });
  }, [items, services, projects]);
}

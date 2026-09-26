/**
 * GROUPED POINTS: a list of DemoPoint split by `group`, one Section per group
 * (or one Section when nothing is grouped). Used by Safety, Student life and
 * Boarding. Each point is a card in the family's language; a group of one
 * or two points prints as wide rows.
 */

import type { DemoPoint } from "@/lib/cms/types";
import { bi, withText } from "@/lib/demo/site/bilingual";
import { Reveal } from "@/pages/site/kit/motion";
import { Card, CardGrid } from "@/pages/site/kit/Section";
import { Bi } from "@/pages/site/kit/Text";

export function groupPoints(list: DemoPoint[] | undefined, lang: "en" | "hi", fallback: string) {
  const out: { name: string; items: DemoPoint[] }[] = [];
  for (const p of withText(list, "title")) {
    const name = bi(p, "group", lang) || fallback;
    const g = out.find((x) => x.name === name);
    if (g) g.items.push(p);
    else out.push({ name, items: [p] });
  }
  return out;
}

export function PointCards({ items }: { items: DemoPoint[] }) {
  return (
    <CardGrid cols={items.length === 4 ? 2 : items.length >= 3 ? 3 : 2}>
      {items.map((p, i) => (
        <Reveal key={i} index={i}>
          <Card className="h-full">
            <Bi of={p} k="title" as="h3" className="ds-display text-xl leading-snug" />
            <Bi of={p} k="body" as="p" className="mt-2 whitespace-pre-line text-[hsl(var(--ds-ink-soft))]" />
          </Card>
        </Reveal>
      ))}
    </CardGrid>
  );
}

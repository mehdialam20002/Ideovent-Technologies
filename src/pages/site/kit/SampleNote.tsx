/**
 * THE "SAMPLE" LINE under results and reviews carried from a template.
 *
 * A duplicate carries the template's results, toppers, pass percentages,
 * selections and reviews (src/lib/demo/templates/fromTemplate.ts). Until Mehdi
 * edits that block, or ticks "Results and reviews on this demo are the
 * institute's real ones", the page says so in one quiet line, drawn in the
 * family's own voice: small caps on classic, a soft pill on modern, a
 * handwritten-feeling italic on warm. It is a caption, not an alert: no red,
 * no icon that reads as an error.
 *
 * Renders nothing on a demo that did not come from a template, or once the
 * block has been edited or marked real. See src/lib/demo/site/sample.ts.
 */

import { tr } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { SAMPLE_COPY, showSampleLine, type SampleLineBlock } from "@/lib/demo/site/sample";

export function SampleNote({ block, className = "", onDark = false }: {
  /** Dental adds "stats" (trust row), "cases" (before-after) and "doctors". */
  block: SampleLineBlock;
  className?: string;
  /** True on a dark band, so the line keeps its contrast. */
  onDark?: boolean;
}) {
  const { site, lang, family } = useSite();
  if (!showSampleLine(site, block)) return null;
  const text = tr(SAMPLE_COPY[block], lang);
  const ink = onDark ? "text-white/80" : "text-[hsl(var(--ds-ink-soft))]";

  /* Dental families (28 Sep 2026): a soft pill on clinical and luxury (gold
     dot on luxury), a hairline caption on calm. Same words everywhere. */
  if (family === "clinical" || family === "luxury" || family === "calm") {
    return (
      <p data-sample-note={block} className={`${className} flex`}>
        <span className={`inline-flex items-center gap-2 ${family === "calm" ? "border-t pt-2 text-[13px]" : "rounded-full border px-3 py-1 text-xs"} font-medium ${onDark ? "border-white/30" : family === "calm" ? "border-[hsl(var(--ds-line))]" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))]/80"} ${ink}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${family === "luxury" ? "bg-[hsl(var(--ds-rule))]" : "bg-[hsl(var(--ds-accent))]"}`} />
          {text}
        </span>
      </p>
    );
  }
  if (family === "modern") {
    return (
      <p data-sample-note={block} className={`${className} flex`}>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${onDark ? "border-white/30" : "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface-2))]"} ${ink}`}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ds-accent))]" />
          {text}
        </span>
      </p>
    );
  }
  if (family === "classic") {
    return (
      <p data-sample-note={block} className={`${className} ds-smallcaps text-xs tracking-wide ${ink}`}>
        <span aria-hidden="true" className="mr-2 text-[hsl(var(--ds-accent))]">·</span>{text}
      </p>
    );
  }
  return (
    <p data-sample-note={block} className={`${className} text-sm italic ${ink}`}>
      <span aria-hidden="true" className="mr-1.5 not-italic text-[hsl(var(--ds-accent))]">*</span>{text}
    </p>
  );
}

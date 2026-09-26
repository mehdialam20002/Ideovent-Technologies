import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Eye, Files, LayoutGrid, Lock, ScanText } from "lucide-react";
import type { DemoKind } from "@/lib/cms/types";
import {
  DESIGN_FAMILIES,
  DESIGN_FAMILY_IDS,
  TEMPLATES,
  TEMPLATE_SEGMENTS,
  TEMPLATE_SEGMENT_LABEL,
  THEME_PALETTE_NAME,
  type DemoTemplateMeta,
  type DesignFamily,
  type TemplateSegment,
} from "@/lib/demo/templates";
import { displayFamily, displayStyle, schoolTheme } from "@/lib/demo/schoolThemes";
import { coachingDisplayFamily, coachingDisplayStyle, coachingTheme } from "@/lib/demo/coachingThemes";
import { useDuplicateTemplate } from "@/admin/useDuplicateTemplate";
import { usePosterImport } from "@/admin/poster/usePosterImport";
import { cn } from "@/lib/utils";

/**
 * THE TEMPLATES TAB, at /admin/templates.
 *
 * Ten ready-made demos, five school and five coaching, fixed in code. This
 * screen offers exactly two things per template, PREVIEW and DUPLICATE, and
 * that is not a matter of which buttons were drawn: a template is a module
 * under src/lib/demo/templates, not a document, so there is nothing in the
 * store for an edit or a delete to act on. Duplicate makes an ordinary draft
 * in Demo sites and opens it there, with every fact about the fictional
 * institute already cleared (see fromTemplate.ts for the table).
 *
 * It is its own tab rather than a filter on Demo sites because the two lists
 * answer different questions. Demo sites is "what have I built and sent";
 * this is "what can I start from". Mixing them put fiction next to real
 * institutes in one list, which is how an example gets sent by mistake.
 *
 * The cards load no template content. The thumbnail is drawn from the THEME
 * each template names, the same token tables and the same hero composition
 * the real page uses, so it shows the family's structure and the palette
 * without downloading ten pages. Preview shows the real thing.
 */

type Filter<T extends string> = T | "all";

const KIND_HEADING: Record<DemoKind, string> = {
  school: "School",
  coaching: "Coaching",
};

export default function AdminTemplates() {
  const [segment, setSegment] = useState<Filter<TemplateSegment>>("all");
  const [family, setFamily] = useState<Filter<DesignFamily>>("all");
  const { request, busy, error, dialog } = useDuplicateTemplate();
  /* A poster photo in, a filled draft out: see src/admin/PosterImportDialog.tsx. */
  const poster = usePosterImport();

  const visible = useMemo(
    () =>
      TEMPLATES.filter(
        (t) => (segment === "all" || t.segment === segment) && (family === "all" || t.designFamily === family),
      ),
    [segment, family],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Templates</h1>
            <p className="text-sm text-muted-foreground">
              {TEMPLATES.length} ready designs · 5 school · 5 coaching
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => poster.open()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <ScanText className="h-4 w-4" aria-hidden="true" /> Create from poster
        </button>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground lg:grid-cols-[1fr_1fr]">
        <p className="flex gap-2.5">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Templates are fixed.</strong> They live in the site’s
            code, not in the content store, so nothing here can be edited or deleted. Preview one to
            read it at full size, or duplicate it to get an editable draft in{" "}
            <Link to="/admin/c/demoSites" className="text-primary underline underline-offset-2">
              Demo sites
            </Link>
            .
          </span>
        </p>
        <p className="flex gap-2.5">
          <Files className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <span>
            <strong className="text-foreground">A duplicate arrives already filled.</strong>{" "}
            Duplicate asks for the institute’s name (and, if you like, its city and Hindi name) and
            puts it everywhere the example name was, in English and Hindi. Everything else comes
            across: courses, fees, timings, teachers, results, reviews, notices, FAQs and photos.
            Only the contact details are left empty, to add from their own website. Results and
            reviews show a small “Sample” line until you edit them or mark them as real.
          </span>
        </p>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        <ChipGroup<Filter<TemplateSegment>>
          label="Where"
          value={segment}
          onChange={setSegment}
          options={[
            { value: "all", label: "All", count: TEMPLATES.length },
            ...TEMPLATE_SEGMENTS.map((s) => ({
              value: s,
              label: TEMPLATE_SEGMENT_LABEL[s],
              count: TEMPLATES.filter((t) => t.segment === s).length,
            })),
          ]}
        />
        <ChipGroup<Filter<DesignFamily>>
          label="Design"
          value={family}
          onChange={setFamily}
          options={[
            { value: "all", label: "All", count: TEMPLATES.length },
            ...DESIGN_FAMILY_IDS.map((f) => ({
              value: f,
              label: DESIGN_FAMILIES[f].label,
              count: TEMPLATES.filter((t) => t.designFamily === f).length,
            })),
          ]}
        />
      </div>

      {dialog}
      {poster.dialog}

      {error && !dialog && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {(["school", "coaching"] as DemoKind[]).map((kind) => {
        const list = visible.filter((t) => t.kind === kind);
        return (
          <section key={kind} aria-labelledby={`tpl-${kind}`} className="mb-10">
            <h2 id={`tpl-${kind}`} className="mb-4 flex items-baseline gap-2 font-display text-lg font-semibold">
              {KIND_HEADING[kind]}
              <span className="text-sm font-normal text-muted-foreground">
                {list.length} of 5
              </span>
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {kind} template matches these filters.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => (
                  <li key={t.id}>
                    <TemplateCard
                      t={t}
                      busy={busy === t.id}
                      disabled={busy !== null}
                      onDuplicate={() => request(t.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section aria-labelledby="tpl-families" className="border-t border-border pt-6">
        <h2 id="tpl-families" className="mb-3 text-sm font-semibold">The three designs</h2>
        <dl className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          {DESIGN_FAMILY_IDS.map((f) => (
            <div key={f}>
              <dt className="font-medium text-foreground">{DESIGN_FAMILIES[f].label}</dt>
              <dd className="mt-0.5">{DESIGN_FAMILIES[f].blurb}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count: number }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              on
                ? "border-primary/50 bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {o.label}
            <span className="tabular-nums opacity-70">{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function TemplateCard({
  t,
  busy,
  disabled,
  onDuplicate,
}: {
  t: DemoTemplateMeta;
  busy: boolean;
  disabled: boolean;
  onDuplicate: () => void;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <Thumbnail t={t} />
      <div className="flex flex-1 flex-col p-4">
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>{TEMPLATE_SEGMENT_LABEL[t.segment]}</span>
          <span aria-hidden="true">·</span>
          <span>{DESIGN_FAMILIES[t.designFamily].label}</span>
        </p>
        <h3 className="mt-1.5 font-display text-base font-semibold leading-snug">{t.label}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Palette: <span className="text-foreground">{THEME_PALETTE_NAME[t.theme]}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link
            to={`/admin/preview/template/${t.id}`}
            aria-label={`Preview the ${t.label} template`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:border-primary/50"
          >
            <Eye className="h-4 w-4" aria-hidden="true" /> Preview
          </Link>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={disabled}
            aria-label={`Duplicate the ${t.label} template into a new draft demo`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
          >
            <Files className="h-4 w-4" aria-hidden="true" /> {busy ? "Duplicating…" : "Duplicate"}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * A sketch of the template's first screen, drawn from its theme.
 *
 * The colours are the theme's own token table, the type sample is set in the
 * theme's own display family, weight, tracking and case, and the object on
 * the right is the theme's own hero composition: hairline fact rows, a solid
 * fact block, a batch board, a strip, a card row, a numeral, or a large faint
 * monogram. So the card shows the structure the page really has, including
 * where two templates share one; it must never flatter a look it lacks.
 * Decorative: the card's text says everything this does.
 */
function Thumbnail({ t }: { t: DemoTemplateMeta }) {
  const s = t.kind === "school" ? schoolSketch(t.theme) : coachingSketch(t.theme);
  const hsl = (v: string, a?: number) => (a === undefined ? `hsl(${v})` : `hsl(${v} / ${a})`);
  const type: CSSProperties = {
    fontFamily: s.display,
    fontWeight: s.weight,
    letterSpacing: s.tracking,
    textTransform: s.transform,
    color: hsl(s.ink),
  };

  return (
    <div
      aria-hidden="true"
      className="relative h-36 overflow-hidden border-b border-border"
      style={{ background: hsl(s.ground) }}
    >
      {/* The page ground under the hero, as a strip, so a light-hero theme
          still shows both of its grounds. */}
      <div className="absolute inset-x-0 bottom-0 h-5" style={{ background: hsl(s.page) }}>
        <div className="flex h-full items-center gap-1.5 px-4">
          {[s.brand, s.accent, s.pageInk].map((c, i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ background: hsl(c) }} />
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 bottom-5 flex">
        <div className={cn("flex flex-col justify-center px-4", s.object === "none" || s.object === "monogram" || s.object === "strip" || s.object === "column" ? "w-full" : "w-[58%]")}>
          <span className="h-[2px] w-6" style={{ background: hsl(s.accentOnGround) }} />
          <span className="mt-2 text-[2.1rem] leading-none" style={type}>
            Aa
          </span>
          <span className="mt-2 block h-[5px] w-4/5 rounded-sm" style={{ background: hsl(s.soft, 0.55) }} />
          {s.object !== "strip" && s.object !== "column" && (
            <span className="mt-1.5 block h-[5px] w-3/5 rounded-sm" style={{ background: hsl(s.soft, 0.4) }} />
          )}
        </div>

        {s.object === "rows" && (
          <div className="flex w-[42%] flex-col justify-center gap-2.5 pr-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block border-t pt-1.5" style={{ borderColor: hsl(s.soft, 0.45) }}>
                <span className="block h-[4px] w-2/3 rounded-sm" style={{ background: hsl(s.soft, 0.6) }} />
              </span>
            ))}
          </div>
        )}

        {s.object === "block" && (
          <div className="my-3 mr-4 flex w-[38%] flex-col justify-center gap-2 px-3" style={{ background: hsl(s.brand), borderRadius: s.radius }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="block h-[4px] rounded-sm" style={{ background: hsl(s.onBrand, 0.8), width: `${80 - i * 15}%` }} />
            ))}
          </div>
        )}

        {s.object === "board" && (
          <div className="my-3 mr-4 flex w-[42%] flex-col justify-center gap-1.5 px-2.5" style={{ background: hsl(s.soft, 0.12), borderRadius: s.radius }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="flex items-center justify-between gap-2 border-b pb-1" style={{ borderColor: hsl(s.soft, 0.3) }}>
                <span className="block h-[4px] w-1/2 rounded-sm" style={{ background: hsl(s.ink, 0.7) }} />
                <span className="block h-[4px] w-1/5 rounded-sm" style={{ background: hsl(s.accentOnGround) }} />
              </span>
            ))}
          </div>
        )}

        {s.object === "figure" && (
          <div className="flex w-[42%] items-center justify-center pr-3">
            <span className="text-[3.4rem] leading-none tabular-nums" style={{ ...type, color: hsl(s.accentOnGround) }}>
              12
            </span>
          </div>
        )}
      </div>

      {s.object === "strip" && (
        <div className="absolute -left-3 -right-3 bottom-[1.6rem] flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-4 flex-1" style={{ background: hsl(s.soft, 0.18), borderRadius: s.radius, borderTop: `2px solid ${hsl(s.accentOnGround)}` }} />
          ))}
        </div>
      )}

      {/* column (studio, bulletin): one measure with the card row beneath it,
          inside the gutters, and the monogram up and to the right, which is
          what DemoCoaching draws for that hero. Not a bare monogram: the real
          page carries the batch cards under the headline. */}
      {s.object === "column" && (
        <>
          <div className="absolute left-4 right-4 bottom-[1.6rem] flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-4 flex-1" style={{ background: hsl(s.soft, 0.18), borderRadius: s.radius, border: `1px solid ${hsl(s.soft, 0.3)}` }} />
            ))}
          </div>
          <span
            className="absolute -right-2 -top-3 text-[5rem] leading-none"
            style={{ ...type, color: hsl(s.ink, 0.08) }}
          >
            {monogramOf(t.label)}
          </span>
        </>
      )}

      {s.object === "monogram" && (
        <span
          className="absolute -right-2 top-1/2 -translate-y-1/2 text-[6.5rem] leading-none"
          style={{ ...type, color: hsl(s.ink, 0.08) }}
        >
          {monogramOf(t.label)}
        </span>
      )}
    </div>
  );
}

/** The crest watermark: the first letters of the first two words. */
function monogramOf(label: string): string {
  return label
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

interface Sketch {
  ground: string;
  ink: string;
  soft: string;
  accentOnGround: string;
  page: string;
  pageInk: string;
  brand: string;
  onBrand: string;
  accent: string;
  radius: string;
  display: string;
  weight: number;
  tracking: string;
  transform: "none" | "uppercase";
  object: "rows" | "block" | "board" | "strip" | "column" | "figure" | "monogram" | "none";
}

/* Photographs never exceed 8px and neither does anything this small. */
const cap = (r: string) => `min(${r}, 8px)`;

function schoolSketch(id: string): Sketch {
  const th = schoolTheme(id);
  const k = th.tokens;
  const d = displayStyle(th.pairing);
  return {
    ground: k.heroBg,
    ink: k.heroInk,
    soft: k.heroSoft,
    accentOnGround: k.heroAccent,
    page: k.bg,
    pageInk: k.ink,
    brand: k.brand,
    onBrand: k.onBrand,
    accent: k.accent,
    radius: cap(th.radius),
    display: displayFamily(th.pairing),
    weight: d.weight,
    tracking: d.tracking,
    transform: d.transform,
    object: th.hero === "deep" ? "rows" : th.hero === "light" ? "block" : "monogram",
  };
}

function coachingSketch(id: string): Sketch {
  const th = coachingTheme(id);
  const k = th.tokens;
  const d = coachingDisplayStyle(th.voice);
  return {
    ground: k.heroBg,
    ink: k.heroInk,
    soft: k.heroSoft,
    accentOnGround: k.heroAccent,
    page: k.bg,
    pageInk: k.ink,
    brand: k.brand,
    onBrand: k.onBrand,
    accent: k.accent,
    radius: cap(th.radius),
    display: coachingDisplayFamily(th.voice),
    weight: d.weight,
    tracking: d.tracking,
    transform: d.transform,
    object:
      th.hero === "board" ? "board" : th.hero === "strip" ? "strip" : th.hero === "figure" ? "figure" : th.hero === "column" ? "column" : "monogram",
  };
}

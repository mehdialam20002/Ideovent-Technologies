/**
 * THE TEMPLATE REGISTRY: ten ready-made demos, five school and five coaching.
 *
 * ── WHAT A TEMPLATE IS ────────────────────────────────────────────────────
 * A complete demo site for an institute that does not exist, written to show
 * one real segment of the Indian market well: an urban CBSE school, a rural
 * tuition centre, a JEE institute in Kota. Mehdi previews one, likes it, and
 * DUPLICATES it into an ordinary draft demo, which he then fills with a real
 * institute's own details. See ./fromTemplate.ts for exactly what survives.
 *
 * ── WHY THEY LIVE IN CODE AND NOT IN THE CMS ──────────────────────────────
 * Mehdi's rule: a template can be previewed and duplicated, never edited and
 * never deleted. Hiding two buttons would not make that true, because a
 * record in the `demoSites` collection is editable and deletable by whatever
 * has access to the collection, and in local mode it also sits in his
 * browser's localStorage where Reset or Import can replace it. So templates
 * are not records at all. They are modules. There is nothing in the database
 * or in localStorage to edit or delete, and the only operations this file
 * offers are read (`loadTemplate`) and copy (`fromTemplate`, next door).
 *
 * ── WHY THE LOADERS ARE DYNAMIC IMPORTS, AND WHO MAY IMPORT THIS FILE ─────
 * Ten rich records are tens of kilobytes. src/lib/cms/seed.ts is imported by
 * main.tsx, so anything there is in the entry chunk every homepage visitor
 * downloads; that is where the old example records lived and it is exactly
 * where these must not go. Each content file is reached only through the
 * `import()` below, so Rollup puts each one in its own chunk, fetched when a
 * template is previewed or duplicated and never otherwise.
 *
 * This file itself (meta and loaders, no content) is imported only by the
 * admin: the Templates tab, the template preview and the demo-sites editor.
 * The public demo route imports ./ids.ts instead, which is a list of strings.
 * Do not re-export this from src/lib/demo/index.ts: the templates import that
 * barrel.
 *
 * ── A TEMPLATE IS NEVER SERVED PUBLICLY ───────────────────────────────────
 * It has no document, so /site/<anything> cannot find one, and
 * src/pages/DemoSiteRoute.tsx additionally answers a template's id or preview
 * slug with the ordinary 404. The only place one renders is
 * /admin/preview/template/:id, behind the admin login.
 */

import type { DemoKind, DemoSite } from "@/lib/cms/types";
import { TEMPLATE_IDS, TEMPLATE_PREVIEW_SLUG_PREFIX, type TemplateId } from "./ids";
import type { DemoTemplateMeta, LoadedTemplate, TemplateModule } from "./shape";

export { TEMPLATE_IDS, isTemplateId, isTemplateSlug, type TemplateId } from "./ids";
export {
  TEMPLATE_SEGMENTS,
  TEMPLATE_SEGMENT_LABEL,
  type DemoTemplateMeta,
  type LoadedTemplate,
  type TemplateContent,
  type TemplateSegment,
} from "./shape";
export {
  DESIGN_FAMILIES,
  DESIGN_FAMILY_IDS,
  THEME_PALETTE_NAME,
  familyOfTheme,
  type DesignFamily,
} from "./families";

/* ── The ten ─────────────────────────────────────────────────────────────── */

/*
  RE-POINTED 26 SEPTEMBER 2026 TO THE MULTI-PAGE THEMES. Each template now
  names a multi-page theme (src/lib/demo/site/themes.ts), so its preview and
  every duplicate render the multi-page site, and the family owns the
  composition. The assignment follows the research in
  E:/myagency/_assets/DEMO-SCHOOL-IA.md and DEMO-COACHING-IA.md:

    s1 metro      Modern a   split hero with the admissions card
    s2 aangan     Warm a     stacked, notice-first, lightest page
    s3 crayon     Warm b     arched photo window, age sticker
    s4 pinewood   Classic a  masthead with a letterbox band
    s5 atlas      Modern b   full-bleed photo, continuum strip
    c1 podium     Modern a   split hero, next-batches data object
    c2 register   Classic a  masthead and register line, lightest page
    c3 folio      Classic b  title page, faculty high
    c4 courtyard  Warm a     brand colour full bleed, question headline
    c5 timetable  Modern b   split hero, next-three-exams data object

  The older line-up below is kept as history: those ids still render the
  single page for demos already sent.

  THE LINE-UP, from Mehdi's brief of 25 September 2026. The segments are his;
  the family and the theme are chosen so that no two templates of one kind
  share a theme, all three families exist on both sides, and each theme's own
  stated purpose (its blurb in schoolThemes.ts or coachingThemes.ts) matches
  the segment it is given:

    s1 modern-campus  "leads with academics": a metro CBSE school's argument is
                      its streams and its results.
    s2 bright         "notices near the top, for a full day school": a village
                      parent opens the site to learn whether Saturday is on.
    s3 riverside      "warm rather than formal, for a primary": parents of a
                      three-year-old are choosing people, not a board.
    s4 heritage       "an older school whose age is the argument": boarding
                      schools sell continuity, grounds and a house system.
    s5 quiet-campus   type-led, prose first, the Avenues device: the
                      international parent reads the philosophy first.
    c1 ledger         "results-led: JEE, NEET": the batch board is the hero.
    c2 bulletin       "a busy neighbourhood centre, notices first".
    c3 signal         tiles for four subjects, hairline type, a strip of
                      batches: a subject shop, not an institution.
    c4 studio         "opens on the free first session": a parent of an
                      eleven-year-old is solving this week's problem.
    c5 marks          results first, a departure board of batches, the next
                      start date as a numeral: a job aspirant reads the
                      calendar before anything else.

  Change a segment only with a reason written here.
*/
export const TEMPLATES: readonly DemoTemplateMeta[] = [
  {
    id: "s1-urban-cbse",
    kind: "school",
    segment: "urban",
    designFamily: "modern",
    theme: "metro",
    label: "Urban CBSE senior secondary",
    description: "A metro day school, Nursery to Class XII, with science, commerce and humanities streams. Opens on academics.",
  },
  {
    id: "s2-rural-state-board",
    kind: "school",
    segment: "rural",
    designFamily: "warm",
    theme: "aangan",
    label: "Rural state-board school",
    description: "Class 1 to 10, Hindi and English medium, read on basic Android phones on patchy data. Notices first.",
  },
  {
    id: "s3-play-school",
    kind: "school",
    segment: "specialised",
    designFamily: "warm",
    theme: "crayon",
    label: "Play school and pre-primary",
    description: "Playgroup, nursery, LKG and UKG, for parents of two to six year olds. The people and the day before any figure.",
  },
  {
    id: "s4-residential",
    kind: "school",
    segment: "specialised",
    designFamily: "classic",
    theme: "pinewood",
    label: "Residential school",
    description: "A boarding school in the hills, Class 4 to 12, where hostel life and the house system are the argument.",
  },
  {
    id: "s5-international",
    kind: "school",
    segment: "urban",
    designFamily: "modern",
    theme: "atlas",
    label: "International school, IB and Cambridge",
    description: "English first, fees and outcomes framed for globally minded parents in a metro. Leads with the prose.",
  },
  {
    id: "c1-jee-neet-urban",
    kind: "coaching",
    segment: "urban",
    designFamily: "modern",
    theme: "podium",
    label: "JEE and NEET, urban",
    description: "Kota or Delhi style: Class 11, 12 and droppers, classroom batches and a test series. The batch board is the hero.",
  },
  {
    id: "c2-rural-tuition",
    kind: "coaching",
    segment: "rural",
    designFamily: "classic",
    theme: "register",
    label: "Rural tuition centre, all subjects",
    description: "Class 6 to 12, every subject, board-exam focus, Hindi-medium friendly, evening batches after school.",
  },
  {
    id: "c3-science",
    kind: "coaching",
    segment: "specialised",
    designFamily: "classic",
    theme: "folio",
    label: "Science only, Class 9 to 12",
    description: "Physics, chemistry, biology and maths, taught one subject at a time. Batches as tiles, teachers early.",
  },
  {
    id: "c4-foundation",
    kind: "coaching",
    segment: "specialised",
    designFamily: "warm",
    theme: "courtyard",
    label: "Foundation, Class 6 to 10",
    description: "School syllabus plus Olympiad and NTSE, for parents of younger children. Opens on the free first class.",
  },
  {
    id: "c5-government-jobs",
    kind: "coaching",
    segment: "rural",
    designFamily: "modern",
    theme: "timetable",
    label: "Government job exams",
    description: "SSC, banking, railways and state PSC, for adults 18 to 30 in tier-2 and tier-3 towns. Results and the calendar first.",
  },
];

/**
 * One loader per id, each a separate dynamic import so each template is its
 * own chunk. Typed as a Record over TemplateId, so an id without a file, or a
 * file without an id, is a compile error.
 */
const LOADERS: Record<TemplateId, () => Promise<{ default: TemplateModule }>> = {
  "s1-urban-cbse": () => import("./school/s1-urban-cbse"),
  "s2-rural-state-board": () => import("./school/s2-rural-state-board"),
  "s3-play-school": () => import("./school/s3-play-school"),
  "s4-residential": () => import("./school/s4-residential"),
  "s5-international": () => import("./school/s5-international"),
  "c1-jee-neet-urban": () => import("./coaching/c1-jee-neet-urban"),
  "c2-rural-tuition": () => import("./coaching/c2-rural-tuition"),
  "c3-science": () => import("./coaching/c3-science"),
  "c4-foundation": () => import("./coaching/c4-foundation"),
  "c5-government-jobs": () => import("./coaching/c5-government-jobs"),
};

/* ── Lookups ─────────────────────────────────────────────────────────────── */

export function templateMeta(id: string | undefined): DemoTemplateMeta | null {
  const s = (id || "").trim().toLowerCase();
  return TEMPLATES.find((t) => t.id === s) || null;
}

export function templatesOfKind(kind: DemoKind): DemoTemplateMeta[] {
  return TEMPLATES.filter((t) => t.kind === kind);
}

/**
 * The full template, or null for an id that is not one.
 *
 * Throws if the file's kind disagrees with the registry. That is a wiring
 * mistake in this folder, and rendering a school's content through the
 * coaching template would hide it behind a page that merely looks odd.
 */
export async function loadTemplate(id: string | undefined): Promise<LoadedTemplate | null> {
  const meta = templateMeta(id);
  if (!meta) return null;
  const mod = (await LOADERS[meta.id]()).default;
  if (mod.kind !== meta.kind) {
    throw new Error(
      `Template ${meta.id} is registered as ${meta.kind} but its file says ${mod.kind}.`,
    );
  }
  return { meta, content: mod.content };
}

/* ── The preview record ──────────────────────────────────────────────────── */

/**
 * The template as a DemoSite, IN MEMORY, for the admin preview only.
 *
 * It is never saved. Its status is "draft", so even if it somehow reached the
 * collection the public route would 404 it; its slug carries the reserved
 * preview prefix, which the admin refuses for any real demo; and `isExample`
 * is true, so the page labels every figure as example content in the marker,
 * in each section head that prints a number, and in the footer.
 */
export function templatePreviewSite(t: LoadedTemplate): DemoSite {
  const { faq, ...rest } = t.content;
  return {
    ...rest,
    /* The `generic` flag is template bookkeeping for the duplicate; the page
       never sees it. Everything else (group, the `hi` twin) is kept, or the
       Hindi preview prints the English questions. */
    faq: faq?.map(({ generic: _generic, ...f }) => f),
    id: `tpl_${t.meta.id}`,
    slug: `${TEMPLATE_PREVIEW_SLUG_PREFIX}${t.meta.id}`,
    status: "draft",
    kind: t.meta.kind,
    theme: t.meta.theme,
    isExample: true,
    templateId: t.meta.id,
  };
}

/** The admin address of a template's preview. Behind the login. */
export function templatePreviewPath(id: TemplateId): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/admin/preview/template/${id}`;
}

/* Every id has exactly one registry entry. Checked at module load in dev, and
   by scripts/test-from-template.mjs in CI, so a copy-pasted entry with a
   repeated id cannot quietly hide one of the ten. */
if (import.meta.env?.DEV) {
  const seen = new Set<string>();
  for (const t of TEMPLATES) {
    if (seen.has(t.id)) console.error(`Template registry: ${t.id} is listed twice.`);
    seen.add(t.id);
  }
  for (const id of TEMPLATE_IDS) {
    if (!seen.has(id)) console.error(`Template registry: ${id} has no entry.`);
  }
}

import { cn } from "@/lib/utils";
import { DEMO_LANG_NAME, type DemoLang } from "@/lib/demo/language";

/**
 * THE ENGLISH / HINDI CONTROL, IN THE INSTITUTE'S OWN HEADER.
 *
 * ── WHY IT IS TWO BUTTONS AND NOT ONE ─────────────────────────────────────
 * A single button labelled "हिंदी" is smaller and it is worse. It says what
 * the site would become, not what it is, and a reader who lands mid-page
 * cannot tell whether they are looking at the English site or the Hindi one.
 * Two options with the current one pressed says both things at once, and it
 * advertises the feature to the person we built it for: a director scrolling
 * past their own masthead sees that their site comes in two languages without
 * anybody having to tell them.
 *
 * ── ACCESSIBILITY, AND WHY EACH PIECE IS THERE ────────────────────────────
 * Real `<button>` elements, so the control is in the tab order and works from
 * a keyboard without a single line of key handling. `role="group"` with a
 * bilingual `aria-label` names the pair. `aria-pressed` is what makes a screen
 * reader announce "English, pressed" rather than leaving the reader to infer
 * the state from a colour. `lang="hi"` on the Hindi option makes a screen
 * reader switch voice for that one word, which is the difference between
 * hearing "Hindi" and hearing an English engine attempt Devanagari.
 *
 * The page's own `lang` attribute is handled elsewhere, by
 * `useDemoLangControl` in @/lib/demo/language, because it is a document-level
 * concern and two components writing it would race.
 *
 * ── WHY THE COLOURS COME FROM A PROP ──────────────────────────────────────
 * The two templates paint from two different token systems: the school reads
 * the `--ds-*` custom properties its theme sets, and the coaching page reads
 * the `--dc-*` set its own themes hand over. A control written against either
 * one is invisible in the other, so the variant is explicit rather than
 * guessed, and both templates render THIS component rather than each carrying
 * a copy: the control a director sees on the school demo and the one they see
 * on the coaching demo the same afternoon must be the same control.
 *
 * ── IT IS NEVER HIDDEN BEHIND THE MENU ────────────────────────────────────
 * On a phone it stays in the masthead beside the menu button. A language
 * switch a reader has to open a hamburger to find is a switch the reader who
 * needs it, the one who is least comfortable with the English page, will not
 * find; and the director we built it for is looking at their phone, not at a
 * desktop.
 */
export function DemoLanguageToggle({
  lang,
  onChange,
  tone,
  className,
}: {
  lang: DemoLang;
  onChange: (lang: DemoLang) => void;
  /** "ds" for the school template's theme tokens, "dc" for the coaching template's. */
  tone: "ds" | "dc";
  className?: string;
}) {
  const ds = tone === "ds";

  const group = ds
    ? "border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))]"
    : "border-[hsl(var(--dc-line))] bg-[hsl(var(--dc-bg))]";

  const active = ds
    ? "bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]"
    : "bg-[hsl(var(--dc-brand))] text-[hsl(var(--dc-on-brand))]";

  const idle = ds
    ? "text-[hsl(var(--ds-ink-soft))] hover:text-[hsl(var(--ds-ink))]"
    : "text-[hsl(var(--dc-ink-soft))] hover:text-[hsl(var(--dc-ink))]";

  const ring = ds
    ? "focus-visible:ring-[hsl(var(--ds-accent))] focus-visible:ring-offset-[hsl(var(--ds-bg))]"
    : "focus-visible:ring-[hsl(var(--dc-accent))] focus-visible:ring-offset-[hsl(var(--dc-bg))]";

  return (
    <div
      role="group"
      data-lang-toggle=""
      /* Both languages, because the reader who needs this control is by
         definition the one who may not read the other half of it. */
      aria-label="Language / भाषा"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border p-[3px]",
        group,
        className,
      )}
    >
      {(["en", "hi"] as const).map((code) => {
        const on = lang === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            lang={code === "hi" ? "hi" : "en"}
            onClick={() => onChange(code)}
            className={cn(
              "inline-flex min-h-[1.75rem] items-center rounded-full px-2.5 text-[0.72rem] font-medium leading-none",
              "transition-colors duration-150 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              ring,
              on ? active : idle,
            )}
          >
            {DEMO_LANG_NAME[code]}
          </button>
        );
      })}
    </div>
  );
}

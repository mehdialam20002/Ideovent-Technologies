/**
 * THE ENGLISH / HINDI SWITCH IN THE DENTAL HEADER, AT EVERY WIDTH (1 Oct 2026).
 *
 * Below 1180px the switch sat only inside the menu sheet, so a phone reader
 * had to open the hamburger to find Hindi: the one thing DemoLanguageToggle
 * says must never happen. The school and coaching headers keep it in the bar
 * at every width, and so does this one now.
 *
 * Their bars drop the primary action on a phone; the dental bar keeps Book,
 * and beside Book and the menu button the full "English | हिंदी" pill left a
 * long clinic name about 90px at 390px. So the header carries two forms and
 * its container query (dental.css, .dn-hdr) shows one:
 *
 *   768px and up   the shared DemoLanguageToggle itself, unchanged
 *   under 768px    its compact twin: the same pill, tokens, size and
 *                  behaviour, two options with the current one pressed,
 *                  labelled "EN" and "हिं". Each button's accessible name is
 *                  still the full language name, in its own language.
 *
 * The hidden form is display:none, so a screen reader meets one switch.
 */

import { cn } from "@/lib/utils";
import { DEMO_LANG_NAME, type DemoLang } from "@/lib/demo/language";
import { DemoLanguageToggle } from "@/pages/site/DemoLanguageToggle";

const SHORT: Record<DemoLang, string> = { en: "EN", hi: "हिं" };

function CompactToggle({ lang, onChange }: { lang: DemoLang; onChange: (lang: DemoLang) => void }) {
  return (
    <div role="group" data-lang-toggle="" aria-label="Language / भाषा"
      className="dn-hdr-lang-compact shrink-0 items-center gap-0.5 rounded-full border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] p-[3px]">
      {(["en", "hi"] as const).map((code) => {
        const on = lang === code;
        return (
          <button key={code} type="button" aria-pressed={on} lang={code} onClick={() => onChange(code)}
            className={cn(
              "inline-flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center rounded-full px-2 text-[0.72rem] font-medium leading-none",
              "transition-colors duration-150 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "focus-visible:ring-[hsl(var(--ds-accent))] focus-visible:ring-offset-[hsl(var(--ds-bg))]",
              on ? "bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]" : "text-[hsl(var(--ds-ink-soft))] hover:text-[hsl(var(--ds-ink))]",
            )}>
            <span aria-hidden="true">{SHORT[code]}</span>
            <span className="sr-only">{DEMO_LANG_NAME[code]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Both forms; dental.css shows the one that fits the header's width. */
export function DentalLangSwitch({ lang, onChange }: { lang: DemoLang; onChange: (lang: DemoLang) => void }) {
  return (
    <>
      <DemoLanguageToggle lang={lang} onChange={onChange} tone="ds" className="dn-hdr-lang-full" />
      <CompactToggle lang={lang} onChange={onChange} />
    </>
  );
}

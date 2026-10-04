import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/80 transition-colors hover:text-foreground hover:border-primary/50";

/*
  TWO STAGES SINCE PAGES ARE PRERENDERED (3 Oct 2026, perf). The build renders the
  header with no stored theme (next-themes knows none on a server), and the browser
  hydrates that HTML, so the first client render must say the same thing: the
  site's default, light, with the empty icon box. React 18 does not repair a
  hydrated attribute, so a label computed from the stored theme in that render
  could have stayed wrong. The button that reads the theme mounts after that,
  which also keeps next-themes' first update (its resolvedTheme effect) away from
  the page while it is still hydrating at low priority.
*/
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted) return <LiveThemeToggle className={className} />;
  return (
    <button type="button" aria-label="Switch to dark theme" className={cn(BUTTON, className)}>
      {/* Before mount the stored theme is not known, so neither icon is right; an
          empty box for a moment is better than a moon on a dark site. */}
      <span className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function LiveThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  return (
    <button
      type="button"
      // Says which way the button will move, not just that it exists. And updates with
      // the theme, so a screen-reader user is not told "toggle" and left to guess.
      // aria-pressed reflects the current state for anything that reads it as a switch.
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(BUTTON, className)}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

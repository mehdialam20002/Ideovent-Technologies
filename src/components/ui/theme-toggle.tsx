import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme !== "light";

  return (
    <button
      type="button"
      // Says which way the button will move, not just that it exists. And updates with
      // the theme, so a screen-reader user is not told "toggle" and left to guess.
      // aria-pressed reflects the current state for anything that reads it as a switch.
      aria-label={isDark ? "Switch to light theme": "Switch to dark theme"}
      aria-pressed={mounted ? isDark: undefined}
      onClick={() => setTheme(isDark ? "light": "dark")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground/80 transition-colors hover:text-foreground hover:border-primary/50",
        className
)}
    >
      {/* Before mount next-themes does not know the stored theme, so neither icon is
          right; an empty box for one frame is better than showing a moon on a dark
          site and flipping it on hydration. */}
      {!mounted ? (
        <span className="h-4 w-4" aria-hidden="true" />
): isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
): (
        <Moon className="h-4 w-4" aria-hidden="true" />
)}
    </button>
);
}

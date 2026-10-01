import type { FinderFilters } from "@/lib/leadFinder/leads";
import { cn } from "@/lib/utils";

const ITEMS: { key: keyof FinderFilters; label: string }[] = [
  { key: "noWebsite", label: "Only no website" },
  { key: "poorOrBroken", label: "Only poor or broken" },
  { key: "rating4", label: "Rating 4+" },
  { key: "reviews20", label: "20+ reviews" },
];

const RATING_KEYS: (keyof FinderFilters)[] = ["rating4", "reviews20"];

/**
 * Toggle chips over the results. Several can be on; a result must pass all of
 * them. `ratings` false (an OpenStreetMap list, which has no ratings) hides
 * the rating and review chips.
 */
export function Filters({ value, onChange, ratings = true }: { value: FinderFilters; onChange: (f: FinderFilters) => void; ratings?: boolean }) {
  return (
    <div role="group" aria-label="Filters" className="flex flex-wrap gap-2">
      {ITEMS.filter(({ key }) => ratings || !RATING_KEYS.includes(key)).map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value[key]}
          onClick={() => onChange({ ...value, [key]: !value[key] })}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value[key] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

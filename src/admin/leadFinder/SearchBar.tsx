import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { TYPE_PRESETS, type TypePreset } from "@/lib/leadFinder/leads";
import { cn } from "@/lib/utils";
import { btn, input } from "./styles";

export interface SearchInput {
  city: string;
  /** What goes to Google as the type: a preset's query or the typed text. */
  type: string;
  /** Shown on the lead as a tag, e.g. "JEE/NEET coaching". */
  typeLabel: string;
  preset?: TypePreset;
}

/**
 * City plus a type. The chips are the kinds Mehdi sells to most; "Other"
 * opens a free text box for anything else (a gym, a clinic, a shop).
 */
export function SearchBar({ busy, onSearch }: { busy: boolean; onSearch: (q: SearchInput) => void }) {
  const [city, setCity] = useState("");
  const [presetId, setPresetId] = useState<string>("coaching");
  const [free, setFree] = useState("");
  const [tried, setTried] = useState(false);
  const preset = TYPE_PRESETS.find((p) => p.id === presetId);
  const typeText = preset ? preset.query : free.trim();
  const missing = !city.trim() ? "city" : !typeText ? "type" : null;

  return (
    <form
      role="search"
      aria-label="Find businesses on Google Maps"
      className="rounded-2xl border border-border bg-card/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (missing || busy) return;
        onSearch({ city: city.trim(), type: typeText, typeLabel: preset ? preset.label : free.trim(), preset });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="flex flex-wrap gap-2">
          {[...TYPE_PRESETS, { id: "other", label: "Other" }].map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={presetId === p.id}
              onClick={() => setPresetId(p.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                presetId === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {presetId === "other" ? (
          <div className="min-w-0">
            <label htmlFor="lf-type" className="mb-1 block text-xs font-medium text-muted-foreground">What kind of business</label>
            <input id="lf-type" className={input} placeholder="e.g. dental clinic, gym, music academy" value={free}
              onChange={(e) => setFree(e.target.value)} aria-invalid={tried && missing === "type"} />
          </div>
        ) : (
          <p className="min-w-0 text-sm text-muted-foreground sm:pb-2">
            Searching for <span className="font-medium text-foreground">{preset?.query}</span>
          </p>
        )}
        <div className="min-w-0">
          <label htmlFor="lf-city" className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
          <input id="lf-city" className={input} placeholder="e.g. Patna" value={city} autoComplete="address-level2"
            onChange={(e) => setCity(e.target.value)} aria-invalid={tried && missing === "city"} />
        </div>
        <button type="submit" disabled={busy} className={cn(btn, "h-10 border-primary bg-primary px-5 text-sm text-primary-foreground hover:opacity-90")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
          Search
        </button>
      </div>
      {tried && missing && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {missing === "city" ? "Type a city, e.g. Patna." : "Type what kind of business to look for."}
        </p>
      )}
    </form>
  );
}

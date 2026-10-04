import { useState } from "react";
import { CheckCircle2, Loader2, Search } from "lucide-react";
import { RADIUS_CHOICES_KM } from "@/lib/leadFinder/client";
import { TYPE_PRESETS, type PresetGroup, type TypePreset } from "@/lib/leadFinder/leads";
import { cn } from "@/lib/utils";
import { btn, input } from "./styles";

export interface SearchInput {
  city: string;
  /** What goes to Google as the type: a preset's query or the typed text. */
  type: string;
  /** Shown on the lead as a tag, e.g. "JEE/NEET coaching". */
  typeLabel: string;
  preset?: TypePreset;
  /** "Also use Google (needs a working key)": a second request, to Google Maps, beside the free one. */
  google: boolean;
  /** A circle of this many km around the city instead of the city's own area; null: its own area. */
  radiusKm: number | null;
}

const GROUPS: PresetGroup[] = ["Schools", "Coaching", "Dental"];

/* Remembered in this browser only, as a convenience: whether "Also use Google" was ticked last time. Off by default. */
const GOOGLE_PREF = "ideovent_finder_also_google";
const readGooglePref = () => {
  try {
    return localStorage.getItem(GOOGLE_PREF) === "1";
  } catch {
    return false;
  }
};
const writeGooglePref = (on: boolean) => {
  try {
    localStorage.setItem(GOOGLE_PREF, on ? "1" : "0");
  } catch {
    /* a private window: the box still works for this visit */
  }
};

const chip = (on: boolean) => cn(
  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
  on ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
);

/**
 * City plus a type. The chips are the kinds Mehdi sells to most, in three
 * rows (schools, coaching, dental); "Other" opens a free text box for
 * anything else (a gym, a physiotherapist, a shop). Every search is free
 * (OpenStreetMap, no key); "Also use Google" adds Google Maps when a working
 * key is saved, and "Area" swaps the city's own area for a circle around it.
 */
export function SearchBar({ busy, onSearch }: { busy: boolean; onSearch: (q: SearchInput) => void }) {
  const [city, setCity] = useState("");
  const [presetId, setPresetId] = useState<string>("coaching");
  const [free, setFree] = useState("");
  const [tried, setTried] = useState(false);
  const [google, setGoogle] = useState<boolean>(readGooglePref);
  const [radius, setRadius] = useState("");
  const preset = TYPE_PRESETS.find((p) => p.id === presetId);
  const typeText = preset ? preset.query : free.trim();
  const missing = !city.trim() ? "city" : !typeText ? "type" : null;

  return (
    <form
      role="search"
      aria-label="Find businesses"
      className="rounded-2xl border border-border bg-card/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (missing || busy) return;
        onSearch({
          city: city.trim(), type: typeText, typeLabel: preset ? preset.label : free.trim(), preset,
          google, radiusKm: radius ? Number(radius) : null,
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="space-y-2">
          {GROUPS.map((g) => (
            <div key={g} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{g}</span>
              {TYPE_PRESETS.filter((p) => p.group === g).map((p) => (
                <button key={p.id} type="button" aria-pressed={presetId === p.id} onClick={() => setPresetId(p.id)} className={chip(presetId === p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Any</span>
            <button type="button" aria-pressed={presetId === "other"} onClick={() => setPresetId("other")} className={chip(presetId === "other")}>
              Other
            </button>
          </div>
        </div>
      </fieldset>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {presetId === "other" ? (
          <div className="min-w-0">
            <label htmlFor="lf-type" className="mb-1 block text-xs font-medium text-muted-foreground">What kind of business</label>
            <input id="lf-type" className={input} placeholder="e.g. gym, physiotherapy clinic, music academy" value={free}
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

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <p data-testid="free-search" className="inline-flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          Free search (OpenStreetMap): no key needed
        </p>
        <span className="inline-flex items-center gap-1.5">
          <label htmlFor="lf-area" className="text-muted-foreground">Area</label>
          <select id="lf-area" value={radius} onChange={(e) => setRadius(e.target.value)}
            className="h-7 min-w-0 max-w-[14rem] rounded-md border border-border bg-background px-1.5 text-xs text-foreground">
            <option value="">The city's own area</option>
            {RADIUS_CHOICES_KM.map((km) => <option key={km} value={String(km)}>{km} km around it</option>)}
          </select>
        </span>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={google} className="h-4 w-4 shrink-0"
            onChange={(e) => { setGoogle(e.target.checked); writeGooglePref(e.target.checked); }} />
          Also use Google (needs a working key)
        </label>
      </div>
      {tried && missing && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {missing === "city" ? "Type a city, e.g. Patna." : "Type what kind of business to look for."}
        </p>
      )}
    </form>
  );
}

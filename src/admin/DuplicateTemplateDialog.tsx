import { useState } from "react";
import { AlertTriangle, Files } from "lucide-react";
import type { DuplicateIdentity } from "@/lib/demo/templates/fromTemplate";

/**
 * The question Duplicate asks: whose demo is this? The name replaces the
 * template's fictional name everywhere in the copy, English and Hindi; the
 * city replaces the template's city; the Hindi name is used in the Hindi
 * version. Enter submits (it is a form).
 */
export function DuplicateTemplateDialog({
  templateLabel, busy, error, onCancel, onSubmit,
}: {
  templateLabel: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (who: DuplicateIdentity) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [hiName, setHiName] = useState("");
  const [tried, setTried] = useState(false);
  const missing = !name.trim();

  const input =
    "mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-template-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && !busy && onCancel()}
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (missing || busy) return;
          onSubmit({ name: name.trim(), city: city.trim(), hiName: hiName.trim() });
        }}
      >
        <h2 id="dup-template-title" className="font-display text-lg font-semibold">
          Duplicate {templateLabel}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The copy arrives already filled: courses, fees, teachers, results, reviews, photos and
          every Hindi line. The example institute’s name becomes this one everywhere. Contact
          details are left empty for you to add from their own website.
        </p>

        <label htmlFor="dup-name" className="mt-4 block text-sm font-medium">
          Institute name
        </label>
        <input
          id="dup-name"
          autoFocus
          className={input}
          placeholder="As they spell it"
          value={name}
          aria-invalid={tried && missing}
          aria-describedby={tried && missing ? "dup-name-error" : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {tried && missing && (
          <p id="dup-name-error" className="mt-1 text-xs text-destructive">
            Type the institute’s name. It replaces the example name on every page.
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dup-city" className="block text-sm font-medium">
              City <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input id="dup-city" className={input} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label htmlFor="dup-hi-name" className="block text-sm font-medium">
              Hindi name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="dup-hi-name"
              lang="hi"
              className={input}
              placeholder="Used on the Hindi pages"
              value={hiName}
              onChange={(e) => setHiName(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <Files className="h-4 w-4" aria-hidden="true" /> {busy ? "Duplicating…" : "Make the draft"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

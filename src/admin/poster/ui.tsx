import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TEMPLATES, templateMeta, type TemplateId } from "@/lib/demo/templates";
import type { PosterContact } from "@/lib/ai/posterSchema";
import type { AnyPosterKind } from "@/lib/ai/dentalPosterSchema";
import { cn } from "@/lib/utils";

/**
 * Small pieces the poster import dialog is built from. Kept apart so the
 * dialog file reads as the flow (upload, reading, review) and not as forty
 * inputs.
 */

export const inputClass =
  "mt-1 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * An EMPTY field looks empty on purpose: a dashed border and "Not on the
 * poster". Mehdi scans the review for what the AI did not find, and a filled
 * look on an empty box would hide exactly that.
 */
export const emptyClass = "border-dashed bg-muted/30";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export type TemplateChoice = TemplateId | "auto";

/** The template select: all seventeen, grouped by kind (school, coaching, dental), plus "Let AI choose". */
export function TemplatePicker({
  id, value, onChange, autoLabel, label = "Template", allowAuto = true,
}: {
  id: string;
  value: TemplateChoice;
  onChange: (v: TemplateChoice) => void;
  /** What "Let AI choose" currently resolves to, when known. */
  autoLabel?: string;
  label?: string;
  /** False where only a real template makes sense (filling by hand). */
  allowAuto?: boolean;
}) {
  const group = (kind: "school" | "coaching" | "dental") => TEMPLATES.filter((t) => t.kind === kind);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value as TemplateChoice)}
      >
        {allowAuto && <option value="auto">Let AI choose{autoLabel ? ` (now: ${autoLabel})` : ""}</option>}
        <optgroup label="School">
          {group("school").map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </optgroup>
        <optgroup label="Coaching">
          {group("coaching").map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </optgroup>
        <optgroup label="Dental clinic">
          {group("dental").map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

export const templateLabel = (id: TemplateId | undefined) => (id && templateMeta(id)?.label) || id || "";

/** One labelled text input that shows when it is empty. */
export function Field({
  id, label, value, onChange, placeholder = "Not on the poster", className, lang, multiline, hint, type = "text",
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  lang?: string;
  multiline?: boolean;
  hint?: ReactNode;
  type?: string;
}) {
  const v = value || "";
  const cls = cn(inputClass, !v.trim() && emptyClass);
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} rows={3} lang={lang} className={cls} placeholder={placeholder} value={v} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={type} lang={lang} className={cls} placeholder={placeholder} value={v} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A section of the review form, a fieldset so screen readers hear its name. */
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-2xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {action && <div className="-mt-1 mb-2 flex justify-end">{action}</div>}
      <div className="grid gap-3">{children}</div>
    </fieldset>
  );
}

/* ── Shared by the school and the clinic review forms ────────────────────── */
/* The list-as-text helpers they also share are in ./listText.ts. */

export const smallButton =
  "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A list of rows (courses, teachers, results, doctors, fees) with Add and Remove. */
export function Rows<T extends object>({
  noun, items, onChange, render, blank,
}: {
  noun: string;
  items: T[] | undefined;
  onChange: (next: T[]) => void;
  render: (item: T, set: (p: Partial<T>) => void, i: number) => ReactNode;
  blank: T;
}) {
  const list = items || [];
  return (
    <div className="grid gap-3">
      {!list.length && (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          None on the poster, so the template’s own {noun}s stay. Add one to replace them.
        </p>
      )}
      {list.map((item, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {noun[0].toUpperCase() + noun.slice(1)} {i + 1}
            </span>
            <button
              type="button"
              className={smallButton}
              aria-label={`Remove ${noun} ${i + 1}`}
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {render(item, (p) => onChange(list.map((x, j) => (j === i ? { ...x, ...p } : x))), i)}
          </div>
        </div>
      ))}
      <button type="button" className={`${smallButton} justify-self-start`} onClick={() => onChange([...list, { ...blank }])}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a {noun}
      </button>
    </div>
  );
}

const KIND_LABEL: Record<AnyPosterKind, string> = { school: "School", coaching: "Coaching", dental: "Dental clinic" };

/** School, coaching or dental clinic. Switching keeps every field typed so far. */
export function KindPicker({ value, onChange }: { value: AnyPosterKind; onChange: (k: AnyPosterKind) => void }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-xs font-medium text-muted-foreground">Kind</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {(["school", "coaching", "dental"] as const).map((k) => (
          <label key={k} className="inline-flex min-h-8 items-center gap-2">
            <input type="radio" name="poster-kind" value={k} checked={value === k} onChange={() => onChange(k)} />
            {KIND_LABEL[k]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Phones, WhatsApp, email, website and address, as the poster prints them. */
export function ContactSection({ contact, onChange }: { contact: PosterContact | undefined; onChange: (c: PosterContact) => void }) {
  const c = contact || {};
  const set = (p: Partial<PosterContact>) => onChange({ ...c, ...p });
  const phones = c.phones || [];
  return (
    <Section title="Contact, from the poster">
      <div className="grid gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground" id="px-phones-label">Phone numbers</p>
          <div className="mt-1 grid gap-2" role="group" aria-labelledby="px-phones-label">
            {!phones.length && (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">Not on the poster.</p>
            )}
            {phones.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field id={`px-phone-${i}`} label={i === 0 ? "Phone (shown on the site)" : `Phone ${i + 1} (kept in private notes)`} className="flex-1" type="tel" value={p} onChange={(v) => set({ phones: phones.map((q, j) => (j === i ? v : q)) })} />
                <button type="button" className="mb-0.5 rounded-full border border-border p-2 hover:bg-muted" aria-label={`Remove phone ${i + 1}`} onClick={() => set({ phones: phones.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" className={`${smallButton} justify-self-start`} onClick={() => set({ phones: [...phones, ""] })}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a phone
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="px-whatsapp" label="WhatsApp" type="tel" value={c.whatsapp} onChange={(v) => set({ whatsapp: v })} />
          <Field id="px-email" label="Email" type="email" value={c.email} onChange={(v) => set({ email: v })} />
          <Field id="px-website" label="Website" value={c.website} onChange={(v) => set({ website: v })} />
          <Field id="px-address" label="Address" multiline value={c.address} onChange={(v) => set({ address: v })} />
        </div>
      </div>
    </Section>
  );
}

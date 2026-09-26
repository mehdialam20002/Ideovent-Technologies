import type { ReactNode } from "react";
import { TEMPLATES, templateMeta, type TemplateId } from "@/lib/demo/templates";
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

/** The template select: all ten, grouped by kind, plus "Let AI choose". */
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
  const group = (kind: "school" | "coaching") => TEMPLATES.filter((t) => t.kind === kind);
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

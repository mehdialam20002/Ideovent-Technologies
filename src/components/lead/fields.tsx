/**
 * The form controls shared by the contact form and the pop-up.
 *
 * One set, so the two forms cannot drift: same labels, same 44px targets,
 * same error pattern, same focus rings. ContactForm is on the home page, so
 * this file is in the entry chunk; it stays small and imports nothing heavy.
 *
 * Measurements the styles below are built to (redesign brief, 25 Sep 2026):
 *   inputs, selects, buttons   44px tall, radius 8px, no shadow
 *   chips                      13px Inter 500, 32px tall, radius 8px, no border,
 *                              tap area stretched to 44px by a ::before
 *   chip fills                 rest 5%, hover 8%, checked 12% of --foreground,
 *                              plus a check mark, so "selected" is carried by a
 *                              shape and not only by a fill a low-vision
 *                              visitor may not tell apart (WCAG 1.4.1, 1.4.11)
 *   transitions                colour 150ms, press 180ms, on the site's one
 *                              curve (Tailwind's DEFAULT timing function)
 */
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  "block w-full rounded-[8px] border bg-background px-3.5 text-[15px] text-foreground",
  "placeholder:text-muted-foreground/70 outline-none transition-colors duration-150",
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/** Inter 500 15px, 44px, radius 8, no shadow. Navy on gold-500 (dark), white on navy-700 (light). */
export const primaryButtonClass = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-primary px-[18px] text-[15px] font-medium text-primary-foreground",
  "transition-[background-color,transform] duration-150 hover:bg-[hsl(var(--brand-navy-600))] dark:hover:bg-secondary",
  "active:scale-[0.99] disabled:cursor-progress disabled:opacity-70",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/** The second action is a text link with an arrow, never a second button. */
export const textLinkClass = cn(
  "group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-foreground underline-offset-4",
  "transition-colors duration-150 hover:underline",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[4px]",
);

function FieldLabel({ htmlFor, id, children, optional, as = "label" }: { htmlFor?: string; id?: string; children: ReactNode; optional?: boolean; as?: "label" | "legend" }) {
  const Tag = as;
  return (
    <Tag
      id={id}
      {...(as === "label" ? { htmlFor } : {})}
      className="mb-1.5 block text-[14px] font-medium leading-5 text-foreground"
    >
      {children}
      {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
    </Tag>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-5 text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

function Hint({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} className="mt-1.5 block text-[13px] leading-5 text-muted-foreground">
      {children}
    </span>
  );
}

const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  inputRef?: (el: HTMLInputElement | null) => void;
};

export function TextField({ id, label, optional, hint, error, inputRef, className, ...rest }: InputProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <input
        id={id}
        ref={inputRef}
        aria-required={!optional || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint && hintId, error && errorId)}
        className={cn(inputClass, "h-11", error ? "border-destructive" : "border-input")}
        {...rest}
      />
      <Hint id={hintId}>{hint}</Hint>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
};

export function TextAreaField({ id, label, optional, error, className, ...rest }: TextareaProps) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(inputClass, "min-h-[104px] py-2.5 leading-6", error ? "border-destructive" : "border-input")}
        {...rest}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  optional?: boolean;
  placeholder: string;
  options: readonly { id: string; label: string; hint?: string }[];
};

export function SelectField({ id, label, optional, placeholder, options, className, ...rest }: SelectProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <div className="relative">
        <select id={id} className={cn(inputClass, "h-11 appearance-none border-input pr-10")} {...rest}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.hint ? `${o.label}, ${o.hint}` : o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Single choice as chips. Native radio inputs inside a fieldset, so arrow keys
 * move the choice, Space selects, and a screen reader announces "radio button,
 * 2 of 5". The input is visually hidden and the label is the chip.
 */
export function ChoiceChips<T extends string>({
  idPrefix,
  name,
  legend,
  options,
  value,
  onChange,
  optional,
  error,
  firstRef,
  className,
}: {
  idPrefix: string;
  name: string;
  legend: string;
  options: readonly { id: T; label: string }[];
  value: T | "" | undefined;
  onChange: (v: T) => void;
  optional?: boolean;
  error?: string;
  firstRef?: (el: HTMLInputElement | null) => void;
  className?: string;
}) {
  const legendId = `${idPrefix}-${name}-legend`;
  const errorId = `${idPrefix}-${name}-error`;
  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={legendId}
      aria-required={!optional || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={cn("min-w-0 border-0 p-0", className)}
    >
      <FieldLabel as="legend" id={legendId} optional={optional}>{legend}</FieldLabel>
      <div className="flex flex-wrap gap-x-2 gap-y-3 pt-1">
        {options.map((o, i) => {
          const checked = value === o.id;
          const inputId = `${idPrefix}-${name}-${o.id}`;
          return (
            <label
              key={o.id}
              htmlFor={inputId}
              className={cn(
                "relative inline-flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium",
                "transition-colors duration-150",
                // The visible chip is 32px; this stretches the hit area to 44px
                // without making the chip itself look like a button.
                "before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                checked
                  ? "bg-foreground/[0.12] text-foreground"
                  : "bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground",
                error && !value && "ring-1 ring-destructive/60",
              )}
            >
              <input
                id={inputId}
                ref={i === 0 ? firstRef : undefined}
                type="radio"
                name={`${idPrefix}-${name}`}
                value={o.id}
                checked={checked}
                onChange={() => onChange(o.id)}
                className="sr-only"
              />
              {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
              {o.label}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}

/**
 * The error summary. role="alert", so the list is read out the moment it
 * appears, and each entry moves focus to the field it is about. The click is
 * handled rather than left to the #fragment: a fragment jump does not
 * reliably focus a visually hidden radio, and the smooth-scroll library
 * would animate it.
 */
export function ErrorSummary<K extends string>({
  errors,
  order,
  focus,
  compact,
}: {
  errors: Partial<Record<K, string>>;
  order: readonly K[];
  focus: (k: K) => void;
  compact?: boolean;
}) {
  const list = order.filter((k) => errors[k]);
  if (!list.length) return null;
  return (
    <div role="alert" className={cn("rounded-[8px] bg-destructive/10 text-[14px]", compact ? "p-3" : "p-4")}>
      <span className="block font-medium text-destructive">
        {list.length === 1 ? "There is a problem with one field:" : `There are problems with ${list.length} fields:`}
      </span>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-destructive">
        {list.map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => focus(k)}
              className="inline-flex min-h-6 items-center text-left underline underline-offset-2"
            >
              {errors[k]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The honeypot. Off screen, out of the tab order, hidden from assistive tech. */
export function Honeypot({ value, onChange, idPrefix }: { value: string; onChange: (v: string) => void; idPrefix: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={`${idPrefix}-leave-empty`}>Leave this empty</label>
      <input
        id={`${idPrefix}-leave-empty`}
        name="leave_this_empty"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

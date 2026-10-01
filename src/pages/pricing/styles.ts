/*
  The non-component half of the /pricing kit (./ui.tsx): class strings and a
  link helper. Kept apart from the components so the file that exports them
  exports components only, which is what fast refresh needs
  (react-refresh/only-export-components).
*/

/** Flat buttons. Primary: navy on light, gold on dark (--primary). */
export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground " +
  "transition-colors duration-200 hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const btnOutline =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-input bg-background px-6 text-base font-medium " +
  "text-foreground transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** wa.me link to our number with a prefilled message, or "" when no number is set. */
export function whatsappHref(number: string | undefined, text: string): string {
  const digits = (number || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : "";
}

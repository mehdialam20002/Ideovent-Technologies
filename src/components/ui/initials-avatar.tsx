import { cn } from "@/lib/utils";

/**
 * "Abhilasha Kumari" → "AK". First letter of the first two words; anything in
 * brackets or after a comma is a qualifier, not part of the name.
 */
export function initialsOf(name: string) {
  const clean = name.replace(/\(.*?\)/g, "").split(",")[0];
  const words = clean.trim().split(/\s+/).filter(Boolean);
  return (
    words
.slice(0, 2)
.map((w) => w[0])
.join("")
.toUpperCase() || "·"
);
}

const SIZES = {
  sm: "h-11 w-11 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-[4.5rem] w-[4.5rem] text-xl sm:h-20 sm:w-20 sm:text-2xl",
} as const;

interface InitialsAvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A person's initials on a disc of the brand navy (#081738, sampled from the
 * official logo, see `--brand-navy` in index.css).
 *
 * The disc itself is `.brand-navy-surface`, which lifts to navy-600 → navy-800
 * with a gold hairline in the dark theme: the dark page ground IS #081738 now,
 * so a flat logo-navy disc would be invisible on it. See that rule's note.
 *
 * Nobody on the team is photographed. Two of the three photos that used to be
 * on the About page were Unsplash stock images of strangers, and showing one
 * real face beside two placeholders reads as a rendering bug rather than a
 * choice. So this is not a fallback for a missing photo. It is the treatment,
 * and it is drawn to look like one: the logo navy, the display face, the wide
 * letterspacing of the wordmark.
 *
 * `aria-hidden` because the name is always printed next to it in the card; a
 * screen reader announcing "M A" before "Mehdi Alam" is noise.
 */
export function InitialsAvatar({ name, size = "lg", className }: InitialsAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "brand-navy-surface inline-flex shrink-0 select-none items-center justify-center rounded-full",
        "font-display font-semibold tracking-[0.1em]",
        SIZES[size],
        className
)}
    >
      {initialsOf(name)}
    </span>
);
}

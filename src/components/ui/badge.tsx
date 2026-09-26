import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        /* Mixed towards --foreground, not faded with an alpha, see the note on
           the `secondary` variant in button.tsx. `bg-secondary/80` composites
           against the page, so it lightened gold-700 to #A28B4E in the light
           theme and dropped the white label to 3.31:1 while measuring 7.57:1 in
           dark. Mixing gives light #7D6423 5.65:1 and dark #E5D29B 11.78:1. */
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,hsl(var(--secondary))_88%,hsl(var(--foreground)))]",
        /* Mixed, not faded, see button.tsx. `bg-destructive/80` measured
           4.47:1 in dark against the page ground; mixing gives 7.53:1 dark and
           8.33:1 light. */
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,hsl(var(--destructive))_80%,hsl(var(--foreground)))]",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant,...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
)
}

export { Badge, badgeVariants }

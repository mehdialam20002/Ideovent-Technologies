import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
  Every variant carries three states, not one.

  Before this pass the only feedback a pointer user got was `hover:`. There was no
  `active:` anywhere in the file, so a tap on a phone (where hover does not exist at
  all) produced no visual acknowledgement between the touch and the route changing.
  On a slow connection that is the difference between one tap and three.

  `active:` is a pressed-down tint plus a 1% scale-down, which reads as a physical
  press without moving neighbouring layout. `motion-reduce: active: scale-100` drops
  the scale for anyone who has asked for less movement; the colour change stays,
  because a colour change is not motion and removing it would leave those users with
  no press feedback at all.

  The focus ring is unchanged and still wins over both: `focus-visible: ring-2` with
  --ring, which the design system sets to a colour that clears 3:1 against the page
  in both themes.
*/
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        /* Same alpha-compositing trap as `secondary`, mirrored into the dark
           theme: `bg-destructive/80` pulled #F87272 towards the navy ground to
           #C86066 and left the dark label at 4.47:1, just under AA, while the
           identical class measured 4.72:1 in light. Mixed towards --foreground
           instead: light #991A1E 8.33:1, dark #F58B8D 7.53:1 at the active step. */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,hsl(var(--destructive))_90%,hsl(var(--foreground)))] active:bg-[color-mix(in_srgb,hsl(var(--destructive))_80%,hsl(var(--foreground)))]",
        outline:
          "border border-input bg-background hover:bg-muted hover:border-primary/50 active:bg-muted/70",
        /* Hover and active MIX TOWARDS --foreground rather than fading the fill
           with an alpha. An alpha composites against whatever is behind the
           button, which moves the fill in opposite directions in the two themes:
           on the light page `bg-secondary/80` lightened gold-700 #8C6F22 to
           #A28B4E and dropped the white label to 3.31:1, with /70 at 2.80:1, 
           both under AA, while the same two classes measured 7.57:1 and 6.06:1
           in dark, so the bug was invisible in the theme most people develop in.
           Mixing towards the foreground darkens the fill in light and lightens
           it in dark, i.e. it always moves AWAY from --secondary-foreground:
             light  hover #7D6423 5.65:1 · active #715C24 6.44:1
             dark   hover #E5D29B 11.78:1 · active #E5D5A6 12.10:1 */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,hsl(var(--secondary))_88%,hsl(var(--foreground)))] active:bg-[color-mix(in_srgb,hsl(var(--secondary))_78%,hsl(var(--foreground)))]",
        ghost: "hover:bg-muted hover:text-foreground active:bg-muted/70",
        link: "text-primary underline-offset-4 hover:underline active:opacity-70",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false,...props }, ref) => {
    const Comp = asChild ? Slot: "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
)
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

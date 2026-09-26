import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      /*
        THE HOVER STATE IS A COLOUR CHANGE, NOT AN UNDERLINE.

        shadcn ships `hover:underline` here. Both of this site's call sites,
        FaqSection (embedded on the home page, /contact, /eduflow, /internship,
        /pricing and /services) and /faq itself, then pass `hover:no-underline`,
        because an underline under a 16px display-face question reads as a link
        rather than as a control, and the question is not a link. tailwind-merge
        resolves that in the call site's favour, so the net effect on all seven
        pages was a button with NO hover state at all: measured in Chrome by
        hovering every interactive element and diffing the computed colour,
        background, border, text-decoration, opacity, transform and box-shadow,
        all five accordion triggers on the home page came back byte-identical
        before and after, and they were the only elements on the page that did.

        `hover:text-primary` is the change the rest of the site already uses for
        "this row answers the pointer" (--primary is navy 12.18:1 in light, gold
        7.77:1 in dark, so it clears AA as body text in both), plus an `active:`
        step so a tap on a phone, where there is no hover at all, is
        acknowledged before the panel opens. The chevron follows the text colour
        on its own because it is `currentColor`.

        The focus ring is untouched: it comes from the :where() rule in
        index.css and is the same gold ring as everything else.
      */
      className={cn(
        "flex flex-1 items-center justify-between gap-4 py-4 text-left font-medium",
        "transition-colors duration-200 hover:text-primary active:text-primary/80",
        "[&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

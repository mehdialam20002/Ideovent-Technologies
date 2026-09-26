import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export default function Testimonials() {
  const items = useCollection("testimonials").filter((t) => t.featured);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const go = useCallback(
    (d: number) => {
      setDir(d);
      setIndex((i) => (i + d + items.length) % items.length);
    },
    [items.length]
  );

  /*
    NO AUTOPLAY. This used to advance itself every 6.5 seconds.

    The array is empty today (_assets/FACTS.md: the four testimonials that were
    here were invented and illustrated with stock photographs), so the component
    returns null and nobody has seen the bug. It is fixed now rather than later,
    because the day a real quote arrives is the day this renders in production
    with whatever it was left holding.

    Two things were wrong with the timer. It is a WCAG 2.2.2 failure: content
    that changes automatically, for longer than five seconds, beside other
    content, with no way to pause it. And a quote that swaps itself out while it
    is being read is worse than one that waits: a testimonial is the one thing on
    a page a visitor reads slowly.

    The arrows and the dots stay. A reader who wants the next one asks for it.
  */

  if (!items.length) return null;
  const t = items[index];

  return (
    <section className="section relative overflow-hidden">
      <div className="container-page">
        <SectionHeading eyebrow="Kind words" title={<>Loved by the teams <span className="accent-italic text-gradient">we build with</span></>} />

        <div className="relative mx-auto mt-14 max-w-3xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 p-8 md:p-12 bg-spotlight">
            <Quote className="h-10 w-10 text-primary/40" />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.blockquote
                key={t.id}
                custom={dir}
                initial={{ opacity: 0, x: dir * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -16 }}
                className="mt-4"
              >
                <div className="mb-4 flex gap-1 text-primary">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="font-display text-xl leading-relaxed md:text-2xl">“{t.quote}”</p>
                <footer className="mt-6 flex items-center gap-3">
                  <img src={t.authorPhoto.src} alt={t.authorPhoto.alt || t.authorName} className="h-12 w-12 rounded-full object-cover" loading="lazy" />
                  <div>
                    <div className="font-medium">{t.authorName}</div>
                    <div className="text-sm text-muted-foreground">
                      {t.authorPosition}
                      {t.authorCompany ? `, ${t.authorCompany}` : ""}
                    </div>
                  </div>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button onClick={() => go(-1)} aria-label="Previous" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors duration-200 hover:border-primary/50 hover:text-primary active:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  aria-label={`Go to testimonial ${i + 1}`}
                  onClick={() => {
                    setDir(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                  aria-current={i === index ? "true" : undefined}
                  /* The DOT stays 8px; the BUTTON is 24px tall with the dot drawn
                     by ::before, so the target clears WCAG 2.5.8 without the design
                     growing a row of fat pills. */
                  className={cn(
                    "flex h-6 items-center justify-center rounded-full",
                    "before:block before:h-2 before:rounded-full before:transition-[width,background-color] before:duration-200",
                    i === index ? "w-6 before:w-6 before:bg-primary" : "w-4 before:w-2 before:bg-border hover:before:bg-muted-foreground"
                  )}
                />
              ))}
            </div>
            <button onClick={() => go(1)} aria-label="Next" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors duration-200 hover:border-primary/50 hover:text-primary active:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

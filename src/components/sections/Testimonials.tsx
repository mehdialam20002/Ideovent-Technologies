import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % items.length);
    }, 6500);
    return () => clearInterval(id);
  }, [items.length]);

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
                initial={{ opacity: 0, x: dir * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -30 }}
                transition={{ duration: 0.4 }}
                className="mt-4"
              >
                <div className="mb-4 flex gap-1 text-primary">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="font-display text-xl leading-relaxed md:text-2xl">"{t.quote}"</p>
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
            <button onClick={() => go(-1)} aria-label="Previous" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary/50 hover:text-primary">
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
                  className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-2 bg-border")}
                />
              ))}
            </div>
            <button onClick={() => go(1)} aria-label="Next" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary/50 hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

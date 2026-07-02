import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Star } from "lucide-react";
import { useSingleton, useCollection } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { staggerContainer, revealItem, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Hero() {
  const home = useSingleton("home");
  const stats = useCollection("stats");
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
      <Aurora />
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

      <div className="container-page relative">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Eyebrow>{home.badge}</Eyebrow>
          </motion.div>

          <motion.h1
            variants={reduce ? undefined : staggerContainer(0.12, 0.1)}
            initial={reduce ? undefined : "hidden"}
            animate={reduce ? undefined : "show"}
            className="mt-6 text-hero font-display font-semibold"
          >
            {home.headingLines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-1">
                <motion.span variants={reduce ? undefined : revealItem} className="inline-block">
                  {line.highlighted ? <span className="accent-italic text-gradient">{line.text}</span> : line.text}{" "}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.5 }} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
            {home.subheading}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.6 }} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {home.ctas.map((cta) => (
              <CtaButton key={cta.label} cta={cta} />
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="flex -space-x-3">
              {home.socialProof.avatars.map((a, i) => (
                <img key={i} src={a.src} alt={a.alt || ""} className="h-9 w-9 rounded-full border-2 border-background object-cover" loading="lazy" />
              ))}
            </div>
            <div className="text-left text-sm">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground">
                {home.socialProof.line1} <span className="text-foreground">{home.socialProof.line2}</span>
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 divide-x divide-border overflow-hidden rounded-3xl border border-border bg-card/40 backdrop-blur md:grid-cols-4"
        >
          {stats.map((s, i) => (
            <div key={s.id} className={cn("flex flex-col items-center gap-1 px-4 py-6 text-center", i >= 2 && "border-t border-border md:border-t-0")}>
              <span className="font-display text-3xl font-semibold md:text-4xl">
                {s.value}
                {s.suffix}
              </span>
              <span className="text-xs text-muted-foreground md:text-sm">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-muted-foreground md:block">
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </div>
    </section>
  );
}

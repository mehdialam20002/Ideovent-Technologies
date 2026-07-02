import { motion } from "framer-motion";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { staggerContainer, fadeUp } from "@/lib/motion";

export default function ProcessSection() {
  const steps = useCollection("process");

  return (
    <section className="section relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
      <div className="container-page">
        <SectionHeading
          eyebrow="How we work"
          title={<>A process built for <span className="accent-italic text-gradient">momentum</span></>}
          subtitle="Clear, collaborative and fast. You always know what's happening and what's next."
        />

        <motion.ol variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <motion.li key={step.id} variants={fadeUp} className="relative rounded-3xl border border-border bg-card/50 p-7 hover-lift">
              <span className="font-display text-5xl font-semibold text-primary/20">{step.number}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

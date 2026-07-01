import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function ServicesGrid({ homeOnly = false, showHeading = true }: { homeOnly?: boolean; showHeading?: boolean }) {
  const all = useCollection("services");
  const services = homeOnly ? all.filter((s) => s.showOnHome) : all;

  return (
    <section id="services" className="section relative">
      <div className="container-page">
        {showHeading && (
          <SectionHeading
            eyebrow="What we do"
            title={<>Services that turn ideas into <span className="accent-italic text-gradient">digital reality</span></>}
            subtitle="From first pixel to production, we cover the full stack of building a modern brand online."
          />
        )}

        <motion.div
          variants={staggerContainer(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className={cn("mt-14 grid gap-4", "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}
        >
          {services.map((s, i) => {
            const Icon = getIcon(s.icon);
            const featured = i === 0;
            return (
              <motion.div key={s.id} variants={fadeUp} className={cn(featured && "sm:col-span-2 lg:col-span-1")}>
                <Link
                  to={`/services/${s.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card/60 p-7 transition-all duration-300 hover:border-primary/40 hover:bg-card"
                >
                  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.shortDescription}</p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
                    Explore
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {homeOnly && (
          <Reveal className="mt-10 text-center">
            <Link to="/services" className="link-underline text-sm font-medium text-muted-foreground hover:text-foreground">
              View all services →
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

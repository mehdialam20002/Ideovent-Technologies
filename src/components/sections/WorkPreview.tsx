import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function WorkPreview() {
  const projects = useCollection("projects").filter((p) => p.featured).slice(0, 4);

  return (
    <section className="section relative">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow="Selected work"
            title={<>Projects we're <span className="accent-italic text-gradient">proud of</span></>}
            subtitle="A glimpse of what we've shipped — from marketing sites to real-time products."
          />
          <Link to="/work" className="link-underline shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground">
            All projects →
          </Link>
        </div>

        <motion.div variants={staggerContainer(0.09)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {projects.map((p, i) => (
            <motion.div key={p.id} variants={fadeUp} className={cn(i % 3 === 0 && "md:row-span-1")}>
              <Link to={`/work/${p.slug}`} className="group block overflow-hidden rounded-3xl border border-border bg-card/40">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={p.coverImage} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full border border-border bg-background/70 px-3 py-1 text-xs capitalize backdrop-blur">{p.category}</span>
                </div>
                <div className="flex items-start justify-between gap-4 p-6">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{p.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.technologies.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from "framer-motion";
import { Sparkles, Zap, Handshake, ShieldCheck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Aurora } from "@/components/ui/aurora";
import { CtaButton } from "@/components/ui/cta-button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Reveal } from "@/components/motion/Reveal";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

const VALUES = [
  {
    icon: Sparkles,
    title: "Craft",
    description:
      "Every pixel, interaction and line of code is considered. We sweat the details so the work feels effortless.",
  },
  {
    icon: Zap,
    title: "Speed",
    description:
      "A small, focused team means fewer hand-offs and faster shipping — momentum without the bloat.",
  },
  {
    icon: Handshake,
    title: "Partnership",
    description:
      "We work alongside you, not just for you. Your goals become ours, and we stay invested past launch.",
  },
  {
    icon: ShieldCheck,
    title: "Transparency",
    description:
      "Honest timelines, clear pricing and no jargon. You always know where a project stands and why.",
  },
];

export default function About() {
  const stats = useCollection("stats");
  const team = useCollection("team").filter((t) => t.visible);
  const milestones = useCollection("milestones");

  return (
    <Layout>
      <Seo
        title="About"
        description="Ideovent Technologies is a design-led digital studio founded in 2024 in Deoria, Uttar Pradesh. Meet the team building thoughtful websites, apps and brands."
        path="/about"
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <Eyebrow>About us</Eyebrow>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-6 text-hero font-display font-semibold">
                A small studio with{" "}
                <span className="accent-italic text-gradient">big craft</span>
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
                Ideovent Technologies is a design-led digital studio founded in 2024 in
                Deoria, Uttar Pradesh. We're a young, growing team building websites, apps
                and brands for people who care about the details. No inflated promises —
                just honest work, done well, and delivered with care.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Mission & Values ─────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
        <div className="container-page">
          <SectionHeading
            eyebrow="What we stand for"
            title={
              <>
                Values that shape{" "}
                <span className="accent-italic text-gradient">everything we make</span>
              </>
            }
            subtitle="We're here to build trust as much as software. These are the principles we keep coming back to."
          />

          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  variants={fadeUp}
                  className="card-surface p-7 hover-lift"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold">{value.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────── */}
      {stats.length > 0 && (
        <section className="section pt-0">
          <div className="container-page">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 bg-spotlight p-8 md:p-12">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.id} className="text-center">
                      <div className="font-display text-4xl font-semibold text-foreground md:text-5xl">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Team ─────────────────────────────────────────── */}
      {team.length > 0 && (
        <section className="section relative overflow-hidden">
          <div className="container-page">
            <SectionHeading
              eyebrow="The people"
              title={
                <>
                  Meet the team behind{" "}
                  <span className="accent-italic text-gradient">the work</span>
                </>
              }
              subtitle="A tight-knit crew of designers and developers who genuinely enjoy building together."
            />

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {team.map((member) => (
                <motion.article
                  key={member.id}
                  variants={fadeUp}
                  className="group card-surface overflow-hidden hover-lift"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {member.photo?.src && (
                      <img
                        src={member.photo.src}
                        alt={member.photo.alt || member.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-lg font-semibold">{member.name}</h3>
                    <p className="text-sm font-medium text-primary">{member.role}</p>
                    {member.bio && (
                      <p className="mt-3 text-sm text-muted-foreground">{member.bio}</p>
                    )}
                    {member.socials?.length > 0 && (
                      <div className="mt-5 flex items-center gap-3">
                        {member.socials.map((social) => {
                          const Icon = getIcon(social.icon);
                          return (
                            <a
                              key={social.url}
                              href={social.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`${member.name} on ${social.platform}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                            >
                              <Icon className="h-4 w-4" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Milestones timeline ──────────────────────────── */}
      {milestones.length > 0 && (
        <section className="section relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-dots opacity-40" aria-hidden />
          <div className="container-page">
            <SectionHeading
              eyebrow="Our journey"
              title={
                <>
                  Small steps, building{" "}
                  <span className="accent-italic text-gradient">something real</span>
                </>
              }
              subtitle="We're just getting started. Here's the story so far."
            />

            <div className="relative mx-auto mt-16 max-w-4xl">
              {/* Center line (desktop) / left line (mobile) */}
              <div
                aria-hidden
                className="absolute top-0 bottom-0 left-4 w-px bg-border md:left-1/2 md:-translate-x-1/2"
              />

              <div className="space-y-10 md:space-y-16">
                {milestones.map((milestone, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <Reveal key={milestone.id} amount={0.3}>
                      <div className="relative pl-12 md:grid md:grid-cols-2 md:items-center md:gap-12 md:pl-0">
                        {/* Node dot */}
                        <span
                          aria-hidden
                          className="absolute left-4 top-2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background md:left-1/2 md:top-1/2 md:-translate-y-1/2"
                        />

                        <div
                          className={cn(
                            "md:col-start-1",
                            isLeft
                              ? "md:pr-12 md:text-right"
                              : "md:col-start-2 md:pl-12 md:text-left"
                          )}
                        >
                          <div className="card-surface p-6 hover-lift">
                            <span className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                              {milestone.year}
                            </span>
                            <h3 className="mt-2 font-display text-xl font-semibold">
                              {milestone.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 bg-spotlight px-6 py-16 text-center md:px-12 md:py-20">
              <Aurora className="opacity-70" />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-display font-display font-semibold">
                  Let's build{" "}
                  <span className="accent-italic text-gradient">something great</span>{" "}
                  together
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
                  Have a project in mind, or just want to say hello? We'd love to hear what
                  you're working on.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <CtaButton cta={{ label: "Start a conversation", href: "/contact" }} />
                  <CtaButton
                    cta={{ label: "See our work", href: "/work", variant: "outline" }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}

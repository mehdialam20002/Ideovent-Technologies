import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import Hero from "@/components/sections/Hero";
import ServicesGrid from "@/components/sections/ServicesGrid";
import WorkPreview from "@/components/sections/WorkPreview";
import ProcessSection from "@/components/sections/ProcessSection";
import Testimonials from "@/components/sections/Testimonials";
import FaqSection from "@/components/sections/FaqSection";
import ContactForm from "@/components/sections/ContactForm";
import { Marquee } from "@/components/ui/marquee";

const TECH = ["React", "TypeScript", "Next.js", "Node.js", "Tailwind CSS", "Framer Motion", "WordPress", "React Native", "Figma", "Supabase"];

export default function Index() {
  return (
    <Layout>
      <Seo path="/" />
      <Hero />

      <div className="border-y border-border/60 py-6">
        <Marquee duration={30}>
          {TECH.map((t) => (
            <span key={t} className="mx-8 font-display text-lg font-medium text-muted-foreground/70">{t}</span>
          ))}
        </Marquee>
      </div>

      <ServicesGrid homeOnly />
      <WorkPreview />
      <ProcessSection />
      <Testimonials />
      <FaqSection category="services" />
      <ContactForm sourcePage="home" />
    </Layout>
  );
}

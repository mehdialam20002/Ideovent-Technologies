import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { useSingleton } from "@/lib/cms/context";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import ContactForm from "@/components/sections/ContactForm";
import FaqSection from "@/components/sections/FaqSection";

export default function Contact() {
  const contact = useSingleton("contact");

  return (
    <Layout>
      <Seo
        title="Contact"
        description="Let's talk. Get in touch with Ideovent Technologies to discuss your project — we usually reply within one business day."
        path="/contact"
      />

      {/* 1. Hero */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-24">
        <Aurora />
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" aria-hidden />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>Contact</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-hero font-display font-semibold">
                Let's <span className="accent-italic text-gradient">talk</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
                Tell us about your idea and we'll help you shape it into something real.{" "}
                {contact.responseTimePromise || "We usually reply within one business day."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. Contact form + NAP cards */}
      <ContactForm sourcePage="contact" />

      {/* 3. Map */}
      {contact.mapEmbedUrl && (
        <section className="section pt-0">
          <div className="container-page">
            <SectionHeading
              align="center"
              eyebrow="Find us"
              title={
                <>
                  Come say <span className="accent-italic text-gradient">hello</span>
                </>
              }
              subtitle="Drop by our office, or reach out — whatever's easiest for you."
            />
            <Reveal className="mt-12">
              <iframe
                src={contact.mapEmbedUrl}
                title="Office location"
                className="w-full h-[380px] rounded-3xl border border-border"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* 4. FAQ (self-hides when empty) */}
      <FaqSection category="general" heading={true} />
    </Layout>
  );
}

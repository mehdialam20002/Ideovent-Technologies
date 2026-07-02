import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FaqSection({ category, heading = true }: { category?: string; heading?: boolean }) {
  const all = useCollection("faqs");
  const faqs = category ? all.filter((f) => f.category === category) : all;
  if (!faqs.length) return null;

  return (
    <section className="section">
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {heading && (
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title={<>Questions? <span className="accent-italic text-gradient">Answered.</span></>}
            subtitle="Everything you might want to know before we start working together."
          />
        )}
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id} className="border-border">
                <AccordionTrigger className="text-left font-display text-base font-medium hover:no-underline">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

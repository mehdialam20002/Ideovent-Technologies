import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FaqSection({
  category,
  heading = true,
  showAllLink = true,
}: { category?: string; heading?: boolean; showAllLink?: boolean }) {
  const all = useCollection("faqs");
  const faqs = category ? all.filter((f) => f.category === category): all;
  if (!faqs.length) return null;

  return (
    <section className="section">
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {heading && (
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            /* Weight contrast, not the serif accent: this block is embedded on
               the home page, /services and /pricing, so an accent here would be
               charged against three pages' budget of two. */
            title={<><span className="font-light">Questions,</span> <span className="font-extrabold">answered</span></>}
            subtitle="What principals and owners ask us first. The answers match the agreement you sign."
          />
)}
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id} className="border-border">
                <AccordionTrigger className="font-display text-base font-medium">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
))}
          </Accordion>

          {/*
            /faq had exactly one inbound link in the whole of src/: the footer.
            This section is embedded on the home page, /services and /pricing and
            shows only the FAQs in one category, so on every one of those pages a
            visitor reads a partial list with no way to the rest. `showAllLink` is
            off on /faq itself, where it would point at the page you are already on.
          */}
          {showAllLink && (
            <Link
              to="/faq"
              className="group mt-8 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-5 text-sm
                         font-medium transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
            >
              Every question we get asked
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
            </Link>
)}
        </Reveal>
      </div>
    </section>
);
}

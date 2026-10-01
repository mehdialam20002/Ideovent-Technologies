import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCollection } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { FaqList } from "@/components/ui/faq-list";

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
            /* Plain since 1 Oct 2026: one weight, no accent. */
            title="Questions, answered"
            subtitle="What owners ask us first. The answers match the agreement you sign."
          />
)}
        <Reveal>
          {/* Native <details>: every answer is in the page's HTML, closed or
              open. The Radix accordion rendered only the open one, so none of
              these answers could be read by a search engine. See ui/faq-list. */}
          <FaqList faqs={faqs} />

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
              className="group mt-8 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-5 text-sm
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

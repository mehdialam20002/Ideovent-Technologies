import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Questions and answers as native <details>/<summary> (1 Oct 2026).
 *
 * WHY NOT THE RADIX ACCORDION ANY MORE. Radix renders an answer only while it is
 * open, so the rendered page held 0 of 25 answers on /faq and 0 of 10 on the home
 * page and /pricing (measured by the SEO audit of 1 Oct 2026). The answers are the
 * text that best matches what buyers type ("how much does a website cost", "do I
 * own the website"), and Google's FAQPage rules require marked-up answers to be
 * visible on the page. A closed <details> keeps its answer in the HTML, opens
 * without JavaScript, and brings keyboard and screen-reader behaviour with it.
 * Radix's mount-time measuring was also the largest single piece of script work
 * on the home page's first render.
 *
 * Several can be open at once, which is how people actually compare answers.
 */
export function FaqList({
  faqs,
  className,
}: {
  faqs: { id: string; question: string; answer: string }[];
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {faqs.map((f) => (
        <details key={f.id} className="group border-b border-border">
          {/*
            list-none + the ::-webkit-details-marker rule hide the browser's own
            triangle; the chevron is the marker. The hover and active colours are
            the accordion's (see ui/accordion.tsx): a colour change, not an
            underline, because the question is a control and not a link.
          */}
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-display text-base font-medium",
              "transition-colors duration-200 hover:text-primary active:text-primary/80 [&::-webkit-details-marker]:hidden",
            )}
          >
            <span>{f.question}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="pb-4 text-sm text-muted-foreground text-pretty">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}

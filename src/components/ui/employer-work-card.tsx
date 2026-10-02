import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { ProjectCover, employerCredit } from "@/components/ui/project-cover";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/cms/types";

/**
 * Mehdi Alam's work for an employer (WTF Go, built at Witness The Fitness Pvt.
 * Ltd.), as a full-width horizontal card. Used by /work and by the home page's
 * work section, where it comes FIRST since 2 Oct 2026 (Mehdi: "project me
 * wtfgos.com ko phle dikhao"; seed.ts gives it order 0).
 *
 * It is not a variant of a client card and must not become one. FACTS.md's
 * attribution rule is the whole design brief: this work belongs to the company
 * that employed him, and a reader who glances at the card for one second has to
 * come away with the employer's name, not ours. So the employer is the largest
 * type in the card (larger than the product), and the sentence that says it is
 * not a client project sits directly under it rather than lower down in a
 * clamped summary. It never uses the word "client" about the product.
 *
 * The live address is its own link, a sibling of the case-study link and above
 * it in the stacking order, because an anchor inside an anchor is invalid. The
 * case-study link stretches over the whole card with ::after, so the card stays
 * one click target, as it was when the whole card was a single <Link>.
 */
export function EmployerWorkCard({ project: p, className }: { project: Project; className?: string }) {
  const employer = (p.clientName ?? "").split(/,\s/)[0].trim();
  const address = p.liveUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-dashed border-primary/45 bg-primary/[0.04] transition-colors duration-200 hover:border-primary/70 motion-reduce:transition-none",
        className
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* A screenshot keeps 16:10 on a phone. The text-only panel (no screenshot
            until the employer agrees in writing) takes the height its words need
            instead: at 16:10 on a 390px phone the reason was cut off mid-sentence. */}
        <div
          className={cn(
            "relative overflow-hidden lg:col-span-5 lg:aspect-auto lg:min-h-[19rem]",
            p.coverImage && "aspect-[16/10]"
          )}
        >
          <ProjectCover
            src={p.coverImage}
            title={p.title}
            slot="showcase"
            panel="tall"
            noImageReason={p.noImageReason}
            attribution={employerCredit(p)}
            liveUrl={p.liveUrl}
            className="group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>

        <div className="lg:col-span-7 p-7 md:p-10">
          <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
            Built by Mehdi Alam while employed at
          </p>
          <p className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">
            {employer || p.clientName}
          </p>
          <p className="mt-3 max-w-xl text-sm text-foreground/80 text-pretty">
            This is his professional work for that company. It is not an Ideovent client project,
            we did not deliver it as a firm, and it is not for sale here.
          </p>

          <div className="mt-6 border-t border-border/60 pt-6">
            <h3 className="font-display text-lg font-semibold md:text-xl">{p.title}</h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground text-pretty">{p.summary}</p>
            {p.technologies?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.technologies.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {address && p.liveUrl && (
                <a
                  href={p.liveUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="relative z-10 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/60 px-4
                             font-mono text-xs text-foreground transition-colors duration-200 hover:border-primary/60 hover:bg-muted active:bg-muted/70"
                >
                  {address}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </a>
              )}
              <Link
                to={`/work/${p.slug}`}
                aria-label={`${p.title}: read what it was`}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary after:absolute after:inset-0 after:content-['']"
              >
                Read what it was
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

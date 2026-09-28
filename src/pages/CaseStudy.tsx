import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ExternalLink, FolderSearch, Info } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { Aurora } from "@/components/ui/aurora";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CtaButton } from "@/components/ui/cta-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCover, employerCredit, monogram } from "@/components/ui/project-cover";
import { FullPageCapture, fullCaptureFor, CAPTURED_ON } from "@/components/ui/full-page-capture";
import { useCms, useCollection } from "@/lib/cms/context";
import { sanitizeRich } from "@/lib/sanitize";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/cms/types";

export default function CaseStudy() {
  const { slug } = useParams();
  const projects = useCollection("projects");
  const project = projects.find((p) => p.slug === slug) as Project | undefined;
  const { loading } = useCms();

  // A project added in /admin lives only in the store's rows, so until load()
  // answers it would read as "not found". Hold a quiet placeholder instead.
  if (!project && loading) return <Layout><div className="min-h-[60vh]" aria-busy="true" /></Layout>;

  if (!project) {
    return (
      <Layout>
        {/* noindex: this page returns HTTP 200, so a retired or mistyped
            /work/* URL would otherwise be indexed as a duplicate soft 404. */}
        <Seo title="Project not found" path="/work" noindex />
        <EmptyState
          tone="page"
          headingAs="h1"
          eyebrow="Case study"
          icon={<FolderSearch className="h-5 w-5" aria-hidden="true" />}
          title={
            <>
              We could not find that <span className="accent-italic">project.</span>
            </>
          }
          body="The case study may have been renamed, or the project may have come off the site. Every project we can show is on one page."
          action={{ label: "All selected work", href: "/work" }}
          links={[
            { label: "What we build", to: "/services" },
            { label: "Prices", to: "/pricing" },
          ]}
        />
      </Layout>
);
  }

  // Other projects for the "more work" band (prefer siblings in the same category).
  const others = projects.filter((p) => p.slug !== project.slug);
  const sameCategory = others.filter((p) => p.category === project.category);
  const moreWork = (sameCategory.length >= 2 ? sameCategory: others).slice(0, 3);

  // Employer work (e.g. WTF Go, built by our founder while employed at Witness
  // The Fitness Pvt. Ltd.) is NOT an Ideovent client project. The template must
  // not label the employer as a "Client" or say that "we delivered" it: the
  // attribution in the summary would be contradicted by the chrome around it.
  const isEmployerWork = project.category.toLowerCase() === "employer work";

  const hasResults = Array.isArray(project.results) && project.results.length > 0;
  const hasGallery = Array.isArray(project.gallery) && project.gallery.length > 0;

  // The two honest-framing blocks every case study in 06-portfolio/case-studies
  // ends with. `evidence` is the "true, with nothing to measure" list, binary
  // facts a reader can check in fifteen seconds. `noClaims` says out loud which
  // numbers belong to the client and which outcomes we are NOT taking credit
  // for. Together they are what stands in for a results band we have not earned:
  // every `results` array on this site is empty, because nothing has been
  // measured and no client has supplied a figure.
  const hasEvidence = Array.isArray(project.evidence) && project.evidence.length > 0;
  const hasHonestyPanel = hasEvidence || Boolean(project.noClaims);

  /**
   * The "at a glance" card mirrors the four-cell meta grid every written case
   * study in 06-portfolio/case-studies opens with. Sector, Engagement, Surface
   * and "Live at" / "Deployed at". The engagement line is DERIVED from the
   * category rather than typed per project, so there is no way to publish
   * employer work, or one of our own products, wearing a client-shaped label.
   */
  const isOwnProduct = project.category.toLowerCase() === "product";
  const engagement = isEmployerWork
    ? "A partner’s own employment: not a client"
: isOwnProduct
      ? "Ours. Nobody paid us to build it"
: "Paid client work";

  /** The whole-page screenshot, where the image pipeline has built one. */
  const fullCapture = fullCaptureFor(project.coverImage);
  /** "HighQ Classes. Coaching Institute Website" → "HighQ Classes". */
  const shortName = project.title.split(/[.,]\s/)[0].trim();

  /**
   * The employer's name, for employer work only.
   *
   * `clientName` reads "Witness The Fitness Pvt. Ltd., founder's employment";
   * everything after the dash is a note to us, so only the employer is printed.
   *
   * It falls back to the raw field because `clientName` is an editable CMS
   * field: cleared or left as a bare dash, the naive split returns "" and this
   * page would render the label "Built at" with nothing under it and emit
   * `name: ""` into the JSON-LD: an attribution that silently vanished, which
   * is the one failure this whole treatment exists to prevent. Work.tsx's
   * EmployerWorkCard and employerCredit() already guard the same way.
   */
  const employerName = isEmployerWork
    ? (project.clientName ?? "").split(/,\s/)[0].trim() || (project.clientName ?? "").trim()
: "";

  return (
    <Layout>
      <Seo
        title={project.title}
        description={project.summary}
        path={`/work/${project.slug}`}
        /* Four projects have no screenshot on file (HighQ Classes, and the two
           tools that sit behind a login). They fall back to the generated work
           card rather than to a stock photograph, FACTS.md forbids using one
           to stand for a project. And never to another project's cover. */
        image={project.coverImage || "/og/ideovent-og-work.png"}
        type="article"
        breadcrumbs={[
          { name: "Work", path: "/work" },
          { name: project.title, path: `/work/${project.slug}` },
        ]}
        schema={{
          "@type": "CreativeWork",
          name: project.title,
          description: project.summary,
...(project.coverImage ? { image: project.coverImage }: {}),
          inLanguage: "en-IN",
...(project.liveUrl ? { url: project.liveUrl }: {}),
...(project.technologies?.length ? { keywords: project.technologies.join(", ") }: {}),
          /* Employer work (WTF Go) was built by our founder while employed at
             Witness The Fitness Pvt. Ltd. The attribution has to survive into
             the machine-readable layer too, so Ideovent is NOT named as the
             creator or publisher of it.

             When employer work carries no usable employer name, this emits
             NEITHER a publisher nor a creator. An empty `name: ""` is a broken
             record, and falling through to "creator: Ideovent Technologies"
             would be the exact false claim the branch exists to avoid. So the
             correct machine-readable answer is to say nothing at all. */
...(isEmployerWork
            ? employerName
              ? {
                  publisher: { "@type": "Organization", name: employerName },
                  creditText: project.clientName,
                }
: {}
: { creator: { "@type": "Organization", name: "Ideovent Technologies" } }),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 md:pt-32">
        <Aurora className="opacity-70" />
        <div className="container-page relative">
          {/* Breadcrumb */}
          <Reveal>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/work" className="link-underline hover:text-foreground">
                Work
              </Link>
              <span aria-hidden className="text-muted-foreground/70">/</span>
              <span className="truncate text-foreground">{project.title}</span>
            </nav>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Reveal>
                <span className="inline-flex items-center rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {project.category}
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] md:text-6xl">
                  {project.title}
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">{project.summary}</p>
              </Reveal>
            </div>

            <div className="lg:col-span-4">
              <Reveal delay={0.15}>
                <div
                  className={cn(
                    "card-surface rounded-3xl border p-6",
                    // Employer work gets different chrome, not the client card
                    // in a different colour. FACTS.md is explicit that the
                    // founder's work for an employer must never read as an
                    // Ideovent client project, and a reader who looks only at
                    // this box has to come away knowing that.
                    isEmployerWork
                      ? "border-dashed border-primary/50 bg-primary/5"
: "border-border bg-card/60"
)}
                >
                  <dl>
                    {/* "Built at <employer>" is only rendered when there IS an
                        employer to name. A label with an empty value under it
                        reads as a load failure, and on this card specifically
                        it would be an attribution that disappeared. The
                        Engagement row below always states the relationship in
                        words, so nothing is lost when this one is absent. */}
                    {(!isEmployerWork || employerName) && (
                      <div>
                        <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                          {isEmployerWork ? "Built at": isOwnProduct ? "Built by": "Project"}
                        </dt>
                        <dd className="mt-1.5 font-display text-xl font-semibold leading-snug">
                          {isEmployerWork
                            ? employerName
: isOwnProduct
                              ? "Ideovent Technologies"
: project.clientName || shortName}
                        </dd>
                      </div>
)}

                    {/* The divider belongs to the row ABOVE this one, so it is
                        dropped when that row is not rendered, otherwise the
                        card opens on a stray hairline. */}
                    <div
                      className={cn(
                        !isEmployerWork || employerName
                          ? "mt-4 border-t border-border/60 pt-4"
: undefined
)}
                    >
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        Engagement
                      </dt>
                      <dd className="mt-1.5 text-sm font-medium text-foreground/90 text-pretty">
                        {engagement}
                      </dd>
                    </div>

                    {project.sector && (
                      <div className="mt-4 border-t border-border/60 pt-4">
                        <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                          Sector
                        </dt>
                        <dd className="mt-1.5 text-sm text-muted-foreground">{project.sector}</dd>
                      </div>
)}

                    {/* "Live at", or, where there is no link, why there is no
                        link. A silently missing button reads as a project we
                        are hiding; a dead one is worse than both. This is the
                        slot the two dead HighQ Classes CTAs used to occupy. */}
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        {project.liveUrl ? "Live at": "No live link"}
                      </dt>
                      {project.liveUrl ? (
                        /* Stated, not linked. The "Visit live site" button is
                           40px below it and goes to the same place; two links
                           to one URL inside one card is noise. Naming the
                           address still does the work a bare button does not, 
                           a reader can see where they are being sent. */
                        <dd className="mt-1.5 break-all text-sm font-medium text-foreground/90">
                          {project.liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </dd>
): (
                        <dd className="mt-1.5 flex items-start gap-2 text-sm text-muted-foreground text-pretty">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span>
                            {project.noLiveUrlReason ??
                              "There is no public address we can send you to for this one."}
                          </span>
                        </dd>
)}
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {project.liveUrl && (
                      <CtaButton cta={{ label: "Visit live site", href: project.liveUrl, variant: "primary" }} />
)}
                    <CtaButton cta={{ label: "Start a project", href: "/contact", variant: project.liveUrl ? "outline": "primary" }} />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Cover */}
          <Reveal delay={0.1} className="mt-12">
            {project.coverImage ? (
              <>
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40">
                  {/* A screenshot gets a fixed 16:9 box so the page does not
                      jump while it loads. */}
                  <div className="relative aspect-[16/9]">
                    <ProjectCover
                      src={project.coverImage}
                      title={project.title}
                      slot="hero"
                      priority
                      noImageReason={project.noImageReason}
                      attribution={employerCredit(project)}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
                  </div>
                </div>
                {/* Say what the picture is and when it was taken. An undated
                    screenshot is a claim about the present tense that nobody
                    has checked. */}
                <p className="mt-3 text-xs text-muted-foreground text-pretty">
                  {fullCapture
                    ? `The top of the live page, captured on ${CAPTURED_ON}.`
: `${shortName}, captured on ${CAPTURED_ON}.`}
                </p>
              </>
): (
              /**
               * No screenshot. This is NOT the card's no-image panel stretched
               * to hero size. That panel is designed to sit under 3rem of card
               * chrome with its text at the foot, and at 1328x747 it became a
               * monogram in one corner and 500px of empty navy, which is
               * exactly the "failed to load" reading the whole treatment exists
               * to avoid.
               *
               * Four of eleven projects land here (HighQ Classes, HRMS Lite,
               * Lead CRM, this site, and WTF Go), so it has to be a layout in
               * its own right: the monogram as a graphic element, the reason
               * set as the largest body copy on the page, and a height that
               * follows the words instead of a ratio.
               */
              <div className="brand-navy-surface brand-navy-etch overflow-hidden rounded-3xl">
                <div className="grid gap-8 p-8 md:grid-cols-12 md:gap-10 md:p-12">
                  <div className="flex flex-col justify-between gap-6 md:col-span-4">
                    <span
                      aria-hidden
                      className="block font-display text-6xl font-semibold leading-none tracking-[0.06em] opacity-90 md:text-8xl"
                    >
                      {monogram(shortName)}
                    </span>
                    <div>
                      <p className="font-display text-xl font-semibold leading-snug md:text-2xl">
                        {shortName}
                      </p>
                      {employerCredit(project) && (
                        <p className="mt-1.5 text-sm font-medium opacity-90">
                          {employerCredit(project)}
                        </p>
)}
                    </div>
                  </div>
                  <div className="md:col-span-8 md:border-l md:border-white/15 md:pl-10">
                    <p className="text-[0.6875rem] uppercase tracking-[0.18em] opacity-70">
                      Why there is no screenshot
                    </p>
                    <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-pretty opacity-95 md:text-xl">
                      {project.noImageReason ??
                        "We do not have a picture of this one that we are able to publish."}
                    </p>
                  </div>
                </div>
              </div>
)}
          </Reveal>

          {/* The whole page, behind a toggle. Nothing is requested until a
              reader opens it, see full-page-capture.tsx. */}
          {fullCapture && (
            <Reveal delay={0.15} className="mt-5">
              <FullPageCapture capture={fullCapture} title={shortName} liveUrl={project.liveUrl} />
            </Reveal>
)}
        </div>
      </section>

      {/* Meta: technologies + results band */}
      <section className="section pt-16 md:pt-20">
        <div className="container-page">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Technologies */}
            <div className="lg:col-span-4">
              <Reveal>
                <Eyebrow>Stack</Eyebrow>
                <h2 className="mt-4 font-display text-2xl font-semibold">Technologies</h2>
                {project.technologies?.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm text-muted-foreground"
                      >
                        {tech}
                      </span>
))}
                  </div>
): (
                  <p className="mt-6 text-sm text-muted-foreground">Tailored to the brief.</p>
)}
              </Reveal>
            </div>

            {/* Results band */}
            {hasResults && (
              <div className="lg:col-span-8">
                <Reveal>
                  <div className="card-surface rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>Outcomes</Eyebrow>
                    <motion.div
                      variants={staggerContainer()}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.2 }}
                      className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {project.results.map((r, i) => (
                        <motion.div key={`${r.label}-${i}`} variants={fadeUp}>
                          <p className="font-display text-4xl font-semibold text-gradient md:text-5xl">{r.metric}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{r.label}</p>
                        </motion.div>
))}
                    </motion.div>
                  </div>
                </Reveal>
              </div>
)}

            {/* What can and cannot be claimed. This replaces the outcomes band
                rather than sitting beside it: a page that shows neither a
                measured number nor an explanation of why there isn't one reads
                as an omission, and a prospect notices. */}
            {!hasResults && hasHonestyPanel && (
              <div className="lg:col-span-8">
                <Reveal>
                  <div className="card-surface rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>What we can and cannot claim</Eyebrow>

                    {hasEvidence && (
                      <>
                        <h2 className="mt-4 font-display text-xl font-semibold md:text-2xl">
                          True, with nothing to{" "}
                          <span className="accent-italic text-gradient">measure</span>
                        </h2>
                        <ul className="mt-6 space-y-3">
                          {project.evidence!.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span className="text-pretty">{item}</span>
                            </li>
))}
                        </ul>
                      </>
)}

                    {project.noClaims && (
                      <p
                        className={cn(
                          "text-sm text-muted-foreground text-pretty",
                          hasEvidence ? "mt-7 border-t border-border/60 pt-6": "mt-6"
)}
                      >
                        {project.noClaims}
                      </p>
)}
                  </div>
                </Reveal>
              </div>
)}
          </div>
        </div>
      </section>

      {/* Try this. One concrete thing to go and look at on the live site.
          Only ever rendered next to a URL the reader can actually open. */}
      {project.tryThis && project.liveUrl && (
        <section className="pt-0">
          <div className="container-page">
            <Reveal>
              <div className="rounded-3xl border border-primary/40 bg-primary/5 p-8 md:p-10">
                <p className="text-xs uppercase tracking-widest text-primary">Try this</p>
                <p className="mt-3 max-w-3xl text-base text-foreground/90 text-pretty md:text-lg">
                  {project.tryThis}
                </p>
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group mt-5 inline-flex min-h-6 items-center gap-2 text-sm font-medium text-primary"
                >
                  Open {project.liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>
)}

      {/* Challenge & Solution */}
      {(project.challenge || project.solution) && (
        <section className="section pt-4">
          <div className="container-page">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              {project.challenge && (
                <Reveal>
                  <div className="card-surface h-full rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>The challenge</Eyebrow>
                    <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
                      {isEmployerWork ? "What it set out to ": "What we set out to "}
                      <span className="accent-italic text-gradient">solve</span>
                    </h2>
                    <p className="mt-5 text-pretty text-muted-foreground">{project.challenge}</p>
                  </div>
                </Reveal>
)}
              {project.solution && (
                <Reveal delay={0.05}>
                  <div className="card-surface h-full rounded-3xl border border-border bg-card/60 p-8 md:p-10">
                    <Eyebrow>{isEmployerWork ? "The build": "Our approach"}</Eyebrow>
                    <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
                      {isEmployerWork ? "How it was ": "How we "}
                      <span className="accent-italic text-gradient">{isEmployerWork ? "built": "delivered"}</span>
                    </h2>
                    <p className="mt-5 text-pretty text-muted-foreground">{project.solution}</p>
                  </div>
                </Reveal>
)}
            </div>

            {/* Optional long-form body (CMS HTML) */}
            {project.body && (
              // amount={0}: same reason as BlogDetail.tsx and Legal.tsx. Reveal's
              // default of 0.2 hides any block taller than 5 viewports forever.
              // Every project.body is empty today, so this has not bitten yet, 
              // it would the first time a long case study is written in /admin.
              <Reveal className="mt-10" amount={0}>
                <article
                  className="prose prose-invert max-w-3xl text-muted-foreground prose-headings:font-display prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeRich(project.body) }}
                />
              </Reveal>
)}
          </div>
        </section>
)}

      {/* Gallery */}
      {hasGallery && (
        <section className="section pt-4">
          <div className="container-page">
            <SectionHeading
              align="left"
              eyebrow="Gallery"
              title={<>A closer <span className="accent-italic text-gradient">look</span></>}
              subtitle="Selected screens and moments from the build."
            />
            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {project.gallery.map((img, i) => (
                <motion.div
                  key={`${img.src}-${i}`}
                  variants={fadeUp}
                  className={cn(
                    "group overflow-hidden rounded-3xl border border-border bg-card/40",
                    i % 3 === 0 && "sm:col-span-2"
)}
                >
                  <div className={cn("relative overflow-hidden", i % 3 === 0 ? "aspect-[16/9]": "aspect-[4/3]")}>
                    <img
                      src={img.src}
                      alt={img.alt || `${project.title} · image ${i + 1}`}
                      width={789}
                      height={735}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </div>
                </motion.div>
))}
            </motion.div>
          </div>
        </section>
)}

      {/* Live site CTA strip */}
      {project.liveUrl && (
        <section className="pt-4">
          <div className="container-page">
            <Reveal>
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex flex-col items-start justify-between gap-4 rounded-3xl border border-border bg-card/60 p-8 transition-colors hover:border-primary/50 sm:flex-row sm:items-center md:p-10"
              >
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">See it live</p>
                  <p className="mt-2 font-display text-xl font-semibold md:text-2xl">Explore {project.title} in the wild</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  Visit site <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            </Reveal>
          </div>
        </section>
)}

      {/* More work */}
      {moreWork.length > 0 && (
        <section className="section">
          <div className="container-page">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <SectionHeading
                align="left"
                eyebrow="Keep exploring"
                title={<>More <span className="accent-italic text-gradient">work</span></>}
                subtitle="Other projects you might want to see."
              />
              <Link
                to="/work"
                className="link-underline leading-6 shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                All projects →
              </Link>
            </div>

            <motion.div
              variants={staggerContainer()}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
            >
              {moreWork.map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <Link
                    to={`/work/${p.slug}`}
                    className="group block h-full overflow-hidden rounded-3xl border border-border bg-card/40"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <ProjectCover
                        src={p.coverImage}
                        title={p.title}
                        slot="card"
                        noImageReason={p.noImageReason}
                        attribution={employerCredit(p)}
                        className="group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full border border-border bg-background/70 px-3 py-1 text-xs capitalize backdrop-blur">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 p-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                        {/* Employer work carries its attribution unclamped, see Work.tsx. */}
                        {p.category.toLowerCase() === "employer work" && p.clientName && (
                          <p className="mt-1.5 text-xs font-medium text-primary">{p.clientName}</p>
)}
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
                      </div>
                      <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
))}
            </motion.div>

            <Reveal className="mt-12" delay={0.05}>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/work"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to all work
                </Link>
                <CtaButton cta={{ label: "Start a project", href: "/contact", variant: "primary" }} />
                <span className="hidden text-muted-foreground sm:inline">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Reveal>
          </div>
        </section>
)}
    </Layout>
);
}

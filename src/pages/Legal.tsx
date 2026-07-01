import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Reveal } from "@/components/motion/Reveal";
import { useSingleton } from "@/lib/cms/context";
import { sanitize } from "@/lib/sanitize";

/** Static legal pages (privacy policy / terms of service) rendered from CMS HTML. */
export default function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const legal = useSingleton("legal");
  const doc = legal[kind];
  const path = kind === "privacy" ? "/privacy" : "/terms";

  return (
    <Layout>
      <Seo title={doc.title} path={path} noindex />

      <section className="section">
        <div className="container-page">
          <Reveal>
            <article className="mx-auto max-w-3xl">
              <header className="mb-10 text-center">
                <h1 className="text-display font-display text-foreground">{doc.title}</h1>
                {doc.updatedAt && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Last updated {doc.updatedAt}
                  </p>
                )}
              </header>

              <div
                className="legal-prose max-w-3xl text-foreground/90 leading-relaxed [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitize(doc.body) }}
              />
            </article>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}

/**
 * STUDENT PORTAL. /portal
 *
 *   LINK CARDS ONLY to the institute's real portals (student app, parent
 *   app, test platform, fee payment). There is no login form here: a mock
 *   login would collect passwords under false pretences. Each card says it
 *   opens the institute's own site.
 */

import { Helmet } from "react-helmet-async";
import { ExternalLink } from "lucide-react";
import { tr, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { C_COPY } from "@/lib/demo/ui/coaching/copy";
import { PageHead } from "../kit/Hero";
import { Card, CardGrid, Section } from "../kit/Section";
import { Bi } from "../kit/Text";

const COPY = {
  title: { en: "Student and parent login", hi: "छात्र और अभिभावक लॉगिन" },
  crumb: { en: "Student portal", hi: "स्टूडेंट पोर्टल" },
  lead: { en: "Attendance, test results and fee receipts are on the institute's own portal. These links open it.", hi: "अटेंडेंस, टेस्ट रिज़ल्ट और फीस की रसीदें संस्थान के अपने पोर्टल पर हैं। ये लिंक उसे खोलते हैं।" },
  links: { en: "Portals", hi: "पोर्टल" },
} satisfies Record<string, Bilingual>;

export default function PortalPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const links = (site.portalLinks || []).filter((l) => (l.url || "").trim() && (l.label || "").trim());

  return (
    <>
      <Helmet><title>{`${tr(COPY.crumb, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.crumb, lang) }]}
      />
      <Section n={1} title={tr(COPY.links, lang)}>
        <CardGrid cols={links.length >= 3 ? 3 : 2}>
          {links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="block h-full">
              <Card interactive className="flex h-full flex-col">
                {l.audience && <Bi of={l} k="audience" as="p" className="text-sm font-semibold text-[hsl(var(--ds-accent))]" />}
                <Bi of={l} k="label" as="p" className="ds-display mt-1 flex items-center gap-2 text-xl" />
                <Bi of={l} k="note" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                <p className="mt-auto flex items-center gap-1 pt-4 text-sm text-[hsl(var(--ds-ink-soft))]"><ExternalLink className="h-4 w-4" aria-hidden="true" />{tr(C_COPY.opensSite, lang)}</p>
              </Card>
            </a>
          ))}
        </CardGrid>
      </Section>
    </>
  );
}

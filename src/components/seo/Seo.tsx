import { Helmet } from "react-helmet-async";
import { useCollection, useSingleton } from "@/lib/cms/context";
import {
  absolute,
  absolutizeUrls,
  breadcrumbNode,
  organizationNode,
  webSiteNode,
  ORG_ID,
  type Crumb,
  type Json,
} from "@/lib/seo/schema";

export type { Crumb };

interface SeoProps {
  title?: string;
  description?: string;
  /** Site-relative ("/og/x.png") or absolute. Made absolute before it is emitted. */
  image?: string;
  path?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /** Page-specific keywords. Falls back to the site defaults. */
  keywords?: string[];
  /** Trail BELOW Home. Home is prepended for you. */
  breadcrumbs?: Crumb[];
  /** Extra JSON-LD nodes merged into this page's @graph. */
  schema?: Json | Json[];
  /** ISO dates, articles only. */
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Per-route document head.
 *
 * This component OWNS the head. index.html ships the same tag names marked
 * `data-rh="true"` so that react-helmet-async adopts and removes them on
 * mount instead of leaving a second canonical / description / og:* behind, 
 * two canonicals with different values make Google discard the signal
 * entirely, which is worse than having none.
 */
export function Seo({
  title,
  description,
  image,
  path,
  type = "website",
  noindex,
  keywords,
  breadcrumbs,
  schema,
  publishedTime,
  modifiedTime,
}: SeoProps) {
  const settings = useSingleton("settings");
  const contact = useSingleton("contact");
  const socials = useCollection("socials");
  const d = settings.defaultSeo;
  const host = d.canonicalHost.replace(/\/$/, "");

  const fullTitle = title ? `${title} · ${settings.siteName}`: d.title;
  const desc = description || d.description;
  /* Everything under /og/ is a generated 1200x630 card, scripts/build_brand_assets.py
     builds every file in that folder to exactly that size from the real logo, so
     the dimensions below can be asserted for any of them. A blog cover or a case
     study screenshot is whatever size it happens to be, and a WRONG
     og: image: width is worse than no og: image: width at all. */
  const img = absolute(host, image || d.ogImage);
  const isGeneratedCard = !image || /(^|\/)og\/[^/]+$/.test(image);
  const url = `${host}${path || "/"}`;
  const kw = (keywords?.length ? keywords: d.keywords).join(", ");

  const graph: Json[] = [
    organizationNode(settings, contact, socials),
    webSiteNode(settings),
  ];
  if (breadcrumbs?.length) graph.push(breadcrumbNode(host, breadcrumbs));

  /* Page nodes are linked back to the Organization automatically so every page
     resolves to ONE entity instead of describing an anonymous company again.
     `provider` is the correct property on a Service and on a Course. It is
     also the one Google reads for the Course rich result, while every other
     node we emit is a CreativeWork subtype (WebPage, AboutPage, Blog,
     Article, SoftwareApplication…), where the correct property is `publisher`.
     An explicit value on the node wins. */
  const PROVIDER_TYPES = new Set(["Service", "Course"]);
  if (schema) {
    const orgRef = { "@id": `${host}/${ORG_ID}` };
    for (const node of Array.isArray(schema) ? schema: [schema]) {
      const t = Array.isArray(node["@type"]) ? node["@type"][0]: node["@type"];
      const key = PROVIDER_TYPES.has(t as string) ? "provider": "publisher";
      const linked = key in node ? node: {...node, [key]: orgRef };
      graph.push(absolutizeUrls(linked, host));
    }
  }

  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={kw} />
      <meta name="robots" content={noindex ? "noindex, nofollow": "index, follow"} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={settings.siteName} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      {isGeneratedCard && <meta property="og:image:width" content="1200" />}
      {isGeneratedCard && <meta property="og:image:height" content="630" />}
      <meta
        property="og:image:alt"
        content={
          isGeneratedCard
            ? `${settings.siteName}, the iV monogram and wordmark on a navy card`
: fullTitle
        }
      />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      {d.twitterHandle && <meta name="twitter:site" content={d.twitterHandle} />}
      {d.twitterHandle && <meta name="twitter:creator" content={d.twitterHandle} />}

      <script type="application/ld+json">{jsonLd}</script>
    </Helmet>
);
}

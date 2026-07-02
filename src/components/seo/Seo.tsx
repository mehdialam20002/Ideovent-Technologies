import { Helmet } from "react-helmet-async";
import { useSingleton } from "@/lib/cms/context";

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

/** Per-route document head. Falls back to global SiteSettings defaults. */
export function Seo({ title, description, image, path, type = "website", noindex }: SeoProps) {
  const settings = useSingleton("settings");
  const d = settings.defaultSeo;

  const fullTitle = title ? `${title} — ${settings.siteName}` : d.title;
  const desc = description || d.description;
  const img = image || d.ogImage;
  const url = `${d.canonicalHost}${path || ""}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      {d.twitterHandle && <meta name="twitter:site" content={d.twitterHandle} />}
    </Helmet>
  );
}

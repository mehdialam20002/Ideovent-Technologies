import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { mainSiteIsCrossOrigin, mainSiteUrl } from "@/lib/host";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> & {
  /** A path on the main site: /admin/..., /admin/preview/site/<slug>, /site/<slug>. */
  path: string;
  /** Open in a new tab (target=_blank, rel=noopener noreferrer). */
  newTab?: boolean;
  children: ReactNode;
};

/**
 * A link from the CRM, or from the lead screen inside it, to a page that lives
 * on the MAIN site: the admin (/admin/...) or a demo (/admin/preview/site/...,
 * /site/...). Every such link in the CRM goes through here.
 *
 * Today the CRM is at /crm on the main site, so this is a router <Link> to the
 * same relative path as before and nothing changes. On the CRM's own subdomain
 * (crm.ideovent.in once VITE_CRM_URL is set; crm.localhost in tests) that page
 * is on another origin, which a router <Link> cannot reach, so it becomes a
 * plain <a href> to the absolute address (mainSiteUrl in src/lib/host.ts).
 */
export function MainSiteLink({ path, newTab, children, ...rest }: Props) {
  const href = mainSiteUrl(path);
  const tab = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  if (mainSiteIsCrossOrigin()) {
    return (
      <a href={href} {...tab} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...tab} {...rest}>
      {children}
    </Link>
  );
}

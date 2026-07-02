import DOMPurify from "dompurify";

/** Sanitize hand-authored / CMS HTML before dangerouslySetInnerHTML. */
export function sanitize(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

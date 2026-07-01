import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Resolve a lucide icon by its PascalCase name (as stored in the CMS). */
export function getIcon(name?: string): LucideIcon {
  if (!name) return Icons.Circle;
  return ((Icons as unknown as Record<string, LucideIcon>)[name]) || Icons.Circle;
}

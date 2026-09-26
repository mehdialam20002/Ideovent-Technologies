import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("eyebrow", className)}>
      {/* bg-secondary, not bg-primary: --secondary is the gold in both themes
          (gold-300 on navy, gold-700 on white), which keeps a gold mark in the
          eyebrow in the light theme too, where --primary is navy and the dot
          would otherwise be the same colour as the heading beside it. */}
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-secondary" />
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Infinite horizontal marquee (duplicates children for a seamless loop). */
export function Marquee({ children, className, duration = 32, fade = true }: { children: ReactNode; className?: string; duration?: number; fade?: boolean }) {
  return (
    <div
      className={cn("group relative flex overflow-hidden", fade && "[mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]", className)}
    >
      <div className="flex shrink-0 items-center animate-marquee group-hover:[animation-play-state:paused]" style={{ ["--marquee-duration" as any]: `${duration}s` }}>
        {children}
        {children}
      </div>
    </div>
  );
}

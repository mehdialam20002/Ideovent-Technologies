import { cn } from "@/lib/utils";

/** Ambient animated gradient blobs for hero / section backdrops. Purely decorative. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-32 left-1/4 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] animate-aurora" />
      <div className="absolute top-10 right-0 h-[32rem] w-[32rem] rounded-full bg-secondary/25 blur-[130px] animate-aurora [animation-delay:-6s]" />
      <div className="absolute -bottom-32 left-10 h-[30rem] w-[30rem] rounded-full bg-accent/15 blur-[130px] animate-aurora [animation-delay:-12s]" />
    </div>
  );
}

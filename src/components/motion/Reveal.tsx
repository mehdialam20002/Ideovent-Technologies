import { motion, useReducedMotion, type Variants } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "span" | "article";
  amount?: number;
  once?: boolean;
}

/** Scroll-triggered reveal. Respects prefers-reduced-motion (renders instantly). */
export function Reveal({
  children,
  variants = fadeUp,
  className,
  delay = 0,
  as = "div",
  amount = 0.2,
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduce) {
    const Tag = as as any;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </MotionTag>
  );
}

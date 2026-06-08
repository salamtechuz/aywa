"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-triggered entrance: fades + slides its children up when they first
 * enter the viewport. Pure CSS transition driven by an IntersectionObserver,
 * so it runs once and then stays put. Honors prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced-motion users still get revealed (instantly) by the observer; the
    // `motion-reduce:transition-none` class drops the animation itself.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-6 blur-[2px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

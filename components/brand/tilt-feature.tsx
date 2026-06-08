"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const REST_TRANSFORM = "rotateX(0deg) rotateY(0deg)";

/**
 * Lightweight pointer-driven 3D tilt + cursor spotlight for marketing cards.
 * Subtler than TiltCard (smaller angles, no scale) so it reads well on a grid.
 * Children that use `translateZ` parallax up against the tilt because this
 * wrapper establishes a preserve-3d context. Flat under reduced-motion and on
 * touch / no-pointer devices.
 *
 * PERF: driven imperatively via refs in a single rAF-coalesced handler — no
 * React state, so children never re-render on pointer move (the old setState-
 * per-mousemove version re-rendered the whole card subtree every frame).
 */
export function TiltFeature({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const allowed = useRef<boolean | null>(null);

  const canTilt = () => {
    if (allowed.current === null) {
      allowed.current =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: fine)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return allowed.current;
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTilt()) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${-py * 6}deg) rotateY(${px * 7}deg)`;
      const g = glareRef.current;
      if (g) {
        g.style.background = `radial-gradient(300px circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 50%)`;
      }
    });
  };

  const onEnter = () => {
    if (!canTilt()) return;
    const el = cardRef.current;
    if (el) el.style.transition = "transform 0.12s ease-out";
    const g = glareRef.current;
    if (g) g.style.opacity = "1";
  };

  const onLeave = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform 0.5s ease-out";
      el.style.transform = REST_TRANSFORM;
    }
    const g = glareRef.current;
    if (g) g.style.opacity = "0";
  };

  return (
    <div className="h-full [perspective:900px]">
      <div
        ref={cardRef}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ transform: REST_TRANSFORM }}
        className={cn(
          "relative h-full will-change-transform [transform-style:preserve-3d] motion-reduce:transform-none",
          className,
        )}
      >
        {children}
        {/* Cursor-tracking spotlight, floated above the card on the Z axis. */}
        <div
          ref={glareRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 [transform:translateZ(40px)]"
        />
      </div>
    </div>
  );
}

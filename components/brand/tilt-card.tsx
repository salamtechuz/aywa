"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const REST_TRANSFORM = "rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)";
const REST_SHADOW = "0 26px 55px -22px rgba(2, 6, 23, 0.45)";

/**
 * Pointer-driven 3D tilt for the product preview. Tilts toward the cursor,
 * lifts on the Z axis on hover, and tracks a sheen highlight + a tilt-aware
 * box-shadow for real depth.
 *
 * PERF: everything is written straight to the DOM via refs inside a single
 * rAF-coalesced handler — there is NO React state, so the (heavy) children
 * never re-render on pointer move. (The previous version called setState on
 * every mousemove, re-rendering the whole PreviewApp subtree dozens of times a
 * second, which is what made the tilt lag.) box-shadow is a cheap paint, NOT
 * filter: drop-shadow (which re-rasterizes the subtree every frame). No-op on
 * touch / coarse pointers and under reduced-motion, so it degrades gracefully.
 */
export function TiltCard({
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

  // Resolved once, lazily: only tilt on a fine pointer (mouse) without
  // reduced-motion. Touch/trackpad-less and a11y users get a static card.
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
      const rx = -py * 14;
      const ry = px * 18;
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(60px) scale(1.035)`;
      // Shadow leans opposite the tilt so the card reads as lifted off the page.
      el.style.boxShadow = `${-ry * 1.9}px ${rx * 1.9 + 34}px 80px -14px color-mix(in oklch, var(--primary) 45%, rgba(2, 6, 23, 0.6))`;
      const g = glareRef.current;
      if (g) {
        g.style.background = `radial-gradient(440px circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.28), transparent 48%)`;
      }
    });
  };

  const onEnter = () => {
    if (!canTilt()) return;
    const el = cardRef.current;
    if (el) {
      // Short transition so tracking feels instant (no 300ms trail), while the
      // initial lift-in still eases in smoothly.
      el.style.transition =
        "transform 0.12s ease-out, box-shadow 0.18s ease-out";
    }
    const g = glareRef.current;
    if (g) g.style.opacity = "1";
  };

  const onLeave = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    const el = cardRef.current;
    if (el) {
      // Longer ease so the card settles back to rest smoothly.
      el.style.transition =
        "transform 0.5s ease-out, box-shadow 0.5s ease-out";
      el.style.transform = REST_TRANSFORM;
      el.style.boxShadow = REST_SHADOW;
    }
    const g = glareRef.current;
    if (g) g.style.opacity = "0";
  };

  return (
    <div className="[perspective:850px]">
      <div
        ref={cardRef}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ transform: REST_TRANSFORM, boxShadow: REST_SHADOW }}
        className={cn(
          "relative rounded-2xl will-change-transform [transform-style:preserve-3d] motion-reduce:transform-none",
          className,
        )}
      >
        {children}
        {/* Cursor-tracking sheen, floated above the surface on the Z axis so it
            catches the light independently of the card face — sells the depth. */}
        <div
          ref={glareRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 [transform:translateZ(70px)]"
        />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { ArrowRight, Check, Star } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

const REST_TRANSFORM = "rotateX(0deg) rotateY(0deg)";

// Decorative avatar stack (gradient circles + initials, no assets needed).
const AVATARS = [
  { initials: "AK", className: "from-violet-500 to-indigo-500" },
  { initials: "MJ", className: "from-sky-500 to-cyan-500" },
  { initials: "RS", className: "from-emerald-500 to-teal-500" },
  { initials: "NB", className: "from-amber-500 to-orange-500" },
] as const;

/**
 * Showcase CTA card: a pointer-driven 3D tilt with a rotating conic-gradient
 * halo, drifting gradient orbs (parallax depth), a cursor-tracking spotlight,
 * a shimmering gradient headline, a perks checklist, and a social-proof row.
 *
 * PERF: the tilt is written straight to the DOM via refs in a single
 * rAF-coalesced handler — no React state, so the card never re-renders on
 * pointer move. All flourishes are decorative and degrade gracefully under
 * prefers-reduced-motion (animations disabled in globals.css).
 */
export function CtaShowcase({
  title,
  body,
  badge,
  perks,
  socialProof,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  body: string;
  badge: string;
  perks: string[];
  socialProof: string;
  primaryLabel: string;
  secondaryLabel: string;
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
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${-py * 5}deg) rotateY(${px * 6}deg)`;
      const g = glareRef.current;
      if (g) {
        g.style.background = `radial-gradient(500px circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 55%)`;
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
    <div className="[perspective:1200px]">
      <div
        ref={cardRef}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ transform: REST_TRANSFORM }}
        className="relative will-change-transform [transform-style:preserve-3d] motion-reduce:transform-none"
      >
        {/* Rotating conic-gradient halo, blurred into a soft glow behind the card. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 overflow-hidden rounded-[2.25rem]"
        >
          <div className="cta-spin absolute left-1/2 top-1/2 h-[150%] w-[150%] opacity-60 blur-2xl [background:conic-gradient(from_0deg,transparent_0deg,color-mix(in_oklch,var(--primary)_60%,transparent)_60deg,transparent_140deg,color-mix(in_oklch,var(--chart-2)_60%,transparent)_240deg,transparent_320deg)]" />
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card/80 p-10 text-center shadow-2xl backdrop-blur-xl md:p-14">
          {/* Drifting gradient orbs. */}
          <div
            aria-hidden
            className="orb-drift pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-primary/25 blur-3xl"
            style={{ "--ox": "34px", "--oy": "22px" } as CSSProperties}
          />
          <div
            aria-hidden
            className="orb-drift pointer-events-none absolute -bottom-12 -right-10 h-52 w-52 rounded-full bg-chart-2/25 blur-3xl"
            style={
              { "--ox": "-28px", "--oy": "-20px", animationDelay: "-4s" } as CSSProperties
            }
          />

          {/* Cursor-tracking spotlight. */}
          <div
            ref={glareRef}
            aria-hidden
            style={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          />

          <div className="relative mx-auto max-w-2xl">
            {/* Eyebrow badge with a live pulse. */}
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {badge}
            </span>

            <h2 className="text-shimmer mx-auto mt-5 max-w-2xl bg-gradient-to-r from-foreground via-primary to-foreground bg-[length:200%_auto] bg-clip-text text-3xl font-semibold tracking-tight text-balance text-transparent md:text-4xl">
              {title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">
              {body}
            </p>

            {/* Perks checklist. */}
            <ul className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              {perks.map((perk) => (
                <li key={perk} className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-muted-foreground">{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-in"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "group gap-1.5 shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40",
                })}
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/sign-in"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className:
                    "border-foreground/15 bg-foreground/5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/10",
                })}
              >
                {secondaryLabel}
              </Link>
            </div>

            {/* Social proof: avatar stack + rating. */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <div className="flex -space-x-2.5">
                {AVATARS.map((a) => (
                  <span
                    key={a.initials}
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${a.className} text-[11px] font-semibold text-white ring-2 ring-card`}
                  >
                    {a.initials}
                  </span>
                ))}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold text-foreground ring-2 ring-card">
                  +
                </span>
              </div>
              <div className="flex flex-col items-center sm:items-start">
                <div className="flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <span className="mt-1 text-xs text-muted-foreground">{socialProof}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

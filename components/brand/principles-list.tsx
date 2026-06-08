"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Keyboard,
  MoonStar,
  PanelRight,
  Smartphone,
  SquarePen,
  Type,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// One icon per principle, in the same order as messages/<locale>.json
// landing.principles. Falls back by modulo so extra strings never crash.
const ICONS: LucideIcon[] = [
  Type, // Generous spacing, modern type scale
  MoonStar, // Real dark mode, not inverted colors
  SquarePen, // Inline editing with optimistic updates
  PanelRight, // Side panels instead of full-page navigation
  Smartphone, // Mobile-responsive from day one
  Keyboard, // Keyboard-driven for power users
];

/**
 * Animated principles checklist. Rows stagger in on scroll, then a spotlight
 * auto-travels down the list on a loop so the section feels alive without
 * interaction. On hover each row lights a cursor-following spotlight, morphs
 * its icon (fills + tilts + glows) and reveals an arrow. Honors
 * prefers-reduced-motion: no auto-cycle, no entrance transition.
 */
export function PrinciplesList({ items }: { items: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState(0);

  // Reveal once the list scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Once visible, cycle the spotlight down the list (paused for reduced-motion).
  useEffect(() => {
    if (!shown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % items.length);
    }, 1600);
    return () => clearInterval(id);
  }, [shown, items.length]);

  // Track the cursor inside a row via CSS vars — no re-render per move.
  const onRowMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <ul ref={ref} className="grid gap-3">
      {items.map((p, i) => {
        const on = i === active;
        const Icon = ICONS[i % ICONS.length];
        return (
          <li
            key={p}
            style={{ transitionDelay: shown ? `${i * 70}ms` : "0ms" }}
            className={cn(
              "transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100",
              shown
                ? "translate-y-0 opacity-100 blur-0"
                : "translate-y-4 opacity-0 blur-[2px]",
            )}
          >
            <div
              onMouseMove={onRowMove}
              className={cn(
                "group relative flex items-center gap-4 overflow-hidden rounded-xl border px-4 py-3.5 transition-all duration-300 will-change-transform",
                on
                  ? "-translate-y-0.5 border-primary/40 bg-primary/[0.05] shadow-lg shadow-primary/10"
                  : "border-foreground/10 bg-foreground/[0.03]",
                "hover:-translate-y-0.5 hover:scale-[1.012] hover:border-primary/50 hover:bg-foreground/[0.06] hover:shadow-xl hover:shadow-primary/15",
              )}
            >
              {/* Cursor-following spotlight. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(170px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklch, var(--primary) 20%, transparent), transparent 60%)",
                }}
              />
              {/* Accent bar wipes down the left edge when lit. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 w-1 origin-top rounded-r bg-primary transition-transform duration-300",
                  on ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                )}
              />

              {/* Icon tile — morphs (fills, tilts, glows) when lit or hovered. */}
              <span
                className={cn(
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6",
                  on
                    ? "bg-primary text-primary-foreground shadow-[0_0_16px_-2px_var(--primary)]"
                    : "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_18px_-2px_var(--primary)]",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>

              <span className="relative text-sm font-medium transition-transform duration-300 group-hover:translate-x-0.5">
                {p}
              </span>

              {/* Arrow slides + fades in on hover. */}
              <ArrowUpRight
                aria-hidden
                className="relative ml-auto h-4 w-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

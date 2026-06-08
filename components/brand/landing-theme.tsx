"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type Ctx = { dark: boolean; toggle: (e: MouseEvent) => void };

const LandingThemeContext = createContext<Ctx>({ dark: false, toggle: () => {} });

/**
 * Local theme scope for the marketing page — independent of the app's
 * next-themes setting. The wrapper always carries an explicit `light`/`dark`
 * class so it owns its own CSS variables and never inherits the dark palette
 * from a system-dark `<html>` (which made the toggle look dead). Defaults to
 * light; the toggle animates with a circular View Transition reveal where
 * supported, falling back to a plain color cross-fade.
 */
export function LandingThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  const toggle = (e: MouseEvent) => {
    const flip = () => setDark((d) => !d);
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || reduce) {
      flip();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => flushSync(flip));
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 340,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <LandingThemeContext.Provider value={{ dark, toggle }}>
      <div
        className={cn(
          "relative flex min-h-dvh flex-1 flex-col overflow-x-clip bg-background text-foreground transition-colors duration-200",
          dark ? "dark" : "light",
        )}
      >
        {children}
      </div>
    </LandingThemeContext.Provider>
  );
}

export function LandingThemeToggle() {
  const { dark, toggle } = useContext(LandingThemeContext);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <Sun
        className={cn(
          "h-[1.15rem] w-[1.15rem] transition-all duration-300",
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute h-[1.15rem] w-[1.15rem] transition-all duration-300",
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the given CSS media query matches. SSR-safe: returns
 * `defaultValue` until first client mount, then subscribes to changes.
 *
 * Usage: const isMobile = useMediaQuery("(max-width: 640px)");
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

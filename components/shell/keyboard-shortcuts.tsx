"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Global keyboard router. Supports "G then X" two-key sequences (the
 * shortcuts declared on each nav item in lib/navigation.ts).
 *
 * Lives in the topbar so it mounts once per app shell. Mounting in a leaf
 * page would double-register the listener on client-side navigation.
 */
const ROUTES: Record<string, string> = {
  d: "/dashboard",
  n: "/inbox", // N for Notifications inbox
  a: "/calendar", // A for Agenda
  c: "/crm",
  s: "/sales",
  u: "/subscriptions", // U for sUbscriptions (S is taken)
  i: "/inventory",
  p: "/purchase",
  r: "/reports",
  k: "/settings/general", // settings
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const armed = useRef(false);
  const armedAt = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip when the user is typing in an input/textarea/contenteditable.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Disarm if the "G" was pressed more than 1.5s ago.
      if (armed.current && Date.now() - armedAt.current > 1500) {
        armed.current = false;
      }

      if (armed.current) {
        const key = e.key.toLowerCase();
        const route = ROUTES[key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        armed.current = false;
        return;
      }

      if (e.key === "g" || e.key === "G") {
        armed.current = true;
        armedAt.current = Date.now();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * Reads the persisted accent color from localStorage on mount and writes the
 * CSS variables that drive the primary/ring/sidebar colors. Lives in the app
 * shell so every authenticated page picks it up; Settings → Appearance writes
 * the value, this component reads it.
 */
const ACCENT_KEY = "aywa-accent-color";

export function AccentLoader() {
  useEffect(() => {
    try {
      const color = window.localStorage.getItem(ACCENT_KEY);
      if (!color) return;
      const root = document.documentElement;
      root.style.setProperty("--primary", color);
      root.style.setProperty("--ring", color);
      root.style.setProperty("--sidebar-primary", color);
      root.style.setProperty("--sidebar-ring", color);
    } catch {
      // localStorage unavailable — leave defaults.
    }
  }, []);
  return null;
}

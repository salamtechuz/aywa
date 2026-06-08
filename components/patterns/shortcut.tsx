"use client";

import { useSyncExternalStore } from "react";

// The OS never changes during a session, so there is nothing to subscribe to.
const noopSubscribe = () => () => {};

function readIsMac(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const probe = `${nav.userAgentData?.platform ?? ""} ${nav.platform ?? ""} ${nav.userAgent ?? ""}`;
  return /mac|iphone|ipad|ipod/i.test(probe);
}

/**
 * True when the client OS uses ⌘ for shortcuts (macOS / iPadOS / iOS), false on
 * Windows/Linux (which use Ctrl).
 *
 * Backed by useSyncExternalStore: the server snapshot (and the first client
 * paint) is the Mac-first default `true`, then React reconciles to the real
 * platform on the client — no hydration mismatch and no setState-in-effect.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(noopSubscribe, readIsMac, () => true);
}

/** The platform command modifier label: `⌘` on Apple, `Ctrl` elsewhere. */
export function ModKey() {
  return <>{useIsMac() ? "⌘" : "Ctrl"}</>;
}

/**
 * A full shortcut hint: `⌘K` on Apple, `Ctrl K` elsewhere. `keyName` is the
 * letter that follows the modifier (defaults to `K`, the command palette).
 */
export function ShortcutHint({ keyName = "K" }: { keyName?: string }) {
  return <>{useIsMac() ? `⌘${keyName}` : `Ctrl ${keyName}`}</>;
}

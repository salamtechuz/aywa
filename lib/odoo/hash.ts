import "server-only";

import { createHash } from "node:crypto";

// Order-independent JSON hashing. Both sides hash the SAME projection so a
// round-trip (aywa → Odoo → aywa) converges to an equal hash and the echo is
// skipped — this is the core loop-breaker for the bidirectional sync.

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = canonical(obj[k]);
    return out;
  }
  return value;
}

export function hashPayload(obj: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(canonical(obj))).digest("hex");
}

import "server-only";

import type { AnyEntityMapper } from "./types";
import { contactMapper } from "./mappers/contact";

// The mapper registry. To add a new synced entity later: write a mapper file
// under ./mappers and add it to this array — the sync engine needs no changes.
const MAPPERS: AnyEntityMapper[] = [
  contactMapper,
  // Phase 2: productMapper, salesOrderMapper, dealMapper
  // Phase 3: stockMapper
];

export const registry = {
  all(): AnyEntityMapper[] {
    return MAPPERS;
  },
  byEntityType(entityType: string): AnyEntityMapper | null {
    return MAPPERS.find((m) => m.entityType === entityType) ?? null;
  },
  byOdooModel(odooModel: string): AnyEntityMapper | null {
    return MAPPERS.find((m) => m.odooModel === odooModel) ?? null;
  },
};

/** Lightweight metadata for the Settings UI (server passes this to the client). */
export function entityMeta(): { entityType: string; label: string }[] {
  return MAPPERS.map((m) => ({ entityType: m.entityType, label: m.label }));
}

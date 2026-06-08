// Shared constants + helpers for the Manufacturing module. Status values are
// stored as TEXT and validated at the app layer (no native DB enums), mirroring
// Sales/Purchase. The board shows DRAFT→CONFIRMED→IN_PROGRESS→DONE columns;
// CANCELLED is a terminal status reachable from the detail drawer.

export const MO_STAGES = [
  { id: "DRAFT", label: "Draft", accent: "var(--muted-foreground)", description: "Planned, not started" },
  { id: "CONFIRMED", label: "Confirmed", accent: "var(--chart-2)", description: "Scheduled to produce" },
  { id: "IN_PROGRESS", label: "In progress", accent: "var(--chart-3)", description: "Being manufactured" },
  { id: "DONE", label: "Done", accent: "var(--success)", description: "Produced, stock updated" },
] as const;

export type MoStatusId = (typeof MO_STAGES)[number]["id"];

export const MO_STATUS_IDS: MoStatusId[] = MO_STAGES.map((s) => s.id);

export const ALL_MO_STATUSES = [...MO_STATUS_IDS, "CANCELLED"] as const;
export type AnyMoStatus = (typeof ALL_MO_STATUSES)[number];

/** Linear progression used by the "advance" action and the drawer's next button. */
export const MO_FLOW: MoStatusId[] = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "DONE"];

/** The status at which an order commits stock movements. */
export const STOCK_COMMIT_STATUS = "DONE";

export function moStageMeta(status: string) {
  return MO_STAGES.find((s) => s.id === status) ?? MO_STAGES[0];
}

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Quantities can be fractional (e.g. 1.5 kg). Trim trailing zeros. */
export function formatQty(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
}

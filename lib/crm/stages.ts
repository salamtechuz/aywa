export const STAGES = [
  { id: "NEW", label: "New", accent: "var(--chart-2)" },
  { id: "QUALIFIED", label: "Qualified", accent: "var(--chart-3)" },
  { id: "PROPOSAL", label: "Proposal", accent: "var(--chart-4)" },
  { id: "NEGOTIATION", label: "Negotiation", accent: "var(--chart-5)" },
  { id: "WON", label: "Won", accent: "var(--success)" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export const STAGE_IDS: StageId[] = STAGES.map((s) => s.id);

export const ALL_STAGES = [...STAGE_IDS, "LOST"] as const;
export type AnyStage = (typeof ALL_STAGES)[number];

export const PROBABILITY_DEFAULT: Record<AnyStage, number> = {
  NEW: 10,
  QUALIFIED: 30,
  PROPOSAL: 55,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

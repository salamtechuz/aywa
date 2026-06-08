export const SALES_STAGES = [
  { id: "DRAFT", label: "Draft", accent: "var(--muted-foreground)", description: "Quote in progress" },
  { id: "SENT", label: "Sent", accent: "var(--chart-2)", description: "Waiting on customer" },
  { id: "CONFIRMED", label: "Confirmed", accent: "var(--chart-3)", description: "Order signed" },
  { id: "DELIVERED", label: "Delivered", accent: "var(--chart-4)", description: "Goods/services delivered" },
  { id: "INVOICED", label: "Invoiced", accent: "var(--success)", description: "Billed" },
] as const;

export type SalesStatusId = (typeof SALES_STAGES)[number]["id"];

export const SALES_STATUS_IDS: SalesStatusId[] = SALES_STAGES.map((s) => s.id);

export const ALL_SALES_STATUSES = [...SALES_STATUS_IDS, "CANCELLED"] as const;
export type AnySalesStatus = (typeof ALL_SALES_STATUSES)[number];

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

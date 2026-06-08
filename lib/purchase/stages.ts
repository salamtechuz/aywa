export const PURCHASE_STAGES = [
  { id: "DRAFT", label: "Draft", accent: "var(--muted-foreground)", description: "PO being prepared" },
  { id: "RFQ_SENT", label: "RFQ sent", accent: "var(--chart-2)", description: "Awaiting vendor quote" },
  { id: "APPROVED", label: "Approved", accent: "var(--chart-3)", description: "Ordered, awaiting delivery" },
  { id: "RECEIVED", label: "Received", accent: "var(--chart-4)", description: "Goods received, stock updated" },
  { id: "BILLED", label: "Billed", accent: "var(--success)", description: "Vendor invoice processed" },
] as const;

export type PurchaseStatusId = (typeof PURCHASE_STAGES)[number]["id"];

export const PURCHASE_STATUS_IDS: PurchaseStatusId[] = PURCHASE_STAGES.map((s) => s.id);

export const ALL_PURCHASE_STATUSES = [...PURCHASE_STATUS_IDS, "CANCELLED"] as const;
export type AnyPurchaseStatus = (typeof ALL_PURCHASE_STATUSES)[number];

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

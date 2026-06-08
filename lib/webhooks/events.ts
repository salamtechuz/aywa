export type WebhookEvent =
  | "deal.won"
  | "deal.lost"
  | "deal.created"
  | "order.created"
  | "order.delivered"
  | "order.invoiced"
  | "po.received"
  | "subscription.created"
  | "subscription.cancelled";

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  "deal.won",
  "deal.lost",
  "deal.created",
  "order.created",
  "order.delivered",
  "order.invoiced",
  "po.received",
  "subscription.created",
  "subscription.cancelled",
];

import "server-only";

import { db } from "@/lib/db";

export type OrderContext = Awaited<ReturnType<typeof loadOrderContext>>;
export type PurchaseOrderContext = Awaited<ReturnType<typeof loadPurchaseOrderContext>>;

export async function loadOrderContext(workspaceId: string, orderId: string) {
  const order = await db.salesOrder.findFirst({
    where: { id: orderId, workspaceId },
    include: {
      customer: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    orderDate: order.orderDate,
    expectedDate: order.expectedDate,
    notes: order.notes,
    ownerName: order.ownerName,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          company: order.customer.company,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : null,
    lines: order.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      productName: l.product?.name ?? null,
      productSku: l.product?.sku ?? null,
    })),
  };
}

export async function loadPurchaseOrderContext(workspaceId: string, orderId: string) {
  const order = await db.purchaseOrder.findFirst({
    where: { id: orderId, workspaceId },
    include: {
      vendor: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    orderDate: order.orderDate,
    expectedDate: order.expectedDate,
    notes: order.notes,
    ownerName: order.ownerName,
    vendor: order.vendor
      ? {
          id: order.vendor.id,
          name: order.vendor.name,
          email: order.vendor.email,
          contactPerson: order.vendor.contactPerson,
          paymentTerms: order.vendor.paymentTerms,
        }
      : null,
    lines: order.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitCost: l.unitCost,
      productName: l.product?.name ?? null,
      productSku: l.product?.sku ?? null,
    })),
  };
}

export function formatPurchaseOrderForPrompt(
  ctx: NonNullable<PurchaseOrderContext>,
): string {
  const lines: string[] = [];
  lines.push(`Purchase Order ${ctx.number}`);
  lines.push(`Status: ${ctx.status}`);
  lines.push(`Estimated total: ${ctx.amount} ${ctx.currency}`);
  if (ctx.expectedDate) {
    lines.push(`Need by: ${ctx.expectedDate.toISOString().slice(0, 10)}`);
  }
  if (ctx.ownerName) lines.push(`Buyer contact: ${ctx.ownerName}`);
  if (ctx.vendor) {
    const v = ctx.vendor;
    const parts = [v.name];
    if (v.contactPerson) parts.push(`attn: ${v.contactPerson}`);
    if (v.email) parts.push(`<${v.email}>`);
    if (v.paymentTerms) parts.push(`terms: ${v.paymentTerms}`);
    lines.push(`Vendor: ${parts.join(" · ")}`);
  }
  if (ctx.notes) lines.push(`Internal notes: ${ctx.notes}`);

  if (ctx.lines.length > 0) {
    lines.push("");
    lines.push("Requested items:");
    for (const l of ctx.lines) {
      const sku = l.productSku ? ` [SKU: ${l.productSku}]` : "";
      lines.push(`- ${l.description}${sku} — ${l.quantity} units at target ${l.unitCost} ${ctx.currency}`);
    }
  }
  return lines.join("\n");
}

export function formatOrderForPrompt(ctx: NonNullable<OrderContext>): string {
  const lines: string[] = [];
  lines.push(`Order #${ctx.number}`);
  lines.push(`Status: ${ctx.status}`);
  lines.push(`Total: ${ctx.amount} ${ctx.currency}`);
  if (ctx.expectedDate) {
    lines.push(`Expected delivery: ${ctx.expectedDate.toISOString().slice(0, 10)}`);
  }
  if (ctx.ownerName) lines.push(`Owner: ${ctx.ownerName}`);
  if (ctx.customer) {
    const c = ctx.customer;
    lines.push(
      `Customer: ${c.name}${c.company ? " (" + c.company + ")" : ""}${c.email ? " <" + c.email + ">" : ""}`,
    );
  }
  if (ctx.notes) lines.push(`Internal notes: ${ctx.notes}`);

  if (ctx.lines.length > 0) {
    lines.push("");
    lines.push("Line items:");
    for (const l of ctx.lines) {
      const sku = l.productSku ? ` [SKU: ${l.productSku}]` : "";
      const disc = l.discount > 0 ? ` -${l.discount}%` : "";
      lines.push(
        `- ${l.description}${sku} — ${l.quantity} × ${l.unitPrice} ${ctx.currency}${disc}`,
      );
    }
  }
  return lines.join("\n");
}

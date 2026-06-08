import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { isAiEnabled } from "@/lib/ai/client";
import { isEmailEnabled } from "@/lib/email/resend";
import { isStripeEnabled } from "@/lib/stripe/client";
import { getActiveWorkspace } from "@/lib/tenant";
import { db } from "@/lib/db";
import { listSalesOrders, listOrderLinesForOrders } from "@/lib/sales/queries";
import { listContacts } from "@/lib/crm/queries";
import { listProducts } from "@/lib/inventory/queries";
import { SalesBoard } from "@/components/sales/sales-board";
import { SalesStats } from "@/components/sales/sales-stats";
import { NewQuoteDialog } from "@/components/sales/new-quote-dialog";
import type { SalesOrderCardData } from "@/components/sales/sales-order-card";
import type { LineItem, ProductOption } from "@/components/sales/line-items-table";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";

export const metadata = { title: "Sales" };

export default async function SalesPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("sales");
  const [orders, contacts, products] = await Promise.all([
    listSalesOrders(ws.id),
    listContacts(ws.id),
    listProducts(ws.id, { activeOnly: true }),
  ]);

  // Batch fetch attachments for every order in one query.
  const allOrderAttachments = await db.attachment.findMany({
    where: {
      workspaceId: ws.id,
      entityType: "ORDER",
      entityId: { in: orders.map((o) => o.id) },
    },
    orderBy: { createdAt: "desc" },
  });
  const attachmentsByOrderId: Record<string, AttachmentItem[]> = {};
  for (const att of allOrderAttachments) {
    const arr = attachmentsByOrderId[att.entityId] ?? [];
    arr.push({
      id: att.id,
      filename: att.filename,
      storageKey: att.storageKey,
      mimeType: att.mimeType,
      size: att.size,
      uploadedBy: att.uploadedBy,
      createdAt: att.createdAt,
    });
    attachmentsByOrderId[att.entityId] = arr;
  }

  // Batch fetch lines for all orders in ONE query, then group by orderId.
  const linesByOrderId: Record<string, LineItem[]> = {};
  const allLines = await listOrderLinesForOrders(
    ws.id,
    orders.map((o) => o.id),
  );
  for (const l of allLines) {
    (linesByOrderId[l.orderId] ??= []).push({
      id: l.id,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      product: l.product
        ? { id: l.product.id, sku: l.product.sku, name: l.product.name, price: l.product.price }
        : null,
    });
  }

  const cards: SalesOrderCardData[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    expectedDate: o.expectedDate,
    ownerName: o.ownerName,
    stripePaidAt: o.stripePaidAt,
    customer: o.customer
      ? {
          name: o.customer.name,
          company: o.customer.company,
          email: o.customer.email,
        }
      : null,
  }));

  const contactOptions = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }));

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: p.price,
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("pipeline")}
          </Badge>
        }
        actions={<NewQuoteDialog contacts={contactOptions} />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <SalesStats orders={cards} />
        <SalesBoard
          initialOrders={cards}
          contacts={contactOptions}
          linesByOrderId={linesByOrderId}
          attachmentsByOrderId={attachmentsByOrderId}
          products={productOptions}
          workspaceName={ws.name}
          aiEnabled={isAiEnabled()}
          emailEnabled={isEmailEnabled()}
          stripeEnabled={isStripeEnabled()}
        />
      </div>
    </>
  );
}

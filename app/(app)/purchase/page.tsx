import Link from "next/link";
import { Users2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isAiEnabled } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { isEmailEnabled } from "@/lib/email/resend";
import { getActiveWorkspace } from "@/lib/tenant";
import { listProducts } from "@/lib/inventory/queries";
import {
  listPurchaseOrderLines,
  listPurchaseOrders,
  listVendors,
} from "@/lib/purchase/queries";
import { PurchaseBoard } from "@/components/purchase/purchase-board";
import { NewPurchaseOrderDialog } from "@/components/purchase/new-po-dialog";
import type { PurchaseOrderCardData } from "@/components/purchase/purchase-order-card";
import type {
  PurchaseLineItem,
  ProductOption,
} from "@/components/purchase/purchase-line-items";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";

export const metadata = { title: "Purchase" };

export default async function PurchasePage() {
  const t = await getTranslations("purchase");
  const ws = await getActiveWorkspace();
  const [orders, vendors, products] = await Promise.all([
    listPurchaseOrders(ws.id),
    listVendors(ws.id, { activeOnly: true }),
    listProducts(ws.id, { activeOnly: true }),
  ]);

  // Batch fetch all lines and attachments to avoid N+1 inside the drawer.
  const linesByOrderId: Record<string, PurchaseLineItem[]> = {};
  await Promise.all(
    orders.map(async (o) => {
      const list = await listPurchaseOrderLines(ws.id, o.id);
      linesByOrderId[o.id] = list.map((l) => ({
        id: l.id,
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitCost: l.unitCost,
        product: l.product
          ? { id: l.product.id, sku: l.product.sku, name: l.product.name, cost: l.product.cost }
          : null,
      }));
    }),
  );

  const orderIds = orders.map((o) => o.id);
  const allAttachments = orderIds.length
    ? await db.attachment.findMany({
        where: { workspaceId: ws.id, entityType: "ORDER", entityId: { in: orderIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const attachmentsByOrderId: Record<string, AttachmentItem[]> = {};
  for (const a of allAttachments) {
    const arr = attachmentsByOrderId[a.entityId] ?? [];
    arr.push({
      id: a.id,
      filename: a.filename,
      storageKey: a.storageKey,
      mimeType: a.mimeType,
      size: a.size,
      uploadedBy: a.uploadedBy,
      createdAt: a.createdAt,
    });
    attachmentsByOrderId[a.entityId] = arr;
  }

  const cards: PurchaseOrderCardData[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    expectedDate: o.expectedDate,
    ownerName: o.ownerName,
    vendor: o.vendor ? { name: o.vendor.name, email: o.vendor.email } : null,
  }));

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    cost: p.cost,
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("orderCount", { count: orders.length })}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/purchase/vendors"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Users2 className="h-4 w-4" />
              {t("vendors")}
            </Link>
            <NewPurchaseOrderDialog vendors={vendorOptions} />
          </div>
        }
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        {vendors.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center">
            <h3 className="text-sm font-semibold">{t("noVendorsYet")}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {t("noVendorsHint")}
            </p>
            <Link
              href="/purchase/vendors"
              className={buttonVariants({ className: "mt-4 gap-1.5" })}
            >
              <Users2 className="h-4 w-4" />
              {t("addFirstVendor")}
            </Link>
          </div>
        ) : (
          <PurchaseBoard
            initialOrders={cards}
            vendors={vendorOptions}
            linesByOrderId={linesByOrderId}
            attachmentsByOrderId={attachmentsByOrderId}
            products={productOptions}
            workspaceName={ws.name}
            aiEnabled={isAiEnabled()}
            emailEnabled={isEmailEnabled()}
          />
        )}
      </div>
    </>
  );
}

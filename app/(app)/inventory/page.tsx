import { AlertTriangle, Package, DollarSign, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";
import { listProducts } from "@/lib/inventory/queries";
import { computeOnHandMap } from "@/lib/inventory/stock";
import { ProductsTable, type ProductRow } from "@/components/inventory/products-table";
import { NewProductDialog } from "@/components/inventory/new-product-dialog";
import type { MovementRow } from "@/components/inventory/stock-movements-panel";

export const metadata = { title: "Inventory" };

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function InventoryPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const products = await listProducts(ws.id);

  // Compute live on-hand from the movement ledger so the stat cards and table
  // reflect reality, not the cached `stockOnHand` column.
  const onHandMap = await computeOnHandMap(
    ws.id,
    products.map((p) => p.id),
  );

  // Batch-fetch recent movements for every product so drawer-open is instant.
  const allMovements = await db.stockMovement.findMany({
    where: { workspaceId: ws.id, productId: { in: products.map((p) => p.id) } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const movementsByProductId: Record<string, MovementRow[]> = {};
  for (const m of allMovements) {
    const arr = movementsByProductId[m.productId] ?? [];
    if (arr.length < 50) {
      arr.push({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        sourceType: m.sourceType,
        sourceId: m.sourceId,
        ownerName: m.ownerName,
        createdAt: m.createdAt,
      });
      movementsByProductId[m.productId] = arr;
    }
  }

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    unit: p.unit,
    price: p.price,
    cost: p.cost,
    stockOnHand: onHandMap.get(p.id) ?? 0,
    reorderAt: p.reorderAt,
    active: p.active,
  }));

  const inventoryValue = rows.reduce((s, p) => s + p.stockOnHand * p.cost, 0);
  const lowStock = rows.filter((p) => p.reorderAt > 0 && p.stockOnHand <= p.reorderAt);
  const categories = new Set(rows.map((p) => p.category).filter(Boolean));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider gap-1">
            <Package className="h-3 w-3" />
            {rows.length}
          </Badge>
        }
        actions={<NewProductDialog />}
      />

      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("products")} value={String(rows.length)} icon={Package} />
          <StatCard
            label={t("categories")}
            value={String(categories.size)}
            icon={Layers}
          />
          <StatCard
            label={t("inventoryValue")}
            value={fmt(inventoryValue)}
            icon={DollarSign}
          />
          <StatCard
            label={t("lowStock")}
            value={String(lowStock.length)}
            trend={lowStock.length > 0 ? "down" : "flat"}
            icon={AlertTriangle}
          />
        </div>

        <ProductsTable rows={rows} movementsByProductId={movementsByProductId} />
      </div>
    </>
  );
}

import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { computeOnHandMap } from "@/lib/inventory/stock";
import { listProducts } from "@/lib/inventory/queries";
import {
  getManufacturingStats,
  listBomsForPicker,
  listManufacturingOrders,
} from "@/lib/manufacturing/queries";
import { ManufacturingNav } from "@/components/manufacturing/manufacturing-nav";
import { ManufacturingStats } from "@/components/manufacturing/manufacturing-stats";
import { MoBoard } from "@/components/manufacturing/mo-board";
import { NewMoDialog } from "@/components/manufacturing/new-mo-dialog";
import type {
  BomPick,
  ComponentPlanLine,
  MoData,
  ProductOption,
} from "@/components/manufacturing/types";

export const metadata = { title: "Manufacturing" };

export default async function ManufacturingPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("manufacturing");

  const [orders, products, boms, stats] = await Promise.all([
    listManufacturingOrders(ws.id),
    listProducts(ws.id, { activeOnly: true }),
    listBomsForPicker(ws.id),
    getManufacturingStats(ws.id),
  ]);

  // Component availability for the build plan: one batched on-hand lookup over
  // every component product referenced by any order's BOM.
  const componentIds = Array.from(
    new Set(orders.flatMap((o) => o.bom?.components.map((c) => c.productId) ?? [])),
  );
  const onHand = await computeOnHandMap(ws.id, componentIds);

  const moData: MoData[] = orders.map((o) => {
    const batch = o.bom && o.bom.quantity > 0 ? o.bom.quantity : 1;
    const factor = o.quantity / batch;
    const plan: ComponentPlanLine[] = (o.bom?.components ?? []).map((c) => ({
      productId: c.productId,
      sku: c.product.sku,
      name: c.product.name,
      unit: c.product.unit,
      required: c.quantity * factor,
      available: onHand.get(c.productId) ?? 0,
    }));
    return {
      id: o.id,
      number: o.number,
      product: { id: o.product.id, sku: o.product.sku, name: o.product.name, unit: o.product.unit },
      quantity: o.quantity,
      status: o.status,
      scheduledDate: o.scheduledDate,
      completedDate: o.completedDate,
      ownerName: o.ownerName,
      notes: o.notes,
      bomId: o.bomId,
      bomReference: o.bom?.reference ?? null,
      plan,
      shortage: plan.some((c) => c.available < c.required),
    };
  });

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
  }));
  const bomPicks: BomPick[] = boms.map((b) => ({
    id: b.id,
    reference: b.reference,
    productId: b.productId,
    quantity: b.quantity,
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("production")}
          </Badge>
        }
        actions={<NewMoDialog products={productOptions} boms={bomPicks} />}
      />
      <ManufacturingNav />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <ManufacturingStats stats={stats} />
        <MoBoard initialOrders={moData} />
      </div>
    </>
  );
}

import { AlertTriangle, DollarSign, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { getActiveWorkspace } from "@/lib/tenant";
import { listProducts } from "@/lib/inventory/queries";
import { computeOnHandMap } from "@/lib/inventory/stock";
import { StockReportTable, type StockRow } from "@/components/inventory/stock-report-table";

export const metadata = { title: "Stock" };

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function StockReportPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const products = await listProducts(ws.id);
  const onHandMap = await computeOnHandMap(
    ws.id,
    products.map((p) => p.id),
  );

  const rows: StockRow[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    onHand: onHandMap.get(p.id) ?? 0,
    cost: p.cost,
    reorderAt: p.reorderAt,
  }));
  const totalCost = rows.reduce((s, r) => s + r.onHand * r.cost, 0);
  const totalRetail = products.reduce(
    (s, p) => s + (onHandMap.get(p.id) ?? 0) * p.price,
    0,
  );
  const low = rows.filter((r) => r.reorderAt > 0 && r.onHand <= r.reorderAt).length;

  return (
    <>
      <PageHeader title={t("stockReport.title")} description={t("stockReport.description")} />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("stockReport.totalValue")} value={fmt(totalCost)} icon={DollarSign} />
          <StatCard label={t("stockReport.retailValue")} value={fmt(totalRetail)} icon={DollarSign} />
          <StatCard label={t("stockReport.skus")} value={String(rows.length)} icon={Package} />
          <StatCard
            label={t("lowStock")}
            value={String(low)}
            icon={AlertTriangle}
            trend={low > 0 ? "down" : "flat"}
          />
        </div>
        <StockReportTable rows={rows} />
      </div>
    </>
  );
}

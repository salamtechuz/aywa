import { Warehouse } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listWarehousesWithUsage } from "@/lib/inventory/warehouse-queries";
import { WarehousesTable } from "@/components/inventory/warehouses-table";
import { WarehouseDialog } from "@/components/inventory/warehouse-dialog";
import type { WarehouseRow } from "@/components/inventory/types";

export const metadata = { title: "Warehouses" };

export default async function WarehousesPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const data = await listWarehousesWithUsage(ws.id);
  const rows: WarehouseRow[] = data.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    address: w.address,
    active: w.active,
    locationCount: w._count.locations,
    operationCount: w._count.operationTypes,
  }));

  return (
    <>
      <PageHeader
        title={t("wh.title")}
        description={t("wh.description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {rows.length}
          </Badge>
        }
        actions={<WarehouseDialog />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title={t("wh.emptyTitle")}
            description={t("wh.emptyDescription")}
            action={<WarehouseDialog />}
          />
        ) : (
          <WarehousesTable rows={rows} />
        )}
      </div>
    </>
  );
}

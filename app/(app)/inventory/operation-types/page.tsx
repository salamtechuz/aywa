import { ArrowLeftRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listOperationTypes } from "@/lib/inventory/operation-type-queries";
import { listWarehouses } from "@/lib/inventory/warehouse-queries";
import { OperationTypesTable } from "@/components/inventory/operation-types-table";
import { OperationTypeDialog } from "@/components/inventory/operation-type-dialog";
import type { OperationTypeRow, WarehouseOption } from "@/components/inventory/types";

export const metadata = { title: "Operation Types" };

export default async function OperationTypesPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const [data, warehousesData] = await Promise.all([
    listOperationTypes(ws.id),
    listWarehouses(ws.id),
  ]);

  const warehouses: WarehouseOption[] = warehousesData.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
  }));
  const rows: OperationTypeRow[] = data.map((o) => ({
    id: o.id,
    name: o.name,
    code: o.code,
    type: o.type,
    active: o.active,
    warehouse: o.warehouse,
  }));

  return (
    <>
      <PageHeader
        title={t("ot.title")}
        description={t("ot.description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {rows.length}
          </Badge>
        }
        actions={<OperationTypeDialog warehouses={warehouses} />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={t("ot.emptyTitle")}
            description={t("ot.emptyDescription")}
            action={<OperationTypeDialog warehouses={warehouses} />}
          />
        ) : (
          <OperationTypesTable rows={rows} warehouses={warehouses} />
        )}
      </div>
    </>
  );
}

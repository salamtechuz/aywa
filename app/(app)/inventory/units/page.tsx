import { Ruler } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listUnitsOfMeasure } from "@/lib/inventory/uom-queries";
import { UnitsTable } from "@/components/inventory/units-table";
import { UomDialog } from "@/components/inventory/uom-dialog";
import type { UnitOfMeasureRow } from "@/components/inventory/types";

export const metadata = { title: "Units of Measure" };

export default async function UnitsOfMeasurePage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const data = await listUnitsOfMeasure(ws.id);
  const rows: UnitOfMeasureRow[] = data.map((u) => ({
    id: u.id,
    name: u.name,
    category: u.category,
    factor: u.factor,
    referenceUnit: u.referenceUnit,
    active: u.active,
  }));

  return (
    <>
      <PageHeader
        title={t("uom.title")}
        description={t("uom.description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {rows.length}
          </Badge>
        }
        actions={<UomDialog />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title={t("uom.emptyTitle")}
            description={t("uom.emptyDescription")}
            action={<UomDialog />}
          />
        ) : (
          <UnitsTable rows={rows} />
        )}
      </div>
    </>
  );
}

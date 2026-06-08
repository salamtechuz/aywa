import { Boxes } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listStorageCategoriesWithUsage } from "@/lib/inventory/storage-category-queries";
import { StorageCategoriesTable } from "@/components/inventory/storage-categories-table";
import { StorageCategoryDialog } from "@/components/inventory/storage-category-dialog";
import type { StorageCategoryRow } from "@/components/inventory/types";

export const metadata = { title: "Storage Categories" };

export default async function StorageCategoriesPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const data = await listStorageCategoriesWithUsage(ws.id);
  const rows: StorageCategoryRow[] = data.map((c) => ({
    id: c.id,
    name: c.name,
    capacity: c.capacity,
    maxWeight: c.maxWeight,
    allowNew: c.allowNew,
    active: c.active,
    locationCount: c._count.locations,
  }));

  return (
    <>
      <PageHeader
        title={t("sc.title")}
        description={t("sc.description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {rows.length}
          </Badge>
        }
        actions={<StorageCategoryDialog />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={t("sc.emptyTitle")}
            description={t("sc.emptyDescription")}
            action={<StorageCategoryDialog />}
          />
        ) : (
          <StorageCategoriesTable rows={rows} />
        )}
      </div>
    </>
  );
}

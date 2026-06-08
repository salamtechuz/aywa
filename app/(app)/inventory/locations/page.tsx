import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listLocations } from "@/lib/inventory/location-queries";
import { listWarehouses } from "@/lib/inventory/warehouse-queries";
import { listStorageCategories } from "@/lib/inventory/storage-category-queries";
import { LocationsTable } from "@/components/inventory/locations-table";
import { LocationDialog } from "@/components/inventory/location-dialog";
import type {
  LocationRow,
  StorageCategoryOption,
  WarehouseOption,
} from "@/components/inventory/types";

export const metadata = { title: "Locations" };

export default async function LocationsPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const [data, warehousesData, categoriesData] = await Promise.all([
    listLocations(ws.id),
    listWarehouses(ws.id),
    listStorageCategories(ws.id),
  ]);

  const warehouses: WarehouseOption[] = warehousesData.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
  }));
  const categories: StorageCategoryOption[] = categoriesData.map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const rows: LocationRow[] = data.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    type: l.type,
    active: l.active,
    warehouse: l.warehouse,
    storageCategory: l.storageCategory,
  }));

  return (
    <>
      <PageHeader
        title={t("loc.title")}
        description={t("loc.description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {rows.length}
          </Badge>
        }
        actions={<LocationDialog warehouses={warehouses} categories={categories} />}
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={t("loc.emptyTitle")}
            description={t("loc.emptyDescription")}
            action={<LocationDialog warehouses={warehouses} categories={categories} />}
          />
        ) : (
          <LocationsTable rows={rows} warehouses={warehouses} categories={categories} />
        )}
      </div>
    </>
  );
}

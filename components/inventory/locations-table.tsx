"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { locationTypeMeta } from "@/lib/inventory/config";

import { LocationDialog } from "./location-dialog";
import type { LocationRow, StorageCategoryOption, WarehouseOption } from "./types";

export function LocationsTable({
  rows,
  warehouses,
  categories,
}: {
  rows: LocationRow[];
  warehouses: WarehouseOption[];
  categories: StorageCategoryOption[];
}) {
  const t = useTranslations("inventory");
  const [editing, setEditing] = useState<LocationRow | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("loc.colName")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("loc.colType")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("loc.colCode")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("loc.colWarehouse")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("loc.colStorageCategory")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className={cn("cursor-pointer hover:bg-muted/50", !r.active && "opacity-60")}
                onClick={() => setEditing(r)}
              >
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: locationTypeMeta(r.type).accent }}
                    />
                    {t(`locationTypes.${r.type}`)}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{r.code}</TableCell>
                <TableCell className="text-sm">
                  {r.warehouse ? (
                    <span className="font-mono text-xs text-muted-foreground">{r.warehouse.code}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.storageCategory ? (
                    r.storageCategory.name
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LocationDialog
        warehouses={warehouses}
        categories={categories}
        location={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        showTrigger={false}
      />
    </>
  );
}

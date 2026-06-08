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
import { operationTypeMeta } from "@/lib/inventory/config";

import { OperationTypeDialog } from "./operation-type-dialog";
import type { OperationTypeRow, WarehouseOption } from "./types";

export function OperationTypesTable({
  rows,
  warehouses,
}: {
  rows: OperationTypeRow[];
  warehouses: WarehouseOption[];
}) {
  const t = useTranslations("inventory");
  const [editing, setEditing] = useState<OperationTypeRow | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("ot.colName")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("ot.colType")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("ot.colCode")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("ot.colWarehouse")}</TableHead>
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
                      style={{ backgroundColor: operationTypeMeta(r.type).accent }}
                    />
                    {t(`operationTypeKinds.${r.type}`)}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{r.code}</TableCell>
                <TableCell className="text-sm">
                  {r.warehouse ? (
                    <span>
                      <span className="font-mono text-xs text-muted-foreground">{r.warehouse.code}</span>{" "}
                      {r.warehouse.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OperationTypeDialog
        warehouses={warehouses}
        operationType={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        showTrigger={false}
      />
    </>
  );
}

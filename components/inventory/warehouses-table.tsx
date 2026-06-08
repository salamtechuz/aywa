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

import { WarehouseDialog } from "./warehouse-dialog";
import type { WarehouseRow } from "./types";

export function WarehousesTable({ rows }: { rows: WarehouseRow[] }) {
  const t = useTranslations("inventory");
  const [editing, setEditing] = useState<WarehouseRow | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("wh.colCode")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("wh.colName")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("wh.colAddress")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("wh.colLocations")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("wh.colOperations")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className={cn("cursor-pointer hover:bg-muted/50", !r.active && "opacity-60")}
                onClick={() => setEditing(r)}
              >
                <TableCell className="font-mono text-sm font-medium">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.address ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.locationCount}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.operationCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <WarehouseDialog
        warehouse={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        showTrigger={false}
      />
    </>
  );
}

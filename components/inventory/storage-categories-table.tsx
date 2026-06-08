"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { StorageCategoryDialog } from "./storage-category-dialog";
import type { StorageCategoryRow } from "./types";

export function StorageCategoriesTable({ rows }: { rows: StorageCategoryRow[] }) {
  const t = useTranslations("inventory");
  const [editing, setEditing] = useState<StorageCategoryRow | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("sc.colName")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("sc.colCapacity")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("sc.colMaxWeight")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-center">{t("sc.colAllowNew")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("sc.colLocations")}</TableHead>
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
                <TableCell className="text-right tabular-nums text-sm">
                  {r.capacity ?? <span className="text-muted-foreground">{t("sc.unlimited")}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {r.maxWeight != null ? `${r.maxWeight} kg` : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  {r.allowNew ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 inline" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground inline" />
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">{r.locationCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StorageCategoryDialog
        category={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        showTrigger={false}
      />
    </>
  );
}

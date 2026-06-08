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
import { uomCategoryMeta } from "@/lib/inventory/config";

import { UomDialog } from "./uom-dialog";
import type { UnitOfMeasureRow } from "./types";

function fmtFactor(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

export function UnitsTable({ rows }: { rows: UnitOfMeasureRow[] }) {
  const t = useTranslations("inventory");
  const [editing, setEditing] = useState<UnitOfMeasureRow | null>(null);

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("uom.colName")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("uom.colCategory")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("uom.colContains")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("uom.colReference")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const isBase = !r.referenceUnit;
              return (
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
                        style={{ backgroundColor: uomCategoryMeta(r.category).accent }}
                      />
                      {t(`uomCategories.${r.category}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {isBase ? (
                      <span className="text-muted-foreground text-xs italic">{t("uom.base")}</span>
                    ) : (
                      fmtFactor(r.factor)
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.referenceUnit ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <UomDialog
        unit={editing ?? undefined}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        showTrigger={false}
      />
    </>
  );
}

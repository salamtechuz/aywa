"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Package, Pencil, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQty } from "@/lib/manufacturing/stages";
import { deleteBom } from "@/app/(app)/manufacturing/actions";

import { BomDialog } from "./bom-dialog";
import type { BomRow, BomDetail, ProductOption } from "./types";

type Props = {
  boms: BomRow[];
  products: ProductOption[];
};

export function BomsTable({ boms, products }: Props) {
  const t = useTranslations("manufacturing");
  const [editing, setEditing] = useState<BomDetail | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteBom(id);
      if (res.ok) toast.success(t("toasts.bomDeleted"));
      else toast.error(res.error);
    });

  const openEdit = (b: BomRow) =>
    setEditing({
      id: b.id,
      productId: b.product.id,
      quantity: b.quantity,
      active: b.active,
      notes: b.notes,
      components: b.components,
    });

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider w-28">{t("colReference")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("producedProduct")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("outputQty")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colComponents")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {boms.map((b) => (
              <TableRow key={b.id} className={b.active ? "" : "opacity-50"}>
                <TableCell className="font-mono text-xs">{b.reference}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{b.product.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{b.product.sku}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatQty(b.quantity)} {b.product.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                  {b.components.length}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={t("edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(b.id)}
                      disabled={pending}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-30"
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <BomDialog
          products={products}
          bom={editing}
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          showTrigger={false}
        />
      )}
    </>
  );
}

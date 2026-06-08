"use client";

import { AlertTriangle, Package, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ProductDetailDrawer } from "./product-detail-drawer";
import type { MovementRow } from "./stock-movements-panel";

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  price: number;
  cost: number;
  stockOnHand: number;
  reorderAt: number;
  active: boolean;
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductsTable({
  rows,
  movementsByProductId,
}: {
  rows: ProductRow[];
  movementsByProductId: Record<string, MovementRow[]>;
}) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Localized labels for the known (seed) categories; custom categories fall
  // back to their raw stored value. Category values themselves stay English in
  // the DB so filtering/data are unchanged — only the display label localizes.
  const categoryNames = t.raw("categoryNames") as Record<string, string>;
  const catLabel = (c: string) => categoryNames[c] ?? c;
  const unitNames = t.raw("units") as Record<string, string>;
  const unitLabel = (u: string) => unitNames[u] ?? u;

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.category && set.add(r.category));
    return [...set].sort();
  }, [rows]);
  const [category, setCategory] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "ALL" && r.category !== category) return false;
      if (q) {
        const hay = `${r.sku} ${r.name} ${r.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, category]);

  const openProduct = openId ? rows.find((r) => r.id === openId) ?? null : null;

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setCategory("ALL")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              category === "ALL"
                ? "bg-foreground text-background border-foreground"
                : "bg-card hover:bg-muted",
            )}
          >
            {tc("all")}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                category === c
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {tc("ofTotal", { count: filtered.length, total: rows.length })}
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("colProduct")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colCategory")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colPrice")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colCost")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colMargin")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colStock")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {query ? tc("noResults") : t("noProducts")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => {
              const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
              const lowStock = p.stockOnHand <= p.reorderAt && p.reorderAt > 0;
              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setOpenId(p.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{p.sku}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.category ? (
                      <Badge variant="outline" className="text-xs">
                        {catLabel(p.category)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {fmt(p.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {fmt(p.cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        margin >= 50 && "text-emerald-600 dark:text-emerald-400",
                        margin < 30 && "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {margin.toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
                        lowStock && "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {lowStock && <AlertTriangle className="h-3 w-3" />}
                      {p.stockOnHand}
                      <span className="text-[10px] text-muted-foreground font-normal ml-1">
                        {unitLabel(p.unit)}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProductDetailDrawer
        product={openProduct ? { ...openProduct, onHand: openProduct.stockOnHand } : null}
        movements={openId ? movementsByProductId[openId] ?? [] : []}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </>
  );
}

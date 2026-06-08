"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StockRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  onHand: number;
  cost: number;
  reorderAt: number;
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function StockReportTable({ rows }: { rows: StockRow[] }) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");
  const unitNames = t.raw("units") as Record<string, string>;
  const unitLabel = (u: string) => unitNames[u] ?? u;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.sku} ${r.name}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("stockReport.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {tc("ofTotal", { count: filtered.length, total: rows.length })}
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("stockReport.colProduct")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("stockReport.colOnHand")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("stockReport.colUnit")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("stockReport.colUnitCost")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("stockReport.colValue")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {query ? tc("noResults") : t("stockReport.empty")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const low = r.reorderAt > 0 && r.onHand <= r.reorderAt;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{r.sku}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 tabular-nums text-sm font-medium",
                        low && "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {low && <AlertTriangle className="h-3 w-3" />}
                      {r.onHand}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{unitLabel(r.unit)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {fmt(r.cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {fmt(r.onHand * r.cost)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

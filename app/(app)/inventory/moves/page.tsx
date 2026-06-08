import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActiveWorkspace } from "@/lib/tenant";
import { listAllMovements } from "@/lib/inventory/stock";
import { TYPE_META, sourceLabelKey } from "@/lib/inventory/movement-meta";

export const metadata = { title: "Moves History" };

const PAGE_SIZE = 100;
const TYPE_FILTERS = ["ALL", "IN", "OUT", "ADJUSTMENT", "INITIAL", "TRANSFER"] as const;

export default async function MovesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const ws = await getActiveWorkspace();
  const t = await getTranslations("inventory");
  const tCal = await getTranslations("calendar");
  const monthsShort = tCal.raw("monthsShort") as string[];

  const activeType = sp.type && sp.type !== "ALL" ? sp.type : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listAllMovements(ws.id, {
    type: activeType,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fmtDate = (d: Date | string) => {
    const date = new Date(d);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${date.getDate()} ${monthsShort[date.getMonth()]} ${date.getFullYear()}, ${hh}:${mm}`;
  };

  const buildHref = (next: { type?: string; page?: number }) => {
    const u = new URLSearchParams();
    const ty = next.type ?? sp.type;
    if (ty && ty !== "ALL") u.set("type", ty);
    const p = next.page ?? page;
    if (p && p > 1) u.set("page", String(p));
    const qs = u.toString();
    return `/inventory/moves${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={t("movesReport.title")}
        description={t("movesReport.description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {total}
          </Badge>
        }
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4">
        <div className="flex gap-1 flex-wrap">
          {TYPE_FILTERS.map((ty) => {
            const isActive = (ty === "ALL" && !activeType) || ty === activeType;
            return (
              <Link
                key={ty}
                href={buildHref({ type: ty, page: 1 })}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card hover:bg-muted",
                )}
              >
                {ty === "ALL" ? t("movesReport.filterAll") : t(`movementType.${ty.toLowerCase()}`)}
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-2 py-10 text-center">
            {t("movesReport.empty")}
          </p>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">{t("movesReport.colDate")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("movesReport.colProduct")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("movesReport.colType")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">{t("movesReport.colQty")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("movesReport.colSource")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("movesReport.colReason")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("movesReport.colOwner")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => {
                  const meta = TYPE_META[m.type] ?? TYPE_META.ADJUSTMENT;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{m.product.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{m.product.sku}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                          {t(meta.labelKey)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t(sourceLabelKey(m.sourceType))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[16rem] truncate">
                        {m.reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.ownerName ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("movesReport.showing", {
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, total),
                total,
              })}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={buildHref({ page: page - 1 })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("movesReport.prev")}
                </Link>
              ) : (
                <span />
              )}
              {page < pages ? (
                <Link
                  href={buildHref({ page: page + 1 })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("movesReport.next")}
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

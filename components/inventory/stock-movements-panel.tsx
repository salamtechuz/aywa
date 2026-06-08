"use client";

import { ArrowDownToLine, ArrowUpFromLine, Loader2, PackageCheck, Plus, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { adjustStock } from "@/app/(app)/inventory/movement-actions";

export type MovementRow = {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  sourceType: string;
  sourceId: string | null;
  ownerName: string | null;
  createdAt: Date | string;
};

const TYPE_META: Record<
  string,
  { icon: typeof ArrowDownToLine; color: string; labelKey: string }
> = {
  IN: {
    icon: ArrowDownToLine,
    color: "text-emerald-600 dark:text-emerald-400",
    labelKey: "movementType.in",
  },
  INITIAL: {
    icon: PackageCheck,
    color: "text-sky-600 dark:text-sky-400",
    labelKey: "movementType.initial",
  },
  OUT: {
    icon: ArrowUpFromLine,
    color: "text-red-600 dark:text-red-400",
    labelKey: "movementType.out",
  },
  ADJUSTMENT: {
    icon: Settings2,
    color: "text-amber-600 dark:text-amber-400",
    labelKey: "movementType.adjustment",
  },
  TRANSFER: {
    icon: Settings2,
    color: "text-violet-600 dark:text-violet-400",
    labelKey: "movementType.transfer",
  },
};

function daysSince(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function sourceLabelKey(sourceType: string): string {
  if (sourceType === "SALES_ORDER") return "source.salesOrder";
  if (sourceType === "PURCHASE_ORDER") return "source.purchaseOrder";
  if (sourceType === "INITIAL_LOAD") return "source.initialInventory";
  return "source.manual";
}

type Props = {
  productId: string;
  onHand: number;
  unit: string;
  reorderAt: number;
  movements: MovementRow[];
};

export function StockMovementsPanel({
  productId,
  onHand,
  unit,
  reorderAt,
  movements,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const tCal = useTranslations("calendar");
  // Localized unit label (each → шт./dona…); custom units fall back to raw.
  const unitLabel = (t.raw("units") as Record<string, string>)[unit] ?? unit;
  const monthsShort = tCal.raw("monthsShort") as string[];
  const [adjusting, startAdjust] = useTransition();
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const lowStock = reorderAt > 0 && onHand <= reorderAt;

  const fmtDate = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    const days = daysSince(d);
    if (days === 0) return t("today");
    if (days === 1) return t("yesterday");
    if (days < 30) return t("daysAgo", { days });
    // Localized "D MMM YYYY" using our own month names (Intl lacks `uz` data and
    // ignores the app locale here, so dates were rendering in English).
    return `${date.getDate()} ${monthsShort[date.getMonth()]} ${date.getFullYear()}`;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(qty);
    if (!Number.isFinite(value) || value === 0) {
      toast.error(t("quantityNonZero"));
      return;
    }
    const delta = direction === "IN" ? Math.abs(value) : -Math.abs(value);
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("delta", String(delta));
    if (reason) fd.set("reason", reason);
    startAdjust(async () => {
      const res = await adjustStock(fd);
      if (res.ok) {
        toast.success(t("stockAdjusted"));
        setQty("");
        setReason("");
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{onHand}</span>
          <span className="text-sm text-muted-foreground">{t("onHand", { unit: unitLabel })}</span>
          {lowStock && (
            <span className="ml-1 inline-flex items-center rounded-full bg-red-500/15 text-red-700 dark:text-red-300 text-[10px] font-semibold px-1.5 py-0.5">
              {t("lowStockBadge")}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("adjust")}
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <div className="grid gap-1">
              <Label htmlFor="direction" className="text-xs">
                {t("direction")}
              </Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as "IN" | "OUT")}
              >
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">{t("restock")}</SelectItem>
                  <SelectItem value="OUT">{t("writeOff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="qty" className="text-xs">
                {t("quantityUnit", { unit: unitLabel })}
              </Label>
              <Input
                id="qty"
                type="number"
                min="0.01"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={t("quantityPlaceholder")}
                autoFocus
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="reason" className="text-xs">
              {t("reasonOptional")}
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={adjusting}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={adjusting || !qty}>
              {adjusting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("apply")}
            </Button>
          </div>
        </form>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          {t("movements")}
        </div>
        {movements.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-3">
            {t("noMovements")}
          </p>
        ) : (
          <ol className="space-y-1.5">
            {movements.map((m) => {
              const meta = TYPE_META[m.type] ?? TYPE_META.ADJUSTMENT;
              const Icon = meta.icon;
              const positive = m.quantity > 0;
              return (
                <li
                  key={m.id}
                  className="flex items-start gap-2 rounded-md border bg-card px-2.5 py-2"
                >
                  <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium tabular-nums">
                        {positive ? "+" : ""}
                        {m.quantity}
                      </span>
                      <span className="text-muted-foreground">{unitLabel}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                        {t(meta.labelKey)}
                      </span>
                    </div>
                    {m.reason && (
                      <div className="text-xs text-muted-foreground truncate">
                        {m.reason}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {t(sourceLabelKey(m.sourceType))} · {fmtDate(m.createdAt)}
                      {m.ownerName ? ` · ${m.ownerName}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

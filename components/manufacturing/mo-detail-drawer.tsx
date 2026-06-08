"use client";

import { ArrowRight, Loader2, Package, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { cn } from "@/lib/utils";
import { ALL_MO_STATUSES, formatQty } from "@/lib/manufacturing/stages";
import {
  advanceManufacturingOrder,
  deleteManufacturingOrder,
  updateManufacturingOrder,
} from "@/app/(app)/manufacturing/actions";

import type { MoData } from "./types";

type Props = {
  order: MoData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toDateInput(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

const NEXT_LABEL_KEY: Record<string, string> = {
  DRAFT: "actions.confirm",
  CONFIRMED: "actions.start",
  IN_PROGRESS: "actions.complete",
};

export function MoDetailDrawer({ order, open, onOpenChange }: Props) {
  const t = useTranslations("manufacturing");
  const [saving, startSave] = useTransition();
  const [advancing, startAdvance] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const statusItems = Object.fromEntries(ALL_MO_STATUSES.map((s) => [s, t(`statuses.${s}`)]));

  if (!order) {
    return (
      <DetailDrawer open={open} onOpenChange={onOpenChange} title="">
        <div />
      </DetailDrawer>
    );
  }

  const onSubmit = (formData: FormData) => {
    formData.set("id", order.id);
    startSave(async () => {
      const res = await updateManufacturingOrder(formData);
      if (res.ok) toast.success(t("toasts.orderUpdated"));
      else toast.error(res.error);
    });
  };

  const onDelete = async () => {
    if (!confirm(t("confirmDelete", { number: order.number }))) return;
    setDeleting(true);
    const res = await deleteManufacturingOrder(order.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("toasts.orderDeleted"));
      onOpenChange(false);
    } else {
      toast.error(res.error ?? t("toasts.deleteFailed"));
    }
  };

  const onAdvance = () => {
    startAdvance(async () => {
      const res = await advanceManufacturingOrder(order.id);
      if (res.ok && res.next) toast.success(t("toasts.movedTo", { status: t(`statuses.${res.next}`) }));
      else if (!res.ok) toast.error(res.error);
    });
  };

  const nextLabelKey = NEXT_LABEL_KEY[order.status];
  const committed = order.status === "DONE";

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={order.number}
      description={`${formatQty(order.quantity)} ${order.product.unit} · ${t(`statuses.${order.status}`)}`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> {t("delete")}
          </Button>
          <div className="flex items-center gap-2">
            {nextLabelKey && (
              <Button variant="outline" onClick={onAdvance} disabled={advancing} className="gap-1.5">
                {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {t(nextLabelKey)}
              </Button>
            )}
            <Button form="mo-form" type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </div>
        </div>
      }
    >
      {/* Produced good */}
      <div className="rounded-lg border bg-card p-3 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {t("produces")}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">{order.product.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{order.product.sku}</div>
            </div>
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {formatQty(order.quantity)} {order.product.unit}
          </div>
        </div>
      </div>

      {/* Build plan / component availability */}
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("components")}</h3>
          {order.bomReference && (
            <span className="text-[11px] text-muted-foreground font-mono">{order.bomReference}</span>
          )}
        </div>
        {order.plan.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground">
            {t("noComponents")}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-medium py-2 pl-3">{t("table.component")}</th>
                  <th className="text-right font-medium py-2">{t("table.required")}</th>
                  <th className="text-right font-medium py-2 pr-3">{t("table.available")}</th>
                </tr>
              </thead>
              <tbody>
                {order.plan.map((c) => {
                  const short = !committed && c.available < c.required;
                  return (
                    <tr key={c.productId} className="border-b last:border-0">
                      <td className="pl-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{c.sku}</span>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-2 tabular-nums">
                        {formatQty(c.required)} {c.unit}
                      </td>
                      <td
                        className={cn(
                          "text-right pr-3 py-2 tabular-nums",
                          short && "text-amber-600 dark:text-amber-400 font-medium",
                        )}
                      >
                        {formatQty(c.available)} {c.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!committed && order.shortage && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">{t("shortageNote")}</p>
        )}
        {committed && <p className="text-[11px] text-muted-foreground">{t("committedNote")}</p>}
      </div>

      <Separator className="my-5" />

      <form id="mo-form" action={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="quantity">{t("quantity")}</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              step="any"
              defaultValue={order.quantity}
              disabled={committed}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="status">{t("status")}</Label>
            <Select name="status" items={statusItems} defaultValue={order.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_MO_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="scheduledDate">{t("scheduledDate")}</Label>
            <Input
              id="scheduledDate"
              name="scheduledDate"
              type="date"
              defaultValue={toDateInput(order.scheduledDate)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ownerName">{t("owner")}</Label>
            <Input id="ownerName" name="ownerName" defaultValue={order.ownerName ?? ""} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={order.notes ?? ""}
            placeholder={t("notesPlaceholder")}
          />
        </div>
      </form>
    </DetailDrawer>
  );
}

"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { deleteProduct, updateProduct } from "@/app/(app)/inventory/actions";
import {
  StockMovementsPanel,
  type MovementRow,
} from "./stock-movements-panel";

import type { ProductRow } from "./products-table";

type Props = {
  product: (ProductRow & { onHand: number }) | null;
  movements: MovementRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductDetailDrawer({ product, movements, open, onOpenChange }: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [saving, startSave] = useTransition();
  const [deleting, setDeleting] = useState(false);

  if (!product) {
    return (
      <DetailDrawer open={open} onOpenChange={onOpenChange} title="">
        <div />
      </DetailDrawer>
    );
  }

  const margin = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0;

  // Category select: localized labels for known categories + the product's own
  // value (so a custom category is preserved). The Select stores the raw value.
  const categoryNames = t.raw("categoryNames") as Record<string, string>;
  const categoryOptions: Record<string, string> = { ...categoryNames };
  if (product.category && !(product.category in categoryOptions)) {
    categoryOptions[product.category] = product.category;
  }

  const onSubmit = (formData: FormData) => {
    formData.set("id", product.id);
    startSave(async () => {
      const res = await updateProduct(formData);
      if (res.ok) toast.success(t("productUpdated"));
      else toast.error(res.error);
    });
  };

  const onDelete = async () => {
    if (!confirm(t("deleteConfirm", { name: product.name }))) return;
    setDeleting(true);
    const res = await deleteProduct(product.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("productDeleted"));
      onOpenChange(false);
    } else {
      toast.error(t("deleteFailed"));
    }
  };

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={product.name}
      description={`${product.sku} · ${fmt(product.price)} · ${t("marginValue", { value: margin.toFixed(0) })}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> {tc("delete")}
          </Button>
          <Button form="product-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("saveChanges")}
          </Button>
        </div>
      }
    >
      <form id="product-form" action={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" defaultValue={product.sku} className="font-mono" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="unit">{t("unit")}</Label>
            <Select name="unit" items={t.raw("units") as Record<string, string>} defaultValue={product.unit}>
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="each">{t("units.each")}</SelectItem>
                <SelectItem value="kg">{t("units.kg")}</SelectItem>
                <SelectItem value="hour">{t("units.hour")}</SelectItem>
                <SelectItem value="license">{t("units.license")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="name">{t("labelName")}</Label>
          <Input id="name" name="name" defaultValue={product.name} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="category">{t("labelCategory")}</Label>
          <Select name="category" items={categoryOptions} defaultValue={product.category ?? undefined}>
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder={t("labelCategory")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryOptions).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="price">{t("labelPrice")}</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="100"
              defaultValue={product.price}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cost">{t("labelCost")}</Label>
            <Input
              id="cost"
              name="cost"
              type="number"
              min="0"
              step="100"
              defaultValue={product.cost}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="reorderAt">{t("labelReorderAtUnits")}</Label>
          <Input
            id="reorderAt"
            name="reorderAt"
            type="number"
            min="0"
            defaultValue={product.reorderAt}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("reorderHint")}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="description">{t("labelDescription")}</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={product.description ?? ""}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div>
            <div className="text-sm font-medium">{t("active")}</div>
            <div className="text-xs text-muted-foreground">
              {t("activeHint")}
            </div>
          </div>
          <Switch name="active" defaultChecked={product.active} value="true" />
        </div>
      </form>

      <Separator className="my-6" />

      <StockMovementsPanel
        productId={product.id}
        onHand={product.onHand}
        unit={product.unit}
        reorderAt={product.reorderAt}
        movements={movements}
      />
    </DetailDrawer>
  );
}

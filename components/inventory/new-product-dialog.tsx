"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct } from "@/app/(app)/inventory/actions";

export function NewProductDialog() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();

  const onSubmit = (formData: FormData) => {
    startSave(async () => {
      const res = await createProduct(formData);
      if (res.ok) {
        toast.success(t("productAdded"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newProduct")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newProduct")}</DialogTitle>
          <DialogDescription>
            {t("newProductDescription")}
          </DialogDescription>
        </DialogHeader>
        <form id="new-product-form" action={onSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" required placeholder="PLT-PRO" className="font-mono" autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="unit">{t("unit")}</Label>
              <Select name="unit" items={t.raw("units") as Record<string, string>} defaultValue="each">
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
            <Input id="name" name="name" required placeholder="aywa Platform — Pro" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="category">{t("labelCategory")}</Label>
            <Input id="category" name="category" placeholder={t("categoryPlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="price">{t("labelPrice")}</Label>
              <Input id="price" name="price" type="number" min="0" step="100" defaultValue="0" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cost">{t("labelCost")}</Label>
              <Input id="cost" name="cost" type="number" min="0" step="100" defaultValue="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="stockOnHand">{t("labelStockOnHand")}</Label>
              <Input
                id="stockOnHand"
                name="stockOnHand"
                type="number"
                min="0"
                defaultValue="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reorderAt">{t("labelReorderAt")}</Label>
              <Input id="reorderAt" name="reorderAt" type="number" min="0" defaultValue="0" />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button form="new-product-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addProduct")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

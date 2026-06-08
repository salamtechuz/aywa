"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { LOCATION_TYPES } from "@/lib/inventory/config";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/app/(app)/inventory/location-actions";

import type { LocationRow, StorageCategoryOption, WarehouseOption } from "./types";

type Props = {
  warehouses: WarehouseOption[];
  categories: StorageCategoryOption[];
  location?: LocationRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function LocationDialog({
  warehouses,
  categories,
  location,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const isEdit = Boolean(location);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const typeItems = Object.fromEntries(
    LOCATION_TYPES.map((l) => [l.id, t(`locationTypes.${l.id}`)]),
  );
  const warehouseItems: Record<string, string> = {
    "": t("none"),
    ...Object.fromEntries(warehouses.map((w) => [w.id, `${w.code} · ${w.name}`])),
  };
  const categoryItems: Record<string, string> = {
    "": t("none"),
    ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
  };

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = isEdit ? await updateLocation(formData) : await createLocation(formData);
      if (res.ok) {
        toast.success(isEdit ? t("loc.saved") : t("loc.created"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = async () => {
    if (!location) return;
    if (!confirm(t("loc.deleteConfirm", { name: location.name }))) return;
    setDeleting(true);
    const res = await deleteLocation(location.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("loc.deleted"));
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && !isEdit && (
        <DialogTrigger
          render={
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("loc.new")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("loc.edit") : t("loc.new")}</DialogTitle>
          <DialogDescription>{t("loc.description")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={location!.id} />}
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5 col-span-2">
              <Label htmlFor="name">{t("loc.labelName")}</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={location?.name}
                placeholder={t("loc.namePlaceholder")}
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code">{t("loc.labelCode")}</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={location?.code}
                placeholder={t("loc.codePlaceholder")}
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">{t("loc.labelType")}</Label>
            <Select name="type" items={typeItems} defaultValue={location?.type ?? "INTERNAL"}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {t(`locationTypes.${l.id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="warehouseId">{t("loc.labelWarehouse")}</Label>
              <Select
                name="warehouseId"
                items={warehouseItems}
                defaultValue={location?.warehouse?.id ?? ""}
              >
                <SelectTrigger id="warehouseId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("none")}</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} · {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="storageCategoryId">{t("loc.labelStorageCategory")}</Label>
              <Select
                name="storageCategoryId"
                items={categoryItems}
                defaultValue={location?.storageCategory?.id ?? ""}
              >
                <SelectTrigger id="storageCategoryId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("none")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={location?.active}
                className="h-4 w-4 rounded border-input"
              />
              {t("active")}
            </label>
          )}
          <DialogFooter className="sm:justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={deleting || pending}
                className="text-destructive hover:text-destructive gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> {tc("delete")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  tc("save")
                ) : (
                  tc("create")
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

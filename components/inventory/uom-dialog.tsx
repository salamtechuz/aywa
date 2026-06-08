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
import { UOM_CATEGORIES } from "@/lib/inventory/config";
import {
  createUnitOfMeasure,
  deleteUnitOfMeasure,
  updateUnitOfMeasure,
} from "@/app/(app)/inventory/uom-actions";

import type { UnitOfMeasureRow } from "./types";

type Props = {
  unit?: UnitOfMeasureRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function UomDialog({
  unit,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const isEdit = Boolean(unit);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const categoryItems = Object.fromEntries(
    UOM_CATEGORIES.map((c) => [c.id, t(`uomCategories.${c.id}`)]),
  );

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = isEdit ? await updateUnitOfMeasure(formData) : await createUnitOfMeasure(formData);
      if (res.ok) {
        toast.success(isEdit ? t("uom.saved") : t("uom.created"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = async () => {
    if (!unit) return;
    if (!confirm(t("uom.deleteConfirm", { name: unit.name }))) return;
    setDeleting(true);
    const res = await deleteUnitOfMeasure(unit.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("uom.deleted"));
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
              {t("uom.new")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("uom.edit") : t("uom.new")}</DialogTitle>
          <DialogDescription>{t("uom.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={unit!.id} />}
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">{t("uom.labelName")}</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={unit?.name}
                placeholder={t("uom.namePlaceholder")}
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category">{t("uom.labelCategory")}</Label>
              <Select name="category" items={categoryItems} defaultValue={unit?.category ?? "UNIT"}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {t(`uomCategories.${c.id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="factor">{t("uom.labelFactor")}</Label>
              <Input
                id="factor"
                name="factor"
                type="number"
                min="0"
                step="any"
                defaultValue={unit?.factor ?? 1}
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="referenceUnit">{t("uom.labelReferenceUnit")}</Label>
              <Input
                id="referenceUnit"
                name="referenceUnit"
                defaultValue={unit?.referenceUnit ?? ""}
                placeholder={t("uom.referencePlaceholder")}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">{t("uom.factorHint")}</p>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={unit?.active}
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

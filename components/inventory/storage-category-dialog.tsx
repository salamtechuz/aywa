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
  createStorageCategory,
  deleteStorageCategory,
  updateStorageCategory,
} from "@/app/(app)/inventory/storage-category-actions";

import type { StorageCategoryRow } from "./types";

type Props = {
  category?: StorageCategoryRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function StorageCategoryDialog({
  category,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const isEdit = Boolean(category);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = isEdit
        ? await updateStorageCategory(formData)
        : await createStorageCategory(formData);
      if (res.ok) {
        toast.success(isEdit ? t("sc.saved") : t("sc.created"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = async () => {
    if (!category) return;
    if (!confirm(t("sc.deleteConfirm", { name: category.name }))) return;
    setDeleting(true);
    const res = await deleteStorageCategory(category.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("sc.deleted"));
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
              {t("sc.new")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("sc.edit") : t("sc.new")}</DialogTitle>
          <DialogDescription>{t("sc.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={category!.id} />}
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("sc.labelName")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={category?.name}
              placeholder={t("sc.namePlaceholder")}
              autoFocus={!isEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="capacity">{t("sc.labelCapacity")}</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="0"
                defaultValue={category?.capacity ?? ""}
                placeholder={t("sc.unlimited")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="maxWeight">{t("sc.labelMaxWeight")}</Label>
              <Input
                id="maxWeight"
                name="maxWeight"
                type="number"
                min="0"
                step="0.1"
                defaultValue={category?.maxWeight ?? ""}
                placeholder={t("sc.unlimited")}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="allowNew"
              value="true"
              defaultChecked={isEdit ? category?.allowNew : true}
              className="h-4 w-4 rounded border-input"
            />
            {t("sc.labelAllowNew")}
          </label>
          <p className="text-[11px] text-muted-foreground -mt-1">{t("sc.allowNewHint")}</p>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={category?.active}
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

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
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from "@/app/(app)/inventory/warehouse-actions";

import type { WarehouseRow } from "./types";

type Props = {
  warehouse?: WarehouseRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function WarehouseDialog({
  warehouse,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const isEdit = Boolean(warehouse);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = isEdit ? await updateWarehouse(formData) : await createWarehouse(formData);
      if (res.ok) {
        toast.success(isEdit ? t("wh.saved") : t("wh.created"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = async () => {
    if (!warehouse) return;
    if (!confirm(t("wh.deleteConfirm", { name: warehouse.name }))) return;
    setDeleting(true);
    const res = await deleteWarehouse(warehouse.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("wh.deleted"));
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
              {t("wh.new")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("wh.edit") : t("wh.new")}</DialogTitle>
          <DialogDescription>{t("wh.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={warehouse!.id} />}
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="code">{t("wh.labelCode")}</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={warehouse?.code}
                placeholder={t("wh.codePlaceholder")}
                className="font-mono"
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label htmlFor="name">{t("wh.labelName")}</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={warehouse?.name}
                placeholder={t("wh.namePlaceholder")}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">{t("wh.labelAddress")}</Label>
            <Input
              id="address"
              name="address"
              defaultValue={warehouse?.address ?? ""}
              placeholder={t("wh.addressPlaceholder")}
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={warehouse?.active}
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

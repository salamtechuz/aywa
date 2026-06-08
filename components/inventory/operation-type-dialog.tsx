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
import { OPERATION_TYPES } from "@/lib/inventory/config";
import {
  createOperationType,
  deleteOperationType,
  updateOperationType,
} from "@/app/(app)/inventory/operation-type-actions";

import type { OperationTypeRow, WarehouseOption } from "./types";

type Props = {
  warehouses: WarehouseOption[];
  operationType?: OperationTypeRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function OperationTypeDialog({
  warehouses,
  operationType,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const isEdit = Boolean(operationType);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  // Base UI <Select.Value> needs an `items` value→label map or the trigger
  // renders the raw id instead of the localized label.
  const typeItems = Object.fromEntries(
    OPERATION_TYPES.map((o) => [o.id, t(`operationTypeKinds.${o.id}`)]),
  );
  const warehouseItems: Record<string, string> = {
    "": t("none"),
    ...Object.fromEntries(warehouses.map((w) => [w.id, `${w.code} · ${w.name}`])),
  };

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = isEdit
        ? await updateOperationType(formData)
        : await createOperationType(formData);
      if (res.ok) {
        toast.success(isEdit ? t("ot.saved") : t("ot.created"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = async () => {
    if (!operationType) return;
    if (!confirm(t("ot.deleteConfirm", { name: operationType.name }))) return;
    setDeleting(true);
    const res = await deleteOperationType(operationType.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("ot.deleted"));
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
              {t("ot.new")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("ot.edit") : t("ot.new")}</DialogTitle>
          <DialogDescription>{t("ot.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={operationType!.id} />}
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("ot.labelName")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={operationType?.name}
              placeholder={t("ot.namePlaceholder")}
              autoFocus={!isEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="type">{t("ot.labelType")}</Label>
              <Select name="type" items={typeItems} defaultValue={operationType?.type ?? "RECEIPT"}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_TYPES.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {t(`operationTypeKinds.${o.id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code">{t("ot.labelCode")}</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={operationType?.code}
                placeholder={t("ot.codePlaceholder")}
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="warehouseId">{t("ot.labelWarehouse")}</Label>
            <Select
              name="warehouseId"
              items={warehouseItems}
              defaultValue={operationType?.warehouse?.id ?? ""}
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
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={operationType?.active}
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

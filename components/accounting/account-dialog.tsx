"use client";

import { Loader2, Plus } from "lucide-react";
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
import { ACCOUNT_TYPES } from "@/lib/accounting/stages";
import { createAccount, updateAccount } from "@/app/(app)/accounting/actions";

import type { AccountRow } from "./types";

type Props = {
  defaultCurrency: string;
  account?: AccountRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function AccountDialog({
  defaultCurrency,
  account,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("accounting");
  const isEdit = Boolean(account);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();

  // Base UI <Select.Value> shows the raw bound value unless the Root gets an
  // `items` value→label map — without it the trigger renders "ASSET" instead
  // of the localized account-type label.
  const accountTypeItems = Object.fromEntries(
    ACCOUNT_TYPES.map((tp) => [tp.id, t(`accountTypes.${tp.id}`)]),
  );

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = isEdit ? await updateAccount(formData) : await createAccount(formData);
      if (res.ok) {
        toast.success(isEdit ? t("toasts.accountSaved") : t("toasts.accountCreated"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && !isEdit && (
        <DialogTrigger
          render={
            <Button variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("newAccount")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editAccount") : t("newAccount")}</DialogTitle>
          <DialogDescription>{t("accountDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={account!.id} />}
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="code">{t("code")}</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={account?.code}
                placeholder="1100"
                className="font-mono"
                autoFocus={!isEdit}
              />
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label htmlFor="name">{t("accountName")}</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={account?.name}
                placeholder="Accounts Receivable"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="type">{t("type")}</Label>
              <Select name="type" items={accountTypeItems} defaultValue={account?.type ?? "ASSET"}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>
                      {t(`accountTypes.${tp.id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="currency">{t("currency")}</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={account?.currency ?? defaultCurrency}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              name="description"
              defaultValue={account?.description ?? ""}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={account?.active}
                className="h-4 w-4 rounded border-input"
              />
              {t("activeAccount")}
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

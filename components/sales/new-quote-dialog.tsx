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
import { createQuote } from "@/app/(app)/sales/actions";

type Props = {
  contacts: { id: string; name: string; company: string | null }[];
};

export function NewQuoteDialog({ contacts }: Props) {
  const t = useTranslations("sales");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();

  const onSubmit = (formData: FormData) => {
    startSave(async () => {
      const res = await createQuote(formData);
      if (res.ok) {
        toast.success(t("toast.quoteCreated", { number: res.number }));
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
            <Plus className="h-4 w-4" /> {t("newQuote")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newQuote")}</DialogTitle>
          <DialogDescription>
            {t("dialog.newQuoteDescription")}
          </DialogDescription>
        </DialogHeader>
        <form id="new-quote-form" action={onSubmit} className="space-y-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="customerId">{t("fields.customer")}</Label>
            <Select name="customerId">
              <SelectTrigger id="customerId">
                <SelectValue placeholder={t("dialog.pickCustomer")} />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="amount">{t("dialog.amountUsd")}</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="100"
                defaultValue="0"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expectedDate">{t("dialog.expectedClose")}</Label>
              <Input id="expectedDate" name="expectedDate" type="date" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ownerName">{t("fields.owner")}</Label>
            <Input id="ownerName" name="ownerName" placeholder={t("dialog.ownerPlaceholder")} />
          </div>
          <input type="hidden" name="status" value="DRAFT" />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button form="new-quote-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("dialog.createDraft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

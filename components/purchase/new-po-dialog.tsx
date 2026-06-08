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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseOrder } from "@/app/(app)/purchase/actions";

type VendorOption = { id: string; name: string };

export function NewPurchaseOrderDialog({ vendors }: { vendors: VendorOption[] }) {
  const t = useTranslations("purchase");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createPurchaseOrder(formData);
      if (res.ok) {
        toast.success(t("toasts.created", { number: res.number }));
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
            <Plus className="h-4 w-4" />
            {t("newPurchaseOrder")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newPurchaseOrder")}</DialogTitle>
          <DialogDescription>
            {t("newPoDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="vendorId">{t("vendor")}</Label>
            <Select name="vendorId">
              <SelectTrigger id="vendorId">
                <SelectValue placeholder={t("pickVendor")} />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ownerName">{t("owner")}</Label>
            <Input id="ownerName" name="ownerName" placeholder={t("ownerPlaceholder")} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="expectedDate">{t("expectedDelivery")}</Label>
            <Input id="expectedDate" name="expectedDate" type="date" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder={t("poNotesPlaceholder")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

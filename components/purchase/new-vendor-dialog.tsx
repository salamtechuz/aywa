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
import { createVendor } from "@/app/(app)/purchase/actions";

export function NewVendorDialog() {
  const t = useTranslations("purchase");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createVendor(formData);
      if (res.ok) {
        toast.success(t("toasts.vendorAdded"));
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
            {t("newVendor")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addVendor")}</DialogTitle>
          <DialogDescription>
            {t("addVendorDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("vendorNameRequired")}</Label>
            <Input id="name" name="name" required placeholder="Acme Supplies LLC" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="vendorCode">{t("code")}</Label>
              <Input id="vendorCode" name="vendorCode" placeholder="V-001" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="currency">{t("currency")}</Label>
              <Input id="currency" name="currency" defaultValue="USD" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
            <Input id="contactPerson" name="contactPerson" placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" name="email" type="email" placeholder="sales@acme.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" name="phone" placeholder="+1 555…" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="paymentTerms">{t("paymentTerms")}</Label>
            <Input id="paymentTerms" name="paymentTerms" placeholder="Net 30" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addVendor")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { createCustomer } from "@/app/(app)/crm/customer-actions";

export function NewCustomerDialog() {
  const t = useTranslations("crm");
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();

  const onSubmit = (formData: FormData) => {
    startSave(async () => {
      const res = await createCustomer(formData);
      if (res.ok) {
        toast.success(t("customers.dialog.added"));
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
            <Plus className="h-4 w-4" /> {t("customers.newCustomer")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("customers.newCustomer")}</DialogTitle>
          <DialogDescription>
            {t("customers.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form id="new-customer-form" action={onSubmit} className="space-y-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="type">{t("customers.dialog.type")}</Label>
            <Select name="type" defaultValue="PERSON">
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSON">{t("customers.dialog.person")}</SelectItem>
                <SelectItem value="COMPANY">{t("customers.dialog.company")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("customers.dialog.name")}</Label>
            <Input id="name" name="name" required placeholder="Jane Doe" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="company">{t("customers.dialog.companyLabel")}</Label>
            <Input id="company" name="company" placeholder="Acme Corp" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("customers.dialog.email")}</Label>
              <Input id="email" name="email" type="email" placeholder="jane@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">{t("customers.dialog.phone")}</Label>
              <Input id="phone" name="phone" placeholder="+1 555 0100" />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("customers.dialog.cancel")}
          </Button>
          <Button form="new-customer-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("customers.dialog.addCustomer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

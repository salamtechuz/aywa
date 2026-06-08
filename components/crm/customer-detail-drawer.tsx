"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { deleteCustomer, updateCustomer } from "@/app/(app)/crm/customer-actions";

import type { CustomerRow } from "./customers-table";

type Props = {
  customer: CustomerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomerDetailDrawer({ customer, open, onOpenChange }: Props) {
  const t = useTranslations("crm");
  const [saving, startSave] = useTransition();
  const [deleting, setDeleting] = useState(false);

  if (!customer) {
    return (
      <DetailDrawer open={open} onOpenChange={onOpenChange} title="">
        <div />
      </DetailDrawer>
    );
  }

  const onSubmit = (formData: FormData) => {
    formData.set("id", customer.id);
    startSave(async () => {
      const res = await updateCustomer(formData);
      if (res.ok) toast.success(t("customers.drawer.updated"));
      else toast.error(res.error);
    });
  };

  const onDelete = async () => {
    if (!confirm(t("customers.drawer.confirmDelete", { name: customer.name }))) return;
    setDeleting(true);
    const res = await deleteCustomer(customer.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("customers.drawer.deleted"));
      onOpenChange(false);
    } else {
      toast.error(t("customers.drawer.failedToDelete"));
    }
  };

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={customer.name}
      description={
        customer.company ??
        (customer.type === "COMPANY"
          ? t("customers.dialog.company")
          : t("customers.dialog.person"))
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> {t("customers.drawer.delete")}
          </Button>
          <Button form="customer-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("customers.drawer.saveChanges")}
          </Button>
        </div>
      }
    >
      <form id="customer-form" action={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="type">{t("customers.dialog.type")}</Label>
            <Select name="type" defaultValue={customer.type}>
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
            <Label>{t("customers.drawer.activity")}</Label>
            <div className="h-8 flex items-center gap-2 text-xs text-muted-foreground">
              {t("customers.drawer.dealsOrders", {
                deals: customer.dealsCount,
                orders: customer.ordersCount,
              })}
            </div>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="name">{t("customers.dialog.name")}</Label>
          <Input id="name" name="name" defaultValue={customer.name} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="company">{t("customers.dialog.companyLabel")}</Label>
          <Input id="company" name="company" defaultValue={customer.company ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="email">{t("customers.dialog.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">{t("customers.dialog.phone")}</Label>
            <Input id="phone" name="phone" defaultValue={customer.phone ?? ""} />
          </div>
        </div>
      </form>
    </DetailDrawer>
  );
}

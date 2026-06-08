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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSubscription } from "@/app/(app)/subscriptions/actions";

type CustomerOption = { id: string; name: string; company: string | null };
type ProductOption = { id: string; sku: string; name: string; price: number };

type Props = {
  customers: CustomerOption[];
  products: ProductOption[];
};

export function NewSubscriptionDialog({ customers, products }: Props) {
  const t = useTranslations("subscriptions");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [name, setName] = useState("");

  const onPickProduct = (id: string | null) => {
    const v = id ?? "";
    setProductId(v);
    const p = products.find((x) => x.id === v);
    if (p) {
      setUnitPrice(String(p.price));
      if (!name) setName(p.name);
    }
  };

  const onSubmit = (formData: FormData) => {
    if (productId) formData.set("productId", productId);
    startTransition(async () => {
      const res = await createSubscription(formData);
      if (res.ok) {
        toast.success(t("toastCreated"));
        setOpen(false);
        setProductId("");
        setUnitPrice("");
        setName("");
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
            {t("newSubscription")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newSubscription")}</DialogTitle>
          <DialogDescription>
            {t("dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="sub-name">{t("fieldName")}</Label>
            <Input
              id="sub-name"
              name="name"
              required
              placeholder={t("placeholderName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sub-customer">{t("fieldCustomer")}</Label>
            <Select name="customerId">
              <SelectTrigger id="sub-customer">
                <SelectValue placeholder={t("placeholderCustomer")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sub-product">{t("fieldProduct")}</Label>
            <Select value={productId} onValueChange={onPickProduct}>
              <SelectTrigger id="sub-product">
                <SelectValue placeholder={t("placeholderProduct")} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-[11px] mr-2">{p.sku}</span>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sub-period">{t("fieldBillingPeriod")}</Label>
              <Select name="billingPeriod" defaultValue="MONTHLY">
                <SelectTrigger id="sub-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{t("billingMonthly")}</SelectItem>
                  <SelectItem value="QUARTERLY">{t("billingQuarterly")}</SelectItem>
                  <SelectItem value="YEARLY">{t("billingYearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-qty">{t("fieldQuantity")}</Label>
              <Input id="sub-qty" name="quantity" type="number" min="1" defaultValue="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sub-price">{t("fieldUnitPrice")}</Label>
              <Input
                id="sub-price"
                name="unitPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="49"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-currency">{t("fieldCurrency")}</Label>
              <Input id="sub-currency" name="currency" defaultValue="USD" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sub-start">{t("fieldStartDate")}</Label>
            <Input id="sub-start" name="startDate" type="date" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sub-notes">{t("fieldNotes")}</Label>
            <Textarea id="sub-notes" name="notes" rows={2} placeholder={t("placeholderNotes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !unitPrice || !name}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

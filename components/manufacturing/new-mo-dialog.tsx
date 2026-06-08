"use client";

import { Link2, Loader2, Plus } from "lucide-react";
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
import { createManufacturingOrder } from "@/app/(app)/manufacturing/actions";

import type { BomPick, ProductOption } from "./types";

type Props = {
  products: ProductOption[];
  boms: BomPick[];
};

const STATUS_OPTIONS = ["DRAFT", "CONFIRMED"] as const;

export function NewMoDialog({ products, boms }: Props) {
  const t = useTranslations("manufacturing");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState("");

  const productItems = Object.fromEntries(products.map((p) => [p.id, `${p.sku} · ${p.name}`]));
  const statusItems = Object.fromEntries(STATUS_OPTIONS.map((s) => [s, t(`statuses.${s}`)]));

  const linkedBom = productId ? boms.find((b) => b.productId === productId) ?? null : null;
  const product = products.find((p) => p.id === productId) ?? null;

  // Reset the product picker each time the dialog opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setProductId("");
  }

  const onSubmit = (formData: FormData) => {
    if (!productId) {
      toast.error(t("toasts.pickProduct"));
      return;
    }
    formData.set("productId", productId);
    formData.set("bomId", linkedBom?.id ?? "");
    startTransition(async () => {
      const res = await createManufacturingOrder(formData);
      if (res.ok) {
        toast.success(t("toasts.created", { number: res.number ?? "" }));
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
            {t("newOrder")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newOrder")}</DialogTitle>
          <DialogDescription>{t("newOrderDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="productId">{t("product")}</Label>
            <Select items={productItems} value={productId} onValueChange={(v) => v && setProductId(v)}>
              <SelectTrigger id="productId" className="w-full">
                <SelectValue placeholder={t("pickProduct")} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-[10px] text-muted-foreground mr-2">{p.sku}</span>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {linkedBom ? (
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Link2 className="h-3 w-3" />
                {t("bomLinked", { reference: linkedBom.reference })}
              </p>
            ) : product ? (
              <p className="text-[11px] text-muted-foreground">{t("noBomForProduct")}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="quantity">{t("quantity")}</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="any"
                defaultValue="1"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status">{t("status")}</Label>
              <Select name="status" items={statusItems} defaultValue="DRAFT">
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="scheduledDate">{t("scheduledDate")}</Label>
              <Input id="scheduledDate" name="scheduledDate" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ownerName">{t("owner")}</Label>
              <Input id="ownerName" name="ownerName" placeholder={t("ownerPlaceholder")} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder={t("notesPlaceholder")} />
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

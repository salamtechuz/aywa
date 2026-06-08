"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addPurchaseLine,
  deletePurchaseLine,
} from "@/app/(app)/purchase/actions";

export type PurchaseLineItem = {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
  product: { id: string; sku: string; name: string; cost: number } | null;
};

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  cost: number;
};

type Props = {
  orderId: string;
  lines: PurchaseLineItem[];
  products: ProductOption[];
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function PurchaseLineItemsTable({ orderId, lines, products }: Props) {
  const t = useTranslations("purchase");
  const [productId, setProductId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [adding, startAdd] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onPickProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setDescription(p.name);
      setUnitCost(String(p.cost));
    }
  };

  const onAdd = () => {
    if (!description.trim() || !Number(quantity) || Number(unitCost) < 0) {
      toast.error(t("toasts.fillLine"));
      return;
    }
    const fd = new FormData();
    fd.set("orderId", orderId);
    if (productId) fd.set("productId", productId);
    fd.set("description", description);
    fd.set("quantity", quantity);
    fd.set("unitCost", unitCost);
    startAdd(async () => {
      const res = await addPurchaseLine(fd);
      if (res.ok) {
        setProductId("");
        setDescription("");
        setQuantity("1");
        setUnitCost("");
        toast.success(t("toasts.lineAdded"));
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deletePurchaseLine(id);
    setDeletingId(null);
    if (!res.ok) toast.error(res.error);
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("colItem")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right w-20">{t("colQty")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right w-24">{t("colCost")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right w-24">{t("colTotal")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                  {t("noLines")}
                </TableCell>
              </TableRow>
            )}
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="text-sm">{l.description}</div>
                  {l.product && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {l.product.sku}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">{l.quantity}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">{fmt(l.unitCost)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {fmt(l.quantity * l.unitCost)}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(l.id)}
                    disabled={deletingId === l.id}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === l.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {lines.length > 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {t("colTotal")}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-semibold">
                  {fmt(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {t("addLine")}
        </div>
        <div className="grid grid-cols-[2fr_4rem_5rem_auto] gap-2">
          <Select value={productId} onValueChange={(v) => onPickProduct(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("pickProduct")} />
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
          <Input
            type="number"
            min="0.01"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={t("colQty")}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder={t("colCost")}
          />
          <Button type="button" size="sm" onClick={onAdd} disabled={adding} className="gap-1">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t("add")}
          </Button>
        </div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>
    </div>
  );
}

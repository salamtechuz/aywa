"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
import { formatMoney } from "@/lib/sales/stages";
import { addLine, deleteLine, updateLine } from "@/app/(app)/sales/line-actions";

export type LineItem = {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  product: { id: string; sku: string; name: string; price: number } | null;
};

export type ProductOption = { id: string; sku: string; name: string; price: number };

type Props = {
  orderId: string;
  lines: LineItem[];
  products: ProductOption[];
};

function lineTotal(l: { quantity: number; unitPrice: number; discount: number }) {
  return l.quantity * l.unitPrice * (1 - l.discount / 100);
}

export function LineItemsTable({ orderId, lines, products }: Props) {
  const t = useTranslations("sales");
  const [adding, setAdding] = useState(false);
  const [, startMut] = useTransition();

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const totalDiscount = lines.reduce(
    (s, l) => s + l.quantity * l.unitPrice * (l.discount / 100),
    0,
  );

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 pl-3">
                {t("table.item")}
              </th>
              <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 w-16">
                {t("table.qty")}
              </th>
              <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 w-24">
                {t("table.price")}
              </th>
              <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 w-16">
                {t("table.disc")}
              </th>
              <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 pr-3 w-28">
                {t("table.lineTotal")}
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && !adding && (
              <tr>
                <td colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                  {t("noLines")}
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <LineRow key={l.id} line={l} />
            ))}
            {adding && (
              <NewLineRow
                orderId={orderId}
                products={products}
                onDone={() => setAdding(false)}
                onCancel={() => setAdding(false)}
              />
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              {totalDiscount > 0 && (
                <tr className="text-xs text-muted-foreground border-t">
                  <td className="pl-3 py-1.5">{t("table.discounts")}</td>
                  <td colSpan={3} />
                  <td className="text-right pr-3 py-1.5 tabular-nums">
                    −{formatMoney(totalDiscount)}
                  </td>
                  <td />
                </tr>
              )}
              <tr className="font-semibold border-t bg-muted/30">
                <td className="pl-3 py-2">{t("table.total")}</td>
                <td colSpan={3} />
                <td className="text-right pr-3 py-2 tabular-nums">
                  {formatMoney(subtotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {!adding && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding(true)}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> {t("addLineItem")}
        </Button>
      )}
    </div>
  );
}

function LineRow({ line }: { line: LineItem }) {
  const t = useTranslations("sales");
  const [description, setDescription] = useState(line.description);
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [unitPrice, setUnitPrice] = useState(String(line.unitPrice));
  const [discount, setDiscount] = useState(String(line.discount));
  const [, startMut] = useTransition();

  const save = (overrides: Partial<{ description: string; quantity: number; unitPrice: number; discount: number }> = {}) => {
    startMut(async () => {
      const payload = {
        id: line.id,
        description: overrides.description ?? description,
        quantity: overrides.quantity ?? Number(quantity || 0),
        unitPrice: overrides.unitPrice ?? Number(unitPrice || 0),
        discount: overrides.discount ?? Number(discount || 0),
      };
      const res = await updateLine(payload);
      if (!res.ok) toast.error(res.error);
    });
  };

  const remove = () => {
    startMut(async () => {
      const res = await deleteLine(line.id);
      if (res.ok) toast.success(t("toast.lineRemoved"));
      else toast.error(res.error);
    });
  };

  const computedTotal =
    Number(quantity || 0) * Number(unitPrice || 0) * (1 - Number(discount || 0) / 100);

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="pl-3 py-1.5">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => save({ description })}
          className="h-7 border-transparent shadow-none px-1 focus-visible:border-input"
        />
        {line.product && (
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 pl-1">
            {line.product.sku}
          </div>
        )}
      </td>
      <td className="py-1.5">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={() => save({ quantity: Number(quantity || 0) })}
          step="1"
          min="0"
          className="h-7 border-transparent shadow-none px-1 text-right tabular-nums focus-visible:border-input"
        />
      </td>
      <td className="py-1.5">
        <Input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={() => save({ unitPrice: Number(unitPrice || 0) })}
          step="100"
          min="0"
          className="h-7 border-transparent shadow-none px-1 text-right tabular-nums focus-visible:border-input"
        />
      </td>
      <td className="py-1.5">
        <Input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          onBlur={() => save({ discount: Number(discount || 0) })}
          step="5"
          min="0"
          max="100"
          className="h-7 border-transparent shadow-none px-1 text-right tabular-nums focus-visible:border-input"
        />
      </td>
      <td className="text-right pr-3 py-1.5 tabular-nums font-medium">
        {formatMoney(computedTotal)}
      </td>
      <td className="text-right pr-2">
        <button
          type="button"
          onClick={remove}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label={t("table.removeLine")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function NewLineRow({
  orderId,
  products,
  onDone,
  onCancel,
}: {
  orderId: string;
  products: ProductOption[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("sales");
  const tc = useTranslations("common");
  const [productId, setProductId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [saving, startSave] = useTransition();

  const pickProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      if (!description) setDescription(p.name);
      if (unitPrice === "0") setUnitPrice(String(p.price));
    }
  };

  const submit = () => {
    if (!description.trim()) {
      toast.error(t("toast.descriptionRequired"));
      return;
    }
    startSave(async () => {
      const res = await addLine({
        orderId,
        productId: productId || null,
        description: description.trim(),
        quantity: Number(quantity || 0),
        unitPrice: Number(unitPrice || 0),
        discount: Number(discount || 0),
      });
      if (res.ok) {
        toast.success(t("toast.lineAdded"));
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  const computedTotal =
    Number(quantity || 0) * Number(unitPrice || 0) * (1 - Number(discount || 0) / 100);

  return (
    <tr className="border-b bg-primary/5">
      <td className="pl-3 py-1.5 space-y-1">
        <Select value={productId} onValueChange={(v) => { if (v) pickProduct(v); }}>
          <SelectTrigger className="h-7 px-2 text-xs">
            <SelectValue placeholder={t("table.pickProduct")} />
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
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("table.customDescription")}
          className="h-7 px-2 text-sm"
          autoFocus
        />
      </td>
      <td className="py-1.5">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          step="1"
          min="0"
          className="h-7 px-1 text-right tabular-nums"
        />
      </td>
      <td className="py-1.5">
        <Input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          step="100"
          min="0"
          className="h-7 px-1 text-right tabular-nums"
        />
      </td>
      <td className="py-1.5">
        <Input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          step="5"
          min="0"
          max="100"
          className="h-7 px-1 text-right tabular-nums"
        />
      </td>
      <td className="text-right pr-3 py-1.5 tabular-nums font-medium">
        {formatMoney(computedTotal)}
      </td>
      <td className="pr-2">
        <div className="flex flex-col gap-1">
          <Button size="xs" onClick={submit} disabled={saving} className="h-6 text-[10px]">
            {saving ? "…" : t("table.add")}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="h-6 text-[10px]"
          >
            {tc("cancel")}
          </Button>
        </div>
      </td>
    </tr>
  );
}

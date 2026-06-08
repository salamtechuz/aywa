"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { createBom, updateBom } from "@/app/(app)/manufacturing/actions";

import type { BomDetail, ProductOption } from "./types";

type EditableComponent = { key: string; productId: string; quantity: string };

let compKeySeq = 0;
function blankComponent(): EditableComponent {
  compKeySeq += 1;
  return { key: `c${compKeySeq}`, productId: "", quantity: "1" };
}
function componentsFromBom(bom: BomDetail): EditableComponent[] {
  const rows = bom.components.map((c) => {
    compKeySeq += 1;
    return { key: `c${compKeySeq}`, productId: c.productId, quantity: String(c.quantity) };
  });
  return rows.length ? rows : [blankComponent()];
}

type Props = {
  products: ProductOption[];
  bom?: BomDetail;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function BomDialog({
  products,
  bom,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("manufacturing");
  const isEdit = Boolean(bom);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();

  const productItems = Object.fromEntries(products.map((p) => [p.id, `${p.sku} · ${p.name}`]));

  const [productId, setProductId] = useState(bom?.productId ?? "");
  const [quantity, setQuantity] = useState(String(bom?.quantity ?? 1));
  const [notes, setNotes] = useState(bom?.notes ?? "");
  const [components, setComponents] = useState<EditableComponent[]>(
    bom ? componentsFromBom(bom) : [blankComponent()],
  );

  // Re-seed on open (create resets, edit prefills) — adjust-on-prop-change.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (bom) {
        setProductId(bom.productId);
        setQuantity(String(bom.quantity));
        setNotes(bom.notes ?? "");
        setComponents(componentsFromBom(bom));
      } else {
        setProductId("");
        setQuantity("1");
        setNotes("");
        setComponents([blankComponent()]);
      }
    }
  }

  const setComp = (key: string, patch: Partial<EditableComponent>) =>
    setComponents((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const submit = () => {
    if (!productId) {
      toast.error(t("toasts.pickProduct"));
      return;
    }
    const payloadComponents = components
      .filter((c) => c.productId && Number(c.quantity) > 0)
      .map((c) => ({ productId: c.productId, quantity: Number(c.quantity) }));

    startTransition(async () => {
      const base = {
        productId,
        quantity: Number(quantity) || 1,
        notes: notes || null,
        components: payloadComponents,
      };
      const res = isEdit ? await updateBom({ id: bom!.id, ...base }) : await createBom(base);
      if (res.ok) {
        toast.success(isEdit ? t("toasts.bomSaved") : t("toasts.bomCreated"));
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
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("newBom")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editBom") : t("newBom")}</DialogTitle>
          <DialogDescription>{t("bomDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5 col-span-2">
              <Label htmlFor="bomProduct">{t("producedProduct")}</Label>
              <Select items={productItems} value={productId} onValueChange={(v) => v && setProductId(v)}>
                <SelectTrigger id="bomProduct" className="w-full">
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
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bomQty">{t("outputQty")}</Label>
              <Input
                id="bomQty"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-medium py-2 pl-3">{t("table.component")}</th>
                  <th className="text-right font-medium py-2 w-28">{t("table.quantity")}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr key={c.key} className="border-b last:border-0">
                    <td className="pl-3 py-1.5">
                      <Select
                        items={productItems}
                        value={c.productId}
                        onValueChange={(v) => v && setComp(c.key, { productId: v })}
                      >
                        <SelectTrigger className="h-7 px-2 text-xs w-full">
                          <SelectValue placeholder={t("table.pickComponent")} />
                        </SelectTrigger>
                        <SelectContent>
                          {products
                            .filter((p) => p.id !== productId)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="font-mono text-[10px] text-muted-foreground mr-2">
                                  {p.sku}
                                </span>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1.5 px-1 align-top">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={c.quantity}
                        onChange={(e) => setComp(c.key, { quantity: e.target.value })}
                        className="h-7 px-1 text-right tabular-nums"
                      />
                    </td>
                    <td className="pr-2 align-top py-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setComponents((prev) =>
                            prev.length > 1 ? prev.filter((x) => x.key !== c.key) : prev,
                          )
                        }
                        disabled={components.length <= 1}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                        aria-label={t("table.removeComponent")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setComponents((prev) => [...prev, blankComponent()])}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> {t("table.addComponent")}
          </Button>

          <div className="grid gap-1.5">
            <Label htmlFor="bomNotes">{t("notes")}</Label>
            <Input
              id="bomNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

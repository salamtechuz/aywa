"use client";

import { ArrowRight, FileDown, Loader2, Send, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { ALL_PURCHASE_STATUSES, formatMoney } from "@/lib/purchase/stages";
import {
  advancePurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrder,
} from "@/app/(app)/purchase/actions";

import type { PurchaseOrderCardData } from "./purchase-order-card";
import {
  PurchaseLineItemsTable,
  type PurchaseLineItem,
  type ProductOption,
} from "./purchase-line-items";
import {
  AttachmentsPanel,
  type AttachmentItem,
} from "@/components/attachments/attachments-panel";
import { SendRfqDialog } from "./send-rfq-dialog";

type VendorOption = { id: string; name: string };

type Props = {
  order: PurchaseOrderCardData | null;
  vendors: VendorOption[];
  linesByOrderId: Record<string, PurchaseLineItem[]>;
  attachmentsByOrderId: Record<string, AttachmentItem[]>;
  products: ProductOption[];
  workspaceName: string;
  aiEnabled: boolean;
  emailEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toDateInput(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

const NEXT_LABEL_KEY: Record<string, string> = {
  DRAFT: "actions.sendRfq",
  RFQ_SENT: "actions.approve",
  APPROVED: "actions.markReceived",
  RECEIVED: "actions.markBilled",
};

export function PurchaseDetailDrawer({
  order,
  vendors,
  linesByOrderId,
  attachmentsByOrderId,
  products,
  workspaceName,
  aiEnabled,
  emailEnabled,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("purchase");
  const [saving, startSave] = useTransition();
  const [advancing, startAdvance] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  if (!order) {
    return (
      <DetailDrawer open={open} onOpenChange={onOpenChange} title="">
        <div />
      </DetailDrawer>
    );
  }

  const onSubmit = (formData: FormData) => {
    formData.set("id", order.id);
    startSave(async () => {
      const res = await updatePurchaseOrder(formData);
      if (res.ok) toast.success(t("toasts.orderUpdated"));
      else toast.error(res.error);
    });
  };

  const onDelete = async () => {
    if (!confirm(t("confirmDelete", { number: order.number }))) return;
    setDeleting(true);
    const res = await deletePurchaseOrder(order.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("toasts.orderDeleted"));
      onOpenChange(false);
    } else {
      toast.error(t("toasts.deleteFailed"));
    }
  };

  const onAdvance = () => {
    startAdvance(async () => {
      const res = await advancePurchaseOrder(order.id);
      if (res.ok && res.next)
        toast.success(t("toasts.movedTo", { status: t(`statuses.${res.next}`) }));
      else if (!res.ok) toast.error(res.error);
    });
  };

  const nextLabelKey = NEXT_LABEL_KEY[order.status];

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={order.number}
      description={`${formatMoney(order.amount, order.currency)} · ${t(`statuses.${order.status}`)}`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> {t("delete")}
          </Button>
          <div className="flex items-center gap-2">
            <a
              href={`/api/purchase-orders/${order.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors"
            >
              <FileDown className="h-4 w-4" />
              {t("pdf")}
            </a>
            <Button
              variant="outline"
              onClick={() => setSendOpen(true)}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              {t("actions.sendRfq")}
            </Button>
            {nextLabelKey && (
              <Button
                variant="outline"
                onClick={onAdvance}
                disabled={advancing}
                className="gap-1.5"
              >
                {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {t(nextLabelKey)}
              </Button>
            )}
            <Button form="po-form" type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("lineItems")}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatMoney(order.amount, order.currency)}
          </span>
        </div>
        <PurchaseLineItemsTable
          orderId={order.id}
          lines={linesByOrderId[order.id] ?? []}
          products={products}
        />
      </div>

      <Separator className="my-5" />

      <form id="po-form" action={onSubmit} className="space-y-5">
        <div className="grid gap-1.5">
          <Label htmlFor="vendorId">{t("vendor")}</Label>
          <Select name="vendorId" defaultValue={findVendorId(vendors, order.vendor) ?? ""}>
            <SelectTrigger id="vendorId">
              <SelectValue placeholder={t("noVendor")} />
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

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="status">{t("status")}</Label>
            <Select name="status" defaultValue={order.status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PURCHASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expectedDate">{t("expectedDate")}</Label>
            <Input
              id="expectedDate"
              name="expectedDate"
              type="date"
              defaultValue={toDateInput(order.expectedDate)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ownerName">{t("owner")}</Label>
          <Input id="ownerName" name="ownerName" defaultValue={order.ownerName ?? ""} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder={t("notesPlaceholder")}
          />
        </div>
      </form>

      <Separator className="my-6" />

      <AttachmentsPanel
        entityType="ORDER"
        entityId={order.id}
        attachments={attachmentsByOrderId[order.id] ?? []}
      />

      <SendRfqDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        orderId={order.id}
        orderNumber={order.number}
        defaultRecipient={order.vendor?.email ?? null}
        workspaceName={workspaceName}
        aiEnabled={aiEnabled}
        emailEnabled={emailEnabled}
        status={order.status}
      />
    </DetailDrawer>
  );
}

function findVendorId(
  vendors: VendorOption[],
  vendor: { name: string } | null,
): string | null {
  if (!vendor) return null;
  return vendors.find((v) => v.name === vendor.name)?.id ?? null;
}

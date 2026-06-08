"use client";

import { ArrowRight, FileDown, Loader2, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { Separator } from "@/components/ui/separator";
import { ALL_SALES_STATUSES, formatMoney } from "@/lib/sales/stages";
import { advanceOrder, deleteOrder, updateOrder } from "@/app/(app)/sales/actions";

import type { SalesOrderCardData } from "./sales-order-card";
import { LineItemsTable, type LineItem, type ProductOption } from "./line-items-table";
import {
  AttachmentsPanel,
  type AttachmentItem,
} from "@/components/attachments/attachments-panel";
import { SendQuoteDialog } from "./send-quote-dialog";
import { StripePayButton } from "./stripe-pay-button";

type Props = {
  order: SalesOrderCardData | null;
  contacts: { id: string; name: string; company: string | null }[];
  linesByOrderId: Record<string, LineItem[]>;
  attachmentsByOrderId: Record<string, AttachmentItem[]>;
  products: ProductOption[];
  workspaceName: string;
  aiEnabled: boolean;
  emailEnabled: boolean;
  stripeEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toDateInput(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function SalesDetailDrawer({
  order,
  contacts,
  linesByOrderId,
  attachmentsByOrderId,
  products,
  workspaceName,
  aiEnabled,
  emailEnabled,
  stripeEnabled,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("sales");
  const tc = useTranslations("common");
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
      const res = await updateOrder(formData);
      if (res.ok) toast.success(t("toast.orderUpdated"));
      else toast.error(res.error);
    });
  };

  const onDelete = async () => {
    if (!confirm(t("confirmDelete", { number: order.number }))) return;
    setDeleting(true);
    const res = await deleteOrder(order.id);
    setDeleting(false);
    if (res.ok) {
      toast.success(t("toast.orderDeleted"));
      onOpenChange(false);
    } else {
      toast.error(t("toast.deleteFailed"));
    }
  };

  const onAdvance = () => {
    startAdvance(async () => {
      const res = await advanceOrder(order.id);
      if (res.ok && res.next)
        toast.success(t("toast.movedTo", { status: t(`statuses.${res.next.toLowerCase()}`) }));
      else if (!res.ok) toast.error(res.error);
    });
  };

  const NEXT_LABEL: Record<string, string> = {
    DRAFT: t("advance.markSent"),
    SENT: t("advance.confirmOrder"),
    CONFIRMED: t("advance.markDelivered"),
    DELIVERED: t("advance.createInvoice"),
  };
  const nextLabel = NEXT_LABEL[order.status];

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={order.number}
      description={`${formatMoney(order.amount, order.currency)} · ${t(`statuses.${order.status.toLowerCase()}`)}`}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> {tc("delete")}
          </Button>
          <div className="flex items-center gap-2">
            <a
              href={`/api/quotes/${order.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </a>
            <Button
              variant="outline"
              onClick={() => setSendOpen(true)}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              {t("send")}
            </Button>
            <StripePayButton
              orderId={order.id}
              orderNumber={order.number}
              paidAt={order.stripePaidAt}
              stripeEnabled={stripeEnabled}
            />
            {nextLabel && (
              <Button
                variant="outline"
                onClick={onAdvance}
                disabled={advancing}
                className="gap-1.5"
              >
                {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {nextLabel}
              </Button>
            )}
            <Button form="order-form" type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("save")}
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
        <LineItemsTable
          orderId={order.id}
          lines={linesByOrderId[order.id] ?? []}
          products={products}
        />
      </div>

      <Separator className="my-5" />

      <form id="order-form" action={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="amount">{t("fields.amountAuto")}</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="100"
              defaultValue={order.amount}
              disabled
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="status">{t("fields.status")}</Label>
            <Select name="status" defaultValue={order.status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_SALES_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`statuses.${s.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="customerId">{t("fields.customer")}</Label>
          <Select
            name="customerId"
            defaultValue={
              order.customer
                ? findContactId(contacts, order.customer) ?? ""
                : ""
            }
          >
            <SelectTrigger id="customerId">
              <SelectValue placeholder={t("fields.noCustomer")} />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company ?? c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ownerName">{t("fields.owner")}</Label>
            <Input id="ownerName" name="ownerName" defaultValue={order.ownerName ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expectedDate">{t("fields.expectedDate")}</Label>
            <Input
              id="expectedDate"
              name="expectedDate"
              type="date"
              defaultValue={toDateInput(order.expectedDate)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">{t("fields.notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder={t("fields.notesPlaceholder")}
          />
        </div>
      </form>

      <Separator className="my-6" />

      <AttachmentsPanel
        entityType="ORDER"
        entityId={order.id}
        attachments={attachmentsByOrderId[order.id] ?? []}
      />

      <SendQuoteDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        orderId={order.id}
        orderNumber={order.number}
        defaultRecipient={order.customer?.email ?? null}
        workspaceName={workspaceName}
        aiEnabled={aiEnabled}
        emailEnabled={emailEnabled}
        status={order.status}
      />
    </DetailDrawer>
  );
}

function findContactId(
  contacts: { id: string; name: string; company: string | null }[],
  contact: { name: string; company: string | null },
): string | null {
  const match = contacts.find(
    (c) => c.name === contact.name && c.company === contact.company,
  );
  return match?.id ?? null;
}

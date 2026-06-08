"use client";

import { Copy, CreditCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createStripeCheckoutForOrder } from "@/app/(app)/sales/stripe-actions";

type Props = {
  orderId: string;
  orderNumber: string;
  paidAt: Date | string | null;
  stripeEnabled: boolean;
};

export function StripePayButton({ orderId, orderNumber, paidAt, stripeEnabled }: Props) {
  const t = useTranslations("sales");
  const tc = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (paidAt) {
    return (
      <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
        <CreditCard className="h-4 w-4" />
        {t("stripe.paid")}
      </span>
    );
  }

  if (!stripeEnabled) {
    return null;
  }

  const onCreate = () => {
    setError(null);
    startTransition(async () => {
      const res = await createStripeCheckoutForOrder(orderId);
      if (res.ok) {
        setUrl(res.url);
        setOpen(true);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  };

  const onCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("stripe.copied"));
    } catch {
      toast.error(t("stripe.copyFailed"));
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onCreate}
        disabled={pending}
        className="gap-1.5"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {t("stripe.payLink")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("stripe.checkoutTitle", { number: orderNumber })}</DialogTitle>
            <DialogDescription>
              {t.rich("stripe.checkoutDescription", {
                status: () => <strong>{t("statuses.invoiced")}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          {url && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={url} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={onCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc("close")}
            </Button>
            {url && (
              <a href={url} target="_blank" rel="noopener" className={buttonVariants()}>
                {t("stripe.openCheckout")}
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

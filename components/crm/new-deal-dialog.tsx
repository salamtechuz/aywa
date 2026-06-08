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
import { STAGES } from "@/lib/crm/stages";
import { createDeal } from "@/app/(app)/crm/actions";

type Props = {
  contacts: { id: string; name: string; company: string | null }[];
};

export function NewDealDialog({ contacts }: Props) {
  const t = useTranslations("crm");
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();

  const onSubmit = (formData: FormData) => {
    startSave(async () => {
      const res = await createDeal(formData);
      if (res.ok) {
        toast.success(t("newDealDialog.created"));
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
            <Plus className="h-4 w-4" /> {t("newDeal")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newDeal")}</DialogTitle>
          <DialogDescription>
            {t("newDealDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form id="new-deal-form" action={onSubmit} className="space-y-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="kind">{t("newDealDialog.type")}</Label>
            <Select name="kind" defaultValue="OPPORTUNITY">
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEAD">{t("newDealDialog.kindLead")}</SelectItem>
                <SelectItem value="OPPORTUNITY">{t("newDealDialog.kindOpportunity")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("newDealDialog.dealName")}</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder={t("newDealDialog.dealNamePlaceholder")}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="value">{t("drawer.valueUsd")}</Label>
              <Input id="value" name="value" type="number" min="0" step="100" defaultValue="0" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stage">{t("drawer.stage")}</Label>
              <Select name="stage" defaultValue="NEW">
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {t(`stages.${s.id.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contactId">{t("drawer.customer")}</Label>
            <Select name="contactId">
              <SelectTrigger id="contactId">
                <SelectValue placeholder={t("newDealDialog.noCustomer")} />
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
              <Label htmlFor="ownerName">{t("newDealDialog.ownerName")}</Label>
              <Input id="ownerName" name="ownerName" placeholder="Alex Rivera" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expectedCloseDate">{t("drawer.expectedClose")}</Label>
              <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("newDealDialog.cancel")}
          </Button>
          <Button form="new-deal-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("newDealDialog.createDeal")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

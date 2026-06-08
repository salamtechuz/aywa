"use client";

import { Loader2, Plus } from "lucide-react";
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
import { JOURNAL_TYPES } from "@/lib/accounting/stages";
import { createJournal } from "@/app/(app)/accounting/actions";

export function JournalDialog() {
  const t = useTranslations("accounting");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // value→label map so Base UI's <Select.Value> renders the localized type
  // label instead of the raw enum id ("GENERAL").
  const journalTypeItems = Object.fromEntries(
    JOURNAL_TYPES.map((tp) => [tp.id, t(`journalTypes.${tp.id}`)]),
  );

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createJournal(formData);
      if (res.ok) {
        toast.success(t("toasts.journalCreated"));
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
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("newJournal")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("newJournal")}</DialogTitle>
          <DialogDescription>{t("journalDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="jcode">{t("code")}</Label>
              <Input id="jcode" name="code" required placeholder="MISC" className="font-mono" autoFocus />
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label htmlFor="jname">{t("journalName")}</Label>
              <Input id="jname" name="name" required placeholder="Miscellaneous" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="jtype">{t("type")}</Label>
            <Select name="type" items={journalTypeItems} defaultValue="GENERAL">
              <SelectTrigger id="jtype" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNAL_TYPES.map((tp) => (
                  <SelectItem key={tp.id} value={tp.id}>
                    {t(`journalTypes.${tp.id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

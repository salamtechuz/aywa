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
import { createProject } from "@/app/(app)/projects/actions";

type Props = {
  customers: { id: string; name: string; company: string | null }[];
};

export function NewProjectDialog({ customers }: Props) {
  const t = useTranslations("projects");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createProject(formData);
      if (res.ok) {
        toast.success(t("projectCreated"));
        setOpen(false);
      } else {
        toast.error(("error" in res && res.error) || t("failed"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("newProject")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newProject")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="proj-name">{t("fieldName")}</Label>
            <Input id="proj-name" name="name" required autoFocus placeholder={t("namePlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="proj-customer">{t("fieldCustomer")}</Label>
            <Select name="customerId">
              <SelectTrigger id="proj-customer">
                <SelectValue placeholder={t("optional")} />
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
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="proj-start">{t("fieldStartDate")}</Label>
              <Input id="proj-start" name="startDate" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proj-due">{t("fieldDueDate")}</Label>
              <Input id="proj-due" name="dueDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="proj-owner">{t("fieldOwner")}</Label>
              <Input id="proj-owner" name="ownerName" placeholder={t("ownerPlaceholder")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proj-budget">{t("fieldBudget")}</Label>
              <Input id="proj-budget" name="budget" type="number" min="0" step="100" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="proj-desc">{t("fieldDescription")}</Label>
            <Textarea id="proj-desc" name="description" rows={2} placeholder={t("descriptionPlaceholder")} />
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

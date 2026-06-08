"use client";

import { Loader2, UserPlus } from "lucide-react";
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
import { createEmployee } from "@/app/(app)/hr/actions";

export function NewEmployeeDialog() {
  const t = useTranslations("hr");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createEmployee(formData);
      if (res.ok) {
        toast.success(t("employeeAdded"));
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
            <UserPlus className="h-4 w-4" />
            {t("addEmployee")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addEmployee")}</DialogTitle>
          <DialogDescription>{t("addEmployeeDescription")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("fieldFullName")}</Label>
            <Input id="name" name="name" required autoFocus placeholder="Jamie Rivera" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("fieldEmail")}</Label>
              <Input id="email" name="email" type="email" placeholder="jamie@company.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">{t("fieldPhone")}</Label>
              <Input id="phone" name="phone" placeholder="+1 555…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="title">{t("fieldTitle")}</Label>
              <Input id="title" name="title" placeholder="Senior Engineer" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="department">{t("fieldDepartment")}</Label>
              <Input id="department" name="department" placeholder="Engineering" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hireDate">{t("fieldHireDate")}</Label>
            <Input id="hireDate" name="hireDate" type="date" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

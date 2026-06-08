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
import { VEHICLE_TYPES, VEHICLE_STATUSES } from "@/lib/logistics/stages";
import { createVehicle } from "@/app/(app)/logistics/actions";

export function NewVehicleDialog() {
  const t = useTranslations("logistics");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();

  const onSubmit = (formData: FormData) => {
    startSave(async () => {
      const res = await createVehicle(formData);
      if (res.ok) {
        toast.success(t("vehicleAdded"));
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const typeItems = t.raw("types") as Record<string, string>;
  const statusItems = t.raw("statuses") as Record<string, string>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newVehicle")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newVehicle")}</DialogTitle>
          <DialogDescription>{t("newVehicleDescription")}</DialogDescription>
        </DialogHeader>
        <form id="new-vehicle-form" action={onSubmit} className="space-y-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("labelName")}</Label>
            <Input id="name" name="name" required placeholder={t("namePlaceholder")} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="type">{t("labelType")}</Label>
              <Select name="type" items={typeItems} defaultValue="TRUCK">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {typeItems[v] ?? v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="plate">{t("labelPlate")}</Label>
              <Input id="plate" name="plate" placeholder="01 A 123 BC" className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="driverName">{t("labelDriver")}</Label>
              <Input id="driverName" name="driverName" placeholder={t("driverPlaceholder")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">{t("labelPhone")}</Label>
              <Input id="phone" name="phone" placeholder="+998 90 123 45 67" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="status">{t("labelStatus")}</Label>
            <Select name="status" items={statusItems} defaultValue="OFFLINE">
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_STATUSES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {statusItems[v] ?? v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button form="new-vehicle-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addVehicle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

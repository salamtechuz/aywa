"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DataTable } from "@/components/patterns/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@/lib/utils";
import {
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_STATUS_COLOR,
  type VehicleStatus,
} from "@/lib/logistics/stages";
import { updateVehicle, deleteVehicle } from "@/app/(app)/logistics/actions";
import type { VehicleDTO } from "./types";

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const color = VEHICLE_STATUS_COLOR[status as VehicleStatus] ?? "#9ca3af";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

type Props = {
  vehicles: VehicleDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function VehiclesTable({ vehicles, selectedId, onSelect }: Props) {
  const t = useTranslations("logistics");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState<VehicleDTO | null>(null);
  const [pending, startTransition] = useTransition();

  const typeItems = t.raw("types") as Record<string, string>;
  const statusItems = t.raw("statuses") as Record<string, string>;

  const onDelete = (v: VehicleDTO) => {
    if (!confirm(t("confirmDelete", { name: v.name }))) return;
    startTransition(async () => {
      const res = await deleteVehicle(v.id);
      if (res.ok) toast.success(t("vehicleDeleted"));
      else toast.error(res.error);
    });
  };

  const columns = useMemo<ColumnDef<VehicleDTO>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("cols.name"),
        cell: ({ row }) => {
          const v = row.original;
          return (
            <button
              onClick={() => onSelect(v.id)}
              className={cn(
                "flex flex-col items-start text-left hover:text-primary transition-colors",
                selectedId === v.id && "text-primary",
              )}
            >
              <span className="font-medium">{v.name}</span>
              {v.plate && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {v.plate}
                </span>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "type",
        header: t("cols.type"),
        cell: ({ row }) => typeItems[row.original.type] ?? row.original.type,
      },
      {
        accessorKey: "driverName",
        header: t("cols.driver"),
        cell: ({ row }) => row.original.driverName ?? "—",
      },
      {
        accessorKey: "status",
        header: t("cols.status"),
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            label={statusItems[row.original.status] ?? row.original.status}
          />
        ),
      },
      {
        accessorKey: "speed",
        header: t("cols.speed"),
        cell: ({ row }) =>
          row.original.speed != null ? `${Math.round(row.original.speed)} km/h` : "—",
      },
      {
        id: "lastSeen",
        header: t("cols.lastSeen"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {relTime(row.original.lastSeenAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={t("showTrack")}
                onClick={() => onSelect(v.id)}
              >
                <MapPin className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={tc("edit")}
                onClick={() => setEditing(v)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title={tc("delete")}
                onClick={() => onDelete(v)}
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tc, selectedId, pending],
  );

  return (
    <>
      <DataTable columns={columns} data={vehicles} emptyMessage={t("empty")} />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing && (
            <EditForm
              vehicle={editing}
              typeItems={typeItems}
              statusItems={statusItems}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditForm({
  vehicle,
  typeItems,
  statusItems,
  onDone,
}: {
  vehicle: VehicleDTO;
  typeItems: Record<string, string>;
  statusItems: Record<string, string>;
  onDone: () => void;
}) {
  const t = useTranslations("logistics");
  const tc = useTranslations("common");
  const [saving, startSave] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("id", vehicle.id);
    startSave(async () => {
      const res = await updateVehicle(formData);
      if (res.ok) {
        toast.success(t("vehicleUpdated"));
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editVehicle")}</DialogTitle>
        <DialogDescription>{vehicle.name}</DialogDescription>
      </DialogHeader>
      <form id="edit-vehicle-form" action={onSubmit} className="space-y-4 mt-2">
        <div className="grid gap-1.5">
          <Label htmlFor="e-name">{t("labelName")}</Label>
          <Input id="e-name" name="name" required defaultValue={vehicle.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="e-type">{t("labelType")}</Label>
            <Select name="type" items={typeItems} defaultValue={vehicle.type}>
              <SelectTrigger id="e-type">
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
            <Label htmlFor="e-plate">{t("labelPlate")}</Label>
            <Input
              id="e-plate"
              name="plate"
              defaultValue={vehicle.plate ?? ""}
              className="font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="e-driver">{t("labelDriver")}</Label>
            <Input id="e-driver" name="driverName" defaultValue={vehicle.driverName ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="e-phone">{t("labelPhone")}</Label>
            <Input id="e-phone" name="phone" defaultValue={vehicle.phone ?? ""} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="e-status">{t("labelStatus")}</Label>
          <Select name="status" items={statusItems} defaultValue={vehicle.status}>
            <SelectTrigger id="e-status">
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
        <Button variant="outline" onClick={onDone} disabled={saving}>
          {tc("cancel")}
        </Button>
        <Button form="edit-vehicle-form" type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("saveChanges")}
        </Button>
      </DialogFooter>
    </>
  );
}

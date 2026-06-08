"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";
import { logAudit } from "@/lib/audit/log";
import { recordPosition } from "@/lib/logistics/positions";
import { VEHICLE_TYPES, VEHICLE_STATUSES } from "@/lib/logistics/stages";

const VehicleSchema = z.object({
  name: z.string().min(2).max(120),
  plate: z.string().max(40).optional().or(z.literal("")),
  type: z.enum(VEHICLE_TYPES).default("TRUCK"),
  driverName: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  status: z.enum(VEHICLE_STATUSES).default("OFFLINE"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function createVehicle(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = VehicleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const vehicle = await db.vehicle.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      plate: d.plate || null,
      type: d.type,
      driverName: d.driverName || null,
      phone: d.phone || null,
      status: d.status,
      notes: d.notes || null,
    },
  });
  await logAudit({
    action: "CREATE",
    entityType: "VEHICLE",
    entityId: vehicle.id,
    summary: `Added vehicle ${d.name}${d.plate ? ` (${d.plate})` : ""}`,
  });
  revalidatePath("/logistics");
  return { ok: true as const };
}

const UpdateSchema = VehicleSchema.partial().extend({
  id: z.string().min(1),
  active: z.coerce.boolean().optional(),
});

export async function updateVehicle(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...rest } = parsed.data;
  const data: Record<string, unknown> = {};
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.plate !== undefined) data.plate = rest.plate || null;
  if (rest.type !== undefined) data.type = rest.type;
  if (rest.driverName !== undefined) data.driverName = rest.driverName || null;
  if (rest.phone !== undefined) data.phone = rest.phone || null;
  if (rest.status !== undefined) data.status = rest.status;
  if (rest.notes !== undefined) data.notes = rest.notes || null;
  if (rest.active !== undefined) data.active = rest.active;

  await db.vehicle.updateMany({ where: { id, workspaceId: ws.id }, data });
  await logAudit({
    action: "UPDATE",
    entityType: "VEHICLE",
    entityId: id,
    summary: `Updated vehicle ${rest.name ?? id}`,
  });
  revalidatePath("/logistics");
  return { ok: true as const };
}

export async function deleteVehicle(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  // VehiclePosition rows cascade-delete via the FK on Vehicle.
  await db.vehicle.deleteMany({ where: { id, workspaceId: ws.id } });
  await logAudit({
    action: "DELETE",
    entityType: "VEHICLE",
    entityId: id,
    summary: `Deleted vehicle ${id}`,
  });
  revalidatePath("/logistics");
  return { ok: true as const };
}

const PositionSchema = z.object({
  vehicleId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  speed: z.coerce.number().min(0).max(400).optional(),
  heading: z.coerce.number().min(0).max(359).optional(),
});

/** Manually drop a GPS ping for a vehicle (e.g. from the UI for testing). */
export async function recordManualPosition(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = PositionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const vehicle = await db.vehicle.findFirst({
    where: { id: d.vehicleId, workspaceId: ws.id },
    select: { id: true },
  });
  if (!vehicle) return { ok: false as const, error: "Vehicle not found" };

  await recordPosition({
    workspaceId: ws.id,
    vehicleId: d.vehicleId,
    lat: d.lat,
    lng: d.lng,
    speed: d.speed ?? null,
    heading: d.heading ?? null,
  });
  revalidatePath("/logistics");
  return { ok: true as const };
}

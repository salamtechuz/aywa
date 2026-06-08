import "server-only";

import { db } from "@/lib/db";

export type RecordPositionInput = {
  workspaceId: string;
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  recordedAt?: Date;
};

/**
 * Appends a GPS ping to the VehiclePosition ledger and keeps the denormalized
 * cache on Vehicle (lastLat/lastLng/lastSpeed/lastSeenAt) in sync. Mirrors the
 * inventory `recordMovement` pattern. Status is auto-derived from speed unless
 * the vehicle is in MAINTENANCE (a manual state we don't want a ping to clear).
 */
export async function recordPosition(input: RecordPositionInput) {
  const recordedAt = input.recordedAt ?? new Date();
  const speed = input.speed ?? null;
  return db.$transaction(async (tx) => {
    const pos = await tx.vehiclePosition.create({
      data: {
        workspaceId: input.workspaceId,
        vehicleId: input.vehicleId,
        lat: input.lat,
        lng: input.lng,
        speed,
        heading: input.heading ?? null,
        recordedAt,
      },
    });
    const current = await tx.vehicle.findFirst({
      where: { id: input.vehicleId, workspaceId: input.workspaceId },
      select: { status: true },
    });
    const nextStatus =
      current?.status === "MAINTENANCE"
        ? "MAINTENANCE"
        : (speed ?? 0) > 3
          ? "ACTIVE"
          : "IDLE";
    await tx.vehicle.updateMany({
      where: { id: input.vehicleId, workspaceId: input.workspaceId },
      data: {
        lastLat: input.lat,
        lastLng: input.lng,
        lastSpeed: speed,
        lastSeenAt: recordedAt,
        status: nextStatus,
      },
    });
    return pos;
  });
}

import "server-only";

import { db } from "@/lib/db";

export async function listVehicles(workspaceId: string) {
  return db.vehicle.findMany({
    where: { workspaceId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getVehicle(workspaceId: string, id: string) {
  return db.vehicle.findFirst({ where: { id, workspaceId } });
}

export async function listPositions(
  workspaceId: string,
  vehicleId: string,
  limit = 100,
) {
  return db.vehiclePosition.findMany({
    where: { workspaceId, vehicleId },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });
}

export type TrackPoint = {
  lat: number;
  lng: number;
  speed: number | null;
  recordedAt: Date;
};

/**
 * Batch-fetch recent track points for several vehicles in one query, returning
 * a map of vehicleId → points ordered oldest→newest (ready to draw as a
 * polyline). Mirrors the inventory page's movementsByProductId batching.
 */
export async function tracksByVehicle(
  workspaceId: string,
  vehicleIds: string[],
  perVehicle = 50,
): Promise<Record<string, TrackPoint[]>> {
  if (vehicleIds.length === 0) return {};
  const rows = await db.vehiclePosition.findMany({
    where: { workspaceId, vehicleId: { in: vehicleIds } },
    orderBy: { recordedAt: "desc" },
    take: 1000,
  });
  const out: Record<string, TrackPoint[]> = {};
  for (const r of rows) {
    const arr = out[r.vehicleId] ?? [];
    if (arr.length < perVehicle) {
      // Push newest-first here; we reverse below so the polyline runs in time order.
      arr.push({ lat: r.lat, lng: r.lng, speed: r.speed, recordedAt: r.recordedAt });
      out[r.vehicleId] = arr;
    }
  }
  for (const id of Object.keys(out)) out[id]!.reverse();
  return out;
}

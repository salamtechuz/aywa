import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/tenant";
import { listVehicles } from "@/lib/logistics/queries";

export const runtime = "nodejs";

/**
 * Session-authenticated poll endpoint for the live map. Returns the current
 * cached position of every vehicle in the active workspace. The logistics page
 * (behind auth middleware) fetches this every few seconds.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ws = await getActiveWorkspace();
  const vehicles = await listVehicles(ws.id);
  return NextResponse.json({
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      plate: v.plate,
      type: v.type,
      driverName: v.driverName,
      phone: v.phone,
      status: v.status,
      lat: v.lastLat,
      lng: v.lastLng,
      speed: v.lastSpeed,
      heading: null,
      lastSeenAt: v.lastSeenAt ? v.lastSeenAt.toISOString() : null,
    })),
  });
}

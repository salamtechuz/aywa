import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { jsonError, parsePagination, requireAuth } from "@/lib/api/respond";
import { recordPosition } from "@/lib/logistics/positions";

export const runtime = "nodejs";

// GET /api/v1/positions — list fleet with current cached positions (READ).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { take, skip } = parsePagination(req);

  const [rows, total] = await Promise.all([
    db.vehicle.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
    db.vehicle.count({ where: { workspaceId: auth.workspaceId } }),
  ]);

  return NextResponse.json({
    data: rows.map((v) => ({
      id: v.id,
      name: v.name,
      plate: v.plate,
      type: v.type,
      status: v.status,
      driver_name: v.driverName,
      lat: v.lastLat,
      lng: v.lastLng,
      speed: v.lastSpeed,
      last_seen_at: v.lastSeenAt ? v.lastSeenAt.toISOString() : null,
    })),
    pagination: { total, limit: take, offset: skip },
  });
}

const CreateSchema = z
  .object({
    vehicle_id: z.string().min(1).optional(),
    plate: z.string().min(1).optional(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    speed: z.number().min(0).max(400).optional(),
    heading: z.number().min(0).max(359).optional(),
    recorded_at: z.string().optional(),
  })
  .refine((d) => d.vehicle_id || d.plate, {
    message: "vehicle_id or plate is required",
  });

// POST /api/v1/positions — ingest a GPS ping from a tracker/phone (WRITE).
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, true);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;

  const vehicle = await db.vehicle.findFirst({
    where: {
      workspaceId: auth.workspaceId,
      ...(d.vehicle_id ? { id: d.vehicle_id } : { plate: d.plate }),
    },
    select: { id: true },
  });
  if (!vehicle) return jsonError(404, "Vehicle not found");

  let recordedAt: Date | undefined;
  if (d.recorded_at) {
    const parsedDate = new Date(d.recorded_at);
    if (Number.isNaN(parsedDate.getTime())) {
      return jsonError(400, "recorded_at must be an ISO 8601 datetime");
    }
    recordedAt = parsedDate;
  }

  const pos = await recordPosition({
    workspaceId: auth.workspaceId,
    vehicleId: vehicle.id,
    lat: d.lat,
    lng: d.lng,
    speed: d.speed ?? null,
    heading: d.heading ?? null,
    recordedAt,
  });

  return NextResponse.json(
    {
      id: pos.id,
      vehicle_id: vehicle.id,
      lat: pos.lat,
      lng: pos.lng,
      recorded_at: pos.recordedAt.toISOString(),
    },
    { status: 201 },
  );
}

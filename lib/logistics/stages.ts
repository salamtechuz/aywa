// String enums for the logistics module. Like the rest of the app, status /
// type values are TEXT validated at the app layer (no DB-level enums). Labels
// live in the `logistics` i18n namespace (types.*, statuses.*).

export const VEHICLE_TYPES = ["TRUCK", "VAN", "CAR", "BIKE", "OTHER"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_STATUSES = [
  "ACTIVE",
  "IDLE",
  "MAINTENANCE",
  "OFFLINE",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

/** Hex color per status — used for the map marker dot and the table badge. */
export const VEHICLE_STATUS_COLOR: Record<VehicleStatus, string> = {
  ACTIVE: "#22c55e", // green-500 — moving
  IDLE: "#f59e0b", // amber-500 — stopped but online
  MAINTENANCE: "#3b82f6", // blue-500
  OFFLINE: "#9ca3af", // gray-400 — no recent ping
};

/** A ping older than this (ms) means the vehicle is considered OFFLINE. */
export const OFFLINE_AFTER_MS = 10 * 60 * 1000; // 10 minutes

export function isVehicleType(v: unknown): v is VehicleType {
  return typeof v === "string" && (VEHICLE_TYPES as readonly string[]).includes(v);
}

export function isVehicleStatus(v: unknown): v is VehicleStatus {
  return (
    typeof v === "string" && (VEHICLE_STATUSES as readonly string[]).includes(v)
  );
}

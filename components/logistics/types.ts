// Shared serializable DTOs for the logistics module (server page → client
// components, and the polling JSON endpoint). Dates are ISO strings so the
// same shape works across the RSC boundary and over HTTP.

export type VehicleDTO = {
  id: string;
  name: string;
  plate: string | null;
  type: string;
  driverName: string | null;
  phone: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  heading: number | null;
  lastSeenAt: string | null; // ISO
};

/** vehicleId → polyline points [lat, lng] in time order (oldest → newest). */
export type TrackMap = Record<string, [number, number][]>;

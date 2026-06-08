"use client";

import { useEffect, useRef, useState } from "react";

import { LogisticsMap } from "./logistics-map";
import { VehiclesTable } from "./vehicles-table";
import type { TrackMap, VehicleDTO } from "./types";

type Props = {
  initialVehicles: VehicleDTO[];
  tracks: TrackMap;
};

const POLL_MS = 15000;

export function LogisticsView({ initialVehicles, tracks }: Props) {
  const [vehicles, setVehicles] = useState<VehicleDTO[]>(initialVehicles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  // Live-refresh marker positions from the cache endpoint (session-auth).
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/logistics/positions", { cache: "no-store" });
        if (!res.ok || !active) return;
        const json = (await res.json()) as { vehicles: VehicleDTO[] };
        if (active && Array.isArray(json.vehicles)) setVehicles(json.vehicles);
      } catch {
        // Network blip — keep showing the last known positions.
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const track = selectedId ? tracks[selectedId] : undefined;

  return (
    <div className="space-y-4">
      <LogisticsMap
        vehicles={vehicles}
        track={track}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
      />
      <VehiclesTable
        vehicles={vehicles}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
      />
    </div>
  );
}

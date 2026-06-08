"use client";

// Leaflet + OpenStreetMap — no API key required. We dynamic-import the leaflet
// runtime inside an effect so nothing touches `window` during SSR/build; only
// the (erased) type import lives at module scope.
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";
import { useEffect, useRef } from "react";

import { VEHICLE_STATUS_COLOR, type VehicleStatus } from "@/lib/logistics/stages";
import type { VehicleDTO } from "./types";

type Props = {
  vehicles: VehicleDTO[];
  /** Track polyline for the selected vehicle, [lat,lng] oldest→newest. */
  track?: [number, number][];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
};

// Tashkent — sensible default center when the fleet has no positions yet.
const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797];

function statusColor(status: string): string {
  return VEHICLE_STATUS_COLOR[status as VehicleStatus] ?? "#9ca3af";
}

function markerIcon(L: typeof import("leaflet"), status: string, selected: boolean) {
  const ring = selected ? "box-shadow:0 0 0 4px rgba(59,130,246,.45);" : "";
  const html = `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${statusColor(
    status,
  )};border:2px solid #fff;${ring}"></span>`;
  return L.divIcon({ html, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
}

function popupHtml(v: VehicleDTO): string {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
  const speed = v.speed != null ? `${Math.round(v.speed)} km/h` : "—";
  const driver = v.driverName ? `<div style="color:#6b7280">${esc(v.driverName)}</div>` : "";
  return `<div style="font-size:12px;line-height:1.4">
    <div style="font-weight:600">${esc(v.name)}${v.plate ? ` · ${esc(v.plate)}` : ""}</div>
    ${driver}
    <div style="color:#6b7280">${esc(v.status)} · ${speed}</div>
  </div>`;
}

export function LogisticsMap({
  vehicles,
  track,
  selectedId,
  onSelect,
  height = 460,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const trackRef = useRef<L.Polyline | null>(null);
  const fittedRef = useRef(false);
  // Keep the latest onSelect without re-running the init effect.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        DEFAULT_CENTER,
        11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
      syncMarkers();
      syncTrack();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
      trackRef.current = null;
      fittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync markers whenever vehicle positions / selection change.
  useEffect(() => {
    syncMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, selectedId]);

  // Re-draw the selected track.
  useEffect(() => {
    syncTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  function syncMarkers() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const positioned = vehicles.filter(
      (v) => typeof v.lat === "number" && typeof v.lng === "number",
    );
    const liveIds = new Set(positioned.map((v) => v.id));

    // Remove markers for vehicles that lost their position or were deleted.
    for (const id of Object.keys(markersRef.current)) {
      if (!liveIds.has(id)) {
        map.removeLayer(markersRef.current[id]!);
        delete markersRef.current[id];
      }
    }

    for (const v of positioned) {
      const pos: [number, number] = [v.lat!, v.lng!];
      const icon = markerIcon(L, v.status, selectedId === v.id);
      const existing = markersRef.current[v.id];
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(icon);
        existing.setPopupContent(popupHtml(v));
      } else {
        const m = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(popupHtml(v));
        m.on("click", () => onSelectRef.current?.(v.id));
        markersRef.current[v.id] = m;
      }
    }

    // Fit to the fleet once, on first load with positions.
    if (!fittedRef.current && positioned.length > 0) {
      const bounds = L.latLngBounds(positioned.map((v) => [v.lat!, v.lng!]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      fittedRef.current = true;
    }
  }

  function syncTrack() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (trackRef.current) {
      map.removeLayer(trackRef.current);
      trackRef.current = null;
    }
    if (track && track.length > 1) {
      trackRef.current = L.polyline(track, {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
      map.fitBounds(trackRef.current.getBounds(), { padding: [50, 50], maxZoom: 15 });
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-lg border bg-muted z-0"
    />
  );
}

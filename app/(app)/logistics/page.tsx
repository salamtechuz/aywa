import { Truck, Navigation, Pause, WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listVehicles, tracksByVehicle } from "@/lib/logistics/queries";
import { LogisticsView } from "@/components/logistics/logistics-view";
import { NewVehicleDialog } from "@/components/logistics/new-vehicle-dialog";
import type { TrackMap, VehicleDTO } from "@/components/logistics/types";

export const metadata = { title: "Logistics" };

export default async function LogisticsPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("logistics");
  const vehicles = await listVehicles(ws.id);

  const tracksRaw = await tracksByVehicle(
    ws.id,
    vehicles.map((v) => v.id),
  );
  const tracks: TrackMap = {};
  for (const [id, points] of Object.entries(tracksRaw)) {
    tracks[id] = points.map((p) => [p.lat, p.lng] as [number, number]);
  }

  const dto: VehicleDTO[] = vehicles.map((v) => ({
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
  }));

  const active = dto.filter((v) => v.status === "ACTIVE").length;
  const idle = dto.filter((v) => v.status === "IDLE").length;
  const offline = dto.filter(
    (v) => v.status === "OFFLINE" || v.status === "MAINTENANCE",
  ).length;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge
            variant="outline"
            className="ml-1 text-[10px] uppercase tracking-wider gap-1"
          >
            <Truck className="h-3 w-3" />
            {dto.length}
          </Badge>
        }
        actions={<NewVehicleDialog />}
      />

      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("stats.fleet")} value={String(dto.length)} icon={Truck} />
          <StatCard
            label={t("stats.active")}
            value={String(active)}
            trend={active > 0 ? "up" : "flat"}
            icon={Navigation}
          />
          <StatCard label={t("stats.idle")} value={String(idle)} icon={Pause} />
          <StatCard label={t("stats.offline")} value={String(offline)} icon={WifiOff} />
        </div>

        <LogisticsView initialVehicles={dto} tracks={tracks} />
      </div>
    </>
  );
}

"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

// Code-split recharts (the heaviest cold-compile dep) out of the /reports route
// graph: the page shell renders immediately and the chart streams in after.
export const FunnelChart = dynamic(
  () => import("./funnel-chart").then((m) => m.FunnelChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

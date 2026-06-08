"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

// Code-split recharts out of the /reports route graph (see funnel-chart.client).
export const RevenueTrendChart = dynamic(
  () => import("./revenue-trend-chart").then((m) => m.RevenueTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

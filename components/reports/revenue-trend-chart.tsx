"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type Datum = { month: string; deals: number; orders: number };

export function RevenueTrendChart({ data }: { data: Datum[] }) {
  const t = useTranslations("reports");
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(v) => `$${Number(v).toLocaleString()}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            formatter={(value) => (value === "deals" ? t("dealsWon") : t("ordersInvoiced"))}
          />
          <Bar dataKey="deals" stackId="rev" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="orders" stackId="rev" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

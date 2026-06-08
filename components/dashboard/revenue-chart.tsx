"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATA = [
  { month: "Jan", revenue: 24800, expenses: 18200 },
  { month: "Feb", revenue: 27100, expenses: 19500 },
  { month: "Mar", revenue: 31400, expenses: 20100 },
  { month: "Apr", revenue: 29800, expenses: 21200 },
  { month: "May", revenue: 34200, expenses: 22800 },
  { month: "Jun", revenue: 38900, expenses: 24100 },
  { month: "Jul", revenue: 42500, expenses: 25600 },
  { month: "Aug", revenue: 41200, expenses: 26200 },
  { month: "Sep", revenue: 45800, expenses: 27400 },
  { month: "Oct", revenue: 49100, expenses: 28800 },
  { month: "Nov", revenue: 52400, expenses: 30100 },
  { month: "Dec", revenue: 57800, expenses: 31900 },
];

export function RevenueChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DATA} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
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
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#rev)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="url(#exp)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

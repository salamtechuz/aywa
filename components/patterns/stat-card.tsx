import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  delta?: number; // percentage change
  trend?: "up" | "down" | "flat";
  hint?: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, delta, trend, hint, icon: Icon }: StatCardProps) {
  const t = trend ?? (delta === undefined ? "flat" : delta >= 0 ? "up" : "down");
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          {Icon && (
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {(delta !== undefined || hint) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  t === "up" && "text-emerald-600 dark:text-emerald-400",
                  t === "down" && "text-red-600 dark:text-red-400",
                  t === "flat" && "text-muted-foreground",
                )}
              >
                {t === "up" && <ArrowUp className="h-3 w-3" />}
                {t === "down" && <ArrowDown className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { CalendarDays, Kanban, LayoutGrid, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type View = "table" | "kanban" | "calendar" | "gallery";

const VIEWS: { value: View; labelKey: string; icon: typeof Rows3 }[] = [
  { value: "table", labelKey: "shared.views.table", icon: Rows3 },
  { value: "kanban", labelKey: "shared.views.kanban", icon: Kanban },
  { value: "calendar", labelKey: "shared.views.calendar", icon: CalendarDays },
  { value: "gallery", labelKey: "shared.views.gallery", icon: LayoutGrid },
];

export function ViewSwitcher({
  value,
  onChange,
  className,
}: {
  value: View;
  onChange: (v: View) => void;
  className?: string;
}) {
  const t = useTranslations("comingSoon");
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as View)} className={cn(className)}>
      <TabsList>
        {VIEWS.map((v) => (
          <TabsTrigger key={v.value} value={v.value} className="gap-1.5">
            <v.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(v.labelKey)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

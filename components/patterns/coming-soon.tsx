import { Plus, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";
import { ViewSwitcherToolbar } from "./view-switcher-toolbar";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  primaryAction?: string;
};

export async function ComingSoonModule({
  title,
  description,
  icon,
  features,
  primaryAction,
}: ComingSoonProps) {
  const t = await getTranslations("comingSoon");
  const action = primaryAction ?? t("shared.createRecord");
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("shared.badge")}
          </Badge>
        }
        actions={
          <Button disabled className="gap-1.5">
            <Plus className="h-4 w-4" />
            {action}
          </Button>
        }
      />
      <ViewSwitcherToolbar />
      <div className="px-6 pb-10">
        <EmptyState
          icon={icon}
          title={t("shared.onRoadmap", { title })}
          description={t("shared.whenItShips")}
          bullets={features}
        />
      </div>
    </>
  );
}

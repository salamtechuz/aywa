"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ViewSwitcher, type View } from "./view-switcher";

export function ViewSwitcherToolbar() {
  const t = useTranslations("comingSoon");
  const [view, setView] = useState<View>("table");
  return (
    <div className="px-6 py-5 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {t("shared.previewNote")}
      </div>
      <ViewSwitcher value={view} onChange={setView} />
    </div>
  );
}

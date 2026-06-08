"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { seedDefaultChartOfAccounts } from "@/app/(app)/accounting/actions";

/**
 * Shown on first visit when a workspace has no chart of accounts yet. The
 * button seeds the standard chart + journals so the module is usable in one
 * click (manual setup via the chart page is also available).
 */
export function EmptyAccounting() {
  const t = useTranslations("accounting");
  const [pending, startTransition] = useTransition();

  const seed = () =>
    startTransition(async () => {
      const res = await seedDefaultChartOfAccounts();
      if (res.ok) {
        toast.success(t("toasts.defaultsCreated", { count: res.accountsCreated ?? 0 }));
      } else {
        toast.error(res.error);
      }
    });

  return (
    <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{t("empty.title")}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        {t("empty.description")}
      </p>
      <Button onClick={seed} disabled={pending} className="mt-5 gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {t("empty.action")}
      </Button>
    </div>
  );
}

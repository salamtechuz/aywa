"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aywa-welcome-tour-completed";
const TOTAL_STEPS = 4;

// Shared rich-text tag renderers for the localized step bodies.
const RICH = {
  strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
  kbd: (chunks: ReactNode) => (
    <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{chunks}</kbd>
  ),
  code: (chunks: ReactNode) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{chunks}</code>
  ),
};

export function WelcomeTour() {
  const t = useTranslations("tour");
  const [stepIndex, setStepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = window.localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Slight delay so the dashboard renders first.
      const t = setTimeout(() => setStepIndex(0), 400);
      return () => clearTimeout(t);
    }
  }, []);

  if (stepIndex === null) return null;

  const finish = () => {
    setStepIndex(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable (private mode) — fine, tour will show again next visit.
    }
  };

  const next = () => {
    if (stepIndex >= TOTAL_STEPS - 1) {
      finish();
      return;
    }
    setStepIndex(stepIndex + 1);
  };

  const n = stepIndex + 1;
  const isLast = stepIndex === TOTAL_STEPS - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full sm:max-w-md rounded-xl border bg-card shadow-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t("stepLabel", { current: n, total: TOTAL_STEPS })}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label={t("skipAria")}
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">{t(`step${n}Title`)}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.rich(`step${n}Body`, RICH)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-muted/30">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  i === stepIndex
                    ? "bg-primary"
                    : i < stepIndex
                      ? "bg-primary/40"
                      : "bg-muted-foreground/20",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>
              {t("skip")}
            </Button>
            <Button size="sm" onClick={next} className="gap-1.5">
              {isLast ? t("gotIt") : t("next")}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

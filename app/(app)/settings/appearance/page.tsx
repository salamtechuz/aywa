"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", icon: Sun },
  { id: "dark", icon: Moon },
  { id: "system", icon: Monitor },
] as const;

const ACCENTS = [
  { id: "indigo", color: "oklch(0.48 0.20 265)" },
  { id: "violet", color: "oklch(0.55 0.22 295)" },
  { id: "emerald", color: "oklch(0.55 0.18 150)" },
  { id: "amber", color: "oklch(0.72 0.17 70)" },
  { id: "rose", color: "oklch(0.60 0.22 15)" },
  { id: "sky", color: "oklch(0.60 0.16 230)" },
] as const;

const ACCENT_KEY = "aywa-accent-color";
const ACCENT_ID_KEY = "aywa-accent-id";

export default function AppearancePage() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState("indigo");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedId = window.localStorage.getItem(ACCENT_ID_KEY);
      if (savedId && ACCENTS.some((a) => a.id === savedId)) setAccent(savedId);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const chosen = ACCENTS.find((a) => a.id === accent);
    if (chosen) {
      document.documentElement.style.setProperty("--primary", chosen.color);
      document.documentElement.style.setProperty("--ring", chosen.color);
      document.documentElement.style.setProperty("--sidebar-primary", chosen.color);
      document.documentElement.style.setProperty("--sidebar-ring", chosen.color);
      try {
        window.localStorage.setItem(ACCENT_KEY, chosen.color);
        window.localStorage.setItem(ACCENT_ID_KEY, chosen.id);
      } catch {
        // ignore
      }
    }
  }, [accent, mounted]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("theme")}</CardTitle>
          <CardDescription>{t("themeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            {THEMES.map((th) => {
              const active = mounted && theme === th.id;
              const Icon = th.icon;
              return (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent",
                    active && "border-primary ring-2 ring-primary/30",
                  )}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t(`themes.${th.id}`)}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("accentColor")}</CardTitle>
          <CardDescription>
            {t("accentColorHintPreview")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                  accent === a.id ? "border-foreground" : "hover:border-foreground/50",
                )}
                type="button"
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: a.color }}
                  aria-hidden
                />
                {t(`accents.${a.id}`)}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Button>{t("primaryButton")}</Button>
            <Button variant="outline">{t("secondaryButton")}</Button>
            <Button variant="ghost">{t("ghostButton")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

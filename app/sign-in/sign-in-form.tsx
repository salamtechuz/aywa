"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Mode = "password" | "demo";

export function SignInForm({ hasGoogle }: { hasGoogle: boolean }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<null | "credentials" | "google" | "dev-email">(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return;

    if (mode === "demo") {
      setLoading("dev-email");
      await signIn("dev-email", { email, callbackUrl: "/dashboard" });
      return;
    }

    if (!password) {
      setError(t("signin.enterPassword"));
      return;
    }
    setLoading("credentials");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(null);
    if (res?.error) {
      setError(t("signin.invalid"));
      return;
    }
    if (res?.ok) {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {hasGoogle && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={loading !== null}
            onClick={async () => {
              setLoading("google");
              await signIn("google", { callbackUrl: "/dashboard" });
            }}
          >
            {loading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {t("continueWithGoogle")}
          </Button>
          <div className="relative">
            <Separator />
            <span className="absolute inset-0 -top-2.5 mx-auto w-fit bg-card px-2 text-xs text-muted-foreground">
              {t("or")}
            </span>
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("workEmail")}</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
        </div>

        {mode === "password" && (
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded px-2 py-1.5">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading !== null || !email}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "demo" ? (
            t("signin.enterDemo")
          ) : (
            t("signin.submit")
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "password" ? "demo" : "password"));
            setError(null);
          }}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === "password" ? t("signin.tryDemo") : t("signin.backToPassword")}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.92 3.28-4.74 3.28-8.07z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 19.98 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.39c1.61 0 3.06.55 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4 4.02 2.18 7.04l3.66 2.84C6.71 7.32 9.14 5.39 12 5.39z"
        fill="#EA4335"
      />
    </svg>
  );
}

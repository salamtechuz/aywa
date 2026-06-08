"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupAction } from "./actions";

export function SignUpForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await signupAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Auto sign in via credentials provider after successful signup.
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: true,
      });
    });
  };

  return (
    <form action={onSubmit} className="mt-6 space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("yourName")}</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("workEmail")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={t("signup.passwordMin")}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="workspaceName">
          {t("signup.workspaceName")}{" "}
          <span className="text-muted-foreground font-normal">{t("signup.optional")}</span>
        </Label>
        <Input
          id="workspaceName"
          name="workspaceName"
          placeholder={t("signup.workspacePlaceholder")}
          autoComplete="organization"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded px-2 py-1.5">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signup.submit")}
      </Button>
    </form>
  );
}

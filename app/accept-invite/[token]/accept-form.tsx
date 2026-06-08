"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "./actions";

type Props = {
  token: string;
  email: string;
  workspaceName: string;
  role: string;
};

export function AcceptForm({ token, email, workspaceName, role }: Props) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("token", token);
    setError(null);
    startTransition(async () => {
      const res = await acceptInvitation(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Auto sign-in via credentials provider.
      const password = String(formData.get("password") ?? "");
      await signIn("credentials", {
        email: res.email,
        password,
        callbackUrl: "/dashboard",
        redirect: true,
      });
    });
  };

  return (
    <form action={onSubmit} className="mt-6 space-y-3">
      <div className="rounded-md bg-muted/50 border px-3 py-2.5 text-sm">
        {t("accept.joining")} <strong>{workspaceName}</strong> {t("accept.as")}{" "}
        <strong>{t(`roles.${role.toLowerCase()}`)}</strong>.<br />
        {t("accept.yourEmail")} <span className="font-mono text-xs">{email}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">{t("yourName")}</Label>
        <Input id="name" name="name" required placeholder={t("namePlaceholder")} autoFocus autoComplete="name" />
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

      {error && (
        <p className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded px-2 py-1.5">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          t("accept.join", { workspace: workspaceName })
        )}
      </Button>
    </form>
  );
}

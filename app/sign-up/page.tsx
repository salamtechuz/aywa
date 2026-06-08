import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Sign up" };

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8" aria-label="aywa home">
        <Logo variant="wordmark" gradient className="text-[1.05rem]" />
      </Link>

      <div className="w-full max-w-sm rounded-xl border bg-card p-7 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{t("signup.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("signup.subtitle")}</p>

        <SignUpForm />

        <p className="mt-5 text-xs text-muted-foreground text-center">
          {t("byContinuing")}
        </p>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("signup.haveAccount")}{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          {t("signup.signIn")}
        </Link>
      </p>
    </div>
  );
}

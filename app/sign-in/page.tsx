import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const t = await getTranslations("auth");
  const hasGoogle =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8" aria-label="aywa home">
        <Logo variant="wordmark" gradient className="text-[1.05rem]" />
      </Link>

      <div className="w-full max-w-sm rounded-xl border bg-card p-7 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{t("signin.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("signin.subtitle")}</p>

        <SignInForm hasGoogle={hasGoogle} />

        <p className="mt-5 text-xs text-muted-foreground text-center">
          {t("byContinuing")}
        </p>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("signin.noAccount")}{" "}
        <Link href="/sign-up" className="text-primary font-medium hover:underline">
          {t("signin.createWorkspace")}
        </Link>
      </p>
    </div>
  );
}

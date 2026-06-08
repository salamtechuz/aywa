import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { db } from "@/lib/db";
import { AcceptForm } from "./accept-form";

export const metadata = { title: "Accept invitation" };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const t = await getTranslations("auth");
  const { token } = await params;
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { workspace: true },
  });

  const invalidReason = !invitation
    ? t("accept.invalidLink")
    : invitation.acceptedAt
      ? t("accept.alreadyAccepted")
      : invitation.expiresAt < new Date()
        ? t("accept.expired")
        : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8" aria-label="aywa home">
        <Logo variant="wordmark" gradient className="text-[1.05rem]" />
      </Link>

      <div className="w-full max-w-sm rounded-xl border bg-card p-7 shadow-sm">
        {invalidReason || !invitation ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("accept.invalidTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{invalidReason}</p>
            <Link
              href="/sign-in"
              className="mt-4 inline-block text-sm text-primary hover:underline font-medium"
            >
              {t("accept.signInArrow")}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("accept.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("accept.subtitle", { workspace: invitation.workspace.name })}
            </p>
            <AcceptForm
              token={invitation.token}
              email={invitation.email}
              workspaceName={invitation.workspace.name}
              role={invitation.role}
            />
            <p className="mt-5 text-xs text-muted-foreground text-center">
              {t("byContinuing")}
            </p>
          </>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("accept.haveAccount")}{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          {t("accept.signIn")}
        </Link>
      </p>
    </div>
  );
}

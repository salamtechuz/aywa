import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { isEmailEnabled } from "@/lib/email/resend";
import { currentRole } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";
import { InviteForm } from "./invite-form";
import {
  MembersTable,
  type MemberRow,
  type PendingInviteRow,
} from "./members-table";

export const metadata = { title: "Settings · Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const t = await getTranslations("settings");
  const ws = await getActiveWorkspace();
  const me = await getCurrentUser();
  const role = await currentRole();

  const [memberships, invitations] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: ws.id },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.invitation.findMany({
      where: { workspaceId: ws.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const members: MemberRow[] = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    image: m.user.image,
    role: m.role,
    joinedAt: m.createdAt,
    isSelf: me?.id === m.userId,
  }));

  const pending: PendingInviteRow[] = invitations.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    invitedBy: i.invitedBy,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  }));

  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inviteTeammates")}</CardTitle>
          <CardDescription>
            {canManage
              ? t("inviteTeammatesDescription")
              : t("inviteTeammatesNoPermission")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <InviteForm emailEnabled={isEmailEnabled()} />
          ) : (
            <p className="text-xs text-muted-foreground">
              {t.rich("signedInAs", {
                role: t(`roles.${role}`),
                medium: (chunks) => <span className="font-medium">{chunks}</span>,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tabMembers")}</CardTitle>
          <CardDescription>
            {t("peopleInWorkspace", { count: members.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable members={members} invitations={pending} />
        </CardContent>
      </Card>
    </div>
  );
}

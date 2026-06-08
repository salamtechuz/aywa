"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { EMAIL_FROM, getResend, isEmailEnabled } from "@/lib/email/resend";
import { assertCanAdmin } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

const ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES).default("MEMBER"),
});

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function appUrl(): string {
  return process.env.AUTH_URL || "http://localhost:3000";
}

export async function inviteMember(formData: FormData) {
  const denied = await assertCanAdmin();
  if (denied) return denied;

  const raw = Object.fromEntries(formData.entries());
  const parsed = InviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const email = parsed.data.email.toLowerCase().trim();
  const role = parsed.data.role;

  const ws = await getActiveWorkspace();
  const sender = await getCurrentUser();

  // If this email is already a member, no-op with a friendly message.
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    const membership = await db.membership.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId: ws.id } },
    });
    if (membership) {
      return { ok: false as const, error: `${email} is already a member` };
    }
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert by (workspaceId, email) so re-inviting refreshes the token + expiry.
  await db.invitation.upsert({
    where: { workspaceId_email: { workspaceId: ws.id, email } },
    create: {
      workspaceId: ws.id,
      email,
      role,
      token,
      invitedBy: sender?.name ?? sender?.email ?? null,
      expiresAt,
    },
    update: {
      role,
      token,
      invitedBy: sender?.name ?? sender?.email ?? null,
      expiresAt,
      acceptedAt: null,
    },
  });

  const acceptUrl = `${appUrl()}/accept-invite/${token}`;

  if (isEmailEnabled()) {
    const resend = await getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [email],
          subject: `You're invited to ${ws.name} on aywa`,
          text: [
            `Hi,`,
            ``,
            `${sender?.name ?? sender?.email ?? "Someone"} invited you to join the workspace "${ws.name}" on aywa as ${role.toLowerCase()}.`,
            ``,
            `Accept the invitation:`,
            acceptUrl,
            ``,
            `The link expires in 7 days.`,
            ``,
            `— aywa`,
          ].join("\n"),
        });
      } catch (err) {
        console.warn("[invite] email send failed:", err);
      }
    }
  } else {
    console.log(`[invite] dev mode — accept link: ${acceptUrl}`);
  }

  await logAudit({
    action: "CREATE",
    entityType: "OTHER",
    summary: `Invited ${email} as ${role.toLowerCase()}`,
  });

  revalidatePath("/settings/members");
  return {
    ok: true as const,
    inviteUrl: acceptUrl,
    emailSent: isEmailEnabled(),
  };
}

export async function revokeInvitation(invitationId: string) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.invitation.deleteMany({
    where: { id: invitationId, workspaceId: ws.id },
  });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: invitationId,
    summary: "Revoked invitation",
  });
  revalidatePath("/settings/members");
  return { ok: true as const };
}

const ChangeRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(ROLES),
});

export async function changeMemberRole(input: z.infer<typeof ChangeRoleSchema>) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const parsed = ChangeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db.membership.updateMany({
    where: { id: parsed.data.membershipId, workspaceId: ws.id },
    data: { role: parsed.data.role },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "OTHER",
    entityId: parsed.data.membershipId,
    summary: `Changed member role to ${parsed.data.role}`,
  });
  revalidatePath("/settings/members");
  return { ok: true as const };
}

export async function removeMember(membershipId: string) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();

  // Don't let the last OWNER remove themselves and lock everyone out.
  const target = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: ws.id },
  });
  if (!target) return { ok: false as const, error: "Member not found" };
  if (target.role === "OWNER") {
    const ownerCount = await db.membership.count({
      where: { workspaceId: ws.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false as const, error: "Can't remove the last owner. Promote someone else first." };
    }
  }

  await db.membership.delete({ where: { id: membershipId } });
  await logAudit({
    action: "DELETE",
    entityType: "OTHER",
    entityId: membershipId,
    summary: "Removed member",
  });
  revalidatePath("/settings/members");
  return { ok: true as const };
}

"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";

const AcceptSchema = z.object({
  token: z.string().min(8),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

export type AcceptResult =
  | { ok: true; userId: string; workspaceSlug: string; email: string }
  | { ok: false; error: string };

export async function acceptInvitation(
  formData: FormData,
): Promise<AcceptResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = AcceptSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, name, password } = parsed.data;

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { workspace: true },
  });
  if (!invitation) return { ok: false, error: "Invalid invitation link" };
  if (invitation.acceptedAt) {
    return { ok: false, error: "This invitation was already used" };
  }
  if (invitation.expiresAt < new Date()) {
    return { ok: false, error: "Invitation expired — ask the workspace admin to re-invite you" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.$transaction(async (tx) => {
    // Either create a new User or attach the invitation to an existing one
    // (someone who signed up separately and then got invited).
    let user = await tx.user.findUnique({ where: { email: invitation.email } });
    if (!user) {
      user = await tx.user.create({
        data: { email: invitation.email, name, passwordHash },
      });
    } else if (!user.passwordHash) {
      // Existing user via OAuth — store the password they just chose.
      user = await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, name: user.name ?? name },
      });
    }

    // Idempotent membership creation.
    await tx.membership.upsert({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId },
      },
      create: {
        userId: user.id,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
      },
      update: { role: invitation.role },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return { user, workspace: invitation.workspace };
  });

  revalidatePath("/settings/members");
  return {
    ok: true,
    userId: result.user.id,
    workspaceSlug: result.workspace.slug,
    email: result.user.email,
  };
}

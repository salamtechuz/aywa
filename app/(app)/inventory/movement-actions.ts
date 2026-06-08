"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordMovement } from "@/lib/inventory/stock";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

const AdjustSchema = z.object({
  productId: z.string().min(1),
  delta: z.coerce.number().refine((v) => v !== 0, "Delta must be non-zero"),
  reason: z.string().max(200).optional(),
});

export async function adjustStock(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const user = await getCurrentUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = AdjustSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { productId, delta, reason } = parsed.data;

  // Confirm the product belongs to this workspace before touching its ledger.
  const product = await (
    await import("@/lib/db")
  ).db.product.findFirst({ where: { id: productId, workspaceId: ws.id } });
  if (!product) return { ok: false as const, error: "Product not found" };

  await recordMovement({
    workspaceId: ws.id,
    productId,
    type: delta > 0 ? "IN" : "OUT",
    quantity: delta,
    reason: reason?.trim() || (delta > 0 ? "Manual restock" : "Manual write-off"),
    sourceType: "MANUAL",
    ownerName: user?.name ?? user?.email ?? undefined,
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveBlob } from "@/lib/attachments/storage";
import { logAudit } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { assertCanAdmin } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

const SLUG_RE = /[^a-z0-9]+/g;
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(SLUG_RE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(40).optional(),
  accentColor: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
});

export async function updateWorkspace(formData: FormData) {
  const denied = await assertCanAdmin();
  if (denied) return denied;

  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const ws = await getActiveWorkspace();

  const slug = d.slug ? slugify(d.slug) : ws.slug;
  if (slug !== ws.slug) {
    const conflict = await db.workspace.findUnique({ where: { slug } });
    if (conflict && conflict.id !== ws.id) {
      return { ok: false as const, error: "That slug is taken — try another" };
    }
  }

  await db.workspace.update({
    where: { id: ws.id },
    data: {
      name: d.name,
      slug,
      accentColor: d.accentColor || null,
      defaultCurrency: d.defaultCurrency || "USD",
    },
  });
  await logAudit({
    action: "UPDATE",
    entityType: "OTHER",
    entityId: ws.id,
    summary: `Updated workspace settings`,
  });
  revalidatePath("/settings/general");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function uploadWorkspaceLogo(formData: FormData) {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "No file provided" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false as const, error: "Logo must be under 2 MB" };
  }
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (file.type && !allowed.includes(file.type)) {
    return { ok: false as const, error: "Logo must be PNG, JPG, WebP, or SVG" };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const { storageKey } = await saveBlob(bytes, file.name);
  const ws = await getActiveWorkspace();
  await db.workspace.update({ where: { id: ws.id }, data: { logo: storageKey } });
  await logAudit({
    action: "UPDATE",
    entityType: "OTHER",
    entityId: ws.id,
    summary: "Updated workspace logo",
  });
  revalidatePath("/settings/general");
  revalidatePath("/dashboard");
  return { ok: true as const, storageKey };
}

export async function removeWorkspaceLogo() {
  const denied = await assertCanAdmin();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.workspace.update({ where: { id: ws.id }, data: { logo: null } });
  await logAudit({
    action: "UPDATE",
    entityType: "OTHER",
    entityId: ws.id,
    summary: "Removed workspace logo",
  });
  revalidatePath("/settings/general");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const EXAMPLE_MARKER = "[example]";

/**
 * Wipes every record in the active workspace whose `notes` (or `description`)
 * starts with the marker injected by the signup seed. Safe to call multiple
 * times; rows the user has edited and removed the marker from are preserved.
 */
export async function clearSampleData() {
  const denied = await assertCanAdmin();
  if (denied) return { ...denied, removed: 0 };
  const ws = await getActiveWorkspace();

  const startsWith = { startsWith: EXAMPLE_MARKER } as const;

  const [
    deals,
    salesOrders,
    purchaseOrders,
    products,
    vendors,
    contacts,
  ] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId: ws.id, notes: startsWith },
      select: { id: true },
    }),
    db.salesOrder.findMany({
      where: { workspaceId: ws.id, notes: startsWith },
      select: { id: true },
    }),
    db.purchaseOrder.findMany({
      where: { workspaceId: ws.id, notes: startsWith },
      select: { id: true },
    }),
    db.product.findMany({
      where: { workspaceId: ws.id, description: startsWith },
      select: { id: true },
    }),
    db.vendor.findMany({
      where: { workspaceId: ws.id, notes: startsWith },
      select: { id: true },
    }),
    db.contact.findMany({
      where: {
        workspaceId: ws.id,
        email: { in: ["riley@northwind.example", "sam@globex.example", "avery@example.com"] },
      },
      select: { id: true },
    }),
  ]);

  await db.$transaction(async (tx) => {
    if (deals.length) await tx.deal.deleteMany({ where: { id: { in: deals.map((d) => d.id) } } });
    if (salesOrders.length) await tx.salesOrder.deleteMany({ where: { id: { in: salesOrders.map((s) => s.id) } } });
    if (purchaseOrders.length) await tx.purchaseOrder.deleteMany({ where: { id: { in: purchaseOrders.map((p) => p.id) } } });
    if (products.length) {
      // Cascade-style cleanup: drop movements first so the products can be removed.
      await tx.stockMovement.deleteMany({
        where: { productId: { in: products.map((p) => p.id) } },
      });
      await tx.product.deleteMany({ where: { id: { in: products.map((p) => p.id) } } });
    }
    if (vendors.length) await tx.vendor.deleteMany({ where: { id: { in: vendors.map((v) => v.id) } } });
    if (contacts.length) await tx.contact.deleteMany({ where: { id: { in: contacts.map((c) => c.id) } } });
  });

  const totalRemoved =
    deals.length +
    salesOrders.length +
    purchaseOrders.length +
    products.length +
    vendors.length +
    contacts.length;

  revalidatePath("/dashboard");
  revalidatePath("/crm");
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/purchase");
  revalidatePath("/reports");
  revalidatePath("/settings/general");

  return { ok: true as const, removed: totalRemoved };
}

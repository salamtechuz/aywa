"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { pushEntity } from "@/lib/odoo/sync";
import { getActiveWorkspace } from "@/lib/tenant";

const CreateSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  company: z.string().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  type: z.enum(["PERSON", "COMPANY"]).default("PERSON"),
});

export async function createCustomer(formData: FormData) {
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const created = await db.contact.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      company: d.company || null,
      email: d.email || null,
      phone: d.phone || null,
      type: d.type,
    },
  });
  void pushEntity(ws.id, "contact", created.id);
  revalidatePath("/crm/customers");
  return { ok: true as const };
}

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().min(1) });

export async function updateCustomer(formData: FormData) {
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...rest } = parsed.data;
  const data: Record<string, unknown> = {};
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.company !== undefined) data.company = rest.company || null;
  if (rest.email !== undefined) data.email = rest.email || null;
  if (rest.phone !== undefined) data.phone = rest.phone || null;
  if (rest.type !== undefined) data.type = rest.type;

  await db.contact.updateMany({
    where: { id, workspaceId: ws.id },
    data,
  });
  void pushEntity(ws.id, "contact", id);
  revalidatePath("/crm/customers");
  return { ok: true as const };
}

export async function deleteCustomer(id: string) {
  const ws = await getActiveWorkspace();
  await db.contact.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/crm/customers");
  return { ok: true as const };
}

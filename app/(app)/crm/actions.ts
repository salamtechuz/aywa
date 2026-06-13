"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { pushEntity } from "@/lib/odoo/sync";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";
import { deliverWebhook } from "@/lib/webhooks/deliver";
import { ALL_STAGES, PROBABILITY_DEFAULT, type AnyStage } from "@/lib/crm/stages";

const StageEnum = z.enum(ALL_STAGES);

const MoveDealSchema = z.object({
  dealId: z.string().min(1),
  stage: StageEnum,
  position: z.number().int().min(0),
});

export async function moveDeal(input: z.infer<typeof MoveDealSchema>) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const { dealId, stage, position } = MoveDealSchema.parse(input);
  const ws = await getActiveWorkspace();

  const current = await db.deal.findFirst({
    where: { id: dealId, workspaceId: ws.id },
  });
  if (!current) return { ok: false as const, error: "Deal not found" };

  const stageChanged = current.stage !== stage;

  // Shift positions in the destination stage to make room.
  await db.deal.updateMany({
    where: {
      workspaceId: ws.id,
      stage,
      position: { gte: position },
      NOT: { id: dealId },
    },
    data: { position: { increment: 1 } },
  });

  await db.deal.updateMany({
    where: { id: dealId, workspaceId: ws.id },
    data: {
      stage,
      position,
      probability: stageChanged
        ? PROBABILITY_DEFAULT[stage as AnyStage]
        : current.probability,
    },
  });

  if (stageChanged && stage === "WON") {
    void deliverWebhook(ws.id, "deal.won", { id: dealId, name: current.name, value: current.value });
  }
  if (stageChanged && stage === "LOST") {
    void deliverWebhook(ws.id, "deal.lost", { id: dealId, name: current.name, value: current.value });
  }

  void pushEntity(ws.id, "deal", dealId);
  revalidatePath("/crm");
  return { ok: true as const };
}

const CreateDealSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  kind: z.enum(["LEAD", "OPPORTUNITY"]).default("OPPORTUNITY"),
  value: z.coerce.number().min(0).default(0),
  contactId: z.string().optional().nullable(),
  stage: StageEnum.default("NEW"),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createDeal(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateDealSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const maxPos = await db.deal.aggregate({
    where: { workspaceId: ws.id, stage: d.stage },
    _max: { position: true },
  });

  const created = await db.deal.create({
    data: {
      workspaceId: ws.id,
      name: d.name,
      kind: d.kind,
      value: d.value,
      stage: d.stage,
      probability: d.kind === "LEAD" ? 10 : PROBABILITY_DEFAULT[d.stage as AnyStage],
      contactId: d.contactId || null,
      ownerName: d.ownerName || null,
      ownerEmail: d.ownerEmail || null,
      notes: d.notes || null,
      expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  void pushEntity(ws.id, "deal", created.id);
  revalidatePath("/crm");
  return { ok: true as const };
}

const UpdateDealSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  value: z.coerce.number().min(0).optional(),
  stage: StageEnum.optional(),
  contactId: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  ownerEmail: z.string().email().optional().or(z.literal("")).nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
});

export async function updateDeal(formData: FormData) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateDealSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, expectedCloseDate, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (expectedCloseDate !== undefined) {
    data.expectedCloseDate =
      expectedCloseDate === "" || expectedCloseDate === null
        ? null
        : new Date(expectedCloseDate);
  }
  await db.deal.updateMany({
    where: { id, workspaceId: ws.id },
    data,
  });
  void pushEntity(ws.id, "deal", id);
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function deleteDeal(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  await db.deal.deleteMany({ where: { id, workspaceId: ws.id } });
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function convertLead(id: string) {
  const denied = await assertCanWrite();
  if (denied) return denied;
  const ws = await getActiveWorkspace();
  const deal = await db.deal.findFirst({
    where: { id, workspaceId: ws.id },
  });
  if (!deal) return { ok: false as const, error: "Deal not found" };
  if (deal.kind !== "LEAD") return { ok: false as const, error: "Already an opportunity" };
  // Promote to opportunity, bump probability if still at lead-default (10).
  await db.deal.updateMany({
    where: { id, workspaceId: ws.id },
    data: {
      kind: "OPPORTUNITY",
      probability: deal.probability < 30 ? 30 : deal.probability,
      stage: deal.stage === "NEW" ? "QUALIFIED" : deal.stage,
    },
  });
  void pushEntity(ws.id, "deal", id);
  revalidatePath("/crm");
  return { ok: true as const };
}

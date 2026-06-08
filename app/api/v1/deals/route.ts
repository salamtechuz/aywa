import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { parsePagination, requireAuth } from "@/lib/api/respond";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["LEAD", "OPPORTUNITY"]).default("OPPORTUNITY"),
  value: z.number().min(0).default(0),
  stage: z
    .enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
    .default("NEW"),
  probability: z.number().int().min(0).max(100).default(20),
  contactId: z.string().optional(),
  ownerName: z.string().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { take, skip } = parsePagination(req);
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");

  const where = {
    workspaceId: auth.workspaceId,
    ...(stage ? { stage } : {}),
  };

  const [rows, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy: [{ stage: "asc" }, { position: "asc" }],
      take,
      skip,
      include: { contact: true },
    }),
    db.deal.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map(serialize),
    pagination: { total, limit: take, offset: skip },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, true);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }
  const d = parsed.data;
  const created = await db.deal.create({
    data: {
      workspaceId: auth.workspaceId,
      name: d.name,
      kind: d.kind,
      value: d.value,
      stage: d.stage,
      probability: d.probability,
      contactId: d.contactId ?? null,
      ownerName: d.ownerName ?? null,
      expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
      notes: d.notes ?? null,
    },
    include: { contact: true },
  });
  return NextResponse.json({ data: serialize(created) }, { status: 201 });
}

type DealRow = {
  id: string;
  name: string;
  kind: string;
  stage: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  ownerName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: { id: string; name: string; company: string | null } | null;
};

function serialize(d: DealRow) {
  return {
    id: d.id,
    name: d.name,
    kind: d.kind,
    stage: d.stage,
    value: d.value,
    currency: d.currency,
    probability: d.probability,
    expected_close_date: d.expectedCloseDate?.toISOString() ?? null,
    owner_name: d.ownerName,
    notes: d.notes,
    contact: d.contact ? { id: d.contact.id, name: d.contact.name, company: d.contact.company } : null,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

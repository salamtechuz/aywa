import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { parsePagination, requireAuth } from "@/lib/api/respond";
import { computeOnHandMap } from "@/lib/inventory/stock";
import { pushEntity } from "@/lib/odoo/sync";

export const runtime = "nodejs";

const CreateSchema = z.object({
  sku: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(["each", "kg", "hour", "license"]).default("each"),
  price: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  reorderAt: z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { take, skip } = parsePagination(req);

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
    db.product.count({ where: { workspaceId: auth.workspaceId } }),
  ]);

  const onHandMap = await computeOnHandMap(
    auth.workspaceId,
    rows.map((p) => p.id),
  );

  return NextResponse.json({
    data: rows.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      category: p.category,
      unit: p.unit,
      price: p.price,
      cost: p.cost,
      stock_on_hand: onHandMap.get(p.id) ?? 0,
      reorder_at: p.reorderAt,
      active: p.active,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    })),
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
  const created = await db.product.create({
    data: { ...parsed.data, workspaceId: auth.workspaceId },
  });
  void pushEntity(auth.workspaceId, "product", created.id);
  return NextResponse.json(
    {
      data: {
        id: created.id,
        sku: created.sku,
        name: created.name,
        price: created.price,
        stock_on_hand: 0,
      },
    },
    { status: 201 },
  );
}

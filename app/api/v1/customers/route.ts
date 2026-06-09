import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { parsePagination, requireAuth } from "@/lib/api/respond";
import { pushEntity } from "@/lib/odoo/sync";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  type: z.enum(["PERSON", "COMPANY"]).default("PERSON"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { take, skip } = parsePagination(req);

  const [rows, total] = await Promise.all([
    db.contact.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
    db.contact.count({ where: { workspaceId: auth.workspaceId } }),
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
  const created = await db.contact.create({
    data: { ...parsed.data, workspaceId: auth.workspaceId },
  });
  void pushEntity(auth.workspaceId, "contact", created.id);
  return NextResponse.json({ data: serialize(created) }, { status: 201 });
}

function serialize(c: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    type: c.type,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

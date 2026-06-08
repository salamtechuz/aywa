import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { parsePagination, requireAuth } from "@/lib/api/respond";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { take, skip } = parsePagination(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where = {
    workspaceId: auth.workspaceId,
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    db.salesOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        customer: true,
        lines: { include: { product: true }, orderBy: { position: "asc" } },
      },
    }),
    db.salesOrder.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      order_date: o.orderDate.toISOString(),
      expected_date: o.expectedDate?.toISOString() ?? null,
      notes: o.notes,
      owner_name: o.ownerName,
      customer: o.customer
        ? {
            id: o.customer.id,
            name: o.customer.name,
            company: o.customer.company,
            email: o.customer.email,
          }
        : null,
      lines: o.lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        discount: l.discount,
        product: l.product
          ? { id: l.product.id, sku: l.product.sku, name: l.product.name }
          : null,
      })),
      created_at: o.createdAt.toISOString(),
      updated_at: o.updatedAt.toISOString(),
    })),
    pagination: { total, limit: take, offset: skip },
  });
}

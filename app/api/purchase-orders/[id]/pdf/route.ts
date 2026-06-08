import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";

import { PoPdfTemplate, type PoPdfData } from "@/components/purchase/po-pdf-template";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ws = await getActiveWorkspace();
  const logoUrl =
    ws.logo && !ws.logo.startsWith("http")
      ? new URL(publicUrlFor(ws.logo), req.url).toString()
      : ws.logo;

  const order = await db.purchaseOrder.findFirst({
    where: { id, workspaceId: ws.id },
    include: {
      vendor: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const data: PoPdfData = {
    workspace: {
      name: ws.name,
      slug: ws.slug,
      logoUrl: logoUrl ?? null,
      accentColor: ws.accentColor,
    },
    order: {
      number: order.number,
      status: order.status,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      currency: order.currency,
      notes: order.notes,
      ownerName: order.ownerName,
    },
    vendor: order.vendor
      ? {
          name: order.vendor.name,
          email: order.vendor.email,
          phone: order.vendor.phone,
          contactPerson: order.vendor.contactPerson,
          paymentTerms: order.vendor.paymentTerms,
        }
      : null,
    lines: order.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitCost: l.unitCost,
      productSku: l.product?.sku ?? null,
    })),
  };

  const buffer = await renderToBuffer(PoPdfTemplate({ data }));
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

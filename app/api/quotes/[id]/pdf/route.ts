import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";

import { QuotePdfTemplate, type QuotePdfData } from "@/components/sales/quote-pdf-template";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";

// react-pdf relies on Node APIs (Buffer, fontkit). Force the route to run on
// the Node runtime — the Edge runtime would crash at import time.
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ws = await getActiveWorkspace();
  // For react-pdf to load the logo, its src must be an absolute URL the
  // server itself can reach. Build it from the incoming request's origin.
  const logoUrl =
    ws.logo && !ws.logo.startsWith("http")
      ? new URL(publicUrlFor(ws.logo), req.url).toString()
      : ws.logo;

  const order = await db.salesOrder.findFirst({
    where: { id, workspaceId: ws.id },
    include: {
      customer: true,
      lines: {
        include: { product: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const data: QuotePdfData = {
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
    customer: order.customer
      ? {
          name: order.customer.name,
          company: order.customer.company,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : null,
    lines: order.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      productSku: l.product?.sku ?? null,
    })),
  };

  const buffer = await renderToBuffer(QuotePdfTemplate({ data }));

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

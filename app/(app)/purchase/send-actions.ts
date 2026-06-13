"use server";

import { revalidatePath } from "next/cache";

import type { PoPdfData } from "@/components/purchase/po-pdf-template";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import { db } from "@/lib/db";
import { pushEntity } from "@/lib/odoo/sync";
import { EMAIL_FROM, getResend, isEmailEnabled } from "@/lib/email/resend";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

export type SendRfqInput = {
  orderId: string;
  to: string;
  subject: string;
  body: string;
  /** When true, advance status DRAFT → RFQ_SENT after a successful send. */
  bumpStatus?: boolean;
};

export type SendRfqResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

export async function sendRfqEmail(input: SendRfqInput): Promise<SendRfqResult> {
  const denied = await assertCanWrite();
  if (denied) return denied;
  if (!isEmailEnabled()) {
    return {
      ok: false,
      error: "Email is not configured. Set RESEND_API_KEY in .env.local.",
    };
  }

  const ws = await getActiveWorkspace();
  const order = await db.purchaseOrder.findFirst({
    where: { id: input.orderId, workspaceId: ws.id },
    include: {
      vendor: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return { ok: false, error: "Order not found" };

  const to = input.to.trim();
  if (!to || !to.includes("@")) return { ok: false, error: "Invalid recipient" };
  if (!input.subject.trim()) return { ok: false, error: "Subject is required" };
  if (!input.body.trim()) return { ok: false, error: "Email body is required" };

  const origin = process.env.AUTH_URL || "http://localhost:3000";
  const logoUrl =
    ws.logo && !ws.logo.startsWith("http")
      ? new URL(publicUrlFor(ws.logo), origin).toString()
      : ws.logo;
  const pdfData: PoPdfData = {
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
  // Loaded lazily so the heavy @react-pdf/renderer graph stays OUT of the
  // /purchase route compile — only needed when actually emailing an RFQ.
  const [{ renderToBuffer }, { PoPdfTemplate }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/purchase/po-pdf-template"),
  ]);
  const pdfBuffer = await renderToBuffer(PoPdfTemplate({ data: pdfData }));

  const resend = await getResend();
  if (!resend) return { ok: false, error: "Email client unavailable" };

  const htmlBody = input.body
    .trim()
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  let messageId: string | null = null;
  try {
    const res = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: input.subject.trim(),
      text: input.body,
      html: htmlBody,
      attachments: [{ filename: `${order.number}.pdf`, content: pdfBuffer }],
    });
    if (res.error) return { ok: false, error: res.error.message ?? "Resend error" };
    messageId = res.data?.id ?? null;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }

  const sessionUser = await getCurrentUser();
  await db.activity.create({
    data: {
      workspaceId: ws.id,
      dealId: null,
      type: "EMAIL",
      title: `RFQ ${order.number} sent to ${to}`,
      body: `Subject: ${input.subject.trim()}\n\n${input.body.trim()}`,
      doneAt: new Date(),
      ownerName: sessionUser?.name ?? sessionUser?.email ?? order.ownerName ?? null,
    },
  });

  if (input.bumpStatus && order.status === "DRAFT") {
    await db.purchaseOrder.update({
      where: { id: order.id },
      data: { status: "RFQ_SENT" },
    });
    void pushEntity(ws.id, "purchase_order", order.id);
  }

  if (messageId) {
    await db.emailEvent.create({
      data: {
        workspaceId: ws.id,
        resendId: messageId,
        entityType: "PO",
        entityId: order.id,
        recipient: to,
        subject: input.subject.trim(),
      },
    });
  }

  revalidatePath("/purchase");
  return { ok: true, messageId };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

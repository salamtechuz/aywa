"use server";

import { revalidatePath } from "next/cache";

import type { QuotePdfData } from "@/components/sales/quote-pdf-template";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import { db } from "@/lib/db";
import { pushEntity } from "@/lib/odoo/sync";
import { EMAIL_FROM, getResend, isEmailEnabled } from "@/lib/email/resend";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace, getCurrentUser } from "@/lib/tenant";

export type SendQuoteInput = {
  orderId: string;
  to: string;
  subject: string;
  body: string;
  /** When true, advance order status DRAFT → SENT after a successful send. */
  bumpStatus?: boolean;
};

export type SendQuoteResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

export async function sendQuoteEmail(
  input: SendQuoteInput,
): Promise<SendQuoteResult> {
  const denied = await assertCanWrite();
  if (denied) return denied;
  if (!isEmailEnabled()) {
    return {
      ok: false,
      error:
        "Email is not configured. Add RESEND_API_KEY (and optionally EMAIL_FROM) to .env.local and restart the dev server.",
    };
  }

  const ws = await getActiveWorkspace();
  const order = await db.salesOrder.findFirst({
    where: { id: input.orderId, workspaceId: ws.id },
    include: {
      customer: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) return { ok: false, error: "Order not found" };

  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Recipient email is missing or invalid" };
  }
  if (!input.subject.trim()) {
    return { ok: false, error: "Subject is required" };
  }
  if (!input.body.trim()) {
    return { ok: false, error: "Email body is required" };
  }

  // Render PDF the same way the /api/quotes/:id/pdf route does.
  const origin = process.env.AUTH_URL || "http://localhost:3000";
  const logoUrl =
    ws.logo && !ws.logo.startsWith("http")
      ? new URL(publicUrlFor(ws.logo), origin).toString()
      : ws.logo;
  const pdfData: QuotePdfData = {
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
  // Loaded lazily so the heavy @react-pdf/renderer graph stays OUT of the
  // /sales route compile — it's only needed when actually emailing a quote.
  const [{ renderToBuffer }, { QuotePdfTemplate }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/sales/quote-pdf-template"),
  ]);
  const pdfBuffer = await renderToBuffer(QuotePdfTemplate({ data: pdfData }));

  const resend = await getResend();
  if (!resend) return { ok: false, error: "Email client unavailable" };

  // Render plain-text body to a basic HTML version so most clients show
  // proper paragraph breaks. Keep the text version too for plain readers.
  const htmlBody = input.body
    .trim()
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  let messageId: string | null = null;
  try {
    const res = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: input.subject.trim(),
      text: input.body,
      html: htmlBody,
      attachments: [
        {
          filename: `${order.number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    if (res.error) {
      return { ok: false, error: res.error.message ?? "Resend rejected the email" };
    }
    messageId = res.data?.id ?? null;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error sending email",
    };
  }

  // Log the send as an Activity so it shows up in CRM timelines + Customer 360.
  // Find a related deal for this customer (if any) so the activity attaches
  // somewhere visible; if none, leave dealId null and surface via Activity list.
  let dealId: string | null = null;
  if (order.customerId) {
    const recentDeal = await db.deal.findFirst({
      where: {
        workspaceId: ws.id,
        contactId: order.customerId,
        stage: { notIn: ["LOST"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    dealId = recentDeal?.id ?? null;
  }

  const sessionUser = await getCurrentUser();
  await db.activity.create({
    data: {
      workspaceId: ws.id,
      dealId,
      type: "EMAIL",
      title: `Quote ${order.number} sent to ${to}`,
      body: `Subject: ${input.subject.trim()}\n\n${input.body.trim()}`,
      doneAt: new Date(),
      ownerName: sessionUser?.name ?? sessionUser?.email ?? order.ownerName ?? null,
    },
  });

  // Bump status DRAFT → SENT only on the user's explicit ask. Don't downgrade
  // CONFIRMED/DELIVERED/INVOICED — sending a follow-up quote shouldn't reset state.
  if (input.bumpStatus && order.status === "DRAFT") {
    await db.salesOrder.update({
      where: { id: order.id },
      data: { status: "SENT" },
    });
    void pushEntity(ws.id, "order", order.id);
  }

  if (messageId) {
    await db.emailEvent.create({
      data: {
        workspaceId: ws.id,
        resendId: messageId,
        entityType: "ORDER",
        entityId: order.id,
        recipient: to,
        subject: input.subject.trim(),
      },
    });
  }

  revalidatePath("/sales");
  revalidatePath("/crm");
  if (order.customerId) revalidatePath(`/crm/customers/${order.customerId}`);

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

import "server-only";

import { db } from "@/lib/db";

export type Customer360 = Awaited<ReturnType<typeof loadCustomer360>>;

export async function loadCustomer360(workspaceId: string, contactId: string) {
  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId },
    include: {
      deals: {
        include: {
          tags: { include: { tag: true } },
          activities: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      salesOrders: {
        include: { lines: true },
        orderBy: { orderDate: "desc" },
      },
    },
  });

  if (!contact) return null;

  // Collect activities belonging to any of this customer's deals.
  const activities = contact.deals.flatMap((d) =>
    d.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      body: a.body,
      dueAt: a.dueAt,
      doneAt: a.doneAt,
      ownerName: a.ownerName,
      createdAt: a.createdAt,
      dealName: d.name,
      dealId: d.id,
    })),
  );
  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Attachments anywhere this customer is referenced (deal or order).
  const dealIds = contact.deals.map((d) => d.id);
  const orderIds = contact.salesOrders.map((o) => o.id);

  const attachments = await db.attachment.findMany({
    where: {
      workspaceId,
      OR: [
        { entityType: "CONTACT", entityId: contact.id },
        { entityType: "DEAL", entityId: { in: dealIds } },
        { entityType: "ORDER", entityId: { in: orderIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Computed metrics.
  const openDeals = contact.deals.filter(
    (d) => d.stage !== "WON" && d.stage !== "LOST",
  );
  const wonDeals = contact.deals.filter((d) => d.stage === "WON");
  const lostDeals = contact.deals.filter((d) => d.stage === "LOST");

  const openPipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);

  const invoicedOrders = contact.salesOrders.filter(
    (o) => o.status === "INVOICED",
  );
  const invoicedRevenue = invoicedOrders.reduce((s, o) => s + o.amount, 0);

  // LTV = invoiced + won (we count won deals as eventually-revenue).
  const lifetimeValue = invoicedRevenue + wonValue;

  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate =
    closedDeals === 0 ? null : (wonDeals.length / closedDeals) * 100;

  const avgOrderValue =
    contact.salesOrders.length === 0
      ? 0
      : contact.salesOrders.reduce((s, o) => s + o.amount, 0) /
        contact.salesOrders.length;

  // Average sales cycle in days for closed-won deals.
  const cycleDays = wonDeals
    .map((d) => {
      const start = d.createdAt.getTime();
      const end = d.updatedAt.getTime();
      const ms = end - start;
      return ms > 0 ? ms / (1000 * 60 * 60 * 24) : null;
    })
    .filter((x): x is number => x !== null);
  const avgCycleDays =
    cycleDays.length === 0
      ? null
      : cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length;

  const firstTouch =
    contact.deals.length === 0
      ? contact.createdAt
      : new Date(
          Math.min(...contact.deals.map((d) => d.createdAt.getTime())),
        );

  const lastTouch =
    activities.length > 0
      ? activities[0].createdAt
      : contact.deals.length > 0
        ? contact.deals[0].updatedAt
        : contact.updatedAt;

  return {
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      type: contact.type,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    },
    metrics: {
      lifetimeValue,
      openPipelineValue,
      wonValue,
      invoicedRevenue,
      avgOrderValue,
      winRate,
      avgCycleDays,
      totalDeals: contact.deals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      totalOrders: contact.salesOrders.length,
      firstTouch,
      lastTouch,
    },
    deals: contact.deals.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      stage: d.stage,
      value: d.value,
      currency: d.currency,
      probability: d.probability,
      expectedCloseDate: d.expectedCloseDate,
      ownerName: d.ownerName,
      updatedAt: d.updatedAt,
      tags: d.tags.map((dt) => ({
        id: dt.tag.id,
        name: dt.tag.name,
        color: dt.tag.color,
      })),
    })),
    orders: contact.salesOrders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      orderDate: o.orderDate,
      expectedDate: o.expectedDate,
      lineCount: o.lines.length,
    })),
    activities,
    attachments: attachments.map((a) => ({
      id: a.id,
      entityType: a.entityType as "CONTACT" | "DEAL" | "ORDER",
      entityId: a.entityId,
      filename: a.filename,
      storageKey: a.storageKey,
      mimeType: a.mimeType,
      size: a.size,
      uploadedBy: a.uploadedBy,
      createdAt: a.createdAt,
    })),
  };
}

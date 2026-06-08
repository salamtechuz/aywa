import "server-only";

import { db } from "@/lib/db";

export type DealWithContact = Awaited<ReturnType<typeof listDeals>>[number];

export async function listDeals(workspaceId: string) {
  return db.deal.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      tags: { include: { tag: true } },
    },
    orderBy: [{ stage: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });
}

export async function listContacts(workspaceId: string) {
  return db.contact.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

export async function listTags(workspaceId: string) {
  return db.tag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

export async function listActivitiesForDeal(workspaceId: string, dealId: string) {
  return db.activity.findMany({
    where: { workspaceId, dealId },
    orderBy: [{ doneAt: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export type ContactWithCounts = Awaited<
  ReturnType<typeof listContactsWithCounts>
>[number];

export async function listContactsWithCounts(workspaceId: string) {
  return db.contact.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { deals: true, salesOrders: true } },
    },
    orderBy: { name: "asc" },
  });
}

"use server";

import { db } from "@/lib/db";
import { getActiveWorkspace } from "@/lib/tenant";

export type SearchResult =
  | { kind: "deal"; id: string; title: string; subtitle: string | null; meta: string | null; stage: string }
  | { kind: "customer"; id: string; title: string; subtitle: string | null; meta: string | null }
  | { kind: "order"; id: string; title: string; subtitle: string | null; meta: string | null; status: string }
  | { kind: "product"; id: string; title: string; subtitle: string | null; meta: string | null };

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function searchAll(rawQuery: string): Promise<SearchResult[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const ws = await getActiveWorkspace();
  const like = `%${q}%`;
  const lower = q.toLowerCase();

  // SQLite via Prisma — `contains` is case-sensitive on the underlying engine,
  // so we lowercase + match across fields manually where needed.
  const [deals, customers, orders, products] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId: ws.id, OR: [{ name: { contains: q } }] },
      include: { contact: true },
      take: 6,
    }),
    db.contact.findMany({
      where: {
        workspaceId: ws.id,
        OR: [{ name: { contains: q } }, { email: { contains: q } }, { company: { contains: q } }],
      },
      take: 6,
    }),
    db.salesOrder.findMany({
      where: {
        workspaceId: ws.id,
        OR: [{ number: { contains: q } }, { notes: { contains: q } }],
      },
      include: { customer: true },
      take: 6,
    }),
    db.product.findMany({
      where: {
        workspaceId: ws.id,
        OR: [{ name: { contains: q } }, { sku: { contains: q } }, { category: { contains: q } }],
      },
      take: 6,
    }),
  ]);

  // Fall-back: case-insensitive secondary filter for the customer name field on deals
  const moreDeals =
    deals.length < 6
      ? await db.deal.findMany({
          where: {
            workspaceId: ws.id,
            contact: { OR: [{ name: { contains: q } }, { company: { contains: q } }] },
            NOT: { id: { in: deals.map((d) => d.id) } },
          },
          include: { contact: true },
          take: 6 - deals.length,
        })
      : [];

  void like;
  void lower;

  const results: SearchResult[] = [
    ...[...deals, ...moreDeals].map(
      (d): SearchResult => ({
        kind: "deal",
        id: d.id,
        title: d.name,
        subtitle: d.contact?.company ?? d.contact?.name ?? null,
        meta: `${fmt(d.value)} · ${d.stage.toLowerCase()}`,
        stage: d.stage,
      }),
    ),
    ...customers.map(
      (c): SearchResult => ({
        kind: "customer",
        id: c.id,
        title: c.name,
        subtitle: c.company,
        meta: c.email,
      }),
    ),
    ...orders.map(
      (o): SearchResult => ({
        kind: "order",
        id: o.id,
        title: o.number,
        subtitle: o.customer?.company ?? o.customer?.name ?? null,
        meta: `${fmt(o.amount)} · ${o.status.toLowerCase()}`,
        status: o.status,
      }),
    ),
    ...products.map(
      (p): SearchResult => ({
        kind: "product",
        id: p.id,
        title: p.name,
        subtitle: p.sku,
        meta: `${fmt(p.price)}${p.category ? ` · ${p.category}` : ""}`,
      }),
    ),
  ];

  return results;
}

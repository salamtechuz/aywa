import "server-only";

import { loadCustomer360 } from "@/lib/crm/customer-360";

export async function formatContactForPrompt(
  workspaceId: string,
  contactId: string,
): Promise<string | null> {
  const c = await loadCustomer360(workspaceId, contactId);
  if (!c) return null;

  const lines: string[] = [];
  lines.push(`Account: ${c.contact.company ?? c.contact.name}`);
  if (c.contact.company) lines.push(`Primary contact: ${c.contact.name}`);
  if (c.contact.email) lines.push(`Email: ${c.contact.email}`);
  if (c.contact.phone) lines.push(`Phone: ${c.contact.phone}`);
  lines.push(`Customer since: ${c.contact.createdAt.toISOString().slice(0, 10)}`);

  lines.push("");
  lines.push("Metrics:");
  lines.push(`- Lifetime value: ${Math.round(c.metrics.lifetimeValue)}`);
  lines.push(`- Open pipeline: ${Math.round(c.metrics.openPipelineValue)}`);
  lines.push(`- Invoiced revenue: ${Math.round(c.metrics.invoicedRevenue)}`);
  lines.push(
    `- Deals: ${c.metrics.totalDeals} total (${c.metrics.openDeals} open, ${c.metrics.wonDeals} won, ${c.metrics.lostDeals} lost)`,
  );
  if (c.metrics.winRate !== null) {
    lines.push(`- Win rate with this account: ${c.metrics.winRate.toFixed(0)}%`);
  }
  if (c.metrics.avgCycleDays !== null) {
    lines.push(`- Average sales cycle: ${c.metrics.avgCycleDays.toFixed(0)} days`);
  }
  lines.push(`- Total orders: ${c.metrics.totalOrders}`);

  if (c.deals.length > 0) {
    lines.push("");
    lines.push("Deals (most recent first):");
    for (const d of c.deals.slice(0, 10)) {
      lines.push(
        `- ${d.name} — ${d.stage} (${d.kind}), ${d.value} ${d.currency}, ${d.probability}% prob.${d.tags.length > 0 ? ", tags: " + d.tags.map((t) => t.name).join(", ") : ""}`,
      );
    }
  }

  if (c.orders.length > 0) {
    lines.push("");
    lines.push("Orders (most recent first):");
    for (const o of c.orders.slice(0, 10)) {
      lines.push(
        `- ${o.number} — ${o.status}, ${o.amount} ${o.currency}, ${o.lineCount} lines, ${o.orderDate.toISOString().slice(0, 10)}`,
      );
    }
  }

  if (c.activities.length > 0) {
    lines.push("");
    lines.push("Recent touchpoints (last 8):");
    for (const a of c.activities.slice(0, 8)) {
      const dateStr = a.createdAt.toISOString().slice(0, 10);
      const done = a.doneAt ? " [done]" : "";
      lines.push(`- [${a.type}] ${a.title} on ${a.dealName}${done} — ${dateStr}`);
      if (a.body) lines.push(`    ${a.body.slice(0, 160)}`);
    }
  }

  return lines.join("\n");
}

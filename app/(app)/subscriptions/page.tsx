import { DollarSign, RefreshCw, Target, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Badge } from "@/components/ui/badge";
import { listContacts } from "@/lib/crm/queries";
import { listProducts } from "@/lib/inventory/queries";
import {
  computeRecurringRevenue,
  listSubscriptions,
} from "@/lib/subscriptions/queries";
import { getActiveWorkspace } from "@/lib/tenant";
import { NewSubscriptionDialog } from "@/components/subscriptions/new-subscription-dialog";
import {
  SubscriptionsTable,
  type SubscriptionRow,
} from "@/components/subscriptions/subscriptions-table";

export const metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SubscriptionsPage() {
  const t = await getTranslations("subscriptions");
  const ws = await getActiveWorkspace();
  const [subs, summary, contacts, products] = await Promise.all([
    listSubscriptions(ws.id),
    computeRecurringRevenue(ws.id),
    listContacts(ws.id),
    listProducts(ws.id, { activeOnly: true }),
  ]);

  const rows: SubscriptionRow[] = subs.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    billingPeriod: s.billingPeriod,
    billingPeriodMonths: s.billingPeriodMonths,
    quantity: s.quantity,
    unitPrice: s.unitPrice,
    currency: s.currency,
    startDate: s.startDate,
    endDate: s.endDate,
    nextRenewalDate: s.nextRenewalDate,
    notes: s.notes,
    customer: s.customer
      ? { id: s.customer.id, name: s.customer.name, company: s.customer.company }
      : null,
    product: s.product
      ? { id: s.product.id, sku: s.product.sku, name: s.product.name }
      : null,
  }));

  const customerOptions = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }));
  const productOptions = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: p.price,
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {t("activeCount", { count: summary.activeCount })}
          </Badge>
        }
        actions={
          <NewSubscriptionDialog customers={customerOptions} products={productOptions} />
        }
      />
      <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("mrr")}
            value={fmt(summary.mrr)}
            icon={TrendingUp}
            hint={t("activeCount", { count: summary.activeCount })}
          />
          <StatCard
            label={t("arr")}
            value={fmt(summary.arr)}
            icon={DollarSign}
            hint={t("arrHint")}
          />
          <StatCard
            label={t("newMrrThisMonth")}
            value={fmt(summary.newMrrThisMonth)}
            trend={summary.newMrrThisMonth > 0 ? "up" : "flat"}
            icon={RefreshCw}
          />
          <StatCard
            label={t("churnedMrrThisMonth")}
            value={fmt(summary.churnedMrrThisMonth)}
            trend={summary.churnedMrrThisMonth > 0 ? "down" : "flat"}
            icon={Target}
            hint={t("cancelledAllTime", { count: summary.cancelledCount })}
          />
        </div>

        <SubscriptionsTable rows={rows} />
      </div>
    </>
  );
}

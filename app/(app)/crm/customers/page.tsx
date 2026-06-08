import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listContactsWithCounts } from "@/lib/crm/queries";
import { CustomersTable, type CustomerRow } from "@/components/crm/customers-table";
import { ImportCustomersDialog } from "@/components/crm/import-customers-dialog";
import { NewCustomerDialog } from "@/components/crm/new-customer-dialog";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("crm.customers");
  const contacts = await listContactsWithCounts(ws.id);

  const rows: CustomerRow[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    type: c.type,
    dealsCount: c._count.deals,
    ordersCount: c._count.salesOrders,
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider gap-1">
            <Users className="h-3 w-3" />
            {rows.length}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <ImportCustomersDialog />
            <NewCustomerDialog />
          </div>
        }
      />
      <div className="px-4 md:px-6 py-4 md:py-5">
        <CustomersTable rows={rows} />
      </div>
    </>
  );
}

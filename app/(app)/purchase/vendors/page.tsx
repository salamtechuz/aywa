import { ArrowLeft, Building2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listVendorsWithCounts } from "@/lib/purchase/queries";
import { getActiveWorkspace } from "@/lib/tenant";
import { NewVendorDialog } from "@/components/purchase/new-vendor-dialog";

export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const t = await getTranslations("purchase");
  const ws = await getActiveWorkspace();
  const vendors = await listVendorsWithCounts(ws.id);

  return (
    <>
      <PageHeader
        title={t("vendorsTitle")}
        description={
          <Link
            href="/purchase"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {t("backToPurchaseOrders")}
          </Link>
        }
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {vendors.length}
          </Badge>
        }
        actions={<NewVendorDialog />}
      />

      <div className="px-4 md:px-6 py-4 md:py-5">
        {vendors.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
            <Building2 className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{t("noVendorsYet")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noVendorsTableHint")}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">{t("colVendor")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("colContact")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("colTerms")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">{t("colPos")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{v.name}</div>
                          {v.vendorCode && (
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {v.vendorCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        {v.contactPerson && (
                          <span className="text-foreground/90">{v.contactPerson}</span>
                        )}
                        {v.email && (
                          <a
                            href={`mailto:${v.email}`}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            {v.email}
                          </a>
                        )}
                        {v.phone && (
                          <a
                            href={`tel:${v.phone}`}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            {v.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-muted-foreground">
                          {v.paymentTerms ?? "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 ml-2">
                          {v.currency}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      <span
                        className={cn(
                          v._count.purchaseOrders === 0 && "text-muted-foreground",
                        )}
                      >
                        {v._count.purchaseOrders}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

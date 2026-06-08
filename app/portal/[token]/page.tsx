import { CheckCircle2, CreditCard, FileDown } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";

export const metadata = { title: "Quote" };
export const dynamic = "force-dynamic";

function fmtMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  CONFIRMED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  DELIVERED: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  INVOICED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await db.salesOrder.findUnique({
    where: { portalToken: token },
    include: {
      customer: true,
      lines: { include: { product: true }, orderBy: { position: "asc" } },
    },
  });
  if (!order) notFound();

  const workspace = await db.workspace.findUnique({
    where: { id: order.workspaceId },
  });
  if (!workspace) notFound();

  const subtotal = order.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalDiscount = order.lines.reduce((s, l) => {
    return s + l.quantity * l.unitPrice * (l.discount / 100);
  }, 0);
  const total = subtotal - totalDiscount;

  const docTitle =
    order.status === "INVOICED"
      ? "Invoice"
      : order.status === "CONFIRMED" || order.status === "DELIVERED"
        ? "Sales Order"
        : "Quote";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 text-primary" />
            <div>
              <div className="text-sm font-semibold">{workspace.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {workspace.slug}.aywa.app
              </div>
            </div>
          </div>
          <Badge
            className={cn(
              "border-transparent text-[10px] uppercase tracking-wider",
              STATUS_BADGE[order.status] ?? STATUS_BADGE.DRAFT,
            )}
          >
            {order.status.toLowerCase()}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{docTitle}</CardTitle>
                <CardDescription className="font-mono mt-1">#{order.number}</CardDescription>
              </div>
              {order.stripePaidAt ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid {fmtDate(order.stripePaidAt)}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  From
                </div>
                <div className="font-semibold">{workspace.name}</div>
                {order.ownerName && (
                  <div className="text-muted-foreground text-xs">{order.ownerName}</div>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Bill to
                </div>
                {order.customer ? (
                  <>
                    <div className="font-semibold">
                      {order.customer.company ?? order.customer.name}
                    </div>
                    {order.customer.company && (
                      <div className="text-muted-foreground text-xs">{order.customer.name}</div>
                    )}
                    {order.customer.email && (
                      <div className="text-muted-foreground text-xs">{order.customer.email}</div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">—</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Issue date
                </div>
                <div>{fmtDate(order.orderDate)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {order.status === "INVOICED" ? "Due date" : "Expected"}
                </div>
                <div>{fmtDate(order.expectedDate)}</div>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Description</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Qty</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Price</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((l) => {
                    const gross = l.quantity * l.unitPrice;
                    const amount = gross - gross * (l.discount / 100);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="text-sm">{l.description}</div>
                          {l.product?.sku && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              SKU: {l.product.sku}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {l.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtMoney(l.unitPrice, order.currency)}
                          {l.discount > 0 && (
                            <div className="text-[10px] text-muted-foreground">−{l.discount}%</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {fmtMoney(amount, order.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmtMoney(subtotal, order.currency)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">−{fmtMoney(totalDiscount, order.currency)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t font-semibold">
                  <span>Total</span>
                  <span className="text-lg tabular-nums">{fmtMoney(total, order.currency)}</span>
                </div>
              </div>
            </div>

            {order.notes && !order.notes.startsWith("[example]") && !order.notes.startsWith("[recurring]") && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Notes
                </div>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap">{order.notes}</div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <a
                href={`/api/quotes/${order.id}/pdf`}
                target="_blank"
                rel="noopener"
                className={buttonVariants({ variant: "outline", className: "gap-1.5" })}
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </a>
              {!order.stripePaidAt && order.stripeSessionId && (
                <a
                  href={`/portal/${token}/pay`}
                  className={buttonVariants({ className: "gap-1.5" })}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay {fmtMoney(total, order.currency)}
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-[11px] text-muted-foreground">
          Generated by {workspace.name} via aywa. Need help? Reply to the email this link came from.
        </p>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, Building2, Mail, MoreHorizontal, Phone, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CustomerDetailDrawer } from "./customer-detail-drawer";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string;
  dealsCount: number;
  ordersCount: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const typeLabel = (type: string) =>
    type === "COMPANY"
      ? t("customers.dialog.company")
      : t("customers.dialog.person");

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const openCustomer = openId ? rows.find((r) => r.id === openId) ?? null : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {t("customers.table.countOf", { count: filtered.length, total: rows.length })}
        </span>
      </div>

      {/* Mobile: card layout. Hidden on sm+ where the table below takes over. */}
      <div className="grid gap-2 sm:hidden">
        {filtered.length === 0 && (
          <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {query ? t("customers.table.noMatches") : t("customers.table.empty")}
          </div>
        )}
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/crm/customers/${c.id}`}
            className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3 active:bg-accent transition-colors"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials(c.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{c.name}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {typeLabel(c.type)}
                </Badge>
              </div>
              {c.company && (
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  {c.company}
                </div>
              )}
              {c.email && (
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3" />
                  {c.email}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground tabular-nums shrink-0">
              <span>{c.dealsCount}D</span>
              <span>{c.ordersCount}O</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("customers.table.customer")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("customers.table.contact")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("customers.table.type")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("customers.table.deals")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("customers.table.orders")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {query ? t("customers.table.noMatches") : t("customers.table.empty")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/50 group"
                onClick={() => router.push(`/crm/customers/${c.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      {c.company && (
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {c.company}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-xs">
                    {c.email && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {c.type === "COMPANY" ? (
                      <Building2 className="h-3 w-3 mr-1" />
                    ) : (
                      <User className="h-3 w-3 mr-1" />
                    )}
                    {typeLabel(c.type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  <span className={cn(c.dealsCount === 0 && "text-muted-foreground")}>
                    {c.dealsCount}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  <span className={cn(c.ordersCount === 0 && "text-muted-foreground")}>
                    {c.ordersCount}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("customers.table.quickView")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(c.id);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <Link
                      href={`/crm/customers/${c.id}`}
                      aria-label={t("customers.table.openProfile")}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-foreground"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CustomerDetailDrawer
        customer={openCustomer}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </>
  );
}

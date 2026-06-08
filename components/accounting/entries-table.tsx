"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2, Loader2, Pencil, Send, Trash2, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailDrawer } from "@/components/patterns/detail-drawer";
import { entryStatusMeta, formatMoney } from "@/lib/accounting/stages";
import {
  deleteEntry,
  postEntry,
  unpostEntry,
} from "@/app/(app)/accounting/actions";

import { EntryDialog } from "./entry-dialog";
import type { AccountOption, EntryRow, JournalOption } from "./types";

type Props = {
  entries: EntryRow[];
  accounts: AccountOption[];
  journals: JournalOption[];
  defaultCurrency: string;
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const meta = entryStatusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: meta.accent }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.accent }} />
      {label}
    </span>
  );
}

export function EntriesTable({ entries, accounts, journals, defaultCurrency }: Props) {
  const t = useTranslations("accounting");
  const [selected, setSelected] = useState<EntryRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const isAuto = (e: EntryRow) => Boolean(e.sourceType && e.sourceType !== "MANUAL");

  const dateFmt = (d: Date) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const statusLabel = (status: string) => t(`status.${status}`);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(ok);
        setSelected(null);
      } else {
        toast.error(res.error);
      }
    });

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("colNumber")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colDate")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colJournal")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colReference")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colStatus")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colAmount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer"
                onClick={() => setSelected(e)}
              >
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    {e.number}
                    {isAuto(e) && (
                      <Link2 className="h-3 w-3 text-muted-foreground" aria-label={t("autoBadge")} />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {dateFmt(e.date)}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[10px] text-muted-foreground mr-1.5">
                    {e.journal.code}
                  </span>
                  <span className="text-sm">{e.journal.name}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {e.reference ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={e.status} label={statusLabel(e.status)} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {formatMoney(e.totalDebit, e.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `${selected.number}` : ""}
        description={selected ? `${selected.journal.name} · ${dateFmt(selected.date)}` : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center gap-2">
              {selected.status === "DRAFT" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => run(() => postEntry(selected.id), t("toasts.entryPosted"))}
                    disabled={pending}
                    className="gap-1.5"
                  >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {t("post")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                    disabled={pending}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> {t("edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run(() => deleteEntry(selected.id), t("toasts.entryDeleted"))}
                    disabled={pending}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
                  </Button>
                </>
              )}
              {selected.status === "POSTED" && !isAuto(selected) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => unpostEntry(selected.id), t("toasts.entryUnposted"))}
                  disabled={pending}
                  className="gap-1.5"
                >
                  <Undo2 className="h-3.5 w-3.5" /> {t("unpost")}
                </Button>
              )}
              {isAuto(selected) && (
                <p className="text-xs text-muted-foreground">{t("autoManagedNote")}</p>
              )}
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} label={statusLabel(selected.status)} />
              {isAuto(selected) && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Link2 className="h-3 w-3" />
                  {selected.sourceType === "SALES_ORDER" ? t("sourceSales") : t("sourcePurchase")}
                </Badge>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 pl-3">
                      {t("table.account")}
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 w-24">
                      {t("table.debit")}
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 pr-3 w-24">
                      {t("table.credit")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="pl-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {l.account?.code}
                          </span>
                          <span>{l.account?.name ?? "—"}</span>
                        </div>
                        {l.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{l.description}</div>
                        )}
                      </td>
                      <td className="text-right py-2 tabular-nums">
                        {l.debit ? formatMoney(l.debit, selected.currency) : ""}
                      </td>
                      <td className="text-right pr-3 py-2 tabular-nums">
                        {l.credit ? formatMoney(l.credit, selected.currency) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="pl-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.totals")}
                    </td>
                    <td className="text-right py-2 tabular-nums">
                      {formatMoney(selected.totalDebit, selected.currency)}
                    </td>
                    <td className="text-right pr-3 py-2 tabular-nums">
                      {formatMoney(selected.totalCredit, selected.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selected.createdBy && (
              <p className="text-xs text-muted-foreground">
                {t("createdBy", { name: selected.createdBy })}
              </p>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Controlled edit dialog for the selected draft entry. */}
      {selected && (
        <EntryDialog
          accounts={accounts}
          journals={journals}
          defaultCurrency={defaultCurrency}
          entry={selected}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) setSelected(null);
          }}
          showTrigger={false}
        />
      )}
    </>
  );
}

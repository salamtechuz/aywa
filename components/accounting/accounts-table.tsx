"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACCOUNT_TYPE_IDS, accountTypeMeta, journalTypeLabel } from "@/lib/accounting/stages";
import { deleteAccount, deleteJournal } from "@/app/(app)/accounting/actions";

import { AccountDialog } from "./account-dialog";
import type { AccountRow, JournalRow } from "./types";

type Props = {
  accounts: AccountRow[];
  journals: JournalRow[];
  defaultCurrency: string;
};

export function AccountsTable({ accounts, journals, defaultCurrency }: Props) {
  const t = useTranslations("accounting");
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [pending, startTransition] = useTransition();

  const removeAccount = (id: string) =>
    startTransition(async () => {
      const res = await deleteAccount(id);
      if (res.ok) toast.success(t("toasts.accountDeleted"));
      else toast.error(res.error);
    });

  const removeJournal = (id: string) =>
    startTransition(async () => {
      const res = await deleteJournal(id);
      if (res.ok) toast.success(t("toasts.journalDeleted"));
      else toast.error(res.error);
    });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider w-20">{t("code")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("accountName")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("type")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">{t("colUsage")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ACCOUNT_TYPE_IDS.flatMap((typeId) => {
              const group = accounts.filter((a) => a.type === typeId);
              if (group.length === 0) return [];
              const meta = accountTypeMeta(typeId);
              return [
                <TableRow key={`h-${typeId}`} className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={5} className="py-1.5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: meta.accent }}
                    >
                      {t(`accountTypes.${typeId}`)}
                    </span>
                  </TableCell>
                </TableRow>,
                ...group.map((a) => (
                  <TableRow key={a.id} className={a.active ? "" : "opacity-50"}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{a.name}</div>
                      {a.description && (
                        <div className="text-[11px] text-muted-foreground">{a.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {a.currency}
                        {!a.active && ` · ${t("inactive")}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {a.usageCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          aria-label={t("edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAccount(a.id)}
                          disabled={pending || a.usageCount > 0}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-30"
                          aria-label={t("delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )),
              ];
            })}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">{t("journalsHeading")}</h3>
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wider w-20">{t("code")}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">{t("journalName")}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">{t("type")}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">{t("colEntries")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs">{j.code}</TableCell>
                  <TableCell className="text-sm font-medium">{j.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {journalTypeLabel(j.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {j.usageCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeJournal(j.id)}
                        disabled={pending || j.usageCount > 0}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-30"
                        aria-label={t("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {editing && (
        <AccountDialog
          defaultCurrency={defaultCurrency}
          account={editing}
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          showTrigger={false}
        />
      )}
    </div>
  );
}

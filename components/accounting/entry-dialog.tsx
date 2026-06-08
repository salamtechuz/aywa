"use client";

import { Loader2, Plus, Trash2, Check, AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney, isBalanced, round2 } from "@/lib/accounting/stages";
import { createEntry, updateEntry } from "@/app/(app)/accounting/actions";

import type { AccountOption, EntryRow, JournalOption } from "./types";

type EditableLine = {
  key: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
};

let lineKeySeq = 0;
function blankLine(): EditableLine {
  lineKeySeq += 1;
  return { key: `l${lineKeySeq}`, accountId: "", description: "", debit: "", credit: "" };
}

function linesFromEntry(entry: EntryRow): EditableLine[] {
  return entry.lines.map((l) => {
    lineKeySeq += 1;
    return {
      key: `l${lineKeySeq}`,
      accountId: l.accountId,
      description: l.description ?? "",
      debit: l.debit ? String(l.debit) : "",
      credit: l.credit ? String(l.credit) : "",
    };
  });
}

function toDateInput(d: Date | string | null) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

type Props = {
  accounts: AccountOption[];
  journals: JournalOption[];
  defaultCurrency: string;
  entry?: EntryRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function EntryDialog({
  accounts,
  journals,
  defaultCurrency,
  entry,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: Props) {
  const t = useTranslations("accounting");
  const isEdit = Boolean(entry);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();

  const defaultJournalId = journals.find((j) => j.type === "GENERAL")?.id ?? journals[0]?.id ?? "";

  const [journalId, setJournalId] = useState(entry?.journalId ?? defaultJournalId);
  const [date, setDate] = useState(toDateInput(entry?.date ?? null));
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [lines, setLines] = useState<EditableLine[]>(
    entry ? linesFromEntry(entry) : [blankLine(), blankLine()],
  );

  // Re-seed the form whenever the dialog transitions to open (create resets to
  // blank, edit prefills from the latest entry). Adjusting state during render
  // on a prop change is the React-endorsed alternative to a sync effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (entry) {
        setJournalId(entry.journalId);
        setDate(toDateInput(entry.date));
        setReference(entry.reference ?? "");
        setLines(linesFromEntry(entry));
      } else {
        setJournalId(defaultJournalId);
        setDate(toDateInput(null));
        setReference("");
        setLines([blankLine(), blankLine()]);
      }
    }
  }

  const setLine = (key: string, patch: Partial<EditableLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onDebitChange = (key: string, value: string) =>
    setLine(key, { debit: value, ...(Number(value) > 0 ? { credit: "" } : {}) });
  const onCreditChange = (key: string, value: string) =>
    setLine(key, { credit: value, ...(Number(value) > 0 ? { debit: "" } : {}) });

  const totalDebit = round2(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
  const balanced = isBalanced(totalDebit, totalCredit) && totalDebit > 0;
  const diff = round2(totalDebit - totalCredit);

  // Base UI's <Select.Value> renders the raw bound value unless the Root is
  // given an `items` value→label map — otherwise the trigger would show the
  // account/journal cuid instead of its name. Build those maps once.
  const journalItems = Object.fromEntries(
    journals.map((j) => [j.id, `${j.code} · ${j.name}`]),
  );
  const accountItems = Object.fromEntries(
    accounts.map((a) => [a.id, `${a.code} · ${a.name}`]),
  );

  const submit = (status: "DRAFT" | "POSTED") => {
    const payloadLines = lines
      .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountId: l.accountId,
        description: l.description || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

    if (payloadLines.length < 2) {
      toast.error(t("toasts.needTwoLines"));
      return;
    }
    if (status === "POSTED" && !balanced) {
      toast.error(t("toasts.mustBalance"));
      return;
    }

    startTransition(async () => {
      const base = { journalId, date, reference, status, lines: payloadLines };
      const res = isEdit
        ? await updateEntry({ id: entry!.id, ...base })
        : await createEntry(base);
      if (res.ok) {
        toast.success(
          status === "POSTED"
            ? t("toasts.entryPosted")
            : isEdit
              ? t("toasts.entrySaved")
              : t("toasts.entryCreated"),
        );
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && !isEdit && (
        <DialogTrigger
          render={
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("newEntry")}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editEntry") : t("newEntry")}</DialogTitle>
          <DialogDescription>{t("entryDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>div]:min-w-0">
            <div className="grid gap-1.5">
              <Label htmlFor="journal">{t("journal")}</Label>
              <Select items={journalItems} value={journalId} onValueChange={(v) => v && setJournalId(v)}>
                <SelectTrigger id="journal" className="w-full min-w-0">
                  <SelectValue placeholder={t("pickJournal")} className="truncate" />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="w-auto min-w-(--anchor-width) max-w-[24rem]"
                >
                  {journals.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      <span className="font-mono text-[10px] text-muted-foreground mr-2">
                        {j.code}
                      </span>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="date">{t("date")}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reference">{t("reference")}</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t("referencePlaceholder")}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 pl-3">
                    {t("table.account")}
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 w-28">
                    {t("table.debit")}
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 w-28">
                    {t("table.credit")}
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b last:border-0">
                    <td className="pl-3 py-1.5 space-y-1">
                      <Select
                        items={accountItems}
                        value={l.accountId}
                        onValueChange={(v) => v && setLine(l.key, { accountId: v })}
                      >
                        <SelectTrigger className="h-7 px-2 text-xs w-full">
                          <SelectValue placeholder={t("table.pickAccount")} />
                        </SelectTrigger>
                        <SelectContent
                          alignItemWithTrigger={false}
                          className="w-auto min-w-(--anchor-width) max-w-[24rem]"
                        >
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="font-mono text-[10px] text-muted-foreground mr-2">
                                {a.code}
                              </span>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={l.description}
                        onChange={(e) => setLine(l.key, { description: e.target.value })}
                        placeholder={t("table.lineMemo")}
                        className="h-7 px-2 text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-1 align-top">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={l.debit}
                        onChange={(e) => onDebitChange(l.key, e.target.value)}
                        min="0"
                        step="0.01"
                        className="h-7 px-1 text-right tabular-nums"
                      />
                    </td>
                    <td className="py-1.5 px-1 align-top">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={l.credit}
                        onChange={(e) => onCreditChange(l.key, e.target.value)}
                        min="0"
                        step="0.01"
                        className="h-7 px-1 text-right tabular-nums"
                      />
                    </td>
                    <td className="pr-2 align-top py-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length > 2 ? prev.filter((x) => x.key !== l.key) : prev,
                          )
                        }
                        disabled={lines.length <= 2}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                        aria-label={t("table.removeLine")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="pl-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">
                    {t("table.totals")}
                  </td>
                  <td className="text-right px-1 py-2 tabular-nums">
                    {formatMoney(totalDebit, defaultCurrency)}
                  </td>
                  <td className="text-right px-1 py-2 tabular-nums">
                    {formatMoney(totalCredit, defaultCurrency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLines((prev) => [...prev, blankLine()])}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> {t("table.addLine")}
            </Button>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                balanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
              )}
            >
              {balanced ? (
                <>
                  <Check className="h-3.5 w-3.5" /> {t("balanced")}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("outOfBalance", { amount: formatMoney(Math.abs(diff), defaultCurrency) })}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => submit("DRAFT")}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveDraft")}
          </Button>
          <Button type="button" onClick={() => submit("POSTED")} disabled={pending || !balanced}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("post")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Loader2, Trash2, User, Workflow, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ALL_STAGES } from "@/lib/crm/stages";
import {
  bulkDeleteDeals,
  bulkUpdateDealOwner,
  bulkUpdateDealStage,
} from "@/app/(app)/crm/bulk-actions";

type Stage = (typeof ALL_STAGES)[number];

type Props = {
  selectedIds: string[];
  onClear: () => void;
};

export function BulkToolbar({ selectedIds, onClear }: Props) {
  const t = useTranslations("crm");
  const [pending, startTransition] = useTransition();
  const [ownerInput, setOwnerInput] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  const runStage = (stage: Stage) => {
    startTransition(async () => {
      const res = await bulkUpdateDealStage({ ids: selectedIds, stage });
      if (res.ok) {
        toast.success(
          t("bulk.movedToStage", {
            count: res.count,
            stage: t(`stages.${stage.toLowerCase()}`),
          }),
        );
        onClear();
      } else {
        toast.error(res.error);
      }
    });
  };

  const runOwner = () => {
    const owner = ownerInput.trim();
    startTransition(async () => {
      const res = await bulkUpdateDealOwner({ ids: selectedIds, ownerName: owner });
      if (res.ok) {
        toast.success(
          t("bulk.assignedTo", {
            count: res.count,
            owner: owner || t("bulk.unassigned"),
          }),
        );
        setOwnerInput("");
        setOwnerOpen(false);
        onClear();
      } else {
        toast.error(res.error);
      }
    });
  };

  const runDelete = () => {
    if (!confirm(t("bulk.confirmDelete", { count: selectedIds.length }))) {
      return;
    }
    startTransition(async () => {
      const res = await bulkDeleteDeals({ ids: selectedIds });
      if (res.ok) {
        toast.success(t("bulk.deleted", { count: res.count }));
        onClear();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-2.5 border-b bg-primary text-primary-foreground shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold tabular-nums">
          {t("bulk.selected", { count: selectedIds.length })}
        </span>

        <div className="h-4 w-px bg-primary-foreground/30" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                disabled={pending}
              >
                <Workflow className="h-3.5 w-3.5" />
                {t("bulk.moveToStage")}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">{t("bulk.pickStage")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_STAGES.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => runStage(s)}
              >
                {t(`stages.${s.toLowerCase()}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={ownerOpen} onOpenChange={setOwnerOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                disabled={pending}
              >
                <User className="h-3.5 w-3.5" />
                {t("bulk.assignOwner")}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-72 p-3">
            <DropdownMenuLabel className="text-xs px-0">{t("bulk.assignTo")}</DropdownMenuLabel>
            <Input
              placeholder={t("bulk.namePlaceholder")}
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runOwner();
                }
              }}
              autoFocus
              className="mt-2"
            />
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={runOwner}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("bulk.apply")}
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={runDelete}
          disabled={pending}
          className="gap-1.5 text-primary-foreground hover:bg-red-500/30 hover:text-primary-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("bulk.delete")}
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={pending}
          aria-label={t("bulk.clearSelection")}
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

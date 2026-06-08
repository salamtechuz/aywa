"use client";

import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TAG_COLORS, TAG_SWATCH_CLASS, safeTagColor } from "@/lib/crm/tags";
import {
  assignTagToDeal,
  createTag,
  removeTagFromDeal,
} from "@/app/(app)/crm/tag-actions";

import { TagChip } from "./tag-chip";

export type TagOption = { id: string; name: string; color: string };

type Props = {
  dealId: string;
  allTags: TagOption[];
  selected: TagOption[];
};

export function TagPicker({ dealId, allTags, selected }: Props) {
  const t = useTranslations("crm.tags");
  const [open, setOpen] = useState(false);
  const [, startMutation] = useTransition();
  const [optimisticIds, setOptimisticIds] = useState<string[]>(
    selected.map((t) => t.id),
  );

  const toggle = (tag: TagOption) => {
    const isSelected = optimisticIds.includes(tag.id);
    setOptimisticIds((prev) =>
      isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
    );
    startMutation(async () => {
      const res = isSelected
        ? await removeTagFromDeal(dealId, tag.id)
        : await assignTagToDeal(dealId, tag.id);
      if (!res.ok) {
        toast.error(t("failedToUpdate"));
        setOptimisticIds((prev) =>
          isSelected ? [...prev, tag.id] : prev.filter((id) => id !== tag.id),
        );
      }
    });
  };

  const currentlySelected = allTags.filter((t) => optimisticIds.includes(t.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {currentlySelected.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 group/tag"
          >
            <TagChip name={tag.name} color={tag.color} size="sm" />
            <button
              type="button"
              onClick={() => toggle(tag)}
              className="text-muted-foreground hover:text-foreground opacity-0 group-hover/tag:opacity-100 transition-opacity"
              aria-label={t("remove", { name: tag.name })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="xs"
                className="gap-1 text-muted-foreground"
              >
                <TagIcon className="h-3 w-3" />
                {currentlySelected.length === 0 ? t("addTag") : t("edit")}
              </Button>
            }
          />
          <PopoverContent className="w-64 p-0" align="start">
            <TagCommand
              dealId={dealId}
              allTags={allTags}
              selectedIds={optimisticIds}
              onToggle={toggle}
              onCreated={(tag) => toggle(tag)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function TagCommand({
  allTags,
  selectedIds,
  onToggle,
  onCreated,
}: {
  dealId: string;
  allTags: TagOption[];
  selectedIds: string[];
  onToggle: (tag: TagOption) => void;
  onCreated: (tag: TagOption) => void;
}) {
  const t = useTranslations("crm.tags");
  const [query, setQuery] = useState("");
  const [creating, startCreate] = useTransition();
  const exactMatch = allTags.find(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = query.trim().length > 0 && !exactMatch;

  const create = (color: string) => {
    startCreate(async () => {
      const res = await createTag({ name: query.trim(), color: color as never });
      if (res.ok && res.id) {
        onCreated({ id: res.id, name: query.trim(), color });
        setQuery("");
      } else {
        toast.error(t("failed"));
      }
    });
  };

  return (
    <Command>
      <CommandInput
        placeholder={t("searchOrCreate")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {canCreate ? t("pressColorToCreate") : t("noTagsYet")}
        </CommandEmpty>
        <CommandGroup heading={t("heading")}>
          {allTags.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            return (
              <CommandItem
                key={tag.id}
                value={tag.name}
                onSelect={() => onToggle(tag)}
                className="gap-2"
              >
                <span
                  className={cn("h-3 w-3 rounded-full", TAG_SWATCH_CLASS[safeTagColor(tag.color)])}
                  aria-hidden
                />
                <span className="flex-1">{tag.name}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {canCreate && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("createNamed", { name: query.trim() })}>
              <div className="px-2 py-1.5 flex flex-wrap gap-1.5">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => create(color)}
                    disabled={creating}
                    className={cn(
                      "h-5 w-5 rounded-full transition-transform hover:scale-110 ring-2 ring-transparent hover:ring-foreground/20",
                      TAG_SWATCH_CLASS[color],
                    )}
                    aria-label={t("createWithColor", { color })}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground self-center ml-1 inline-flex items-center gap-0.5">
                  <Plus className="h-2.5 w-2.5" /> {t("pickColor")}
                </span>
              </div>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}

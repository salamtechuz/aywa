"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { Membership } from "@/lib/tenant";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-muted text-muted-foreground",
  PRO: "bg-primary/10 text-primary",
  ENTERPRISE: "bg-foreground text-background",
};

export function WorkspaceSwitcher({
  memberships,
  activeId,
}: {
  memberships: Membership[];
  activeId: string;
}) {
  const [open, setOpen] = useState(false);
  const active = memberships.find((m) => m.workspace.id === activeId)?.workspace ?? memberships[0].workspace;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="h-9 gap-2 px-2 max-w-[130px] sm:max-w-[220px] justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {active.name.charAt(0)}
              </div>
              <span className="truncate font-medium">{active.name}</span>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        }
      />
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search workspace…" />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Your workspaces">
              {memberships.map(({ workspace, role }) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => setOpen(false)}
                  className="gap-2"
                >
                  <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {workspace.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{workspace.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{role.toLowerCase()}</div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 font-semibold",
                      PLAN_BADGE[workspace.plan] ?? PLAN_BADGE.FREE,
                    )}
                  >
                    {workspace.plan}
                  </span>
                  {workspace.id === active.id && (
                    <Check className="h-4 w-4 ml-1 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem className="gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" />
                Create workspace
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clearSampleData } from "./actions";

export function ClearSampleButton() {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (
      !confirm(
        "Remove all auto-seeded example records? Anything you've edited or created yourself stays.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await clearSampleData();
      if (res.ok) {
        toast.success(
          res.removed === 0 ? "Nothing to remove" : `Removed ${res.removed} sample records`,
        );
      } else {
        toast.error(("error" in res && res.error) || "Failed to clear sample data");
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending} className="gap-1.5">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      Clear sample data
    </Button>
  );
}

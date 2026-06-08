"use client";

import { Copy, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateAccountBrief } from "@/lib/ai/actions";

type Props = {
  contactId: string;
  aiEnabled: boolean;
};

export function AccountBriefPanel({ contactId, aiEnabled }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!aiEnabled) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">AI is off</p>
          <p className="mt-0.5">
            Add <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ANTHROPIC_API_KEY</code> to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">.env.local</code> to enable account briefs.
          </p>
        </div>
      </div>
    );
  }

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAccountBrief(contactId);
      if (res.ok) {
        setResult(res.text);
      } else {
        setError(res.error);
        setResult(null);
      }
    });
  };

  const onCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={run}
        disabled={pending}
        className="gap-1.5"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Generate account brief
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Account brief
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <pre className="p-3 text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

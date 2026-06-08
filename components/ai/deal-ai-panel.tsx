"use client";

import { Copy, Loader2, Mail, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { draftFollowUpEmail, summarizeDeal } from "@/lib/ai/actions";

type Mode = "summary" | "email";

type Props = {
  dealId: string;
  /** Hide the panel entirely when AI is not configured. The server reads this once at render. */
  aiEnabled: boolean;
};

export function DealAiPanel({ dealId, aiEnabled }: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!aiEnabled) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">AI is off</p>
            <p className="mt-0.5">
              Add <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ANTHROPIC_API_KEY</code>{" "}
              to <code className="rounded bg-muted px-1 py-0.5 text-[10px]">.env.local</code> and restart the
              dev server to enable Summarize / Draft email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const run = (nextMode: Mode) => {
    setError(null);
    setMode(nextMode);
    startTransition(async () => {
      const res =
        nextMode === "summary"
          ? await summarizeDeal(dealId)
          : await draftFollowUpEmail(dealId);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI assistant</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => run("summary")}
          disabled={pending}
          className="gap-1.5"
        >
          {pending && mode === "summary" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Summarize this deal
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => run("email")}
          disabled={pending}
          className="gap-1.5"
        >
          {pending && mode === "email" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          Draft follow-up email
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {mode === "summary" ? "Summary" : "Draft email"}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <pre
            className={cn(
              "p-3 text-sm whitespace-pre-wrap font-sans leading-relaxed",
              mode === "email" && "font-mono text-[13px]",
            )}
          >
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

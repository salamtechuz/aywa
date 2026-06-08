"use client";

import { Copy, Loader2, PlusCircle, Trash2, Webhook } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/events";

import { createWebhook, deleteWebhook, updateWebhook } from "./webhook-actions";

export type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastFiredAt: Date | string | null;
  lastStatus: number | null;
};

function fmtDate(d: Date | string | null) {
  if (!d) return "never";
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WebhookForm({ webhooks }: { webhooks: WebhookRow[] }) {
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    () => new Set(ALL_WEBHOOK_EVENTS as readonly string[]),
  );
  const [pending, startTransition] = useTransition();
  const [newSecret, setNewSecret] = useState<{ url: string; secret: string } | null>(null);

  const toggleEvent = (e: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.size === 0) return;
    startTransition(async () => {
      const res = await createWebhook({
        url: url.trim(),
        events: Array.from(selectedEvents),
      });
      if (res.ok) {
        setNewSecret({ url: url.trim(), secret: res.secret });
        setUrl("");
      } else {
        toast.error(("error" in res && res.error) || "Failed");
      }
    });
  };

  const onCopy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const onToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await updateWebhook({ id, active });
      if (res.ok) toast.success(active ? "Enabled" : "Paused");
      else toast.error("Failed");
    });
  };

  const onDelete = (id: string, u: string) => {
    if (!confirm(`Delete webhook to ${u}?`)) return;
    startTransition(async () => {
      const res = await deleteWebhook(id);
      if (res.ok) toast.success("Deleted");
      else toast.error("Failed");
    });
  };

  return (
    <div className="space-y-5">
      {newSecret && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Webhook created — copy your signing secret
            </span>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            We&apos;ll include an{" "}
            <code className="bg-emerald-500/10 px-1 rounded">aywa-signature</code> header on
            every POST to <code className="bg-emerald-500/10 px-1 rounded">{newSecret.url}</code>.
            Compute HMAC-SHA256 of <code className="bg-emerald-500/10 px-1 rounded">{`{ts}.{body}`}</code>{" "}
            with this secret and compare. The secret is shown only once.
          </p>
          <div className="flex gap-2">
            <Input value={newSecret.secret} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => onCopy(newSecret.secret)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNewSecret(null)}
            className="-ml-2"
          >
            I&apos;ve saved it
          </Button>
        </div>
      )}

      <form onSubmit={onCreate} className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="wh-url">Endpoint URL</Label>
          <Input
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-app.example.com/webhooks/aywa"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Subscribed events</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_WEBHOOK_EVENTS.map((e) => {
              const on = selectedEvents.has(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEvent(e)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-mono transition-colors",
                    on
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending || !url.trim() || selectedEvents.size === 0}
          className="gap-1.5"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          Add endpoint
        </Button>
      </form>

      {webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No webhook endpoints yet. Add one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {webhooks.map((w) => (
            <li key={w.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start gap-3">
                <Webhook
                  className={cn(
                    "h-4 w-4 mt-1 shrink-0",
                    w.active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono truncate">{w.url}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.events.map((e) => (
                      <Badge key={e} variant="outline" className="text-[10px] font-mono">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle(w.id, !w.active)}
                    disabled={pending}
                  >
                    {w.active ? "Pause" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(w.id, w.url)}
                    disabled={pending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-3 pl-7">
                <span>last fired {fmtDate(w.lastFiredAt)}</span>
                {w.lastStatus !== null && (
                  <span
                    className={cn(
                      "font-mono",
                      w.lastStatus >= 200 && w.lastStatus < 300
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    HTTP {w.lastStatus || "error"}
                  </span>
                )}
                {!w.active && (
                  <Badge variant="outline" className="text-[10px]">
                    paused
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

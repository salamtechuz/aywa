"use client";

import {
  CheckCircle2,
  Copy,
  Loader2,
  Plug,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { backfillOdoo, saveOdooConnection, testOdooConnectionAction } from "./actions";

export type EntityOption = { entityType: string; label: string };

export type OdooSettings = {
  baseUrl: string;
  db: string;
  username: string;
  hasKey: boolean;
  active: boolean;
  enabledEntities: string[];
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  lastPullAt: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  linkCounts: Record<string, number>;
};

function fmtDate(d: string | null) {
  if (!d) return "never";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function OdooConnectionForm({
  settings,
  entities,
}: {
  settings: OdooSettings;
  entities: EntityOption[];
}) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [database, setDatabase] = useState(settings.db);
  const [username, setUsername] = useState(settings.username);
  const [apiKey, setApiKey] = useState("");
  const [active, setActive] = useState(settings.active);
  const [enabled, setEnabled] = useState<Set<string>>(new Set(settings.enabledEntities));
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();

  const toggleEntity = (e: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveOdooConnection({
        baseUrl: baseUrl.trim(),
        db: database.trim(),
        username: username.trim(),
        apiKey: apiKey.trim() || undefined,
        enabledEntities: Array.from(enabled),
        active,
      });
      if (res.ok) {
        toast.success("Saved");
        setApiKey("");
      } else {
        toast.error(("error" in res && res.error) || "Failed");
      }
    });
  };

  const onTest = () => {
    startTest(async () => {
      const res = await testOdooConnectionAction();
      if (res.ok) toast.success(`Connected — Odoo uid ${"uid" in res ? res.uid : ""}`);
      else toast.error(("error" in res && res.error) || "Connection failed");
    });
  };

  const onBackfill = (entityType: string) => {
    startTransition(async () => {
      const res = await backfillOdoo(entityType);
      if (res.ok && "pushed" in res) {
        toast.success(`Backfill done — pushed ${res.pushed}, pulled ${res.pulled}`);
      } else {
        toast.error(("error" in res && res.error) || "Backfill failed");
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

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Connection */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="od-url">Odoo URL</Label>
          <Input
            id="od-url"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://agrifoods-test.odoo.com"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="od-db">Database</Label>
          <Input
            id="od-db"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder="agrifoods-test"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="od-user">Username (email)</Label>
          <Input
            id="od-user"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="od-key">API key</Label>
          <Input
            id="od-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              settings.hasKey ? "•••••••••• (leave blank to keep current)" : "Odoo → Account Security → API Keys"
            }
            autoComplete="off"
          />
        </div>
      </div>

      {/* Which data to sync */}
      <div className="grid gap-2">
        <Label>Sync these entities (both directions)</Label>
        <div className="flex flex-wrap gap-1.5">
          {entities.map((ent) => {
            const on = enabled.has(ent.entityType);
            const count = settings.linkCounts[ent.entityType] ?? 0;
            return (
              <button
                key={ent.entityType}
                type="button"
                onClick={() => toggleEntity(ent.entityType)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {ent.label}
                {count > 0 && (
                  <span className="rounded-full bg-background/20 px-1.5 text-[10px]">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Linked record counts shown per entity. Use “Backfill” below after the first connect to seed both sides.
        </p>
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Enable sync (active)
      </label>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onTest} disabled={testing} className="gap-1.5">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Test connection
        </Button>
        {Array.from(enabled).map((et) => (
          <Button
            key={et}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onBackfill(et)}
            disabled={pending}
            className="gap-1.5 text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Backfill {entities.find((e) => e.entityType === et)?.label ?? et}
          </Button>
        ))}
      </div>

      {/* Status */}
      <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Last test:</span>
          {settings.lastTestOk === null ? (
            <span className="text-muted-foreground">not tested</span>
          ) : settings.lastTestOk ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" /> {settings.lastTestError ?? "failed"}
            </span>
          )}
          <span className="text-muted-foreground">({fmtDate(settings.lastTestAt)})</span>
        </div>
        <div>
          <span className="text-muted-foreground">Last pull from Odoo:</span> {fmtDate(settings.lastPullAt)}
        </div>
      </div>

      {/* Inbound webhook (optional, for real-time Odoo → aywa) */}
      {settings.webhookUrl && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-sm font-medium">Inbound webhook (optional)</div>
          <p className="text-[11px] text-muted-foreground">
            For near real-time Odoo → aywa, add an Odoo Automation Rule that POSTs{" "}
            <code className="bg-muted px-1 rounded">{`{ "model": "...", "res_id": id }`}</code> to this URL.
            Otherwise the sync cron pulls every few minutes.
          </p>
          <div className="flex gap-2">
            <Input value={settings.webhookUrl} readOnly className="font-mono text-[11px]" />
            <Button type="button" variant="outline" size="icon" onClick={() => onCopy(settings.webhookUrl!)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {settings.webhookSecret && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Secret header x-odoo-secret:</span>
              <Input value={settings.webhookSecret} readOnly className="font-mono text-[11px]" />
              <Button type="button" variant="outline" size="icon" onClick={() => onCopy(settings.webhookSecret!)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        The API key is stored on the server and used to call Odoo. Treat this workspace’s admins as trusted.
      </p>
    </form>
  );
}

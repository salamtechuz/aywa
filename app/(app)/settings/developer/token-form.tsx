"use client";

import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { createApiToken, revokeApiToken } from "./actions";

export type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  createdBy: string | null;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
};

function fmtDate(d: Date | string | null) {
  if (!d) return "never";
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function TokenForm({ tokens }: { tokens: TokenRow[] }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"READ" | "WRITE">("READ");
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("scope", scope);
    startTransition(async () => {
      const res = await createApiToken(fd);
      if (res.ok) {
        setNewToken(res.token);
        setName("");
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

  const onRevoke = async (id: string, n: string) => {
    if (!confirm(`Revoke token "${n}"? Anything using it will stop working immediately.`)) {
      return;
    }
    setRevokingId(id);
    const res = await revokeApiToken(id);
    setRevokingId(null);
    if (res.ok) toast.success("Revoked");
    else toast.error("Failed");
  };

  return (
    <div className="space-y-5">
      {newToken && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Token created — copy it now
            </span>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            This is the only time you&apos;ll see this token in full. Store it somewhere safe; if
            you lose it, revoke and create a new one.
          </p>
          <div className="flex gap-2">
            <Input value={newToken} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => onCopy(newToken)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNewToken(null)}
            className="-ml-2"
          >
            I&apos;ve saved it
          </Button>
        </div>
      )}

      <form onSubmit={onCreate} className="flex flex-col sm:flex-row gap-2 items-end">
        <div className="flex-1 grid gap-1.5 w-full">
          <Label htmlFor="token-name">Token name</Label>
          <Input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zapier integration"
            required
          />
        </div>
        <div className="grid gap-1.5 sm:w-40">
          <Label htmlFor="token-scope">Scope</Label>
          <Select value={scope} onValueChange={(v) => v && setScope(v as "READ" | "WRITE")}>
            <SelectTrigger id="token-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="READ">Read only</SelectItem>
              <SelectItem value="WRITE">Read & Write</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pending || !name.trim()} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create token
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Token</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Scope</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Created</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Last used</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  No API tokens yet. Create one above to access the REST API.
                </TableCell>
              </TableRow>
            )}
            {tokens.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-muted text-xs">
                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      {t.createdBy && (
                        <div className="text-[11px] text-muted-foreground">
                          by {t.createdBy}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
                    {t.prefix}…
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border-transparent text-[10px] uppercase tracking-wider",
                      t.scope === "WRITE"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                    )}
                  >
                    {t.scope === "WRITE" ? "Read & Write" : "Read only"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtDate(t.createdAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtDate(t.lastUsedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRevoke(t.id, t.name)}
                    disabled={revokingId === t.id}
                    aria-label="Revoke token"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {revokingId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

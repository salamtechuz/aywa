"use client";

import { Mail, MoreHorizontal, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { changeMemberRole, removeMember, revokeInvitation } from "./actions";

export type MemberRow = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  joinedAt: Date | string;
  /** True if this row is the currently-signed-in user. UI guards prevent self-demote. */
  isSelf: boolean;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  invitedBy: string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
};

const ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  ADMIN: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  MEMBER: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  VIEWER: "bg-muted text-muted-foreground",
};

function initials(s: string) {
  return s
    .split(/\s+|@/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function MemberRowActions({ row }: { row: MemberRow }) {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();

  const onRole = (role: string) => {
    if (role === row.role) return;
    startTransition(async () => {
      const res = await changeMemberRole({ membershipId: row.membershipId, role: role as never });
      if (res.ok) toast.success(t("roleChanged", { role: t(`roles.${role}`) }));
      else toast.error(("error" in res && res.error) || t("failed"));
    });
  };

  const onRemove = () => {
    if (!confirm(t("removeMemberConfirm", { email: row.email }))) return;
    startTransition(async () => {
      const res = await removeMember(row.membershipId);
      if (res.ok) toast.success(t("removed"));
      else toast.error(("error" in res && res.error) || t("failed"));
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" disabled={pending} aria-label={t("rowActions")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">{t("role")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={row.role} onValueChange={onRole}>
          <DropdownMenuRadioItem value="OWNER">{t("roles.OWNER")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ADMIN">{t("roles.ADMIN")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="MEMBER">{t("roles.MEMBER")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="VIEWER">{t("roles.VIEWER")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRemove} disabled={row.isSelf} className="text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          {row.isSelf ? t("cantRemoveSelf") : t("removeMember")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InviteRowActions({ row }: { row: PendingInviteRow }) {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        startTransition(async () => {
          const res = await revokeInvitation(row.id);
          if (res.ok) toast.success(t("invitationRevoked"));
          else toast.error(("error" in res && res.error) || t("failed"));
        });
      }}
      disabled={pending}
      className="text-destructive hover:text-destructive gap-1.5"
    >
      <Trash2 className="h-3.5 w-3.5" /> {t("revoke")}
    </Button>
  );
}

export function MembersTable({
  members,
  invitations,
}: {
  members: MemberRow[];
  invitations: PendingInviteRow[];
}) {
  const t = useTranslations("settings");
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">{t("colMember")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("role")}</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">{t("colJoined")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.membershipId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(m.name ?? m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.name ?? m.email.split("@")[0]}
                        {m.isSelf && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                            {t("you")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent", ROLE_BADGE[m.role])}>
                    {m.role === "OWNER" && <ShieldCheck className="h-3 w-3 mr-1" />}
                    {t(`roles.${m.role}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {fmtDate(m.joinedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <MemberRowActions row={m} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invitations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t("pendingInvitations")}
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {invitations.length}
            </span>
          </h3>
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">{t("colEmail")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("role")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("colExpires")}</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">{t("colInvitedBy")}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.email}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-transparent", ROLE_BADGE[row.role])}>
                        {t(`roles.${row.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(row.expiresAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.invitedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <InviteRowActions row={row} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

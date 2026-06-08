"use client";

import { Copy, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMember } from "./actions";

type Props = {
  emailEnabled: boolean;
};

export function InviteForm({ emailEnabled }: Props) {
  const t = useTranslations("settings");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [pending, startTransition] = useTransition();
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const fd = new FormData();
    fd.set("email", email.trim());
    fd.set("role", role);
    startTransition(async () => {
      const res = await inviteMember(fd);
      if (res.ok) {
        if (res.emailSent) {
          toast.success(t("invitationSent", { email }));
          setLastInviteUrl(null);
        } else {
          toast.success(t("invitationCreated"));
          setLastInviteUrl(res.inviteUrl);
        }
        setEmail("");
      } else {
        toast.error(res.error);
      }
    });
  };

  const copyLink = async () => {
    if (!lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInviteUrl);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger className="sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OWNER">{t("roles.OWNER")}</SelectItem>
            <SelectItem value="ADMIN">{t("roles.ADMIN")}</SelectItem>
            <SelectItem value="MEMBER">{t("roles.MEMBER")}</SelectItem>
            <SelectItem value="VIEWER">{t("roles.VIEWER")}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={pending || !email.trim()} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("invite")}
        </Button>
      </form>

      {!emailEnabled && (
        <p className="text-xs text-muted-foreground">
          {t.rich("emailOffNote", {
            code: (chunks) => (
              <code className="rounded bg-muted px-1 py-0.5">{chunks}</code>
            ),
          })}
        </p>
      )}

      {lastInviteUrl && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t("invitationLinkExpiry")}
          </div>
          <div className="flex gap-2">
            <Input value={lastInviteUrl} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

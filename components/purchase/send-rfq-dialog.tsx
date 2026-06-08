"use client";

import { FileDown, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { draftRfqEmail } from "@/lib/ai/actions";
import { sendRfqEmail } from "@/app/(app)/purchase/send-actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  defaultRecipient: string | null;
  workspaceName: string;
  aiEnabled: boolean;
  emailEnabled: boolean;
  status: string;
};

function splitDraft(text: string): { subject: string; body: string } {
  const match = /^subject:\s*(.+)$/im.exec(text);
  if (!match) return { subject: "", body: text.trim() };
  const subjectLine = match[1].trim();
  const idx = text.indexOf(match[0]) + match[0].length;
  const rest = text.slice(idx).replace(/^\s*\n+/, "");
  return { subject: subjectLine, body: rest.trim() };
}

export function SendRfqDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  defaultRecipient,
  workspaceName,
  aiEnabled,
  emailEnabled,
  status,
}: Props) {
  const t = useTranslations("purchase");
  const [to, setTo] = useState(defaultRecipient ?? "");
  const [subject, setSubject] = useState(
    t("rfqSubject", { number: orderNumber, workspace: workspaceName }),
  );
  const [body, setBody] = useState("");
  const [drafting, startDraft] = useTransition();
  const [sending, startSend] = useTransition();
  const [bumpStatus, setBumpStatus] = useState(status === "DRAFT");
  const [error, setError] = useState<string | null>(null);

  // Auto-draft on first open. Re-run each time the dialog reopens for a
  // different order; reset state.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTo(defaultRecipient ?? "");
    setSubject(t("rfqSubject", { number: orderNumber, workspace: workspaceName }));
    setBumpStatus(status === "DRAFT");
    if (aiEnabled && !body) {
      startDraft(async () => {
        const res = await draftRfqEmail(orderId, workspaceName);
        if (res.ok) {
          const parsed = splitDraft(res.text);
          if (parsed.subject) setSubject(parsed.subject);
          setBody(parsed.body);
        } else {
          setError(res.error);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId, orderNumber, defaultRecipient, workspaceName, status]);

  const redraft = () => {
    setError(null);
    setBody("");
    startDraft(async () => {
      const res = await draftRfqEmail(orderId, workspaceName);
      if (res.ok) {
        const parsed = splitDraft(res.text);
        if (parsed.subject) setSubject(parsed.subject);
        setBody(parsed.body);
      } else {
        setError(res.error);
      }
    });
  };

  const onSend = () => {
    setError(null);
    startSend(async () => {
      const res = await sendRfqEmail({
        orderId,
        to,
        subject,
        body,
        bumpStatus,
      });
      if (res.ok) {
        toast.success(t("toasts.rfqSent", { number: orderNumber, to }));
        onOpenChange(false);
      } else {
        setError(res.error);
      }
    });
  };

  const disabled =
    sending || drafting || !to.trim() || !subject.trim() || !body.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t("sendRfqTitle", { number: orderNumber })}
          </DialogTitle>
          <DialogDescription>
            {t("sendRfqDescription")}
          </DialogDescription>
        </DialogHeader>

        {!emailEnabled && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 text-xs px-3 py-2 text-amber-800 dark:text-amber-200">
            <strong>{t("emailOff")}</strong> {t("emailOffHintBefore")}{" "}
            <code className="rounded bg-amber-500/10 px-1 py-0.5">RESEND_API_KEY</code> {t("emailOffHintMiddle")}{" "}
            <code className="rounded bg-amber-500/10 px-1 py-0.5">.env.local</code> {t("emailOffHintAfter")}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rfq-to">{t("to")}</Label>
            <Input
              id="rfq-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="vendor@supplier.com"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rfq-subject">{t("subject")}</Label>
            <Input
              id="rfq-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rfq-body">{t("message")}</Label>
              {aiEnabled && (
                <button
                  type="button"
                  onClick={redraft}
                  disabled={drafting}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {drafting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {t("redraftWithAi")}
                </button>
              )}
            </div>
            <Textarea
              id="rfq-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder={
                drafting
                  ? t("draftingWithAi")
                  : aiEnabled
                    ? t("emptyTryRedraft")
                    : t("bodyPlaceholder")
              }
              disabled={drafting}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border bg-muted/30 px-3 py-2">
            <FileDown className="h-4 w-4 shrink-0" />
            <span>
              <strong>{orderNumber}.pdf</strong> {t("attachedAutomatically")}
            </span>
          </div>

          {status === "DRAFT" && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bumpStatus}
                onChange={(e) => setBumpStatus(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-muted-foreground/40"
              />
              <span>
                {t.rich("markRfqSentAfterDelivery", {
                  b: (chunks) => (
                    <strong className="text-foreground">{chunks}</strong>
                  ),
                })}
              </span>
            </label>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t("cancel")}
          </Button>
          <Button onClick={onSend} disabled={disabled || !emailEnabled} className="gap-1.5">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

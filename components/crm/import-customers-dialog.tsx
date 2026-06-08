"use client";

import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { importCustomersCsv } from "@/app/(app)/crm/customers/import-actions";

export function ImportCustomersDialog() {
  const t = useTranslations("crm.import");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("pickCsv"));
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const res = await importCustomersCsv(fd);
      if (res.ok) {
        setResult({ created: res.created, skipped: res.skipped, failed: res.failed });
        toast.success(t("importedCount", { count: res.created }));
      } else {
        toast.error(res.error);
      }
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) submitFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) submitFile(file);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Upload className="h-4 w-4" />
            {t("importCsv")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t.rich("description", {
              code: (chunks) => (
                <code className="rounded bg-muted px-1 py-0.5">{chunks}</code>
              ),
              cols: (chunks) => <span className="font-mono"> {chunks}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-card p-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {result.created}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("created")}
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {result.skipped}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("skipped")}
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  {result.failed}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("failed")}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                {t("importAnother")}
              </Button>
              <Button onClick={() => setOpen(false)}>{t("done")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "rounded-lg border border-dashed py-10 px-4 text-center transition-colors",
                dragOver ? "bg-primary/5 border-primary" : "bg-muted/30",
              )}
            >
              {pending ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("importing")}
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground/60" />
                  <p className="mt-2 text-sm">
                    {t.rich("dropZone", {
                      pick: (chunks) => (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-primary underline-offset-2 hover:underline font-medium"
                        >
                          {chunks}
                        </button>
                      ),
                    })}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("maxSize")}</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onChange}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

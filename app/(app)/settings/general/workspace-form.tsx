"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import {
  removeWorkspaceLogo,
  updateWorkspace,
  uploadWorkspaceLogo,
} from "../actions";

const ACCENTS = [
  { id: "indigo", color: "oklch(0.48 0.20 265)" },
  { id: "violet", color: "oklch(0.55 0.22 295)" },
  { id: "emerald", color: "oklch(0.55 0.18 150)" },
  { id: "amber", color: "oklch(0.72 0.17 70)" },
  { id: "rose", color: "oklch(0.60 0.22 15)" },
  { id: "sky", color: "oklch(0.60 0.16 230)" },
] as const;

type Props = {
  workspace: {
    name: string;
    slug: string;
    logo: string | null;
    accentColor: string | null;
    defaultCurrency: string;
  };
};

export function WorkspaceForm({ workspace }: Props) {
  const t = useTranslations("settings");
  const [accent, setAccent] = useState(workspace.accentColor);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [removingLogo, startRemove] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (formData: FormData) => {
    if (accent) formData.set("accentColor", accent);
    startSave(async () => {
      const res = await updateWorkspace(formData);
      if (res.ok) {
        toast.success(t("workspaceSaved"));
      } else {
        toast.error(("error" in res && res.error) || t("saveFailed"));
      }
    });
  };

  const onPickLogo = () => fileInputRef.current?.click();

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startUpload(async () => {
      const res = await uploadWorkspaceLogo(fd);
      if (res.ok) toast.success(t("logoUpdated"));
      else toast.error(("error" in res && res.error) || t("uploadFailed"));
    });
    e.target.value = "";
  };

  const onLogoRemove = () => {
    if (!confirm(t("removeLogoConfirm"))) return;
    startRemove(async () => {
      const res = await removeWorkspaceLogo();
      if (res.ok) toast.success(t("logoRemoved"));
      else toast.error(("error" in res && res.error) || t("failed"));
    });
  };

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
          {workspace.logo ? (
            <Image
              src={publicUrlFor(workspace.logo)}
              alt={t("workspaceLogoAlt")}
              width={64}
              height={64}
              className="object-contain"
              unoptimized
            />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={onLogoChange}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onPickLogo} disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {workspace.logo ? t("replaceLogo") : t("uploadLogo")}
            </Button>
            {workspace.logo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLogoRemove}
                disabled={removingLogo}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("remove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("logoHint")}
          </p>
        </div>
      </div>

      <div className="grid gap-1.5 max-w-md">
        <Label htmlFor="ws-name">{t("workspaceName")}</Label>
        <Input id="ws-name" name="name" defaultValue={workspace.name} required />
      </div>

      <div className="grid gap-1.5 max-w-md">
        <Label htmlFor="ws-slug">{t("urlSlug")}</Label>
        <div className="flex items-center gap-2">
          <Input id="ws-slug" name="slug" defaultValue={workspace.slug} required />
          <span className="text-sm text-muted-foreground">.aywa.app</span>
        </div>
      </div>

      <div className="grid gap-1.5 max-w-[8rem]">
        <Label htmlFor="ws-currency">{t("defaultCurrency")}</Label>
        <Input
          id="ws-currency"
          name="defaultCurrency"
          defaultValue={workspace.defaultCurrency}
          maxLength={3}
          className="uppercase font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("accentColor")}</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccent(a.color)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                accent === a.color ? "border-foreground" : "hover:border-foreground/50",
              )}
            >
              <span className="h-4 w-4 rounded-full" style={{ background: a.color }} aria-hidden />
              {t(`accents.${a.id}`)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("accentColorHintDocs")}
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveChanges")}
        </Button>
      </div>
    </form>
  );
}

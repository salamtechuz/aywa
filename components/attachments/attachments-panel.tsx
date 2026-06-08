"use client";

import {
  Download,
  File as FileIcon,
  FileImage,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteAttachment,
  uploadAttachment,
} from "@/lib/attachments/actions";
import { publicUrlFor } from "@/lib/attachments/storage-public";
import type { EntityType } from "@/lib/attachments/queries";

export type AttachmentItem = {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  createdAt: Date | string;
};

type Props = {
  entityType: EntityType;
  entityId: string;
  attachments: AttachmentItem[];
};

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  return FileIcon;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AttachmentsPanel({
  entityType,
  entityId,
  attachments,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    startUpload(async () => {
      for (const file of list) {
        const fd = new FormData();
        fd.set("entityType", entityType);
        fd.set("entityId", entityId);
        fd.set("file", file);
        const res = await uploadAttachment(fd);
        if (res.ok) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`${file.name}: ${res.error}`);
        }
      }
    });
  };

  const onPick = () => fileInputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = ""; // allow same file twice
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const onDelete = async (att: AttachmentItem) => {
    if (!confirm(`Delete "${att.filename}"?`)) return;
    setDeletingId(att.id);
    const res = await deleteAttachment(att.id);
    setDeletingId(null);
    if (res.ok) toast.success("Attachment deleted");
    else toast.error(res.error);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Attachments</span>
          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {attachments.length}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPick}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onChange}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-lg border border-dashed bg-muted/30 transition-colors",
          dragOver && "border-primary bg-primary/5",
          attachments.length === 0 ? "py-8 px-4" : "p-2",
        )}
      >
        {attachments.length === 0 ? (
          <div className="text-center">
            <Upload className="h-5 w-5 mx-auto text-muted-foreground/60" />
            <p className="mt-2 text-xs text-muted-foreground">
              Drop files here or{" "}
              <button
                type="button"
                onClick={onPick}
                className="text-primary underline-offset-2 hover:underline"
              >
                browse
              </button>
              . PDF, DOCX, images up to 10 MB.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {attachments.map((att) => {
              const Icon = iconFor(att.mimeType);
              const isDeleting = deletingId === att.id;
              return (
                <li
                  key={att.id}
                  className="group flex items-center gap-2 rounded-md bg-card border px-2 py-1.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={publicUrlFor(att.storageKey)}
                      download={att.filename}
                      className="text-sm font-medium truncate block hover:text-primary transition-colors"
                    >
                      {att.filename}
                    </a>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {formatSize(att.size)} · {formatDate(att.createdAt)}
                      {att.uploadedBy ? ` · ${att.uploadedBy}` : ""}
                    </div>
                  </div>
                  <a
                    href={publicUrlFor(att.storageKey)}
                    download={att.filename}
                    aria-label={`Download ${att.filename}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onDelete(att)}
                    disabled={isDeleting}
                    aria-label={`Delete ${att.filename}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

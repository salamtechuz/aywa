"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit/log";
import { parseCsvWithHeader } from "@/lib/csv/parse";
import { db } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { getActiveWorkspace } from "@/lib/tenant";

export type ImportRowResult = {
  row: number;
  ok: boolean;
  error?: string;
  contactId?: string;
};

export type ImportResult =
  | {
      ok: true;
      created: number;
      skipped: number;
      failed: number;
      results: ImportRowResult[];
    }
  | { ok: false; error: string };

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "contact", "contact name", "customer", "имя", "клиент"],
  email: ["email", "e-mail", "почта"],
  phone: ["phone", "telephone", "tel", "телефон"],
  company: ["company", "organization", "org", "компания"],
  type: ["type", "kind", "тип"],
};

function mapHeader(header: string): string | null {
  const norm = header.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(norm)) return canonical;
  }
  return null;
}

export async function importCustomersCsv(formData: FormData): Promise<ImportResult> {
  const denied = await assertCanWrite();
  if (denied) return { ok: false, error: denied.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "CSV must be under 5 MB" };
  }
  const text = await file.text();
  const { headers, rows } = parseCsvWithHeader(text);
  if (rows.length === 0) {
    return { ok: false, error: "CSV has no data rows" };
  }

  // Build a per-row map from canonical field → CSV column.
  const headerMap: Record<string, string> = {};
  for (const h of headers) {
    const canonical = mapHeader(h);
    if (canonical && !headerMap[canonical]) headerMap[canonical] = h;
  }
  if (!headerMap.name) {
    return {
      ok: false,
      error: `Couldn't find a "name" column. Detected: ${headers.join(", ")}`,
    };
  }

  const ws = await getActiveWorkspace();
  const results: ImportRowResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  // Dedupe inside the file by email when present, otherwise by name+company.
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = (headerMap.name ? r[headerMap.name] : "").trim();
    if (!name) {
      results.push({ row: i + 2, ok: false, error: "missing name" });
      failed++;
      continue;
    }
    const email = (headerMap.email ? r[headerMap.email] : "").trim().toLowerCase() || null;
    const phone = (headerMap.phone ? r[headerMap.phone] : "").trim() || null;
    const company = (headerMap.company ? r[headerMap.company] : "").trim() || null;
    const typeRaw = (headerMap.type ? r[headerMap.type] : "").trim().toUpperCase();
    const type = typeRaw === "COMPANY" || company ? "COMPANY" : "PERSON";

    const dedupeKey = email ?? `${name.toLowerCase()}::${company?.toLowerCase() ?? ""}`;
    if (seen.has(dedupeKey)) {
      results.push({ row: i + 2, ok: true, error: "duplicate in file — skipped" });
      skipped++;
      continue;
    }
    seen.add(dedupeKey);

    // Skip if a contact with same email already exists in the workspace.
    if (email) {
      const existing = await db.contact.findFirst({
        where: { workspaceId: ws.id, email },
      });
      if (existing) {
        results.push({ row: i + 2, ok: true, contactId: existing.id, error: "already exists — skipped" });
        skipped++;
        continue;
      }
    }

    try {
      const c = await db.contact.create({
        data: { workspaceId: ws.id, name, email, phone, company, type },
      });
      results.push({ row: i + 2, ok: true, contactId: c.id });
      created++;
    } catch (err) {
      results.push({
        row: i + 2,
        ok: false,
        error: err instanceof Error ? err.message : "Insert failed",
      });
      failed++;
    }
  }

  await logAudit({
    action: "CREATE",
    entityType: "CUSTOMER",
    summary: `CSV imported ${created} customers (${skipped} skipped, ${failed} failed)`,
  });

  revalidatePath("/crm/customers");
  revalidatePath("/crm");

  return { ok: true, created, skipped, failed, results };
}

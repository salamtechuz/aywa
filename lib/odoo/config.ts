import "server-only";

import { db } from "@/lib/db";
import type { OdooConfig } from "./types";

// Resolves the Odoo connection config for a workspace. Priority:
//   1. The active OdooConnection row (per-workspace, configured in Settings).
//   2. Env vars (ODOO_URL/ODOO_DB/ODOO_USERNAME/ODOO_API_KEY) — single-instance
//      fallback for a quick bring-up, mirroring the Stripe/Resend env gating.

export function envConfig(): OdooConfig | null {
  const baseUrl = process.env.ODOO_URL;
  const database = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const apiKey = process.env.ODOO_API_KEY;
  if (baseUrl && database && username && apiKey) {
    return { baseUrl, db: database, username, apiKey };
  }
  return null;
}

export function connToConfig(conn: {
  baseUrl: string;
  db: string;
  username: string;
  apiKey: string;
}): OdooConfig {
  return { baseUrl: conn.baseUrl, db: conn.db, username: conn.username, apiKey: conn.apiKey };
}

export async function getActiveConnection(workspaceId: string) {
  return db.odooConnection.findFirst({ where: { workspaceId, active: true } });
}

/** Full resolver used by the inbound webhook + cron. */
export async function getOdooConfig(workspaceId: string): Promise<OdooConfig | null> {
  const conn = await getActiveConnection(workspaceId);
  if (conn) return connToConfig(conn);
  return envConfig();
}

export function enabledEntitySet(csv: string): Set<string> {
  return new Set(
    csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

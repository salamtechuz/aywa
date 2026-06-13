import "server-only";

import { createHash } from "node:crypto";

import type { OdooClient, OdooConfig } from "./types";

// Thin Odoo JSON-RPC client over global fetch — no SDK dependency. Odoo Online
// (SaaS) exposes JSON-RPC at POST {baseUrl}/jsonrpc. We only need 5 verbs.

const RPC_TIMEOUT_MS = 20_000;
const AUTH_TTL_MS = 10 * 60 * 1000; // re-authenticate (uid) at most every 10 min

type CacheEntry = { uid: number; expiresAt: number };
const authCache = new Map<string, CacheEntry>();

export class OdooError extends Error {
  data?: unknown;
  constructor(message: string, data?: unknown) {
    super(message);
    this.name = "OdooError";
    this.data = data;
  }
}

function cacheKey(c: OdooConfig): string {
  return createHash("sha256")
    .update(`${c.baseUrl}|${c.db}|${c.username}|${c.apiKey}`)
    .digest("hex");
}

async function rpc(baseUrl: string, params: Record<string, unknown>): Promise<unknown> {
  const url = `${baseUrl.replace(/\/+$/, "")}/jsonrpc`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params, id: Date.now() }),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
  } catch (err) {
    throw new OdooError(`Network error reaching Odoo: ${(err as Error).message}`);
  }
  if (!res.ok) throw new OdooError(`Odoo HTTP ${res.status}`);
  const json = (await res.json()) as {
    result?: unknown;
    error?: { message?: string; data?: { message?: string } };
  };
  if (json.error) {
    const msg = json.error.data?.message || json.error.message || "Odoo RPC error";
    throw new OdooError(msg, json.error.data);
  }
  return json.result;
}

async function authenticate(config: OdooConfig): Promise<number> {
  const result = await rpc(config.baseUrl, {
    service: "common",
    method: "authenticate",
    args: [config.db, config.username, config.apiKey, {}],
  });
  if (typeof result !== "number" || result === 0) {
    throw new OdooError("Authentication failed — check the database name, username, and API key");
  }
  return result;
}

async function getUid(config: OdooConfig): Promise<number> {
  const key = cacheKey(config);
  const hit = authCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.uid;
  const uid = await authenticate(config);
  authCache.set(key, { uid, expiresAt: Date.now() + AUTH_TTL_MS });
  return uid;
}

export function evictOdooAuth(config: OdooConfig): void {
  authCache.delete(cacheKey(config));
}

export async function getOdooClient(config: OdooConfig): Promise<OdooClient> {
  const uid = await getUid(config);
  const exec = (
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {},
  ): Promise<unknown> =>
    rpc(config.baseUrl, {
      service: "object",
      method: "execute_kw",
      args: [config.db, uid, config.apiKey, model, method, args, kwargs],
    });

  return {
    uid,
    async searchRead(model, domain, fields, opts) {
      const kwargs: Record<string, unknown> = {};
      if (fields) kwargs.fields = fields;
      if (opts?.limit != null) kwargs.limit = opts.limit;
      if (opts?.offset != null) kwargs.offset = opts.offset;
      if (opts?.order) kwargs.order = opts.order;
      const r = await exec(model, "search_read", [domain], kwargs);
      return Array.isArray(r) ? (r as Record<string, unknown>[]) : [];
    },
    async create(model, values) {
      const r = await exec(model, "create", [values]);
      return r as number;
    },
    async write(model, ids, values) {
      const r = await exec(model, "write", [ids, values]);
      return Boolean(r);
    },
    async unlink(model, ids) {
      const r = await exec(model, "unlink", [ids]);
      return Boolean(r);
    },
    callKw(model, method, args, kwargs) {
      return exec(model, method, args, kwargs ?? {});
    },
  };
}

/** Explicit connection test (bypasses the uid cache). Used by the Settings UI. */
export async function testOdooConnection(
  config: OdooConfig,
): Promise<{ ok: true; uid: number } | { ok: false; error: string }> {
  try {
    const uid = await authenticate(config);
    return { ok: true, uid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

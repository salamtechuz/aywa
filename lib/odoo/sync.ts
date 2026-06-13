import "server-only";

import { db } from "@/lib/db";

import { getOdooClient } from "./client";
import {
  connToConfig,
  enabledEntitySet,
  envConfig,
  getActiveConnection,
} from "./config";
import { hashPayload } from "./hash";
import { registry } from "./registry";
import type { AnyEntityMapper, OdooClient, OdooConfig, OdooLinkRef } from "./types";

// ---------------------------------------------------------------------------
// OdooLink helpers (the id-mapping + echo-guard backbone)
// ---------------------------------------------------------------------------

async function resolveLinkByLocal(
  workspaceId: string,
  entityType: string,
  localId: string,
): Promise<OdooLinkRef | null> {
  const link = await db.odooLink.findUnique({
    where: { workspaceId_entityType_localId: { workspaceId, entityType, localId } },
  });
  return link ? { localId: link.localId, odooId: link.odooId, contentHash: link.contentHash } : null;
}

async function resolveLinkByOdoo(workspaceId: string, entityType: string, odooId: number) {
  return db.odooLink.findUnique({
    where: { workspaceId_entityType_odooId: { workspaceId, entityType, odooId } },
  });
}

async function upsertLink(args: {
  workspaceId: string;
  entityType: string;
  localId: string;
  odooModel: string;
  odooId: number;
  contentHash: string;
  origin: "OUTBOUND" | "INBOUND";
}): Promise<void> {
  await db.odooLink.upsert({
    where: {
      workspaceId_entityType_localId: {
        workspaceId: args.workspaceId,
        entityType: args.entityType,
        localId: args.localId,
      },
    },
    create: { ...args },
    update: {
      odooModel: args.odooModel,
      odooId: args.odooId,
      contentHash: args.contentHash,
      origin: args.origin,
      lastSyncedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// 1) OUTBOUND — push one aywa record to Odoo. Fire-and-forget safe (never throws).
//    Call as `void pushEntity(ws.id, "contact", id)` from server actions.
// ---------------------------------------------------------------------------

export async function pushEntity(
  workspaceId: string,
  entityType: string,
  localId: string,
): Promise<void> {
  return pushEntityImpl(workspaceId, entityType, localId, false);
}

/**
 * Resolve a related local record to its Odoo id for an outbound payload,
 * pushing it to Odoo first if it isn't linked yet. Dependencies bypass the
 * enabled-entity gate (`force`): an order's customer/products must exist in
 * Odoo for the order to be created, regardless of their own toggles.
 */
async function odooIdForLocal(
  workspaceId: string,
  entityType: string,
  localId: string | null | undefined,
): Promise<number | null> {
  if (!localId) return null;
  const existing = await resolveLinkByLocal(workspaceId, entityType, localId);
  if (existing) return existing.odooId;
  await pushEntityImpl(workspaceId, entityType, localId, true);
  const after = await resolveLinkByLocal(workspaceId, entityType, localId);
  return after?.odooId ?? null;
}

async function pushEntityImpl(
  workspaceId: string,
  entityType: string,
  localId: string,
  force: boolean,
): Promise<void> {
  try {
    const conn = await getActiveConnection(workspaceId);
    let config: OdooConfig | null;
    if (conn) {
      if (!force && !enabledEntitySet(conn.enabledEntities).has(entityType)) return;
      config = connToConfig(conn);
    } else {
      config = envConfig();
    }
    if (!config) return; // integration disabled for this workspace — silent no-op

    const mapper = registry.byEntityType(entityType);
    if (!mapper) return;
    const local = await mapper.aywaGet(workspaceId, localId);
    if (!local) return;

    // Self-managed "action" entities (e.g. stock) own their entire outbound.
    if (mapper.pushOutbound) {
      const client = await getOdooClient(config);
      await mapper.pushOutbound(
        {
          workspaceId,
          client,
          odooIdFor: (et, id) => odooIdForLocal(workspaceId, et, id),
          getLink: () => resolveLinkByLocal(workspaceId, entityType, localId),
          saveLink: (odooId, contentHash) =>
            upsertLink({
              workspaceId,
              entityType,
              localId,
              odooModel: mapper.odooModel,
              odooId,
              contentHash,
              origin: "OUTBOUND",
            }),
        },
        local,
      );
      return;
    }

    const link = await resolveLinkByLocal(workspaceId, entityType, localId);

    // Build the Odoo payload. The async builder (relation resolution) takes
    // precedence and needs the client up front; the pure path stays lazy so an
    // echo-guarded no-op never has to authenticate.
    let odooFields: Record<string, unknown> | null;
    let client: OdooClient | null = null;
    if (mapper.buildOutbound) {
      client = await getOdooClient(config);
      odooFields = await mapper.buildOutbound(
        {
          workspaceId,
          client,
          mode: link ? "update" : "create",
          odooIdFor: (et, id) => odooIdForLocal(workspaceId, et, id),
        },
        local,
      );
    } else if (mapper.toOdoo) {
      odooFields = mapper.toOdoo(local);
    } else {
      return; // misconfigured mapper: no outbound mapping defined
    }
    if (!odooFields) return; // builder asked to skip this record

    const hash = hashPayload(odooFields);
    if (link && link.contentHash === hash) return; // no-op / echo guard

    if (!client) client = await getOdooClient(config);
    let odooId: number;
    if (link) {
      await client.write(mapper.odooModel, [link.odooId], odooFields);
      odooId = link.odooId;
    } else {
      const matched = mapper.matchOdoo ? await mapper.matchOdoo(client, local) : null;
      odooId = matched ?? (await client.create(mapper.odooModel, odooFields));
    }
    await upsertLink({
      workspaceId,
      entityType,
      localId,
      odooModel: mapper.odooModel,
      odooId,
      contentHash: hash,
      origin: "OUTBOUND",
    });
  } catch (err) {
    console.warn(`[odoo] pushEntity(${entityType}/${localId}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// 2) INBOUND — apply one Odoo record into aywa (shared by webhook + cron).
// ---------------------------------------------------------------------------

export async function applyFromOdoo(
  ctx: { workspaceId: string; client: OdooClient },
  mapper: AnyEntityMapper,
  odooId: number,
  rec?: Record<string, unknown>,
): Promise<void> {
  const { workspaceId, client } = ctx;
  const { fromOdoo, aywaUpsert } = mapper;
  if (!fromOdoo || !aywaUpsert) return; // outbound-only entity — nothing to apply
  const record =
    rec ??
    (await client.searchRead(mapper.odooModel, [["id", "=", odooId]], mapper.odooFields, {
      limit: 1,
    }))[0];
  if (!record) return;

  const localData = fromOdoo(record);
  const hash = hashPayload(localData as Record<string, unknown>);

  const existing = await resolveLinkByOdoo(workspaceId, mapper.entityType, odooId);
  if (existing && existing.contentHash === hash) return; // echo guard

  let linkRef: OdooLinkRef | null = existing
    ? { localId: existing.localId, odooId: existing.odooId, contentHash: existing.contentHash }
    : null;

  if (!linkRef && mapper.matchLocal) {
    const matchedLocalId = await mapper.matchLocal(workspaceId, record);
    if (matchedLocalId) linkRef = { localId: matchedLocalId, odooId, contentHash: "" };
  }

  const localId = await aywaUpsert(workspaceId, localData, linkRef);
  await upsertLink({
    workspaceId,
    entityType: mapper.entityType,
    localId,
    odooModel: mapper.odooModel,
    odooId,
    contentHash: hash,
    origin: "INBOUND",
  });
}

/** Apply a single Odoo record by model name (used by the inbound webhook). */
export async function applyOdooRecord(
  workspaceId: string,
  odooModel: string,
  odooId: number,
): Promise<boolean> {
  const conn = await getActiveConnection(workspaceId);
  const config = conn ? connToConfig(conn) : envConfig();
  if (!config) return false;
  const mapper = registry.byOdooModel(odooModel);
  if (!mapper || mapper.pull === false) return false; // unknown or outbound-only
  if (conn && !enabledEntitySet(conn.enabledEntities).has(mapper.entityType)) return false;
  const client = await getOdooClient(config);
  await applyFromOdoo({ workspaceId, client }, mapper, odooId);
  return true;
}

// ---------------------------------------------------------------------------
// 3) INBOUND PULL — incremental sync from Odoo for one workspace (the reliable
//    backbone driven by the cron). Advances the write_date cursor.
// ---------------------------------------------------------------------------

export async function runOdooPull(
  workspaceId: string,
): Promise<{ pulled: number; entities: Record<string, number> }> {
  const conn = await getActiveConnection(workspaceId);
  if (!conn) return { pulled: 0, entities: {} };

  const client = await getOdooClient(connToConfig(conn));
  const enabled = enabledEntitySet(conn.enabledEntities);
  const since = conn.lastPullAt; // ISO string in Odoo server time, or null
  let maxWrite = since;
  let pulled = 0;
  const entities: Record<string, number> = {};

  for (const mapper of registry.all()) {
    if (mapper.pull === false) continue; // outbound-only entity
    if (!enabled.has(mapper.entityType)) continue;
    const domain = since ? [["write_date", ">", since]] : [];
    const recs = await client.searchRead(mapper.odooModel, domain, mapper.odooFields, {
      order: "write_date asc",
      limit: 200,
    });
    for (const rec of recs) {
      const odooId = typeof rec.id === "number" ? rec.id : Number(rec.id);
      if (!Number.isFinite(odooId)) continue;
      await applyFromOdoo({ workspaceId, client }, mapper, odooId, rec);
      pulled++;
      entities[mapper.entityType] = (entities[mapper.entityType] ?? 0) + 1;
      const wd = typeof rec.write_date === "string" ? rec.write_date : null;
      if (wd && (!maxWrite || wd > maxWrite)) maxWrite = wd;
    }
  }

  if (maxWrite && maxWrite !== since) {
    await db.odooConnection.update({ where: { id: conn.id }, data: { lastPullAt: maxWrite } });
  }
  return { pulled, entities };
}

/** Pull across every workspace that has an active connection (cron entrypoint). */
export async function runOdooPullAll(): Promise<{ workspaces: number; pulled: number }> {
  const conns = await db.odooConnection.findMany({ where: { active: true }, select: { workspaceId: true } });
  let pulled = 0;
  for (const c of conns) {
    try {
      const r = await runOdooPull(c.workspaceId);
      pulled += r.pulled;
    } catch (err) {
      console.warn(`[odoo] pull for workspace ${c.workspaceId} failed:`, err);
    }
  }
  return { workspaces: conns.length, pulled };
}

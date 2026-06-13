// Shared types for the Odoo integration. Pure types only (no runtime imports),
// so this module is safe to reference from anywhere.

export type OdooConfig = {
  baseUrl: string; // e.g. https://agrifoods-test.odoo.com
  db: string;
  username: string;
  apiKey: string;
};

/** A thin Odoo JSON-RPC client bound to an authenticated session (uid). */
export type OdooClient = {
  uid: number;
  searchRead(
    model: string,
    domain: unknown[],
    fields?: string[],
    opts?: { limit?: number; offset?: number; order?: string },
  ): Promise<Record<string, unknown>[]>;
  create(model: string, values: Record<string, unknown>): Promise<number>;
  write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean>;
  unlink(model: string, ids: number[]): Promise<boolean>;
  callKw(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>,
  ): Promise<unknown>;
};

export type OdooLinkRef = {
  localId: string;
  odooId: number;
  contentHash: string;
};

/**
 * Context handed to `buildOutbound` for entities whose Odoo payload needs the
 * live client or cross-entity link resolution (e.g. an order's partner_id and
 * order_line product ids).
 */
export type OutboundCtx = {
  workspaceId: string;
  client: OdooClient;
  /** "create" when no OdooLink exists yet, "update" when updating a linked record. */
  mode: "create" | "update";
  /**
   * Resolve a related local record to its Odoo id, pushing it to Odoo first if
   * it isn't linked yet (so pushing an order auto-pushes its customer/products).
   * Returns null when the relation is empty or can't be resolved.
   */
  odooIdFor(entityType: string, localId: string | null | undefined): Promise<number | null>;
};

/**
 * Context for `pushOutbound` — fully self-managed outbound for "action" entities
 * whose Odoo side isn't a plain create/write (e.g. stock, which sets a quant's
 * inventory_quantity and calls action_apply_inventory). The mapper owns the
 * whole flow: its own echo-guard (getLink/saveLink) and side effects.
 */
export type SelfOutboundCtx = {
  workspaceId: string;
  client: OdooClient;
  /** Resolve/auto-push a related local record's Odoo id (e.g. the product). */
  odooIdFor(entityType: string, localId: string | null | undefined): Promise<number | null>;
  /** The current OdooLink for this record, if any (for the mapper's echo-guard). */
  getLink(): Promise<OdooLinkRef | null>;
  /** Persist the OdooLink (odooId + content hash) after a successful push. */
  saveLink(odooId: number, contentHash: string): Promise<void>;
};

/**
 * One self-contained entity mapping (the extensibility seam). Add a new module
 * later by writing one of these and registering it in registry.ts — the sync
 * engine drives every mapper generically and never names a concrete entity.
 */
export interface EntityMapper<TLocal = Record<string, unknown>> {
  /** Stable key used in OdooLink.entityType and OdooConnection.enabledEntities. */
  entityType: string; // "contact"
  /** Odoo model this maps to. */
  odooModel: string; // "res.partner"
  /** Human label for the Settings toggle list. */
  label: string; // "Contacts"
  /** Fields to request from Odoo in search_read (always include "write_date"). */
  odooFields: string[];
  /**
   * If false, the cron + webhook pull skips this entity — it syncs aywa → Odoo
   * only. Used by entities (e.g. orders) whose inbound path needs reverse
   * relation resolution we defer to a later phase. Defaults to true (two-way).
   */
  pull?: boolean;

  // --- aywa side: generic CRUD the engine drives ---
  aywaGet(workspaceId: string, localId: string): Promise<TLocal | null>;
  aywaList(workspaceId: string, opts?: { updatedAfter?: Date }): Promise<TLocal[]>;
  /** Upsert a local record from inbound data; returns the local id. Required unless pull is false. */
  aywaUpsert?(workspaceId: string, data: Partial<TLocal>, link: OdooLinkRef | null): Promise<string>;

  // --- field mapping: pure (toOdoo) OR async with relation resolution (buildOutbound) ---
  /** Pure local → Odoo field mapping. Define this OR buildOutbound. */
  toOdoo?(local: TLocal): Record<string, unknown>;
  /**
   * Async outbound builder for entities needing the client or related Odoo ids.
   * Takes precedence over toOdoo when present. Return null to skip the push
   * (e.g. a required relation could not be resolved).
   */
  buildOutbound?(ctx: OutboundCtx, local: TLocal): Promise<Record<string, unknown> | null>;
  /**
   * Fully self-managed outbound for "action" entities (e.g. stock inventory
   * adjustments). Takes precedence over buildOutbound/toOdoo; the mapper owns
   * its echo-guard and side effects via SelfOutboundCtx.
   */
  pushOutbound?(ctx: SelfOutboundCtx, local: TLocal): Promise<void>;
  /** Odoo → local field mapping. Required unless pull is false. */
  fromOdoo?(rec: Record<string, unknown>): Partial<TLocal>;

  // --- identity matching (dedup when no OdooLink exists yet) ---
  matchOdoo?(client: OdooClient, local: TLocal): Promise<number | null>;
  matchLocal?(workspaceId: string, rec: Record<string, unknown>): Promise<string | null>;
}

// A registry holds heterogeneous mappers; the generic must be erased to store
// them together. This single `any` is the only one in the module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEntityMapper = EntityMapper<any>;

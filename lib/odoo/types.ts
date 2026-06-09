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

  // --- aywa side: generic CRUD the engine drives ---
  aywaGet(workspaceId: string, localId: string): Promise<TLocal | null>;
  aywaList(workspaceId: string, opts?: { updatedAfter?: Date }): Promise<TLocal[]>;
  /** Upsert a local record from inbound data; returns the local id. */
  aywaUpsert(workspaceId: string, data: Partial<TLocal>, link: OdooLinkRef | null): Promise<string>;

  // --- pure field mapping ---
  toOdoo(local: TLocal): Record<string, unknown>;
  fromOdoo(rec: Record<string, unknown>): Partial<TLocal>;

  // --- identity matching (dedup when no OdooLink exists yet) ---
  matchOdoo?(client: OdooClient, local: TLocal): Promise<number | null>;
  matchLocal?(workspaceId: string, rec: Record<string, unknown>): Promise<string | null>;
}

// A registry holds heterogeneous mappers; the generic must be erased to store
// them together. This single `any` is the only one in the module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEntityMapper = EntityMapper<any>;

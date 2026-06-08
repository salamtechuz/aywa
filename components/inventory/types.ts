// Serializable row + option types passed from the inventory server pages into
// the client tables/dialogs. Keep these in sync with the Prisma selects in
// lib/inventory/*-queries.ts.

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
  locationCount: number;
  operationCount: number;
};

export type StorageCategoryRow = {
  id: string;
  name: string;
  capacity: number | null;
  maxWeight: number | null;
  allowNew: boolean;
  active: boolean;
  locationCount: number;
};

export type LocationRow = {
  id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  warehouse: { id: string; code: string; name: string } | null;
  storageCategory: { id: string; name: string } | null;
};

export type OperationTypeRow = {
  id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  warehouse: { id: string; code: string; name: string } | null;
};

export type UnitOfMeasureRow = {
  id: string;
  name: string;
  category: string;
  factor: number;
  referenceUnit: string | null;
  active: boolean;
};

export type WarehouseOption = { id: string; code: string; name: string };
export type StorageCategoryOption = { id: string; name: string };

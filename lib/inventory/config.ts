// Shared constants for the Inventory warehouse-config entities. Type values are
// stored as TEXT and validated at the app layer (no native DB enums), exactly
// like the other modules. Human labels live in i18n
// (inventory.locationTypes.* / inventory.operationTypeKinds.*); only the IDs +
// badge accent live here. The `_IDS` tuples feed `z.enum(...)` in the actions.

export const LOCATION_TYPES = [
  { id: "INTERNAL", accent: "var(--chart-1)" },
  { id: "SUPPLIER", accent: "var(--chart-4)" },
  { id: "CUSTOMER", accent: "var(--chart-2)" },
  { id: "INVENTORY", accent: "var(--warning)" },
  { id: "TRANSIT", accent: "var(--chart-3)" },
  { id: "VIEW", accent: "var(--muted-foreground)" },
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number]["id"];
export const LOCATION_TYPE_IDS = LOCATION_TYPES.map((t) => t.id) as [
  LocationType,
  ...LocationType[],
];

export function locationTypeMeta(type: string) {
  return LOCATION_TYPES.find((t) => t.id === type) ?? LOCATION_TYPES[0];
}

export const OPERATION_TYPES = [
  { id: "RECEIPT", accent: "var(--success)" },
  { id: "DELIVERY", accent: "var(--info)" },
  { id: "INTERNAL", accent: "var(--chart-3)" },
] as const;

export type OperationTypeId = (typeof OPERATION_TYPES)[number]["id"];
export const OPERATION_TYPE_IDS = OPERATION_TYPES.map((t) => t.id) as [
  OperationTypeId,
  ...OperationTypeId[],
];

export function operationTypeMeta(type: string) {
  return OPERATION_TYPES.find((t) => t.id === type) ?? OPERATION_TYPES[0];
}

export const UOM_CATEGORIES = [
  { id: "UNIT", accent: "var(--chart-1)" },
  { id: "WEIGHT", accent: "var(--chart-4)" },
  { id: "LENGTH", accent: "var(--chart-2)" },
  { id: "VOLUME", accent: "var(--chart-3)" },
  { id: "TIME", accent: "var(--chart-5)" },
  { id: "PACKAGING", accent: "var(--muted-foreground)" },
] as const;

export type UomCategory = (typeof UOM_CATEGORIES)[number]["id"];
export const UOM_CATEGORY_IDS = UOM_CATEGORIES.map((c) => c.id) as [
  UomCategory,
  ...UomCategory[],
];

export function uomCategoryMeta(category: string) {
  return UOM_CATEGORIES.find((c) => c.id === category) ?? UOM_CATEGORIES[0];
}

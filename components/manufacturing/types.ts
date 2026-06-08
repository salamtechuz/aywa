// Serializable shapes passed from the manufacturing server pages into client
// components. Dates cross the RSC boundary fine.

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
};

/** Active BOMs, for auto-linking a manufacturing order to its recipe. */
export type BomPick = {
  id: string;
  reference: string;
  productId: string;
  quantity: number;
};

/** One scaled component line with current stock availability. */
export type ComponentPlanLine = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  required: number;
  available: number;
};

/** Everything the board card + detail drawer need for one order. */
export type MoData = {
  id: string;
  number: string;
  product: ProductOption;
  quantity: number;
  status: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  ownerName: string | null;
  notes: string | null;
  bomId: string | null;
  bomReference: string | null;
  plan: ComponentPlanLine[];
  shortage: boolean;
};

export type BomRow = {
  id: string;
  reference: string;
  product: ProductOption;
  quantity: number;
  active: boolean;
  notes: string | null;
  components: { productId: string; quantity: number }[];
};

export type BomDetail = {
  id: string;
  productId: string;
  quantity: number;
  active: boolean;
  notes: string | null;
  components: { productId: string; quantity: number }[];
};

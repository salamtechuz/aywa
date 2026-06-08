// Shared visual + label metadata for StockMovement rows, used by both the
// product detail drawer panel (components/inventory/stock-movements-panel.tsx)
// and the Moves History report (components/inventory/moves-history-table.tsx).
// Plain module (no "server-only") because it is imported into client tables.

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageCheck,
  Settings2,
} from "lucide-react";

/** Icon + color + i18n labelKey (under the `inventory` namespace) per
 *  StockMovement.type. */
export const TYPE_META: Record<
  string,
  { icon: typeof ArrowDownToLine; color: string; labelKey: string }
> = {
  IN: {
    icon: ArrowDownToLine,
    color: "text-emerald-600 dark:text-emerald-400",
    labelKey: "movementType.in",
  },
  INITIAL: {
    icon: PackageCheck,
    color: "text-sky-600 dark:text-sky-400",
    labelKey: "movementType.initial",
  },
  OUT: {
    icon: ArrowUpFromLine,
    color: "text-red-600 dark:text-red-400",
    labelKey: "movementType.out",
  },
  ADJUSTMENT: {
    icon: Settings2,
    color: "text-amber-600 dark:text-amber-400",
    labelKey: "movementType.adjustment",
  },
  TRANSFER: {
    icon: Settings2,
    color: "text-violet-600 dark:text-violet-400",
    labelKey: "movementType.transfer",
  },
};

/** Maps a StockMovement.sourceType to its i18n key (under `inventory`). */
export function sourceLabelKey(sourceType: string): string {
  if (sourceType === "SALES_ORDER") return "source.salesOrder";
  if (sourceType === "PURCHASE_ORDER") return "source.purchaseOrder";
  if (sourceType === "MANUFACTURING_ORDER") return "source.manufacturingOrder";
  if (sourceType === "INITIAL_LOAD") return "source.initialInventory";
  return "source.manual";
}

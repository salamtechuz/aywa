import { ListTree } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/patterns/page-header";
import { Badge } from "@/components/ui/badge";
import { getActiveWorkspace } from "@/lib/tenant";
import { listProducts } from "@/lib/inventory/queries";
import { listBoms } from "@/lib/manufacturing/queries";
import { ManufacturingNav } from "@/components/manufacturing/manufacturing-nav";
import { BomsTable } from "@/components/manufacturing/boms-table";
import { BomDialog } from "@/components/manufacturing/bom-dialog";
import type { BomRow, ProductOption } from "@/components/manufacturing/types";

export const metadata = { title: "Bills of Materials" };

export default async function BomsPage() {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("manufacturing");

  const [bomsRaw, products] = await Promise.all([
    listBoms(ws.id),
    listProducts(ws.id, { activeOnly: true }),
  ]);

  const boms: BomRow[] = bomsRaw.map((b) => ({
    id: b.id,
    reference: b.reference,
    product: { id: b.product.id, sku: b.product.sku, name: b.product.name, unit: b.product.unit },
    quantity: b.quantity,
    active: b.active,
    notes: b.notes,
    components: b.components.map((c) => ({ productId: c.productId, quantity: c.quantity })),
  }));

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
  }));

  return (
    <>
      <PageHeader
        title={t("bomsTitle")}
        description={t("bomsDescription")}
        badge={
          <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
            {boms.length}
          </Badge>
        }
        actions={<BomDialog products={productOptions} />}
      />
      <ManufacturingNav />
      <div className="px-4 md:px-6 py-4 md:py-5">
        {boms.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
            <ListTree className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{t("noBomsYet")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("noBomsHint")}</p>
          </div>
        ) : (
          <BomsTable boms={boms} products={productOptions} />
        )}
      </div>
    </>
  );
}

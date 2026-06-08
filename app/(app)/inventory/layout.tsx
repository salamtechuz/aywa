import { InventoryMenubar } from "@/components/inventory/inventory-menubar";

// Odoo-style module shell: the menu-bar sits on top of every inventory page
// (Products / Reporting / Configuration), then the page renders its own
// PageHeader + body below it.
export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InventoryMenubar />
      {children}
    </>
  );
}

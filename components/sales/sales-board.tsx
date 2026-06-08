"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { SALES_STAGES, formatMoney, type SalesStatusId } from "@/lib/sales/stages";
import { moveOrder } from "@/app/(app)/sales/actions";

import { SalesOrderCard, type SalesOrderCardData } from "./sales-order-card";
import { SalesDetailDrawer } from "./sales-detail-drawer";
import type { LineItem, ProductOption } from "./line-items-table";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";

type Props = {
  initialOrders: SalesOrderCardData[];
  contacts: { id: string; name: string; company: string | null }[];
  linesByOrderId: Record<string, LineItem[]>;
  attachmentsByOrderId: Record<string, AttachmentItem[]>;
  products: ProductOption[];
  workspaceName: string;
  aiEnabled: boolean;
  emailEnabled: boolean;
  stripeEnabled: boolean;
};

function groupByStatus(orders: SalesOrderCardData[]) {
  const map = new Map<string, SalesOrderCardData[]>();
  for (const s of SALES_STAGES) map.set(s.id, []);
  for (const o of orders) {
    if (map.has(o.status)) map.get(o.status)!.push(o);
  }
  return map;
}

function SortableCard({
  order,
  onOpen,
}: {
  order: SalesOrderCardData;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: order.id, data: { status: order.status } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <SalesOrderCard order={order} dragging={isDragging} onClick={() => onOpen(order.id)} />
    </div>
  );
}

function StageColumn({
  status,
  accent,
  orders,
  onOpen,
}: {
  status: SalesStatusId;
  accent: string;
  orders: SalesOrderCardData[];
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("sales");
  const label = t(`statuses.${status.toLowerCase()}`);
  const description = t(`columns.${status.toLowerCase()}`);
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } });
  const total = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="flex flex-col w-[85vw] sm:w-[280px] sm:min-w-[280px] shrink-0 snap-start sm:snap-align-none">
      <div
        className="flex items-start justify-between px-3 py-2 rounded-t-lg border border-b-0 bg-card"
        style={{ borderTopColor: accent, borderTopWidth: 2 }}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: accent }}
              aria-hidden
            />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground">{orders.length}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5">{description}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums mt-1">
          {formatMoney(total)}
        </span>
      </div>

      <SortableContext
        items={orders.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 min-h-[160px] rounded-b-lg border border-t-0 bg-muted/30 p-2 space-y-2 transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          {orders.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-6 select-none">
              {t("dropOrderHere")}
            </div>
          )}
          {orders.map((o) => (
            <SortableCard key={o.id} order={o} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function SalesBoard({
  initialOrders,
  contacts,
  linesByOrderId,
  attachmentsByOrderId,
  products,
  workspaceName,
  aiEnabled,
  emailEnabled,
  stripeEnabled,
}: Props) {
  const [orders, setOrders] = useState<SalesOrderCardData[]>(initialOrders);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => groupByStatus(orders), [orders]);

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) ?? null : null;
  const openOrder = openOrderId ? orders.find((o) => o.id === openOrderId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeNow = orders.find((o) => o.id === active.id);
    if (!activeNow) return;

    let targetStatus: string;
    let targetIndex: number;

    if (String(over.id).startsWith("col:")) {
      targetStatus = String(over.id).slice("col:".length);
      const inStatus = orders.filter((o) => o.status === targetStatus && o.id !== active.id);
      targetIndex = inStatus.length;
    } else {
      const overOrder = orders.find((o) => o.id === over.id);
      if (!overOrder) return;
      targetStatus = overOrder.status;
      const inStatus = orders.filter((o) => o.status === targetStatus);
      const overIdx = inStatus.findIndex((o) => o.id === over.id);
      targetIndex = overIdx === -1 ? inStatus.length : overIdx;
    }

    const sourceStatus = activeNow.status;
    const sourceInStatus = orders.filter((o) => o.status === sourceStatus);
    const sourceIdx = sourceInStatus.findIndex((o) => o.id === active.id);

    if (sourceStatus === targetStatus && sourceIdx === targetIndex) return;

    setOrders((prev) => {
      const others = prev.filter((o) => o.id !== active.id);
      const updatedActive = { ...activeNow, status: targetStatus };
      const inTarget = others.filter((o) => o.status === targetStatus);
      const before = inTarget.slice(0, targetIndex);
      const after = inTarget.slice(targetIndex);
      const notInTarget = others.filter((o) => o.status !== targetStatus);

      if (sourceStatus === targetStatus) {
        const reordered = arrayMove(
          prev.filter((o) => o.status === sourceStatus),
          sourceIdx,
          targetIndex,
        );
        const otherCols = prev.filter((o) => o.status !== sourceStatus);
        return [...otherCols, ...reordered];
      }
      return [...notInTarget, ...before, updatedActive, ...after];
    });

    startTransition(async () => {
      await moveOrder({
        orderId: String(active.id),
        status: targetStatus as SalesStatusId,
        position: targetIndex,
      });
    });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 snap-x snap-mandatory sm:snap-none -mx-4 sm:mx-0 px-4 sm:px-0">
          {SALES_STAGES.map((s) => (
            <StageColumn
              key={s.id}
              status={s.id}
              accent={s.accent}
              orders={grouped.get(s.id) ?? []}
              onOpen={setOpenOrderId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeOrder && (
            <div className="w-[264px] rotate-2 shadow-xl">
              <SalesOrderCard order={activeOrder} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <SalesDetailDrawer
        order={openOrder}
        contacts={contacts}
        linesByOrderId={linesByOrderId}
        attachmentsByOrderId={attachmentsByOrderId}
        products={products}
        workspaceName={workspaceName}
        aiEnabled={aiEnabled}
        emailEnabled={emailEnabled}
        stripeEnabled={stripeEnabled}
        open={!!openOrderId}
        onOpenChange={(o) => !o && setOpenOrderId(null)}
      />
    </>
  );
}

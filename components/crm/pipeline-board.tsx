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
import { STAGES, formatMoney, type StageId } from "@/lib/crm/stages";
import { moveDeal } from "@/app/(app)/crm/actions";

import { DealCard, type DealCardData } from "./deal-card";
import { DealDetailDrawer } from "./deal-detail-drawer";
import type { ActivityItem } from "./activity-timeline";
import type { TagOption } from "./tag-picker";
import type { AttachmentItem } from "@/components/attachments/attachments-panel";

type Props = {
  initialDeals: DealCardData[];
  contacts: { id: string; name: string; company: string | null }[];
  allTags: TagOption[];
  activitiesByDealId: Record<string, ActivityItem[]>;
  attachmentsByDealId: Record<string, AttachmentItem[]>;
  aiEnabled: boolean;
};

function groupByStage(deals: DealCardData[]) {
  const byStage = new Map<string, DealCardData[]>();
  for (const s of STAGES) byStage.set(s.id, []);
  for (const d of deals) {
    if (byStage.has(d.stage)) byStage.get(d.stage)!.push(d);
  }
  return byStage;
}

function SortableCard({
  deal,
  onOpen,
}: {
  deal: DealCardData;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { stage: deal.stage } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <DealCard deal={deal} dragging={isDragging} onClick={() => onOpen(deal.id)} />
    </div>
  );
}

function StageColumn({
  stage,
  accent,
  deals,
  onOpen,
}: {
  stage: StageId;
  accent: string;
  deals: DealCardData[];
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("crm");
  const label = t(`stages.${stage.toLowerCase()}`);
  const { setNodeRef, isOver } = useDroppable({ id: `column:${stage}`, data: { stage } });
  const total = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col w-[85vw] sm:w-[280px] sm:min-w-[280px] shrink-0 snap-start sm:snap-align-none">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 bg-card"
        style={{ borderTopColor: accent, borderTopWidth: 2 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: accent }}
            aria-hidden
          />
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">{deals.length}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {formatMoney(total)}
        </span>
      </div>

      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 min-h-[160px] rounded-b-lg border border-t-0 bg-muted/30 p-2 space-y-2 transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          {deals.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-6 select-none">
              {t("board.dropDealHere")}
            </div>
          )}
          {deals.map((d) => (
            <SortableCard key={d.id} deal={d} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function PipelineBoard({
  initialDeals,
  contacts,
  allTags,
  activitiesByDealId,
  attachmentsByDealId,
  aiEnabled,
}: Props) {
  const [deals, setDeals] = useState<DealCardData[]>(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grouped = useMemo(() => groupByStage(deals), [deals]);

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;
  const openDeal = openDealId ? deals.find((d) => d.id === openDealId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeDealNow = deals.find((d) => d.id === active.id);
    if (!activeDealNow) return;

    // Resolve target stage + position
    let targetStage: string;
    let targetIndex: number;

    if (String(over.id).startsWith("column:")) {
      targetStage = String(over.id).slice("column:".length);
      const inStage = deals.filter(
        (d) => d.stage === targetStage && d.id !== active.id,
      );
      targetIndex = inStage.length; // drop at end
    } else {
      const overDeal = deals.find((d) => d.id === over.id);
      if (!overDeal) return;
      targetStage = overDeal.stage;
      const inStage = deals.filter((d) => d.stage === targetStage);
      const overIdx = inStage.findIndex((d) => d.id === over.id);
      targetIndex = overIdx === -1 ? inStage.length : overIdx;
    }

    const sourceStage = activeDealNow.stage;
    const sourceInStage = deals.filter((d) => d.stage === sourceStage);
    const sourceIdx = sourceInStage.findIndex((d) => d.id === active.id);

    if (sourceStage === targetStage && sourceIdx === targetIndex) return;

    // Optimistic update
    setDeals((prev) => {
      const others = prev.filter((d) => d.id !== active.id);
      const updatedActive = { ...activeDealNow, stage: targetStage };
      const inTargetStage = others.filter((d) => d.stage === targetStage);
      const beforeInsert = inTargetStage.slice(0, targetIndex);
      const afterInsert = inTargetStage.slice(targetIndex);
      const reorderedTarget = [...beforeInsert, updatedActive, ...afterInsert];
      const notInTarget = others.filter((d) => d.stage !== targetStage);

      if (sourceStage === targetStage) {
        // Pure reorder within column
        const reordered = arrayMove(
          deals.filter((d) => d.stage === sourceStage),
          sourceIdx,
          targetIndex,
        );
        const otherCols = deals.filter((d) => d.stage !== sourceStage);
        return [...otherCols, ...reordered];
      }
      return [...notInTarget, ...reorderedTarget];
    });

    startTransition(async () => {
      await moveDeal({ dealId: String(active.id), stage: targetStage as StageId, position: targetIndex });
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
          {STAGES.map((s) => (
            <StageColumn
              key={s.id}
              stage={s.id}
              accent={s.accent}
              deals={grouped.get(s.id) ?? []}
              onOpen={setOpenDealId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && (
            <div className="w-[264px] rotate-2 shadow-xl">
              <DealCard deal={activeDeal} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DealDetailDrawer
        deal={openDeal}
        contacts={contacts}
        allTags={allTags}
        activitiesByDealId={activitiesByDealId}
        attachmentsByDealId={attachmentsByDealId}
        aiEnabled={aiEnabled}
        open={!!openDealId}
        onOpenChange={(o) => !o && setOpenDealId(null)}
      />
    </>
  );
}

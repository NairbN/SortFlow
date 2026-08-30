"use client";

import { startTransition, useOptimistic } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { updatePalletStatus } from "@/lib/actions";
import type { BoardPallet, PalletStatus } from "@/lib/types";

const COLUMNS: { status: PalletStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "staged", label: "Staged" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
];

export function KanbanBoard({ pallets }: { pallets: BoardPallet[] }) {
  const [optimisticPallets, movePallet] = useOptimistic(
    pallets,
    (current, action: { palletId: number; status: PalletStatus }) =>
      current.map((p) =>
        p.id === action.palletId ? { ...p, status: action.status } : p
      )
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const palletId = Number(active.id);
    const newStatus = over.id as PalletStatus;
    const pallet = optimisticPallets.find((p) => p.id === palletId);
    if (!pallet || pallet.status === newStatus) return;

    startTransition(async () => {
      movePallet({ palletId, status: newStatus });
      await updatePalletStatus(palletId, newStatus);
    });
  }

  return (
    <DndContext
      id="pallet-kanban"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {/* Flex, not grid - Backlog's width animates on collapse/expand
          (see KanbanColumn.tsx) and its siblings (flex-1) need to reflow
          into the freed space every frame of that transition. Stacks to a
          plain full-width column on mobile, where the width animation
          doesn't apply (see KanbanColumn.tsx for why). */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            pallets={optimisticPallets.filter((p) => p.status === col.status)}
            collapsible={col.status === "backlog"}
          />
        ))}
      </div>
    </DndContext>
  );
}

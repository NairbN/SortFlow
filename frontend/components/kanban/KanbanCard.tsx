"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { daysUntilDue, dueLabel, dueBadgeClass } from "@/lib/dates";
import { useToday } from "@/lib/TodayContext";
import type { BoardPallet } from "@/lib/types";

export function KanbanCard({ pallet }: { pallet: BoardPallet }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: pallet.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    // See OrderCard.tsx - dnd-kit only sets this automatically on its own
    // DragOverlay, which this app doesn't use, so it's needed here directly
    // for touch drags to not get eaten by the browser's scroll gesture.
    touchAction: "none",
  };

  const today = useToday();
  const daysLeft = daysUntilDue(pallet.order.sla_due_date, today);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab flex-col gap-1 rounded-md border border-border bg-surface p-3.5 text-sm shadow-card active:cursor-grabbing ${isDragging ? "z-10 opacity-50" : ""}`}
    >
      <p className="font-bold">{pallet.pallet_id}</p>
      <p className="text-xs text-muted">{pallet.order.client_name}</p>
      <p className="text-xs text-faint">Order #{pallet.order.order_number}</p>
      {pallet.rack_location && (
        <p className="text-xs text-faint">{pallet.rack_location}</p>
      )}
      <span
        className={`mt-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${dueBadgeClass(daysLeft)}`}
      >
        {dueLabel(daysLeft)}
      </span>
    </div>
  );
}

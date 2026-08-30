"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { daysUntilDue, dueLabel, dueLabelClass } from "@/lib/dates";
import { useToday } from "@/lib/TodayContext";
import type { BoardPallet } from "@/lib/types";

export function KanbanCard({ pallet }: { pallet: BoardPallet }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: pallet.id });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const today = useToday();
  const daysLeft = daysUntilDue(pallet.order.sla_due_date, today);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded border border-zinc-200 bg-white p-2 text-sm shadow-sm active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900 ${isDragging ? "z-10 opacity-50" : ""}`}
    >
      <p className="font-medium">{pallet.pallet_id}</p>
      <p className="text-xs text-zinc-500">{pallet.order.client_name}</p>
      <p className="text-xs text-zinc-400">Order #{pallet.order.order_number}</p>
      {pallet.rack_location && (
        <p className="text-xs text-zinc-400">{pallet.rack_location}</p>
      )}
      <p className={`text-xs font-medium ${dueLabelClass(daysLeft)}`}>
        {dueLabel(daysLeft)}
      </p>
    </div>
  );
}

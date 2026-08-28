"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { daysUntilDue, dueLabel, dueLabelClass } from "@/lib/dates";
import type { Order } from "@/lib/types";

export function OrderCard({ order }: { order: Order }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const daysLeft = daysUntilDue(order.sla_due_date);
  const isOverdue = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 2;

  const borderClass = isOverdue
    ? "border-red-400 dark:border-red-500"
    : isUrgent
      ? "border-amber-400 dark:border-amber-500"
      : "border-zinc-200 dark:border-zinc-700";

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab items-center justify-between rounded-lg border bg-white p-4 shadow-sm active:cursor-grabbing dark:bg-zinc-900 ${borderClass} ${isDragging ? "opacity-50" : ""}`}
    >
      <div>
        <p className="font-semibold">{order.client_name}</p>
        <p className="text-sm text-zinc-500">Order #{order.order_number}</p>
        <p className="text-sm text-zinc-500">
          {order.pallets.length} pallet{order.pallets.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{order.sla_due_date}</p>
        <p className={`text-xs ${dueLabelClass(daysLeft)}`}>{dueLabel(daysLeft)}</p>
      </div>
    </li>
  );
}

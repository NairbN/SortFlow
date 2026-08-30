"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { daysUntilDue, dueLabel, dueLabelClass } from "@/lib/dates";
import { useToday } from "@/lib/TodayContext";
import { deleteOrder } from "@/lib/actions";
import { OrderMenu } from "@/components/OrderMenu";
import { EditOrderForm } from "@/components/EditOrderForm";
import type { Order } from "@/lib/types";

export function OrderCard({ order }: { order: Order }) {
  const [isEditing, setIsEditing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: order.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Without this, touch browsers treat a drag gesture as a page scroll
    // instead of handing it to dnd-kit's PointerSensor - dnd-kit only sets
    // this automatically on its own DragOverlay, which this app doesn't use.
    touchAction: "none",
  };

  const today = useToday();
  const daysLeft = daysUntilDue(order.sla_due_date, today);
  const isOverdue = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 2;

  const borderClass = isOverdue
    ? "border-red-400 dark:border-red-500"
    : isUrgent
      ? "border-amber-400 dark:border-amber-500"
      : "border-zinc-200 dark:border-zinc-700";

  // While editing, the card shouldn't be draggable at all - useSortable's
  // own `disabled` option above stops drag activation, and not spreading
  // these here too means the form's inputs never see a stray dnd-kit
  // pointerdown listener.
  const dragProps = isEditing ? {} : { ...attributes, ...listeners };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={`flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm dark:bg-zinc-900 ${borderClass} ${isDragging ? "opacity-50" : ""} ${isEditing ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      {isEditing ? (
        <EditOrderForm
          order={order}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div>
            <p className="font-semibold">{order.client_name}</p>
            <p className="text-sm text-zinc-500">Order #{order.order_number}</p>
            <p className="text-sm text-zinc-500">
              {order.pallets.length} pallet{order.pallets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium">{order.sla_due_date}</p>
              <p className={`text-xs ${dueLabelClass(daysLeft)}`}>{dueLabel(daysLeft)}</p>
            </div>
            <OrderMenu onEdit={() => setIsEditing(true)} onDelete={() => deleteOrder(order.id)} />
          </div>
        </>
      )}
    </li>
  );
}

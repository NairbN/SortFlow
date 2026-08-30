"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { daysUntilDue, dueLabel, dueBadgeClass } from "@/lib/dates";
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

  const accentBorderClass = isOverdue
    ? "border-l-danger"
    : isUrgent
      ? "border-l-warning"
      : "border-l-transparent";

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
      className={`flex items-center gap-4 rounded-lg border border-border border-l-[3px] ${accentBorderClass} bg-surface p-5 shadow-card ${isDragging ? "opacity-50" : ""} ${isEditing ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      {isEditing ? (
        <EditOrderForm
          order={order}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      ) : (
        <>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" className="shrink-0 text-faint opacity-60">
            <circle cx="3" cy="3" r="1.6" /><circle cx="9" cy="3" r="1.6" />
            <circle cx="3" cy="10" r="1.6" /><circle cx="9" cy="10" r="1.6" />
            <circle cx="3" cy="17" r="1.6" /><circle cx="9" cy="17" r="1.6" />
          </svg>
          <div className="flex-1">
            <p className="font-bold">{order.client_name}</p>
            <p className="text-sm text-muted">
              Order #{order.order_number} &middot; {order.pallets.length} pallet
              {order.pallets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-sm font-semibold text-muted">{order.sla_due_date}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${dueBadgeClass(daysLeft)}`}>
              {dueLabel(daysLeft)}
            </span>
          </div>
          <OrderMenu onEdit={() => setIsEditing(true)} onDelete={() => deleteOrder(order.id)} />
        </>
      )}
    </li>
  );
}

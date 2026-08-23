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
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { OrderCard } from "./OrderCard";
import { reorderOrder } from "@/lib/actions";
import type { Order } from "@/lib/types";

export function OrderQueue({ orders }: { orders: Order[] }) {
  const [optimisticOrders, moveOrder] = useOptimistic(
    orders,
    (current, action: { fromId: number; toId: number }) => {
      const oldIndex = current.findIndex((o) => o.id === action.fromId);
      const newIndex = current.findIndex((o) => o.id === action.toId);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromId = Number(active.id);
    const toId = Number(over.id);

    const oldIndex = optimisticOrders.findIndex((o) => o.id === fromId);
    const newIndex = optimisticOrders.findIndex((o) => o.id === toId);
    const reordered = arrayMove(optimisticOrders, oldIndex, newIndex);
    const movedIndex = reordered.findIndex((o) => o.id === fromId);
    const previousOrderId = reordered[movedIndex - 1]?.id ?? null;
    const nextOrderId = reordered[movedIndex + 1]?.id ?? null;

    startTransition(async () => {
      moveOrder({ fromId, toId });
      await reorderOrder(fromId, previousOrderId, nextOrderId);
    });
  }

  return (
    <DndContext
      id="orders-queue"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={optimisticOrders.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {optimisticOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

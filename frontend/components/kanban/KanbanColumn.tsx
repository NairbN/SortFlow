"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./KanbanCard";
import type { BoardPallet, PalletStatus } from "@/lib/types";

const COLUMN_BORDER: Record<PalletStatus, string> = {
  backlog: "border-zinc-300 dark:border-zinc-700",
  staged: "border-blue-300 dark:border-blue-700",
  in_progress: "border-amber-300 dark:border-amber-700",
  completed: "border-emerald-300 dark:border-emerald-700",
};

export function KanbanColumn({
  status,
  label,
  pallets,
}: {
  status: PalletStatus;
  label: string;
  pallets: BoardPallet[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] flex-col gap-2 rounded-lg border-2 border-dashed p-3 ${COLUMN_BORDER[status]} ${isOver ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs text-zinc-400">{pallets.length}</span>
      </div>
      {pallets.map((pallet) => (
        <KanbanCard key={pallet.id} pallet={pallet} />
      ))}
    </div>
  );
}

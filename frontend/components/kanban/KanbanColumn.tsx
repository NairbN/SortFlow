"use client";

import { useState } from "react";
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
  collapsible,
}: {
  status: PalletStatus;
  label: string;
  pallets: BoardPallet[];
  collapsible?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  // Backlog tends to be the largest, least-actionable column, so it starts
  // minimized to keep the board focused on staged/in-progress/completed -
  // still a valid drop target while collapsed, just visually condensed.
  const [expanded, setExpanded] = useState(!collapsible);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] flex-col gap-2 rounded-lg border-2 border-dashed p-3 ${COLUMN_BORDER[status]} ${isOver ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{pallets.length}</span>
          {collapsible && (
            // -m-2 p-2 expands the tap target well beyond the visible text
            // without shifting surrounding layout (the negative margin
            // cancels the padding's footprint) - important on a small
            // secondary control like this one.
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="-m-2 p-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </div>
      </div>
      {expanded
        ? pallets.map((pallet) => <KanbanCard key={pallet.id} pallet={pallet} />)
        : pallets.length > 0 && (
            <p className="text-xs text-zinc-400">
              {pallets.length} pallet{pallets.length === 1 ? "" : "s"} hidden
            </p>
          )}
    </div>
  );
}

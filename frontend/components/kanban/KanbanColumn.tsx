"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./KanbanCard";
import type { BoardPallet, PalletStatus } from "@/lib/types";

const STATUS_DOT: Record<PalletStatus, string> = {
  backlog: "bg-faint",
  staged: "bg-accent",
  in_progress: "bg-warning",
  completed: "bg-success",
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

  // The width animation (flex-basis, below) only makes sense in the row
  // layout KanbanBoard uses at sm+ - in the mobile stacked-column layout
  // every column is already full-width, so collapsing there just hides the
  // card list (the sm:flex-* classes are no-ops at that breakpoint).
  const widthClass = collapsible
    ? expanded
      ? "sm:flex-[0_0_300px]"
      : "sm:flex-[0_0_84px]"
    : "sm:flex-1";

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[100px] flex-col gap-3.5 rounded-lg border border-border bg-surface-2 p-4 transition-[flex-basis,padding] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${widthClass} ${collapsible && !expanded ? "sm:px-2.5" : ""} ${isOver ? "bg-accent-tint/40" : ""}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
          {(!collapsible || expanded) && (
            <h3 className="truncate text-sm font-bold">{label}</h3>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold text-faint">{pallets.length}</span>
      </div>

      {expanded ? (
        <div className="flex animate-fade-in-up flex-col gap-2.5">
          {pallets.length === 0 && !collapsible && (
            <div className="rounded-md border border-dashed border-border-strong py-7 text-center text-xs text-faint">
              Drop pallets here
            </div>
          )}
          {pallets.map((pallet) => (
            <KanbanCard key={pallet.id} pallet={pallet} />
          ))}
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-1 self-center rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              Hide
            </button>
          )}
        </div>
      ) : (
        collapsible && (
          <div className="flex animate-fade-in-up flex-col items-center gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              Show
            </button>
          </div>
        )
      )}
    </div>
  );
}

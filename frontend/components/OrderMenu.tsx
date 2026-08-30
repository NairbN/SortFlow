"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The "..." action menu on an OrderCard (Edit / Delete). OrderCard is
 * itself a dnd-kit drag handle, so onPointerDown here stops propagation -
 * without it, clicking this button would also register as the start of a
 * card drag.
 */
export function OrderMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleConfirmDelete() {
    setIsDeleting(true);
    await onDelete();
    // No reset needed on success - the card unmounts once the order is gone.
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Order actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="-m-2 flex h-9 w-9 items-center justify-center rounded-sm p-2 text-faint hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="6" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="18" r="1.75" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-border bg-surface py-1 text-sm shadow-pop"
        >
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-xs text-muted">Delete this order?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-sm bg-danger px-2 py-1 text-xs font-semibold text-danger-fg disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-sm border border-border-strong px-2 py-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-2 text-left hover:bg-surface-2"
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirmingDelete(true)}
                className="block w-full px-3 py-2 text-left text-danger hover:bg-surface-2"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

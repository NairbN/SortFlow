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
        className="-m-2 flex h-9 w-9 items-center justify-center rounded p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
          className="absolute right-0 z-10 mt-1 w-40 rounded border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-xs text-zinc-500">Delete this order?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
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
                className="block w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirmingDelete(true)}
                className="block w-full px-3 py-2 text-left text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
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

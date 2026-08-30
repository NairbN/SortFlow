"use client";

import { useEffect, useRef, useState } from "react";
import { CA_COMMODITY_FLOOR, RACK_LOCATIONS } from "@/lib/rackLocations";

const OPTIONS: string[] = [CA_COMMODITY_FLOOR, ...RACK_LOCATIONS];

/**
 * A searchable dropdown, not a plain <select> - native <select> typeahead
 * only matches from the start of each option's text, and every option here
 * starts with "CA", so typing digits (the part that actually distinguishes
 * them) wouldn't jump anywhere. This filters by substring match anywhere in
 * the option instead, so typing "01" finds CA01-RCK01.
 *
 * Still only lets you land on a known value - what's submitted (the hidden
 * input) only ever updates to an exact option match, never to whatever's
 * currently typed in the visible search box.
 */
export function RackLocationSelect({
  name,
  className,
  defaultValue,
}: {
  name: string;
  className?: string;
  /** Pre-fills the field for editing an existing pallet's rack location
   * (falls back to the shared floor default when creating a new one). */
  defaultValue?: string;
}) {
  const initial = defaultValue ?? CA_COMMODITY_FLOOR;
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  function choose(option: string) {
    setSelected(option);
    setQuery(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlight]) choose(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <input type="hidden" name={name} value={selected} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={(e) => {
          setOpen(true);
          // Select existing text so typing immediately starts a fresh
          // search instead of inserting into the middle of it.
          e.target.select();
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${name}-listbox`}
        aria-autocomplete="list"
        className={className}
      />
      {open && filtered.length > 0 && (
        <ul
          id={`${name}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-surface text-sm shadow-pop"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === selected}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the input, avoid a blur-before-click race
                choose(opt);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-1.5 ${
                i === highlight ? "bg-accent-tint text-accent-tint-text" : "hover:bg-surface-2"
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

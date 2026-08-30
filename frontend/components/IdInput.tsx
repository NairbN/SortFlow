"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type IdInputProps = {
  name: string;
  prefix: string;
  digitCount: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
  /** Pre-fills the field with an already-formatted value (e.g. "ORD-00001"),
   * for editing an existing record rather than creating a new one. */
  defaultValue?: string;
};

/**
 * Auto-formats a fixed-prefix, zero-padded ID (e.g. "PLT-0004201") live as
 * digits are typed - matches the ORD-00000 / PLT-0000000 convention in
 * CLAUDE.md. Digits are tracked as their own state (never re-parsed back out
 * of the padded display) so backspace can't confuse a "real" zero for a
 * padding zero. Editing only ever appends/removes from the end, so the
 * cursor is pinned there after every change - this is a right-anchored
 * counter-style field, not general free text.
 */
export function IdInput({
  name,
  prefix,
  digitCount,
  placeholder,
  required,
  className,
  onValueChange,
  defaultValue,
}: IdInputProps) {
  const [rawDigits, setRawDigits] = useState(() =>
    defaultValue ? defaultValue.replace(/\D/g, "").slice(-digitCount) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const value = rawDigits.length > 0 ? `${prefix}${rawDigits.padStart(digitCount, "0")}` : "";

  useEffect(() => {
    onValueChange?.(value);
    // onValueChange intentionally omitted: only value changes should
    // trigger this, not the parent handing down a new function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      el.setSelectionRange(value.length, value.length);
    }
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      setRawDigits((d) => d.slice(0, -1));
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setRawDigits((d) => (d.length < digitCount ? d + e.key : d));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Block any other single printable character - only digits are
      // meaningful here. Non-printable keys (Tab, arrows, Enter...) pass
      // through untouched.
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    setRawDigits(digits.slice(-digitCount));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Fallback for input methods that don't go through onKeyDown (some
    // mobile virtual keyboards) - re-sync from whatever landed in the DOM.
    const digits = e.target.value.replace(/\D/g, "");
    setRawDigits(digits.slice(-digitCount));
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      name={name}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}

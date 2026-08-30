"use client";

import { useActionState, useState } from "react";
import { createOrder } from "@/lib/actions";
import { IdInput } from "@/components/IdInput";
import { RackLocationSelect } from "@/components/RackLocationSelect";

type PalletRow = { key: number };

export function NewOrderForm() {
  const [palletRows, setPalletRows] = useState<PalletRow[]>([{ key: 0 }]);
  const [nextKey, setNextKey] = useState(1);
  const [palletFilled, setPalletFilled] = useState<Record<number, boolean>>({});
  const [clientNameValue, setClientNameValue] = useState("");
  const [slaDueDateValue, setSlaDueDateValue] = useState("");
  const [orderNumberFilled, setOrderNumberFilled] = useState(false);

  const [{ formKey }, formAction, isPending] = useActionState(
    async (prev: { formKey: number }, formData: FormData) => {
      await createOrder(formData);
      setPalletRows([{ key: 0 }]);
      setNextKey(1);
      setPalletFilled({});
      setClientNameValue("");
      setSlaDueDateValue("");
      setOrderNumberFilled(false);
      return { formKey: prev.formKey + 1 };
    },
    { formKey: 0 }
  );

  function addPalletRow() {
    setPalletRows((rows) => [...rows, { key: nextKey }]);
    setNextKey((k) => k + 1);
  }

  function removePalletRow(key: number) {
    setPalletRows((rows) =>
      rows.length > 1 ? rows.filter((r) => r.key !== key) : rows
    );
    setPalletFilled((filled) =>
      Object.fromEntries(Object.entries(filled).filter(([k]) => k !== String(key)))
    );
  }

  function handlePalletValueChange(row: PalletRow, value: string) {
    setPalletFilled((filled) => ({ ...filled, [row.key]: value.length > 0 }));

    // Once someone starts typing in what is currently the last row, open a
    // fresh empty one below it so they don't have to reach for "+ Add
    // pallet" between every pallet. Only fires on the empty -> non-empty
    // transition of the LAST row, so it never double-adds as they keep
    // typing into that same (now not-last) row.
    const isLastRow = palletRows[palletRows.length - 1]?.key === row.key;
    if (isLastRow && value.length > 0) {
      addPalletRow();
    }
  }

  const anyPalletFilled = Object.values(palletFilled).some(Boolean);
  const canSubmit =
    clientNameValue.trim().length > 0 &&
    orderNumberFilled &&
    slaDueDateValue.length > 0 &&
    anyPalletFilled;

  const fieldClassName =
    "rounded-md border border-border-strong bg-surface-2 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-4.5 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 className="text-[15px] font-bold">Log a new order</h2>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">Client name</span>
          <input
            name="client_name"
            placeholder="Client name"
            value={clientNameValue}
            onChange={(e) => setClientNameValue(e.target.value)}
            required
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">Order number</span>
          <IdInput
            name="order_number"
            prefix="ORD-"
            digitCount={5}
            placeholder="Order number (e.g. ORD-00001)"
            required
            onValueChange={(value) => setOrderNumberFilled(value.length > 0)}
            className={fieldClassName}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">SLA due date</span>
          <input
            name="sla_due_date"
            type="date"
            value={slaDueDateValue}
            onChange={(e) => setSlaDueDateValue(e.target.value)}
            required
            className={fieldClassName}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2.5">
        {palletRows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2.5 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">Pallet ID</span>
              <IdInput
                name="pallet_id"
                prefix="PLT-"
                digitCount={7}
                placeholder="Pallet ID (e.g. PLT-0000001)"
                onValueChange={(value) => handlePalletValueChange(row, value)}
                className={`w-full ${fieldClassName}`}
              />
            </label>
            {/* Rack select + remove button stay paired on their own row so
                the rack combobox always has enough width to show a full
                rack code (e.g. "CA Commodity Floor") instead of getting
                squeezed down to a sliver next to the pallet ID field. */}
            <div className="flex gap-2.5 sm:w-64">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">Rack location</span>
                <RackLocationSelect name="rack_location" className={`w-full ${fieldClassName}`} />
              </label>
              <button
                type="button"
                onClick={() => removePalletRow(row.key)}
                className="mt-[22px] flex h-[38px] w-11 shrink-0 items-center justify-center text-faint hover:text-danger"
                aria-label="Remove pallet"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addPalletRow}
          className="self-start text-sm font-semibold text-accent hover:text-accent-hover"
        >
          + Add pallet
        </button>
      </div>

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="self-start rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg shadow-card transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? "Logging..." : "Log order"}
      </button>
    </form>
  );
}

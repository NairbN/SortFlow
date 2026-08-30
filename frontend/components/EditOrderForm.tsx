"use client";

import { useState } from "react";
import { updateOrder } from "@/lib/actions";
import { IdInput } from "@/components/IdInput";
import { RackLocationSelect } from "@/components/RackLocationSelect";
import type { Order } from "@/lib/types";

type PalletRow = {
  key: number;
  /** null for a pallet being added; the existing pallet's id otherwise -
   * submitted as "pallet_row_id" so the backend can tell an edit-in-place
   * apart from an add (see OrderPalletUpdate in backend/app/schemas/order.py). */
  id: number | null;
  pallet_id: string;
  rack_location: string | null;
};

const fieldClassName =
  "rounded-md border border-border-strong bg-surface-2 px-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function EditOrderForm({
  order,
  onCancel,
  onSaved,
}: {
  order: Order;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [clientName, setClientName] = useState(order.client_name);
  const [orderNumberFilled, setOrderNumberFilled] = useState(true);
  const [slaDueDate, setSlaDueDate] = useState(order.sla_due_date);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [palletRows, setPalletRows] = useState<PalletRow[]>(() =>
    order.pallets.map((p, i) => ({
      key: i,
      id: p.id,
      pallet_id: p.pallet_id,
      rack_location: p.rack_location,
    }))
  );
  const [nextKey, setNextKey] = useState(order.pallets.length);
  const [palletFilled, setPalletFilled] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(order.pallets.map((_, i) => [i, true]))
  );

  function addPalletRow() {
    setPalletRows((rows) => [
      ...rows,
      { key: nextKey, id: null, pallet_id: "", rack_location: null },
    ]);
    setNextKey((k) => k + 1);
  }

  function removePalletRow(key: number) {
    setPalletRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
    setPalletFilled((filled) =>
      Object.fromEntries(Object.entries(filled).filter(([k]) => k !== String(key)))
    );
  }

  function handlePalletValueChange(row: PalletRow, value: string) {
    setPalletFilled((filled) => ({ ...filled, [row.key]: value.length > 0 }));

    // Same auto-add-a-fresh-row-below pattern as NewOrderForm, but gated on
    // row.id === null (a genuinely new row) too - IdInput fires this same
    // onValueChange on mount for its defaultValue, so without that guard, a
    // pre-existing pallet that happens to be the last row would wrongly
    // auto-add a row every time the edit form opens (indistinguishable, from
    // this handler's point of view, from the user having just typed into it).
    const isLastRow = palletRows[palletRows.length - 1]?.key === row.key;
    if (isLastRow && row.id === null && value.length > 0) {
      addPalletRow();
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);
    try {
      await updateOrder(order.id, formData);
      onSaved();
    } catch {
      setError("Failed to save changes");
      setIsSaving(false);
    }
  }

  const anyPalletFilled = Object.values(palletFilled).some(Boolean);
  const canSubmit =
    clientName.trim().length > 0 && orderNumberFilled && slaDueDate.length > 0 && anyPalletFilled;

  return (
    <form action={handleSubmit} className="flex w-full flex-col gap-2">
      <input
        name="client_name"
        placeholder="Client name"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        required
        className={fieldClassName}
      />
      <IdInput
        name="order_number"
        prefix="ORD-"
        digitCount={5}
        defaultValue={order.order_number}
        required
        onValueChange={(value) => setOrderNumberFilled(value.length > 0)}
        className={fieldClassName}
      />
      <input
        name="sla_due_date"
        type="date"
        value={slaDueDate}
        onChange={(e) => setSlaDueDate(e.target.value)}
        required
        className={fieldClassName}
      />

      <div className="flex flex-col gap-2">
        {palletRows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="pallet_row_id" value={row.id ?? ""} />
            <IdInput
              name="pallet_id"
              prefix="PLT-"
              digitCount={7}
              placeholder="Pallet ID (e.g. PLT-0000001)"
              defaultValue={row.pallet_id}
              onValueChange={(value) => handlePalletValueChange(row, value)}
              className={`w-full sm:flex-1 ${fieldClassName}`}
            />
            <div className="flex gap-2 sm:w-64">
              <RackLocationSelect
                name="rack_location"
                defaultValue={row.rack_location ?? undefined}
                className={`w-full ${fieldClassName}`}
              />
              <button
                type="button"
                onClick={() => removePalletRow(row.key)}
                className="flex w-11 shrink-0 items-center justify-center text-faint hover:text-danger"
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
          className="self-start text-xs font-semibold text-accent hover:text-accent-hover"
        >
          + Add pallet
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || !canSubmit}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-bold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

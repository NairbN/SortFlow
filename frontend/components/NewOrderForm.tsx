"use client";

import { useActionState, useState } from "react";
import { createOrder } from "@/lib/actions";
import { IdInput } from "@/components/IdInput";
import { RackLocationSelect } from "@/components/RackLocationSelect";

type PalletRow = { key: number };

export function NewOrderForm() {
  const [palletRows, setPalletRows] = useState<PalletRow[]>([{ key: 0 }]);
  const [nextKey, setNextKey] = useState(1);

  const [{ formKey }, formAction, isPending] = useActionState(
    async (prev: { formKey: number }, formData: FormData) => {
      await createOrder(formData);
      setPalletRows([{ key: 0 }]);
      setNextKey(1);
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
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h2 className="font-semibold">Log a new order</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          name="client_name"
          placeholder="Client name"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <IdInput
          name="order_number"
          prefix="ORD-"
          digitCount={5}
          placeholder="Order number (e.g. ORD-00001)"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          SLA due date
          <input
            name="sla_due_date"
            type="date"
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {palletRows.map((row) => (
          <div key={row.key} className="flex gap-2">
            <IdInput
              name="pallet_id"
              prefix="PLT-"
              digitCount={7}
              placeholder="Pallet ID (e.g. PLT-0000001)"
              required
              className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <RackLocationSelect
              name="rack_location"
              className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={() => removePalletRow(row.key)}
              className="px-2 text-zinc-400 hover:text-red-500"
              aria-label="Remove pallet"
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addPalletRow}
          className="self-start text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          + Add pallet
        </button>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Logging..." : "Log order"}
      </button>
    </form>
  );
}

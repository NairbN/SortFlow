"use client";

import { useState } from "react";
import { updateOrder } from "@/lib/actions";
import { IdInput } from "@/components/IdInput";
import type { Order } from "@/lib/types";

const fieldClassName =
  "rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800";

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

  const canSubmit = clientName.trim().length > 0 && orderNumberFilled && slaDueDate.length > 0;

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
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || !canSubmit}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

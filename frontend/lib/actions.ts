"use server";

import { refresh } from "next/cache";
import { backendFetch } from "./backend";
import type { PalletStatus } from "./types";

export async function createOrder(formData: FormData) {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  const slaDueDate = String(formData.get("sla_due_date") ?? "");
  const palletIds = formData.getAll("pallet_id").map((v) => String(v).trim());
  const rackLocations = formData
    .getAll("rack_location")
    .map((v) => String(v).trim());

  const pallets = palletIds
    .map((palletId, i) => ({
      pallet_id: palletId,
      rack_location: rackLocations[i] || null,
    }))
    .filter((p) => p.pallet_id.length > 0);

  if (!clientName || !orderNumber || !slaDueDate || pallets.length === 0) {
    throw new Error("Missing required fields");
  }

  const res = await backendFetch("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      order_number: orderNumber,
      sla_due_date: slaDueDate,
      pallets,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create order: ${res.status}`);
  }

  refresh();
}

export async function updateOrder(orderId: number, formData: FormData) {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  const slaDueDate = String(formData.get("sla_due_date") ?? "");
  const palletIds = formData.getAll("pallet_id").map((v) => String(v).trim());
  const rackLocations = formData
    .getAll("rack_location")
    .map((v) => String(v).trim());
  // "" for a pallet being added, the existing pallet's id otherwise - see
  // EditOrderForm.tsx's PalletRow type.
  const rowIds = formData.getAll("pallet_row_id").map((v) => String(v).trim());

  const pallets = palletIds
    .map((palletId, i) => ({
      id: rowIds[i] ? Number(rowIds[i]) : null,
      pallet_id: palletId,
      rack_location: rackLocations[i] || null,
    }))
    .filter((p) => p.pallet_id.length > 0);

  if (!clientName || !orderNumber || !slaDueDate || pallets.length === 0) {
    throw new Error("Missing required fields");
  }

  const res = await backendFetch(`/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      order_number: orderNumber,
      sla_due_date: slaDueDate,
      pallets,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update order: ${res.status}`);
  }

  refresh();
}

export async function deleteOrder(orderId: number) {
  const res = await backendFetch(`/orders/${orderId}`, { method: "DELETE" });

  if (!res.ok) {
    throw new Error(`Failed to delete order: ${res.status}`);
  }

  refresh();
}

export async function reorderOrder(
  orderId: number,
  previousOrderId: number | null,
  nextOrderId: number | null
) {
  const res = await backendFetch(`/orders/${orderId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      previous_order_id: previousOrderId,
      next_order_id: nextOrderId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to reorder order: ${res.status}`);
  }

  refresh();
}

export async function updatePalletStatus(
  palletId: number,
  status: PalletStatus
) {
  const res = await backendFetch(`/pallets/${palletId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update pallet status: ${res.status}`);
  }

  refresh();
}

import { backendFetch } from "./backend";
import type { BoardPallet, Order } from "./types";

export async function getOrders(): Promise<Order[]> {
  const res = await backendFetch("/orders", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch orders: ${res.status}`);
  }
  return res.json();
}

export async function getBoardPallets(): Promise<BoardPallet[]> {
  const res = await backendFetch("/pallets", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch pallets: ${res.status}`);
  }
  return res.json();
}

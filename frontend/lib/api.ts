import type { Order } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function getOrders(): Promise<Order[]> {
  const res = await fetch(`${BACKEND_URL}/orders`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch orders: ${res.status}`);
  }
  return res.json();
}

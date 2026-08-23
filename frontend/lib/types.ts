export type PalletStatus = "backlog" | "staged" | "in_progress" | "completed";

export type Pallet = {
  id: number;
  order_id: number;
  pallet_id: string;
  rack_location: string | null;
  status: PalletStatus;
  created_at: string;
};

export type Order = {
  id: number;
  client_name: string;
  order_number: string;
  sla_due_date: string;
  position: number;
  created_at: string;
  pallets: Pallet[];
};

export type OrderSummary = {
  id: number;
  client_name: string;
  order_number: string;
  sla_due_date: string;
};

export type BoardPallet = {
  id: number;
  pallet_id: string;
  rack_location: string | null;
  status: PalletStatus;
  order: OrderSummary;
};

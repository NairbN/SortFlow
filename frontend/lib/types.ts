export type Pallet = {
  id: number;
  order_id: number;
  pallet_id: string;
  rack_location: string | null;
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

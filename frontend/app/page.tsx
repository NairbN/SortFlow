import { getOrders } from "@/lib/api";
import { OrderQueue } from "@/components/OrderQueue";
import { NewOrderForm } from "@/components/NewOrderForm";

export default async function Home() {
  const orders = await getOrders();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold">SLA Queue</h1>
        <p className="text-sm text-zinc-500">
          Drag to reorder. Sorted by due date by default; manual order sticks
          until someone drags again.
        </p>
      </header>

      <NewOrderForm />

      {orders.length === 0 ? (
        <p className="text-zinc-500">No orders yet.</p>
      ) : (
        <OrderQueue orders={orders} />
      )}
    </div>
  );
}

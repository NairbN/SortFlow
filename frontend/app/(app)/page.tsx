import { getOrders } from "@/lib/api";
import { OrderQueue } from "@/components/OrderQueue";
import { NewOrderForm } from "@/components/NewOrderForm";

export default async function Home() {
  const orders = await getOrders();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-6 py-10">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-extrabold tracking-tight">SLA Queue</h1>
        <p className="text-sm text-muted">
          Drag to reorder. Sorted by due date by default; manual order sticks
          until someone drags again.
        </p>
      </header>

      <NewOrderForm />

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <OrderQueue orders={orders} />
      )}
    </div>
  );
}

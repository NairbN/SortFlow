import { getBoardPallets } from "@/lib/api";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default async function PalletsPage() {
  const pallets = await getBoardPallets();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold">Pallet Board</h1>
        <p className="text-sm text-zinc-500">
          Drag pallets across columns as sorting progresses. The #1 order in
          the SLA queue stages automatically; completing every pallet on an
          order archives it.
        </p>
      </header>

      {pallets.length === 0 ? (
        <p className="text-zinc-500">No active pallets.</p>
      ) : (
        <KanbanBoard pallets={pallets} />
      )}
    </div>
  );
}

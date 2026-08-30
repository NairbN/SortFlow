import Link from "next/link";
import { logout } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RealtimeListener } from "@/components/RealtimeListener";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RealtimeListener />
      <nav className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 text-sm font-medium dark:border-zinc-800">
        <div className="flex gap-4">
          <Link href="/" className="hover:underline">
            SLA Queue
          </Link>
          <Link href="/pallets" className="hover:underline">
            Pallet Board
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="text-zinc-400 hover:text-zinc-600 hover:underline dark:hover:text-zinc-200"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
      {children}
    </>
  );
}

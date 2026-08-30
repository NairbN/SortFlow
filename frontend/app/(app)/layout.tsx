import { logout } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import { RealtimeListener } from "@/components/RealtimeListener";
import { TodayProvider } from "@/lib/TodayContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Computed once here (server-side) rather than in each card - see
  // TodayContext.tsx for why that matters for hydration correctness.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <TodayProvider today={today}>
      <RealtimeListener />
      <nav className="flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-3 text-sm font-medium sm:gap-4 sm:px-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-8">
          <div className="flex shrink-0 items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-accent">
              <rect x="1" y="14" width="20" height="4" rx="2" fill="currentColor" />
              <rect x="4" y="8" width="14" height="4" rx="2" fill="currentColor" opacity="0.65" />
              <rect x="7" y="2" width="8" height="4" rx="2" fill="currentColor" opacity="0.35" />
            </svg>
            {/* Wordmark hides at mobile widths - the icon alone plus the
                nav links already make the page unambiguous, and the full
                nav (logo + both links + toggle + log out) doesn't fit
                alongside it under ~400px. */}
            <span className="hidden text-base font-extrabold tracking-tight sm:inline">
              SortFlow
            </span>
          </div>
          <NavLinks />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <ThemeToggle />
          <div className="h-5 w-px bg-border" />
          {/* -my-3 py-3 expands the tap target to the full nav-bar height
              without changing the visible row height - the negative margin
              cancels the padding's effect on surrounding layout. */}
          <form action={logout}>
            <button
              type="submit"
              className="-my-3 flex items-center py-3 text-sm font-semibold text-muted hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
      {children}
    </TodayProvider>
  );
}

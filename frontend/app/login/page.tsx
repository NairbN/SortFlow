import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6"
      style={{
        backgroundImage:
          "radial-gradient(600px 420px at 50% 38%, var(--accent-tint), transparent 70%)",
      }}
    >
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3.5">
          <svg width="30" height="30" viewBox="0 0 22 22" fill="none" className="text-accent">
            <rect x="1" y="14" width="20" height="4" rx="2" fill="currentColor" />
            <rect x="4" y="8" width="14" height="4" rx="2" fill="currentColor" opacity="0.65" />
            <rect x="7" y="2" width="8" height="4" rx="2" fill="currentColor" opacity="0.35" />
          </svg>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-extrabold tracking-tight">SortFlow</span>
            <span className="text-sm text-muted">Sort team SLA &amp; pallet tracking</span>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

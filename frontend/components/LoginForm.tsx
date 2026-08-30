"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth-actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    { error: false }
  );

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-7 shadow-pop"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted">Password</span>
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          autoFocus
          className="rounded-md border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </label>
      {state.error && (
        <p className="text-sm text-danger">
          {state.rateLimited
            ? "Too many attempts. Wait a minute and try again."
            : "Incorrect password."}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg shadow-pop transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? "Checking..." : "Log in"}
      </button>
    </form>
  );
}

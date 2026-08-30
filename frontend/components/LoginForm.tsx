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
      className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h1 className="text-lg font-semibold">SortFlow</h1>
      <p className="text-sm text-zinc-500">
        Enter the shared team password to continue.
      </p>
      <input
        type="password"
        name="password"
        placeholder="Password"
        required
        autoFocus
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
      />
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.rateLimited
            ? "Too many attempts. Wait a minute and try again."
            : "Incorrect password."}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Checking..." : "Log in"}
      </button>
    </form>
  );
}

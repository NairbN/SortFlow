"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, expectedSessionToken, SESSION_COOKIE_NAME } from "./auth";
import { isRateLimited, recordFailedAttempt } from "./rate-limit";

export type LoginState = { error: boolean; rateLimited?: boolean };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return { error: true, rateLimited: true };
  }

  const password = String(formData.get("password") ?? "");

  if (!checkPassword(password)) {
    recordFailedAttempt(ip);
    return { error: true };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, expectedSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days - shared team password, low friction
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

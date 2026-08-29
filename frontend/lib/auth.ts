import crypto from "crypto";

export const SESSION_COOKIE_NAME = "sortflow_session";

export function checkPassword(password: string): boolean {
  return password === (process.env.SITE_PASSWORD ?? "");
}

/**
 * The session cookie stores a hash of the shared password rather than the
 * password itself - a visitor with a valid cookie can't read the plaintext
 * password back out of it, and a stray cookie value can't be forged without
 * knowing the real password.
 */
export function expectedSessionToken(): string {
  const password = process.env.SITE_PASSWORD ?? "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

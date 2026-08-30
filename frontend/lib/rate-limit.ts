const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

/**
 * Best-effort only: state lives in this server's memory, so it resets on a
 * Vercel serverless cold start and isn't shared across instances. Still
 * raises the bar against unsophisticated scripted brute-forcing of the
 * shared SITE_PASSWORD - the backend's matching limiter (app/rate_limit.py)
 * is the sturdier one, since Railway runs it as one persistent process.
 */
const failedAttempts = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const attempts = (failedAttempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failedAttempts.set(key, attempts);
  return attempts.length >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const attempts = failedAttempts.get(key) ?? [];
  attempts.push(Date.now());
  failedAttempts.set(key, attempts);
}

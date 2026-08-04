// In-memory only — resets on redeploy and is not shared across serverless
// instances. Acceptable for MVP lead-volume; revisit with a durable store
// (e.g. Vercel KV/Upstash) once traffic justifies it.
const lastRequestAt = new Map<string, number>();
const WINDOW_MS = 30_000;

// Entries older than the window can never block anything again, so sweep them
// on every call. This keeps the Map bounded by the number of *currently rate
// limited* keys instead of growing once per unique IP for the lifetime of the
// process. An O(n) pass over a small map is cheaper than the bookkeeping a
// background timer would need at MVP scale.
function evictExpired(now: number): void {
  for (const [key, at] of lastRequestAt) {
    if (now - at >= WINDOW_MS) {
      lastRequestAt.delete(key);
    }
  }
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  evictExpired(now);

  const last = lastRequestAt.get(key);
  if (last !== undefined && now - last < WINDOW_MS) {
    return false;
  }
  lastRequestAt.set(key, now);
  return true;
}

// Test-only introspection so the unit tests can assert that expired entries are
// actually removed from the Map, not merely ignored. Not used by app code.
export function __rateLimitSizeForTests(): number {
  return lastRequestAt.size;
}

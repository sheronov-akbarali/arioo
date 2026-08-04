// In-memory only — resets on redeploy and is not shared across serverless
// instances. Acceptable for MVP lead-volume; revisit with a durable store
// (e.g. Vercel KV/Upstash) once traffic justifies it.
const lastRequestAt = new Map<string, number>();
const WINDOW_MS = 30_000;

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const last = lastRequestAt.get(key);
  if (last !== undefined && now - last < WINDOW_MS) {
    return false;
  }
  lastRequestAt.set(key, now);
  return true;
}

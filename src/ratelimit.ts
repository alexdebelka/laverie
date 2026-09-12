/**
 * Best-effort, in-memory rate limiter.
 *
 * Privacy note: the key is a salted SHA-256 of the client IP, kept only in the
 * memory of the current Worker isolate for `windowMs`. Nothing is written to
 * the database or to logs, and isolates are short-lived, so no IP-derived
 * value ever persists. This is enough to stop a bored neighbour from spamming
 * the board; it is not a security boundary.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

// A per-isolate random salt: hashes are not comparable across isolates or restarts.
// Generated lazily: Workers forbid random values in the global scope.
let salt: string | null = null;

async function key(ip: string, scope: string): Promise<string> {
  salt ??= crypto.randomUUID();
  const data = new TextEncoder().encode(`${salt}|${scope}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function allow(
  ip: string,
  scope: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  const k = await key(ip, scope);
  const b = buckets.get(k);
  if (!b || b.resetAt <= now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

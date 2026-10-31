/**
 * Simple fixed-window rate limiter for public callable functions.
 *
 * Tracks request counts per identifier (e.g. IP address) within a time window.
 * Not distributed across function instances; sufficient for a single-region
 * deployment. For stricter limits, use Firebase App Check or Redis.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Checks whether a request is within the rate limit.
 * Returns true if allowed, false if rate-limited.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(identifier, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

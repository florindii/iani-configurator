import db from "../db.server";

// In-memory rate limit store: key = "ip:endpoint", value = { count, resetAt }
// Resets per server instance; good enough for a single-process deployment (Render).
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// 1% chance to sweep expired entries on each request (avoids memory leak)
function maybeCleanup(now: number) {
  if (Math.random() > 0.01) return;
  for (const [key, val] of rateLimitStore) {
    if (val.resetAt < now) rateLimitStore.delete(key);
  }
}

/**
 * Check rate limit. Returns true if allowed, false if the IP is over the limit.
 * @param request    Incoming request (used to extract IP)
 * @param endpoint   Short identifier for the endpoint, e.g. "save-config"
 * @param maxRequests  Max requests per window (default 60)
 * @param windowMs   Window size in ms (default 60 000 = 1 minute)
 */
export function checkRateLimit(
  request: Request,
  endpoint: string,
  maxRequests = 60,
  windowMs = 60_000
): boolean {
  const ip = getClientIp(request);
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  maybeCleanup(now);

  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// Exposed for tests only — clears the in-memory store
export function _clearRateLimitStore() {
  rateLimitStore.clear();
}

/**
 * Validate that a shop domain is registered in our database.
 * Prevents arbitrary shops from writing to our API.
 */
export async function validateShop(shop: string | null | undefined): Promise<boolean> {
  if (!shop) return false;
  if (!shop.includes(".myshopify.com")) return false;
  const record = await db.shop.findUnique({
    where: { shopDomain: shop },
    select: { shopDomain: true },
  });
  return record !== null;
}

// ── Canned responses ──────────────────────────────────────────────────────────

export function rateLimitResponse(corsHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again in a minute." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
        ...corsHeaders,
      },
    }
  );
}

export function forbiddenResponse(
  message = "Shop not authorized",
  corsHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

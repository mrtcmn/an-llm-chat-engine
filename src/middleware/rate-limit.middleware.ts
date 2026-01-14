import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "./error-handler.middleware.js";
import type { JwtUserPayload } from "./auth.middleware.js";
import { RATE_LIMITS } from "@config";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter store
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  check(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // New entry or expired window
    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    // Within window
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// Single shared store
const store = new RateLimitStore();

/**
 * Rate limit tiers (from most to least permissive)
 * Using constants from @config for consistency across the application
 */
const LIMITS = {
  // Tier 1: IP-based - largest window, most permissive
  ip: {
    windowMs: RATE_LIMITS.IP.WINDOW_MS,
    limit: RATE_LIMITS.IP.MAX_REQUESTS,
  },
  // Tier 2: User ID - medium window
  user: {
    windowMs: RATE_LIMITS.USER.WINDOW_MS,
    limit: RATE_LIMITS.USER.MAX_REQUESTS,
  },
  // Tier 3: User ID + route - smallest, most restrictive
  route: {
    windowMs: RATE_LIMITS.ROUTE.WINDOW_MS,
    limit: RATE_LIMITS.ROUTE.MAX_REQUESTS,
  },
} as const;

/**
 * Generate route hash from method + path pattern
 */
function getRouteHash(req: FastifyRequest): string {
  // Use routeOptions.url for the pattern (e.g., "/chats/:chatId")
  const pattern = req.routeOptions?.url || req.url;
  return `${req.method}:${pattern}`;
}

/**
 * Rate limit middleware
 * Applies 3-tier rate limiting:
 * 1. IP-based (15min/500req) - prevents abuse from single IP
 * 2. User-based (1min/60req) - prevents single user flooding
 * 3. User+Route (1min/20req) - prevents hammering specific endpoints
 */
export async function rateLimitMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const ip = req.ip;
  const user = req.user as JwtUserPayload | undefined;
  const routeHash = getRouteHash(req);

  // Tier 1: IP-based limit (always applied)
  const ipKey = `ip:${ip}`;
  const ipResult = store.check(ipKey, LIMITS.ip.limit, LIMITS.ip.windowMs);

  if (!ipResult.allowed) {
    req.log.warn({ ip }, "IP rate limit exceeded");
    throw AppError.tooManyRequests("Too many requests from this IP");
  }

  // Tier 2 & 3: User-based limits (only if authenticated)
  if (user?.sub) {
    const userId = user.sub;

    // Tier 2: User limit
    const userKey = `user:${userId}`;
    const userResult = store.check(userKey, LIMITS.user.limit, LIMITS.user.windowMs);

    if (!userResult.allowed) {
      req.log.warn({ userId }, "User rate limit exceeded");
      throw AppError.tooManyRequests("Too many requests");
    }

    // Tier 3: User + Route limit
    const routeKey = `route:${userId}:${routeHash}`;
    const routeResult = store.check(routeKey, LIMITS.route.limit, LIMITS.route.windowMs);

    // Set headers based on most restrictive limit
    reply.header("X-RateLimit-Limit", LIMITS.route.limit);
    reply.header("X-RateLimit-Remaining", routeResult.remaining);
    reply.header("X-RateLimit-Reset", Math.ceil(routeResult.resetAt / 1000));

    if (!routeResult.allowed) {
      req.log.warn({ userId, route: routeHash }, "Route rate limit exceeded");
      throw AppError.tooManyRequests("Too many requests to this endpoint");
    }
  } else {
    // Unauthenticated: only IP limit headers
    reply.header("X-RateLimit-Limit", LIMITS.ip.limit);
    reply.header("X-RateLimit-Remaining", ipResult.remaining);
    reply.header("X-RateLimit-Reset", Math.ceil(ipResult.resetAt / 1000));
  }
}

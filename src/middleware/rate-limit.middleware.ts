import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "./error-handler.middleware.js";
import type { JwtUserPayload } from "./auth.middleware.js";
import { RATE_LIMITS } from "@config";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Route-specific rate limit configuration
 */
export interface RouteRateLimitConfig {
  enabled?: boolean;
  customLimit?: number;
  customWindow?: number;
  skipIpCheck?: boolean;
  skipUserCheck?: boolean;
}

/**
 * Extended FastifyRequest with rate limit config
 */
declare module "fastify" {
  interface FastifyRequest {
    routeConfig?: {
      rateLimit?: RouteRateLimitConfig;
    };
  }
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
 * Set standard rate limit headers
 */
function setRateLimitHeaders(
  reply: FastifyReply,
  limit: number,
  remaining: number,
  resetAt: number,
): void {
  reply.header("X-RateLimit-Limit", limit);
  reply.header("X-RateLimit-Remaining", remaining);
  reply.header("X-RateLimit-Reset", Math.ceil(resetAt / 1000));
}

/**
 * Set rate limit headers including Retry-After for exceeded limits
 */
function setRateLimitExceededHeaders(
  reply: FastifyReply,
  limit: number,
  resetAt: number,
): void {
  setRateLimitHeaders(reply, limit, 0, resetAt);
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  reply.header("Retry-After", Math.max(1, retryAfterSeconds));
}

/**
 * Rate limit middleware
 * Applies 3-tier rate limiting:
 * 1. IP-based (15min/500req) - prevents abuse from single IP
 * 2. User-based (1min/60req) - prevents single user flooding
 * 3. User+Route (1min/20req) - prevents hammering specific endpoints
 * 
 * Supports route-specific configuration via req.routeConfig.rateLimit
 */
export async function rateLimitMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const ip = req.ip;
  const user = req.user as JwtUserPayload | undefined;
  const routeHash = getRouteHash(req);
  
  // Get route-specific configuration
  const routeConfig = req.routeConfig?.rateLimit;
  
  // Allow routes to completely disable rate limiting
  if (routeConfig?.enabled === false) {
    req.logger.debug("[Middleware] RateLimit: disabled for this route", { route: routeHash });
    return;
  }

  // Get custom limits or use defaults
  const routeLimit = routeConfig?.customLimit ?? LIMITS.route.limit;
  const routeWindow = routeConfig?.customWindow ?? LIMITS.route.windowMs;

  // Tier 1: IP-based limit (unless explicitly skipped)
  if (!routeConfig?.skipIpCheck) {
    const ipKey = `ip:${ip}`;
    const ipResult = store.check(ipKey, LIMITS.ip.limit, LIMITS.ip.windowMs);

    if (!ipResult.allowed) {
      req.logger.warn("[Middleware] RateLimit: IP rate limit exceeded", { ip });
      setRateLimitExceededHeaders(reply, LIMITS.ip.limit, ipResult.resetAt);
      throw AppError.tooManyRequests("Too many requests from this IP");
    }
  }

  // Tier 2 & 3: User-based limits (only if authenticated)
  if (user?.sub) {
    const userId = user.sub;

    // Tier 2: User limit (unless explicitly skipped)
    if (!routeConfig?.skipUserCheck) {
      const userKey = `user:${userId}`;
      const userResult = store.check(userKey, LIMITS.user.limit, LIMITS.user.windowMs);

      if (!userResult.allowed) {
        req.logger.warn("[Middleware] RateLimit: user rate limit exceeded", { userId });
        setRateLimitExceededHeaders(reply, LIMITS.user.limit, userResult.resetAt);
        throw AppError.tooManyRequests("Too many requests");
      }
    }

    // Tier 3: User + Route limit (with custom limits if configured)
    const routeKey = `route:${userId}:${routeHash}`;
    const routeResult = store.check(routeKey, routeLimit, routeWindow);

    // Set headers based on most restrictive limit
    setRateLimitHeaders(reply, routeLimit, routeResult.remaining, routeResult.resetAt);

    if (!routeResult.allowed) {
      req.logger.warn("[Middleware] RateLimit: route rate limit exceeded", { 
        userId, 
        route: routeHash,
        customLimit: routeConfig?.customLimit 
      });
      setRateLimitExceededHeaders(reply, routeLimit, routeResult.resetAt);
      throw AppError.tooManyRequests("Too many requests to this endpoint");
    }

    req.logger.debug("[Middleware] RateLimit: rate limit check passed", { 
      userId, 
      route: routeHash,
      remaining: routeResult.remaining,
      limit: routeLimit 
    });
  } else {
    // Unauthenticated: only IP limit headers
    const ipKey = `ip:${ip}`;
    const ipResult = store.check(ipKey, LIMITS.ip.limit, LIMITS.ip.windowMs);
    
    setRateLimitHeaders(reply, LIMITS.ip.limit, ipResult.remaining, ipResult.resetAt);

    req.logger.debug("[Middleware] RateLimit: rate limit check passed (unauthenticated)", { 
      ip,
      remaining: ipResult.remaining 
    });
  }
}

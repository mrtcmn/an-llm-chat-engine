import { RATE_LIMITS } from "@config";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtUserPayload } from "./auth.middleware.js";
import { AppError } from "./error-handler.middleware.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RouteRateLimitConfig {
  enabled?: boolean;
  customLimit?: number;
  customWindow?: number;
  skipUserCheck?: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    routeConfig?: {
      rateLimit?: RouteRateLimitConfig;
    };
  }
}

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  check(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
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

const store = new RateLimitStore();

const LIMITS = {
  ip: {
    windowMs: RATE_LIMITS.IP.WINDOW_MS,
    limit: RATE_LIMITS.IP.MAX_REQUESTS,
  },
  user: {
    windowMs: RATE_LIMITS.USER.WINDOW_MS,
    limit: RATE_LIMITS.USER.MAX_REQUESTS,
  },
  route: {
    windowMs: RATE_LIMITS.ROUTE.WINDOW_MS,
    limit: RATE_LIMITS.ROUTE.MAX_REQUESTS,
  },
} as const;

function getRouteHash(req: FastifyRequest): string {
  const pattern = req.routeOptions?.url || req.url;
  return `${req.method}:${pattern}`;
}

function setRateLimitHeaders(
  reply: FastifyReply,
  limit: number,
  remaining: number,
  resetAt: number
): void {
  reply.header("X-RateLimit-Limit", limit);
  reply.header("X-RateLimit-Remaining", remaining);
  reply.header("X-RateLimit-Reset", Math.ceil(resetAt / 1000));
}

function setRateLimitExceededHeaders(
  reply: FastifyReply,
  limit: number,
  resetAt: number
): void {
  setRateLimitHeaders(reply, limit, 0, resetAt);
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  reply.header("Retry-After", Math.max(1, retryAfterSeconds));
}

/**
 * IP-based rate limit middleware
 * Checks IP limits globally before auth
 */
export async function ipRateLimitMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ip = req.ip;
  const ipKey = `ip:${ip}`;
  const ipResult = store.check(ipKey, LIMITS.ip.limit, LIMITS.ip.windowMs);

  setRateLimitHeaders(
    reply,
    LIMITS.ip.limit,
    ipResult.remaining,
    ipResult.resetAt
  );

  if (!ipResult.allowed) {
    req.logger.warn("[Middleware] RateLimit: IP rate limit exceeded", { ip });
    setRateLimitExceededHeaders(reply, LIMITS.ip.limit, ipResult.resetAt);
    throw AppError.tooManyRequests("Too many requests from this IP");
  }

  req.logger.debug("[Middleware] RateLimit: IP check passed", {
    ip,
    remaining: ipResult.remaining,
  });
}

/**
 * User and route-based rate limit middleware
 * Checks user and route limits per-route after auth
 */
export async function rateLimitMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = req.user as JwtUserPayload | undefined;
  const routeHash = getRouteHash(req);
  const routeConfig = req.routeConfig?.rateLimit;

  if (routeConfig?.enabled === false) {
    req.logger.debug("[Middleware] RateLimit: disabled for this route", {
      route: routeHash,
    });
    return;
  }

  if (!user?.sub) {
    req.logger.debug(
      "[Middleware] RateLimit: skipping user/route check (not authenticated)",
      {
        route: routeHash,
      }
    );
    return;
  }

  const userId = user.sub;
  const routeLimit = routeConfig?.customLimit ?? LIMITS.route.limit;
  const routeWindow = routeConfig?.customWindow ?? LIMITS.route.windowMs;

  if (!routeConfig?.skipUserCheck) {
    const userKey = `user:${userId}`;
    const userResult = store.check(
      userKey,
      LIMITS.user.limit,
      LIMITS.user.windowMs
    );

    if (!userResult.allowed) {
      req.logger.warn("[Middleware] RateLimit: user rate limit exceeded", {
        userId,
      });
      setRateLimitExceededHeaders(reply, LIMITS.user.limit, userResult.resetAt);
      throw AppError.tooManyRequests("Too many requests");
    }
  }

  const routeKey = `route:${userId}:${routeHash}`;
  const routeResult = store.check(routeKey, routeLimit, routeWindow);

  setRateLimitHeaders(
    reply,
    routeLimit,
    routeResult.remaining,
    routeResult.resetAt
  );

  if (!routeResult.allowed) {
    req.logger.warn("[Middleware] RateLimit: route rate limit exceeded", {
      userId,
      route: routeHash,
      customLimit: routeConfig?.customLimit,
    });
    setRateLimitExceededHeaders(reply, routeLimit, routeResult.resetAt);
    throw AppError.tooManyRequests("Too many requests to this endpoint");
  }

  req.logger.debug("[Middleware] RateLimit: user/route check passed", {
    userId,
    route: routeHash,
    remaining: routeResult.remaining,
    limit: routeLimit,
  });
}

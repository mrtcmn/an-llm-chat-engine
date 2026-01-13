import type { FastifyInstance, preHandlerHookHandler } from "fastify";

// Export all middleware
export { appCheckMiddleware } from "./app-check.middleware.js";
export { authMiddleware } from "./auth.middleware.js";
export type { JwtUserPayload } from "./auth.middleware.js";
export { clientDetectionMiddleware } from "./client-detection.middleware.js";
export type { ClientType } from "./client-detection.middleware.js";
export {
  paramSchemas,
  bodySchemas,
  querySchemas,
  responseSchemas,
  routeSchemas,
} from "./validation.middleware.js";
export {
  errorHandler,
  notFoundHandler,
  AppError,
} from "./error-handler.middleware.js";
export type { ErrorResponse } from "./error-handler.middleware.js";
export { rateLimitMiddleware } from "./rate-limit.middleware.js";

// Re-import for internal use
import { appCheckMiddleware } from "./app-check.middleware.js";
import { authMiddleware } from "./auth.middleware.js";
import { clientDetectionMiddleware } from "./client-detection.middleware.js";
import { rateLimitMiddleware } from "./rate-limit.middleware.js";

/**
 * Middleware chain presets for different route groups
 * Order is crucial: appCheck -> rateLimit -> auth -> clientDetection
 *
 * Rate limiting is tiered:
 * - IP-based: 500 req / 15 min (always applied)
 * - User-based: 60 req / min (if authenticated)
 * - User+Route: 20 req / min (if authenticated)
 */
export const middlewareChains = {
  /**
   * Full authenticated chain with all middleware
   * Use for: /chats, /completions, /messages, etc.
   */
  authenticated: [
    appCheckMiddleware,
    rateLimitMiddleware,
    authMiddleware,
    clientDetectionMiddleware,
  ] as preHandlerHookHandler[],

  /**
   * Public endpoints with rate limiting only
   * Use for: /health, /status, etc.
   */
  public: [
    appCheckMiddleware,
    rateLimitMiddleware,
    clientDetectionMiddleware,
  ] as preHandlerHookHandler[],
};

/**
 * Register a middleware chain as preHandler hooks for a route group
 *
 * @example
 * ```typescript
 * fastify.register(async (instance) => {
 *   registerMiddlewareChain(instance, middlewareChains.authenticated);
 *   instance.get('/chats', async (req, reply) => { ... });
 * });
 * ```
 */
export function registerMiddlewareChain(
  instance: FastifyInstance,
  chain: preHandlerHookHandler[],
): void {
  for (const middleware of chain) {
    instance.addHook("preHandler", middleware);
  }
}

/**
 * Create a route configuration object with middleware chain
 *
 * @example
 * ```typescript
 * fastify.route({
 *   method: 'GET',
 *   url: '/chats',
 *   ...withMiddleware(middlewareChains.authenticated),
 *   handler: async (req, reply) => { ... }
 * });
 * ```
 */
export function withMiddleware(chain: preHandlerHookHandler[]) {
  return {
    preHandler: chain,
  };
}

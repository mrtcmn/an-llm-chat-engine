import type { FastifyInstance, preHandlerHookHandler } from "fastify";

export type { JwtUserPayload } from "./auth.middleware.js";
// Export all middleware
export { authMiddleware } from "./auth.middleware.js";
export type { ClientType } from "./client-detection.middleware.js";
export { clientDetectionMiddleware } from "./client-detection.middleware.js";
export type { ErrorResponse } from "./error-handler.middleware.js";
export {
  AppError,
  errorHandler,
  notFoundHandler,
} from "./error-handler.middleware.js";
export { loggingMiddleware } from "./logging.middleware.js";
export type { RouteRateLimitConfig } from "./rate-limit.middleware.js";
export { rateLimitMiddleware } from "./rate-limit.middleware.js";
export { requestContextMiddleware } from "./request-context.middleware.js";

/**
 * Register a middleware chain as preHandler hooks for a route group
 *
 * Middleware execution order (as registered):
 * 1. Authentication - Validates JWT tokens and attaches user info
 * 2. Client detection - Identifies client type (Web/Mobile/Desktop)
 * 3. Request validation - Validates request schema (handled by Fastify schema)
 * 4. Error handling - Catches and formats errors (global handler)
 * 5. Logging - Logs request/response details
 *
 * Global middleware (registered at app level):
 * - Request context - Sets request/correlation IDs (via plugin hook)
 * - Rate limiter - Checks IP-based rate limits early, blocks restricted IPs before route processing (via global hook)
 * - Firebase App Check - Verifies requests from legitimate clients (via plugin hook)
 *
 * @example
 * ```typescript
 * import { authMiddleware, clientDetectionMiddleware, loggingMiddleware } from '@middleware';
 *
 * // For authenticated routes
 * fastify.register(async (instance) => {
 *   registerMiddlewareChain(instance, [
 *     authMiddleware,
 *     clientDetectionMiddleware,
 *     loggingMiddleware,
 *   ]);
 *   instance.get('/chats', async (req, reply) => { ... });
 * });
 *
 * // For public routes
 * fastify.register(async (instance) => {
 *   registerMiddlewareChain(instance, [
 *     clientDetectionMiddleware,
 *     loggingMiddleware,
 *   ]);
 *   instance.get('/health', async (req, reply) => { ... });
 * });
 * ```
 */
export function registerMiddlewareChain(
  instance: FastifyInstance,
  chain: preHandlerHookHandler[]
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
 * import { authMiddleware, clientDetectionMiddleware, loggingMiddleware } from '@middleware';
 *
 * fastify.route({
 *   method: 'GET',
 *   url: '/chats',
 *   ...withMiddleware([
 *     authMiddleware,
 *     clientDetectionMiddleware,
 *     loggingMiddleware,
 *   ]),
 *   handler: async (req, reply) => { ... }
 * });
 * ```
 */
export function withMiddleware(chain: preHandlerHookHandler[]) {
  return {
    preHandler: chain,
  };
}

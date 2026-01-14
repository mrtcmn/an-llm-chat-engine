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
export { loggingMiddleware } from "./logging.middleware.js";
export { requestContextMiddleware } from "./request-context.middleware.js";

/**
 * Register a middleware chain as preHandler hooks for a route group
 *
 * Middleware execution order (as registered):
 * 1. Rate limiter - Prevents abuse and DoS attacks
 * 2. Request context - Sets request/correlation IDs on response headers
 * 3. Firebase App Check - Verifies requests come from legitimate clients
 * 4. Authentication - Validates JWT tokens and attaches user info
 * 5. Client detection - Identifies client type (Web/Mobile/Desktop)
 * 6. Request validation - Validates request schema (handled by Fastify schema)
 * 7. Error handling - Catches and formats errors (global handler)
 * 8. Logging - Logs request/response details
 *
 * @example
 * ```typescript
 * import { rateLimitMiddleware, requestContextMiddleware, appCheckMiddleware, authMiddleware, clientDetectionMiddleware, loggingMiddleware } from '@middleware';
 *
 * // For authenticated routes
 * fastify.register(async (instance) => {
 *   registerMiddlewareChain(instance, [
 *     rateLimitMiddleware,
 *     requestContextMiddleware,
 *     appCheckMiddleware,
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
 *     rateLimitMiddleware,
 *     requestContextMiddleware,
 *     appCheckMiddleware,
 *     clientDetectionMiddleware,
 *     loggingMiddleware,
 *   ]);
 *   instance.get('/health', async (req, reply) => { ... });
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
 * import { rateLimitMiddleware, requestContextMiddleware, appCheckMiddleware, authMiddleware, clientDetectionMiddleware, loggingMiddleware } from '@middleware';
 *
 * fastify.route({
 *   method: 'GET',
 *   url: '/chats',
 *   ...withMiddleware([
 *     rateLimitMiddleware,
 *     requestContextMiddleware,
 *     appCheckMiddleware,
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

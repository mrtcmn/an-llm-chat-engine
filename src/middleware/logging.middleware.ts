import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Request logging middleware
 * Logs incoming requests with timing and response information
 */
export async function loggingMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Log request info
  // Note: requestId, correlationId, userId, and clientType are automatically added by the request-bound logger
  req.logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
}

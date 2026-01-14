import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Request logging middleware
 * Logs incoming requests with timing and response information
 */
export async function loggingMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {

  req.logger.debug("[Middleware] Logging: request received", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
}

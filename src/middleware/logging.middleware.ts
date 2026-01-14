import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Request logging middleware
 * Logs incoming requests with timing and response information
 */
export async function loggingMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const startTime = Date.now();

  // Log request info
  req.log.info(
    {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      userId: req.user ? (req.user as { sub: string }).sub : undefined,
    },
    "Incoming request",
  );

}

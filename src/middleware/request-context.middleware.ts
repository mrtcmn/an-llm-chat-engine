import type { FastifyRequest, FastifyReply } from "fastify";
import { REQUEST } from "@config/constants";

/**
 * Extend Fastify types to include correlation ID
 */
declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
  }
}

/**
 * Request context middleware
 * Handles request/correlation ID extraction and response header binding
 *
 * - Extracts correlation-id from incoming headers or defaults to request-id
 * - Attaches correlation-id to request for downstream access
 * - Sets both x-request-id and x-correlation-id on response headers
 */
export async function requestContextMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Extract correlation ID from header or use request ID as fallback
  const correlationId =
    (req.headers[REQUEST.CORRELATION_ID_HEADER] as string) || req.id;

  // Store on request for downstream access
  req.correlationId = correlationId;

  // Bind response headers for tracing
  reply.header(REQUEST.REQUEST_ID_HEADER, req.id);
  reply.header(REQUEST.CORRELATION_ID_HEADER, correlationId);
}

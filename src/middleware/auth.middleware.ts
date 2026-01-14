import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * User payload from JWT token
 */
export interface JwtUserPayload {
  sub: string; // User ID
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

/**
 * JWT authentication middleware
 * Verifies token from Authorization header and attaches user to request
 * Must be registered after the JWT plugin
 */
export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // @fastify/jwt adds jwtVerify to request
    await req.jwtVerify();

    // User is automatically attached by @fastify/jwt
    req.logger.debug("[Middleware] Auth: user authenticated", { userId: (req.user as JwtUserPayload).sub });
  } catch (err) {
    req.logger.warn("[Middleware] Auth: verification failed", { error: (err as Error).message });
    reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired token",
      statusCode: 401,
    });
  }
}
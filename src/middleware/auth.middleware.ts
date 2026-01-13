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
    req.log.debug({ userId: (req.user as JwtUserPayload).sub }, "Auth: user authenticated");
  } catch (err) {
    req.log.warn({ error: (err as Error).message }, "Auth: verification failed");
    reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired token",
      statusCode: 401,
    });
  }
}
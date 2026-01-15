import {
  clientDetectionMiddleware,
  loggingMiddleware,
  registerMiddlewareChain,
} from "@middleware";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Auth routes plugin
 * Provides authentication-related endpoints including JWT testing
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply public middleware chain (no auth required) in exact order
  registerMiddlewareChain(fastify, [
    clientDetectionMiddleware,
    loggingMiddleware,
  ]);
  /**
   * JWT Test Endpoint
   * Returns a test JWT token with hardcoded payload
   * Useful for testing and development purposes
   */
  fastify.get(
    "/jwt/test",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              token: { type: "string" },
            },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{ Body: { email: string } }>,
      reply: FastifyReply
    ) => {
      const token = fastify.jwt.sign({
        sub: "1b0bc859-f8dc-4305-8bca-a92bd9e1924f",
        email: "john.doe@example.com",
        role: "user",
      });
      return {
        token,
      };
    }
  );

  fastify.log.info("Auth routes registered");
}

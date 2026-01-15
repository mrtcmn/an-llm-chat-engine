import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Basic Health Check Endpoint
   * Returns 200 OK if the service is running
   * Used by load balancers and monitoring tools
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "Basic health check endpoint",
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string" },
              uptime: { type: "number" },
            },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }
  );

  fastify.log.info("Health check routes registered");
}

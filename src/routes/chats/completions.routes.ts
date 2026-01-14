import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  registerMiddlewareChain,
  middlewareChains,
  routeSchemas,
} from "@middleware";

/**
 * Request types for completion routes
 */
interface CreateCompletionRequest {
  Params: {
    chatId: string;
  };
  Body: {
    message: string;
    stream?: boolean;
  };
}

/**
 * Chat completions routes plugin
 * Endpoints:
 *   POST /chats/:chatId/completion - Create a completion (send message to AI)
 *
 * Strategy pattern:
 *   - STREAMING_ENABLED=true + stream=true → SSE streaming response
 *   - Otherwise → Regular JSON response
 */
export async function completionsRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply authenticated middleware chain (rate limiting is tiered automatically)
  registerMiddlewareChain(fastify, middlewareChains.authenticated);

  // POST /chats/:chatId/completion - Create a completion
  fastify.post<CreateCompletionRequest>(
    "/:chatId/completion",
    {
      schema: routeSchemas.createCompletion,
    },
    async (req: FastifyRequest<CreateCompletionRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const { message} = req.body;
      const userId = req.user!.sub;

      return fastify.completionService.createCompletion(
        req,
        reply,
        chatId,
        message,
        userId,
      );
    },
  );

  fastify.log.info("Completion routes registered");
}

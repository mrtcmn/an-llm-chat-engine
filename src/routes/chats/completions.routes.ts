import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
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
 *   POST /chats/:chatId/completions - Create a completion (send message to AI)
 */
async function completionsRoutesCallback(fastify: FastifyInstance): Promise<void> {
  // Apply authenticated middleware chain (rate limiting is tiered automatically)
  registerMiddlewareChain(fastify, middlewareChains.authenticated);

  // POST /chats/:chatId/completions - Create a completion
  fastify.post<CreateCompletionRequest>(
    "/:chatId/completions",
    { schema: routeSchemas.createCompletion },
    async (req: FastifyRequest<CreateCompletionRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const { message, stream = true } = req.body;
      const userId = req.user!.sub;
      const clientType = req.clientType;

      req.log.info(
        { userId, chatId, messageLength: message.length, stream, clientType },
        "Creating completion",
      );

      // TODO: Implement streaming logic based on feature flag and stream param
      const streamingEnabled = fastify.config.getFeatureFlag("streamingEnabled");

      if (stream && streamingEnabled) {
        // TODO: Implement SSE streaming response
        req.log.info("Streaming completion requested");

        // Placeholder: Return non-streaming for now
        return {
          id: "placeholder-message-uuid",
          chatId,
          role: "assistant",
          content: "This is a placeholder response. Streaming will be implemented.",
          createdAt: new Date().toISOString(),
        };
      }

      // Non-streaming response
      // TODO: Implement actual AI completion call
      return {
        id: "placeholder-message-uuid",
        chatId,
        role: "assistant",
        content: "This is a placeholder response. AI integration coming soon.",
        createdAt: new Date().toISOString(),
      };
    },
  );

  fastify.log.info("Completion routes registered");
}

export const completionsRoutes = fp(completionsRoutesCallback, {
  name: "completions-routes",
  dependencies: ["jwt-plugin"],
});

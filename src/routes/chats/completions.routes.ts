import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  registerMiddlewareChain,
  middlewareChains,
  routeSchemas,
} from "@middleware";
import { streamingStrategy, regularStrategy } from "./strategies";
import type { AIMessage } from "../../services/ai";

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
 * Build AI messages from user input
 * In future: will include chat history from database
 */
function buildMessages(userMessage: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: 'You are a helpful AI assistant. Be concise and helpful in your responses. If you use tools, explain what information you gathered.'
    },
    {
      role: 'user',
      content: userMessage
    }
  ];
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
      sse: true // Enable SSE support for streaming responses
    },
    async (req: FastifyRequest<CreateCompletionRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const { message, stream = true } = req.body;
      const userId = req.user!.sub;
      const clientType = req.clientType;

      req.log.info(
        { userId, chatId, messageLength: message.length, stream, clientType },
        "Creating completion",
      );

      // Build messages for AI
      // TODO: In future, fetch chat history and include previous messages
      const messages = buildMessages(message);

      // Strategy pattern: streaming vs regular based on feature flag and request
      const streamingEnabled = fastify.config.getFeatureFlag("streamingEnabled");
      const useStreaming = stream && streamingEnabled;

      if (useStreaming) {
        req.log.info("Using streaming strategy");

        // SSE streaming response - this will handle the reply internally
        await streamingStrategy(req, reply, messages);

        // TODO: Save assistant message to database after stream completes
        // For now, streaming doesn't persist the response

        return reply;
      }

      // Non-streaming: Regular JSON response
      req.log.info("Using regular strategy");

      const response = await regularStrategy(req, chatId, messages);

      // TODO: Save assistant message to database
      // await fastify.db.message.create({
      //   data: {
      //     chatId,
      //     role: 'assistant',
      //     content: response.content
      //   }
      // });

      return response;
    },
  );

  fastify.log.info("Completion routes registered");
}

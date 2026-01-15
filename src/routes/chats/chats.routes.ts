import {
  authMiddleware,
  clientDetectionMiddleware,
  loggingMiddleware,
  registerMiddlewareChain,
} from "@middleware";
import { routeSchemas } from "@schemas/validation.schemas";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Request types for chat routes
 */
interface ChatParamsRequest {
  Params: {
    chatId: string;
  };
}

interface ListChatsRequest {
  Querystring: {
    limit?: number;
    offset?: number;
    page?: number;
  };
}

/**
 * Chat routes plugin
 * Endpoints:
 *   GET /chats                - List all chats for user
 *   GET /chats/:chatId/history - Get message history for a chat
 */
export async function chatsRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply authenticated middleware chain to all routes in this plugin in exact order
  registerMiddlewareChain(fastify, [
    authMiddleware,
    clientDetectionMiddleware,
    loggingMiddleware,
  ]);

  // GET /chats - List all chats
  fastify.get<ListChatsRequest>(
    "/",
    { schema: routeSchemas.listChats },
    async (req: FastifyRequest<ListChatsRequest>, reply: FastifyReply) => {
      const userId = req.user!.sub;
      const { limit, page } = req.query;

      return fastify.chatService.listChats(userId, { limit, page });
    }
  );

  // GET /chats/:chatId/history - Get message history
  fastify.get<ChatParamsRequest>(
    "/:chatId/history",
    { schema: routeSchemas.getChatHistory },
    async (req: FastifyRequest<ChatParamsRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const userId = req.user!.sub;
      return fastify.chatService.getChatHistory(chatId, userId);
    }
  );

  fastify.log.info("Chat routes registered");
}

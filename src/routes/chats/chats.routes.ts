import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  registerMiddlewareChain,
  middlewareChains,
  routeSchemas,
} from "@middleware";

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
    cursor?: string;
    limit?: number;
    archived?: boolean;
  };
}

/**
 * Chat routes plugin
 * Endpoints:
 *   GET /chats                - List all chats for user
 *   GET /chats/:chatId/history - Get message history for a chat
 */
export async function chatsRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply authenticated middleware chain to all routes in this plugin
  registerMiddlewareChain(fastify, middlewareChains.authenticated);

  // GET /chats - List all chats
  fastify.get<ListChatsRequest>(
    "/",
    { schema: routeSchemas.listChats },
    async (req: FastifyRequest<ListChatsRequest>, reply: FastifyReply) => {
      const { cursor, limit = 20, archived } = req.query;
      const userId = req.user!.sub;

      req.log.info({ userId, cursor, limit, archived }, "Listing chats");

      // TODO: Implement business logic
      return {
        chats: [],
        nextCursor: null,
      };
    },
  );

  // GET /chats/:chatId/history - Get message history
  fastify.get<ChatParamsRequest>(
    "/:chatId/history",
    { schema: routeSchemas.getChatHistory },
    async (req: FastifyRequest<ChatParamsRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const userId = req.user!.sub;

      req.log.info({ userId, chatId }, "Getting chat history");

      // TODO: Implement business logic - fetch messages from database
      return {
        chatId,
        messages: [],
      };
    },
  );

  fastify.log.info("Chat routes registered");
}

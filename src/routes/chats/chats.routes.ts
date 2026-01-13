import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import {
  registerMiddlewareChain,
  middlewareChains,
  routeSchemas,
} from "@middleware";

/**
 * Request types for chat routes
 */
interface CreateChatRequest {
  Body: {
    title: string;
    model?: string;
  };
}

interface ChatParamsRequest {
  Params: {
    chatId: string;
  };
}

interface UpdateChatRequest {
  Params: {
    chatId: string;
  };
  Body: {
    title?: string;
    archived?: boolean;
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
 * Chat CRUD routes plugin
 * Endpoints:
 *   GET    /chats          - List all chats for user
 *   POST   /chats          - Create a new chat
 *   GET    /chats/:chatId  - Get a specific chat
 *   PATCH  /chats/:chatId  - Update a chat
 *   DELETE /chats/:chatId  - Delete a chat
 */
async function chatsRoutesCallback(fastify: FastifyInstance): Promise<void> {
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

  // POST /chats - Create a new chat
  fastify.post<CreateChatRequest>(
    "/",
    { schema: routeSchemas.createChat },
    async (req: FastifyRequest<CreateChatRequest>, reply: FastifyReply) => {
      const { title, model = "gpt-4" } = req.body;
      const userId = req.user!.sub;

      req.log.info({ userId, title, model }, "Creating chat");

      // TODO: Implement business logic
      reply.status(201);
      return {
        id: "placeholder-uuid",
        title,
        model,
        userId,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  );

  // GET /chats/:chatId - Get a specific chat
  fastify.get<ChatParamsRequest>(
    "/:chatId",
    { schema: routeSchemas.getChat },
    async (req: FastifyRequest<ChatParamsRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const userId = req.user!.sub;

      req.log.info({ userId, chatId }, "Getting chat");

      // TODO: Implement business logic
      return {
        id: chatId,
        title: "Placeholder Chat",
        model: "gpt-4",
        userId,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  );

  // PATCH /chats/:chatId - Update a chat
  fastify.patch<UpdateChatRequest>(
    "/:chatId",
    { schema: routeSchemas.updateChat },
    async (req: FastifyRequest<UpdateChatRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const { title, archived } = req.body;
      const userId = req.user!.sub;

      req.log.info({ userId, chatId, title, archived }, "Updating chat");

      // TODO: Implement business logic
      return {
        id: chatId,
        title: title || "Placeholder Chat",
        model: "gpt-4",
        userId,
        archived: archived ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  );

  // DELETE /chats/:chatId - Delete a chat
  fastify.delete<ChatParamsRequest>(
    "/:chatId",
    { schema: routeSchemas.deleteChat },
    async (req: FastifyRequest<ChatParamsRequest>, reply: FastifyReply) => {
      const { chatId } = req.params;
      const userId = req.user!.sub;

      req.log.info({ userId, chatId }, "Deleting chat");

      // TODO: Implement business logic
      reply.status(204);
      return;
    },
  );

  fastify.log.info("Chat routes registered");
}

export const chatsRoutes = fp(chatsRoutesCallback, {
  name: "chats-routes",
  dependencies: ["jwt-plugin"],
});

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { chatsRoutes, completionsRoutes } from "./chats/index";
import { authRoutes } from "./auth.routes";
import { errorHandler, notFoundHandler } from "@middleware";

/**
 * Main router plugin
 * Registers all route plugins with their prefixes and sets up error handling
 *
 * Route structure:
 *   /api/auth/jwt/test                   - JWT test endpoint (public)
 *   /api/chats                           - List all chats (authenticated)
 *   /api/chats/:chatId/history           - Get chat message history (authenticated)
 *   /api/chats/:chatId/completion        - AI completion with streaming (authenticated)
 */
async function routerPluginCallback(fastify: FastifyInstance): Promise<void> {
  // Set global error handler with structured logging for observability
  fastify.setErrorHandler(errorHandler);

  // Set 404 handler
  fastify.setNotFoundHandler(notFoundHandler);

  // API routes
  fastify.register(async (api) => {
    // Register auth routes at /api/auth
    api.register(authRoutes, { prefix: "/auth" });

    // Register chat routes at /api/chats
    api.register(chatsRoutes, { prefix: "/chats" });

    // Register completion routes at /api/chats (they add /:chatId/completion)
    api.register(completionsRoutes, { prefix: "/chats" });
  }, { prefix: "/api" });

  fastify.log.info("Router plugin registered");
}

export const routerPlugin = fp(routerPluginCallback, {
  name: "router-plugin",
  dependencies: ["jwt-plugin", "database-plugin"],
});

// Re-export individual routes for custom registration if needed
export { chatsRoutes, completionsRoutes } from "./chats/index.js";
export { authRoutes } from "./auth.routes.js";
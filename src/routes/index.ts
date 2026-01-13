import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { chatsRoutes, completionsRoutes } from "./chats/index";
import { errorHandler, notFoundHandler } from "@middleware";

/**
 * Main router plugin
 * Registers all route plugins with their prefixes and sets up error handling
 *
 * Route structure:
 *   /api/v1/chats/*                  - Chat CRUD endpoints (authenticated)
 *   /api/v1/chats/:id/completions    - Completion endpoint (authenticated)
 */
async function routerPluginCallback(fastify: FastifyInstance): Promise<void> {
  // Set global error handler with structured logging for observability
  fastify.setErrorHandler(errorHandler);

  // Set 404 handler
  fastify.setNotFoundHandler(notFoundHandler);

  // API v1 routes
  fastify.register(async (api) => {
    // Register chat CRUD routes at /api/v1/chats
    api.register(chatsRoutes, { prefix: "/chats" });

    // Register completion routes at /api/v1/chats (they add /:chatId/completions)
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

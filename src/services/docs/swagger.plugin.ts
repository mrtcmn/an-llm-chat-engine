import { API } from "@config";
import fastifySwagger from "@fastify/swagger";
import scalarFastify from "@scalar/fastify-api-reference";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Swagger/OpenAPI plugin with Scalar UI
 * Provides API documentation at /docs
 */
async function swaggerPluginCallback(fastify: FastifyInstance): Promise<void> {
  // Register @fastify/swagger for OpenAPI spec generation
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "LLM Chat Engine API",
        description: "API for managing chat conversations with LLM models",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      tags: [
        { name: "Chats", description: "Chat management endpoints" },
        { name: "Completions", description: "LLM completion endpoints" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT authentication token",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  // Register Scalar for beautiful API reference UI
  await fastify.register(scalarFastify, {
    routePrefix: API.DOCS_PATH,
    configuration: {
      title: "LLM Chat Engine API",
      theme: "default",
      darkMode: true,
    },
  });

  fastify.log.info("Swagger plugin registered - docs available at /docs");
}

export const swaggerPlugin = fp(swaggerPluginCallback, {
  name: "swagger-plugin",
  dependencies: ["config-plugin"],
});

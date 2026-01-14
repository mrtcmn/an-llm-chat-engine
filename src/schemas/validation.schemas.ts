import { PAGINATION } from "@config";
import type { FastifySchema } from "fastify";

/**
 * Common validation schemas for route parameters
 * These are used with Fastify's built-in schema validation (JSON Schema)
 */

/**
 * Parameter schemas
 */
export const paramSchemas = {
  chatId: {
    type: "object" as const,
    required: ["chatId"],
    properties: {
      chatId: { type: "string" },
    },
  },
} as const;

/**
 * Body schemas
 */
export const bodySchemas = {
  completionMessage: {
    type: "object" as const,
    required: ["message"],
    properties: {
      message: { type: "string", minLength: 1, maxLength: 32000 },
    },
  },
} as const;

/**
 * Query schemas
 */
export const querySchemas = {
  chatList: {
    type: "object" as const,
    properties: {
      limit: { type: "integer", minimum: PAGINATION.MIN_LIMIT, maximum: PAGINATION.MAX_LIMIT, default: PAGINATION.DEFAULT_LIMIT },
      page: { type: "integer", minimum: 1 },
    },
  },
} as const;

/**
 * Response schemas
 */
export const responseSchemas = {
  error: {
    type: "object" as const,
    properties: {
      error: { type: "string" },
      message: { type: "string" },
      statusCode: { type: "integer" },
    },
  },
  chat: {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      model: { type: "string" },
      userId: { type: "string" },
      archived: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  message: {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      chatId: { type: "string" },
      role: { type: "string", enum: ["user", "assistant", "system"] },
      content: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
    },
  },
} as const;

/**
 * Pre-built route schemas for common endpoints
 * Includes OpenAPI metadata (tags, summary, description) for documentation
 */
export const routeSchemas = {
  // GET /chats
  listChats: {
    tags: ["Chats"],
    summary: "List all chats",
    description: "Returns a paginated list of chats for the authenticated user. Use either 'page' or 'offset' for pagination.",
    querystring: querySchemas.chatList,
    response: {
      200: {
        type: "object",
        properties: {
          chats: { type: "array", items: responseSchemas.chat },
          pagination: {
            type: "object",
            properties: {
              total: { type: "integer" },
              limit: { type: "integer" },
              offset: { type: "integer" },
              count: { type: "integer" },
              hasMore: { type: "boolean" },
              nextOffset: { type: ["integer", "null"] },
              page: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      401: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // GET /chats/:chatId/history
  getChatHistory: {
    tags: ["Chats"],
    summary: "Get chat history",
    description: "Returns the message history for a specific chat",
    params: paramSchemas.chatId,
    response: {
      200: {
        type: "object",
        properties: {
          chatId: { type: "string" },
          messages: { type: "array", items: responseSchemas.message },
        },
      },
      401: responseSchemas.error,
      404: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // POST /chats/:chatId/completion
  createCompletion: {
    tags: ["Completions"],
    summary: "Create a completion",
    description: "Sends a message to the LLM and returns the assistant's response. Supports streaming.",
    params: paramSchemas.chatId,
    body: bodySchemas.completionMessage,
    response: {
      200: responseSchemas.message,
      400: responseSchemas.error,
      401: responseSchemas.error,
      404: responseSchemas.error,
    },
  } satisfies FastifySchema,
} as const;

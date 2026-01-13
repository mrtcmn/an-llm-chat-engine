import type { FastifySchema } from "fastify";

/**
 * Common validation schemas for route parameters
 * These are used with Fastify's built-in schema validation (JSON Schema)
 */

// UUID format regex pattern
const UUID_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

/**
 * Parameter schemas
 */
export const paramSchemas = {
  chatId: {
    type: "object" as const,
    required: ["chatId"],
    properties: {
      chatId: { type: "string", pattern: UUID_PATTERN },
    },
  },
  messageId: {
    type: "object" as const,
    required: ["messageId"],
    properties: {
      messageId: { type: "string", pattern: UUID_PATTERN },
    },
  },
  chatAndMessageId: {
    type: "object" as const,
    required: ["chatId", "messageId"],
    properties: {
      chatId: { type: "string", pattern: UUID_PATTERN },
      messageId: { type: "string", pattern: UUID_PATTERN },
    },
  },
} as const;

/**
 * Body schemas
 */
export const bodySchemas = {
  createChat: {
    type: "object" as const,
    required: ["title"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 255 },
      model: { type: "string", default: "gpt-4" },
    },
  },
  completionMessage: {
    type: "object" as const,
    required: ["message"],
    properties: {
      message: { type: "string", minLength: 1, maxLength: 32000 },
      stream: { type: "boolean", default: true },
    },
  },
  updateChat: {
    type: "object" as const,
    properties: {
      title: { type: "string", minLength: 1, maxLength: 255 },
      archived: { type: "boolean" },
    },
    minProperties: 1,
  },
} as const;

/**
 * Query schemas
 */
export const querySchemas = {
  pagination: {
    type: "object" as const,
    properties: {
      cursor: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
  },
  chatList: {
    type: "object" as const,
    properties: {
      cursor: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      archived: { type: "boolean" },
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
  // POST /chats
  createChat: {
    tags: ["Chats"],
    summary: "Create a new chat",
    description: "Creates a new chat conversation with the specified title and model",
    body: bodySchemas.createChat,
    response: {
      201: responseSchemas.chat,
      400: responseSchemas.error,
      401: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // GET /chats
  listChats: {
    tags: ["Chats"],
    summary: "List all chats",
    description: "Returns a paginated list of chats for the authenticated user",
    querystring: querySchemas.chatList,
    response: {
      200: {
        type: "object",
        properties: {
          chats: { type: "array", items: responseSchemas.chat },
          nextCursor: { type: "string", nullable: true },
        },
      },
      401: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // GET /chats/:chatId
  getChat: {
    tags: ["Chats"],
    summary: "Get a chat",
    description: "Returns a specific chat by ID",
    params: paramSchemas.chatId,
    response: {
      200: responseSchemas.chat,
      401: responseSchemas.error,
      404: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // PATCH /chats/:chatId
  updateChat: {
    tags: ["Chats"],
    summary: "Update a chat",
    description: "Updates a chat's title or archived status",
    params: paramSchemas.chatId,
    body: bodySchemas.updateChat,
    response: {
      200: responseSchemas.chat,
      400: responseSchemas.error,
      401: responseSchemas.error,
      404: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // DELETE /chats/:chatId
  deleteChat: {
    tags: ["Chats"],
    summary: "Delete a chat",
    description: "Permanently deletes a chat and all its messages",
    params: paramSchemas.chatId,
    response: {
      204: { type: "null" },
      401: responseSchemas.error,
      404: responseSchemas.error,
    },
  } satisfies FastifySchema,

  // POST /chats/:chatId/completions
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

  // GET /chats/:chatId/messages
  listMessages: {
    tags: ["Chats"],
    summary: "List chat messages",
    description: "Returns a paginated list of messages in a chat",
    params: paramSchemas.chatId,
    querystring: querySchemas.pagination,
    response: {
      200: {
        type: "object",
        properties: {
          messages: { type: "array", items: responseSchemas.message },
          nextCursor: { type: "string", nullable: true },
        },
      },
      401: responseSchemas.error,
      404: responseSchemas.error,
    },
  } satisfies FastifySchema,
} as const;

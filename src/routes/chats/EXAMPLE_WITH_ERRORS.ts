/**
 * EXAMPLE: Chat routes with proper error handling and structured logging
 * 
 * This file demonstrates how to use the enhanced AppError with nested context
 * for detailed observability in production systems.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "@middleware";
import type { PrismaClient } from "@prisma/client";

interface GetChatRequest {
  Params: {
    chatId: string;
  };
}

interface CreateMessageRequest {
  Params: {
    chatId: string;
  };
  Body: {
    content: string;
  };
}

/**
 * Example: GET /chats/:chatId with detailed error context
 */
export async function getChatWithErrorHandling(
  req: FastifyRequest<GetChatRequest>,
  reply: FastifyReply,
  db: PrismaClient,
) {
  const { chatId } = req.params;
  const userId = req.user!.sub;
  const startTime = Date.now();

  try {
    // Attempt to fetch chat
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    // Not found error with context
    if (!chat) {
      throw AppError.notFound("Chat", {
        userId,
        chatId,
        operation: "get_chat",
        errorCode: "CHAT_NOT_FOUND",
        metadata: {
          requestedResource: "chat",
          searchMethod: "byId",
        },
      });
    }

    // Authorization error with context
    if (chat.userId !== userId) {
      throw AppError.forbidden("Access denied to this chat", {
        userId,
        chatId,
        operation: "get_chat",
        errorCode: "CHAT_ACCESS_DENIED",
        metadata: {
          actualOwnerId: chat.userId,
          attemptedAction: "read",
          resourceType: "chat",
        },
      });
    }

    // Successful operation (could log this too for tracing)
    req.log.info(
      {
        business: {
          userId,
          chatId,
          operation: "get_chat",
        },
        performance: {
          duration: Date.now() - startTime,
        },
        metadata: {
          messageCount: chat._count.messages,
          archived: chat.archived,
        },
      },
      "Chat retrieved successfully",
    );

    return chat;

  } catch (error) {
    // Handle database errors
    if (error.code?.startsWith("P")) {
      const duration = Date.now() - startTime;
      
      throw AppError.internal("Database operation failed", {
        userId,
        chatId,
        operation: "get_chat",
        errorCode: "DATABASE_ERROR",
        errorCategory: "database",
        duration,
        metadata: {
          prismaErrorCode: error.code,
          prismaMessage: error.message,
          query: "chat.findUnique",
        },
      });
    }

    // Re-throw AppErrors (they already have context)
    if (error instanceof AppError) {
      throw error;
    }

    // Unknown errors - capture as much context as possible
    throw AppError.internal("Unexpected error during chat retrieval", {
      userId,
      chatId,
      operation: "get_chat",
      errorCode: "UNKNOWN_ERROR",
      duration: Date.now() - startTime,
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
      },
    });
  }
}

/**
 * Example: POST /chats/:chatId/messages with quota validation
 */
export async function createMessageWithErrorHandling(
  req: FastifyRequest<CreateMessageRequest>,
  reply: FastifyReply,
  db: PrismaClient,
) {
  const { chatId } = req.params;
  const { content } = req.body;
  const userId = req.user!.sub;
  const startTime = Date.now();

  try {
    // Step 1: Verify chat exists and user has access
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!chat) {
      throw AppError.notFound("Chat", {
        userId,
        chatId,
        operation: "create_message",
        errorCode: "CHAT_NOT_FOUND",
      });
    }

    if (chat.userId !== userId) {
      throw AppError.forbidden("Access denied to this chat", {
        userId,
        chatId,
        operation: "create_message",
        errorCode: "CHAT_ACCESS_DENIED",
        metadata: {
          actualOwnerId: chat.userId,
          attemptedAction: "create_message",
        },
      });
    }

    // Step 2: Check if chat is archived
    if (chat.archived) {
      throw AppError.badRequest(
        "Cannot add messages to archived chat",
        {
          reason: "Chat is archived",
          archivedAt: chat.updatedAt,
        },
        {
          userId,
          chatId,
          operation: "create_message",
          errorCode: "CHAT_ARCHIVED",
          errorCategory: "validation",
          metadata: {
            chatStatus: "archived",
            archivedAt: chat.updatedAt.toISOString(),
          },
        },
      );
    }

    // Step 3: Check message quota
    const MESSAGE_LIMIT = 100;
    const currentCount = chat._count.messages;

    if (currentCount >= MESSAGE_LIMIT) {
      throw AppError.badRequest(
        "Chat message limit reached",
        {
          limit: MESSAGE_LIMIT,
          current: currentCount,
        },
        {
          userId,
          chatId,
          operation: "create_message",
          errorCode: "MESSAGE_LIMIT_EXCEEDED",
          errorCategory: "quota",
          metadata: {
            currentCount,
            maxAllowed: MESSAGE_LIMIT,
            utilizationPercent: (currentCount / MESSAGE_LIMIT) * 100,
          },
        },
      );
    }

    // Step 4: Validate message content
    if (content.length > 10000) {
      throw AppError.badRequest(
        "Message content too long",
        {
          maxLength: 10000,
          actualLength: content.length,
        },
        {
          userId,
          chatId,
          operation: "create_message",
          errorCode: "MESSAGE_TOO_LONG",
          errorCategory: "validation",
          metadata: {
            contentLength: content.length,
            maxLength: 10000,
          },
        },
      );
    }

    // Step 5: Create the message
    const message = await db.message.create({
      data: {
        chatId,
        content,
        role: "user",
      },
    });

    // Log success with performance metrics
    req.log.info(
      {
        business: {
          userId,
          chatId,
          messageId: message.id,
          operation: "create_message",
        },
        performance: {
          duration: Date.now() - startTime,
        },
        metadata: {
          contentLength: content.length,
          totalMessages: currentCount + 1,
          quotaUsagePercent: ((currentCount + 1) / MESSAGE_LIMIT) * 100,
        },
      },
      "Message created successfully",
    );

    reply.status(201);
    return message;

  } catch (error) {
    // Handle Prisma unique constraint violations
    if (error.code === "P2002") {
      throw AppError.conflict("Duplicate message detected", undefined, {
        userId,
        chatId,
        operation: "create_message",
        errorCode: "DUPLICATE_MESSAGE",
        metadata: {
          prismaErrorCode: error.code,
          constraint: error.meta?.target,
        },
      });
    }

    // Handle foreign key violations (chat deleted during operation)
    if (error.code === "P2003") {
      throw AppError.notFound("Chat", {
        userId,
        chatId,
        operation: "create_message",
        errorCode: "CHAT_DELETED",
        metadata: {
          prismaErrorCode: error.code,
          foreignKey: error.meta?.field_name,
        },
      });
    }

    // Handle other Prisma errors
    if (error.code?.startsWith("P")) {
      const duration = Date.now() - startTime;

      throw AppError.internal("Database operation failed", {
        userId,
        chatId,
        operation: "create_message",
        errorCode: "DATABASE_ERROR",
        errorCategory: "database",
        duration,
        metadata: {
          prismaErrorCode: error.code,
          prismaMessage: error.message,
          query: "message.create",
        },
      });
    }

    // Re-throw AppErrors
    if (error instanceof AppError) {
      throw error;
    }

    // Unknown errors
    throw AppError.internal("Unexpected error during message creation", {
      userId,
      chatId,
      operation: "create_message",
      errorCode: "UNKNOWN_ERROR",
      duration: Date.now() - startTime,
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
      },
    });
  }
}

/**
 * Example: AI completion with external API error handling
 */
export async function callAIWithErrorHandling(
  chatId: string,
  userId: string,
  messageId: string,
  openaiClient: any, // Replace with actual OpenAI client type
  retryAttempt: number = 0,
) {
  const startTime = Date.now();

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      temperature: 0.7,
    });

    // Log successful API call for monitoring
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: "info",
      msg: "AI completion successful",
      business: {
        userId,
        chatId,
        messageId,
        operation: "ai_completion",
      },
      integration: {
        service: "openai",
        requestId: response.id,
        retryAttempt,
      },
      performance: {
        duration,
      },
      metadata: {
        model: "gpt-4",
        tokensUsed: response.usage?.total_tokens,
        finishReason: response.choices[0]?.finish_reason,
      },
    }));

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle rate limiting
    if (error.status === 429) {
      throw AppError.tooManyRequests("OpenAI rate limit exceeded", {
        userId,
        chatId,
        messageId,
        operation: "ai_completion",
        errorCode: "OPENAI_RATE_LIMIT",
        errorCategory: "rate_limit",
        externalService: "openai",
        externalRequestId: error.headers?.["x-request-id"],
        retryAttempt,
        duration,
        metadata: {
          model: "gpt-4",
          rateLimitRemaining: error.headers?.["x-ratelimit-remaining"],
          rateLimitReset: error.headers?.["x-ratelimit-reset"],
          retryAfter: error.headers?.["retry-after"],
        },
      });
    }

    // Handle invalid requests
    if (error.status === 400) {
      throw AppError.badRequest(
        "Invalid request to OpenAI API",
        {
          openaiError: error.message,
        },
        {
          userId,
          chatId,
          messageId,
          operation: "ai_completion",
          errorCode: "OPENAI_INVALID_REQUEST",
          errorCategory: "validation",
          externalService: "openai",
          externalRequestId: error.headers?.["x-request-id"],
          duration,
          metadata: {
            model: "gpt-4",
            errorType: error.type,
            errorCode: error.code,
          },
        },
      );
    }

    // Handle authentication errors
    if (error.status === 401) {
      throw AppError.internal(
        "OpenAI authentication failed",
        {
          userId,
          chatId,
          messageId,
          operation: "ai_completion",
          errorCode: "OPENAI_AUTH_FAILED",
          errorCategory: "authentication",
          externalService: "openai",
          duration,
          metadata: {
            errorType: error.type,
            // Don't log API key!
          },
        },
      );
    }

    // Handle service unavailable
    if (error.status === 503) {
      throw AppError.internal(
        "OpenAI service temporarily unavailable",
        {
          userId,
          chatId,
          messageId,
          operation: "ai_completion",
          errorCode: "OPENAI_SERVICE_UNAVAILABLE",
          errorCategory: "external_api",
          externalService: "openai",
          externalRequestId: error.headers?.["x-request-id"],
          retryAttempt,
          duration,
          metadata: {
            canRetry: retryAttempt < 3,
            nextRetryDelay: Math.min(1000 * Math.pow(2, retryAttempt), 10000),
          },
        },
      );
    }

    // Generic external API error
    throw AppError.internal(
      "Failed to generate AI completion",
      {
        userId,
        chatId,
        messageId,
        operation: "ai_completion",
        errorCode: "OPENAI_API_ERROR",
        errorCategory: "external_api",
        externalService: "openai",
        externalRequestId: error.headers?.["x-request-id"],
        retryAttempt,
        duration,
        metadata: {
          statusCode: error.status,
          errorType: error.type,
          errorCode: error.code,
          errorMessage: error.message,
        },
      },
    );
  }
}

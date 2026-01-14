import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, ERROR_CODES } from "@config";

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface ErrorContext {
  userId?: string;
  chatId?: string;
  messageId?: string;
  operation?: string;
  clientType?: string;
  errorCode?: string;
  errorCategory?: string;
  metadata?: Record<string, unknown>;
  externalService?: string;
  externalRequestId?: string;
  duration?: number;
  retryAttempt?: number;
}

export class AppError extends Error {
  public readonly errorCode?: string;
  public readonly errorCategory?: string;
  public readonly context?: ErrorContext;

  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: unknown,
    context?: ErrorContext,
  ) {
    super(message);
    this.name = "AppError";
    this.errorCode = context?.errorCode;
    this.errorCategory = context?.errorCategory;
    this.context = context;
  }

  static badRequest(message: string, details?: unknown, context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "validation";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.VALIDATION_ERROR;
    return new AppError(HTTP_STATUS.BAD_REQUEST, "Bad Request", message, details, ctx);
  }

  static unauthorized(message: string = "Unauthorized", context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "authentication";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.UNAUTHORIZED;
    return new AppError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized", message, undefined, ctx);
  }

  static forbidden(message: string = "Forbidden", context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "authorization";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.FORBIDDEN;
    return new AppError(HTTP_STATUS.FORBIDDEN, "Forbidden", message, undefined, ctx);
  }

  static notFound(resource: string = "Resource", context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "not_found";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.NOT_FOUND;
    return new AppError(HTTP_STATUS.NOT_FOUND, "Not Found", `${resource} not found`, undefined, ctx);
  }

  static conflict(message: string, details?: unknown, context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "conflict";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.CONFLICT;
    return new AppError(HTTP_STATUS.CONFLICT, "Conflict", message, details, ctx);
  }

  static tooManyRequests(message: string = "Too many requests", context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "rate_limit";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.RATE_LIMIT_EXCEEDED;
    return new AppError(HTTP_STATUS.TOO_MANY_REQUESTS, "Too Many Requests", message, undefined, ctx);
  }

  static internal(message: string = "Internal server error", context?: ErrorContext): AppError {
    const ctx = context || {};
    ctx.errorCategory = ctx.errorCategory || "internal";
    ctx.errorCode = ctx.errorCode || ERROR_CODES.INTERNAL_ERROR;
    return new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal Server Error", message, undefined, ctx);
  }
}

function getStatusCode(error: FastifyError | Error): number {
  if ("validation" in error && error.validation) {
    return HTTP_STATUS.BAD_REQUEST;
  }

  if (error instanceof AppError) {
    return error.statusCode;
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

export async function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const statusCode = getStatusCode(error);

  const logContext: Record<string, unknown> = {
    http: {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    },
    error: {
      name: error.name,
      message: error.message,
      code: "code" in error ? error.code : undefined,
      stack: statusCode >= 500 ? error.stack : undefined,
    },
  };

  if (error instanceof AppError) {
    logContext.error = {
      ...(logContext.error as Record<string, unknown>),
      code: error.errorCode,
      category: error.errorCategory,
      details: error.details,
    };

    if (error.context) {
      logContext.business = {
        userId: error.context.userId,
        chatId: error.context.chatId,
        messageId: error.context.messageId,
        operation: error.context.operation,
        clientType: error.context.clientType,
      };

      if (error.context.externalService) {
        logContext.integration = {
          service: error.context.externalService,
          requestId: error.context.externalRequestId,
          retryAttempt: error.context.retryAttempt,
        };
      }

      if (error.context.duration) {
        logContext.performance = { duration: error.context.duration };
      }

      if (error.context.metadata) {
        logContext.metadata = error.context.metadata;
      }
    }
  }

  if ("validation" in error && error.validation) {
    logContext.validation = error.validation;
  }

  if (req.user) {
    logContext.user = {
      id: req.user.sub,
      email: req.user.email,
    };
  }

  if (req.logger) {
    const logMessage = error instanceof AppError && error.context?.operation
      ? `Error in ${error.context.operation}: ${error.message}`
      : error.message;

    if (statusCode >= 500) {
      req.logger.error(logMessage, error, logContext);
    } else if (statusCode >= 400) {
      req.logger.warn(logMessage, logContext);
    }
  }

  const response: ErrorResponse = {
    error: error instanceof AppError ? error.error : getErrorName(statusCode),
    message: error instanceof AppError && statusCode >= 500 ? "Internal server error" : (error instanceof AppError ? error.message : (statusCode >= 500 ? "Internal server error" : error.message)),
    statusCode,
  };

  try {
    if (statusCode === 400 && "validation" in error && error.validation) {
      response.details = error.validation;
    }

    if (error instanceof AppError && error.details) {
      response.details = error.details;
    }
  } catch (serializationError) {
    req.logger?.warn("Error serializing error details", { serializationError });
  }

  return reply.status(statusCode).send(response);
}

function getErrorName(statusCode: number): string {
  const names: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  return names[statusCode] || "Error";
}

export function notFoundHandler(req: FastifyRequest, reply: FastifyReply): void {
  req.logger?.debug("[Middleware] NotFound: route not found", { url: req.url, method: req.method });

  reply.status(404).send({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  });
}

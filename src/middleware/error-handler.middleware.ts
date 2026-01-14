import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, ERROR_CODES } from "@config";

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Structured error details for nested logging
 */
export interface ErrorContext {
  // Business context
  userId?: string;
  chatId?: string;
  messageId?: string;
  operation?: string;
  
  // Request context
  clientType?: string;
  
  // Error specifics
  errorCode?: string;
  errorCategory?: string;
  
  // Additional nested data
  metadata?: Record<string, unknown>;
  
  // Integration context
  externalService?: string;
  externalRequestId?: string;
  
  // Performance
  duration?: number;
  retryAttempt?: number;
}

/**
 * Application-specific error class with structured logging support
 */
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
    return new AppError(HTTP_STATUS.BAD_REQUEST, "Bad Request", message, details, {
      ...context,
      errorCategory: context?.errorCategory || "validation",
      errorCode: context?.errorCode || ERROR_CODES.VALIDATION_ERROR,
    });
  }

  static unauthorized(message: string = "Unauthorized", context?: ErrorContext): AppError {
    return new AppError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized", message, undefined, {
      ...context,
      errorCategory: context?.errorCategory || "authentication",
      errorCode: context?.errorCode || ERROR_CODES.UNAUTHORIZED,
    });
  }

  static forbidden(message: string = "Forbidden", context?: ErrorContext): AppError {
    return new AppError(HTTP_STATUS.FORBIDDEN, "Forbidden", message, undefined, {
      ...context,
      errorCategory: context?.errorCategory || "authorization",
      errorCode: context?.errorCode || ERROR_CODES.FORBIDDEN,
    });
  }

  static notFound(resource: string = "Resource", context?: ErrorContext): AppError {
    return new AppError(HTTP_STATUS.NOT_FOUND, "Not Found", `${resource} not found`, undefined, {
      ...context,
      errorCategory: context?.errorCategory || "not_found",
      errorCode: context?.errorCode || ERROR_CODES.NOT_FOUND,
    });
  }

  static conflict(message: string, details?: unknown, context?: ErrorContext): AppError {
    return new AppError(HTTP_STATUS.CONFLICT, "Conflict", message, details, {
      ...context,
      errorCategory: context?.errorCategory || "conflict",
      errorCode: context?.errorCode || ERROR_CODES.CONFLICT,
    });
  }

  static tooManyRequests(message: string = "Too many requests", context?: ErrorContext): AppError {
    return new AppError(HTTP_STATUS.TOO_MANY_REQUESTS, "Too Many Requests", message, undefined, {
      ...context,
      errorCategory: context?.errorCategory || "rate_limit",
      errorCode: context?.errorCode || ERROR_CODES.RATE_LIMIT_EXCEEDED,
    });
  }

  static internal(message: string = "Internal server error", context?: ErrorContext): AppError {
    return new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal Server Error", message, undefined, {
      ...context,
      errorCategory: context?.errorCategory || "internal",
      errorCode: context?.errorCode || ERROR_CODES.INTERNAL_ERROR,
    });
  }
}

/**
 * Map known error types to HTTP status codes
 */
function getStatusCode(error: FastifyError | Error): number {
  // Fastify validation errors
  if ("validation" in error) {
    return HTTP_STATUS.BAD_REQUEST;
  }

  // AppError instances
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Fastify errors with statusCode
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  // Default to 500
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Global error handler for Fastify
 * Provides consistent error response format and structured logging for observability
 */
export function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = getStatusCode(error);

  // Build structured log object with nested context
  const logContext: Record<string, unknown> = {
    // HTTP context
    http: {
      method: req.method,
      url: req.url,
      statusCode,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    },
    
    // Error details
    error: {
      name: error.name,
      message: error.message,
      stack: statusCode >= 500 ? error.stack : undefined,
    },
  };

  // Add AppError-specific context (nested business logic details)
  if (error instanceof AppError) {
    logContext.error = {
      ...(logContext.error as Record<string, unknown>),
      code: error.errorCode,
      category: error.errorCategory,
      details: error.details,
    };

    // Add business context (userId, chatId, operation, etc.)
    if (error.context) {
      logContext.business = {
        userId: error.context.userId,
        chatId: error.context.chatId,
        messageId: error.context.messageId,
        operation: error.context.operation,
        clientType: error.context.clientType,
      };

      // Add integration context if present
      if (error.context.externalService) {
        logContext.integration = {
          service: error.context.externalService,
          requestId: error.context.externalRequestId,
          retryAttempt: error.context.retryAttempt,
        };
      }

      // Add performance metrics if present
      if (error.context.duration) {
        logContext.performance = {
          duration: error.context.duration,
        };
      }

      // Add any custom metadata
      if (error.context.metadata) {
        logContext.metadata = error.context.metadata;
      }
    }
  }

  // Add validation errors
  if ("validation" in error) {
    logContext.validation = error.validation;
  }

  // Add user context from JWT if available
  if (req.user) {
    logContext.user = {
      id: req.user.sub,
      email: req.user.email,
    };
  }

  // Log with appropriate level and human-readable message
  const logMessage = error instanceof AppError && error.context?.operation
    ? `Error in ${error.context.operation}: ${error.message}`
    : error.message;

  if (statusCode >= 500) {
    req.logger.error(logMessage, error, logContext);
  } else if (statusCode >= 400) {
    req.logger.warn(logMessage, logContext);
  }

  // Build error response (hide sensitive details from clients)
  const response: ErrorResponse = {
    error: error instanceof AppError ? error.error : getErrorName(statusCode),
    message: statusCode >= 500 ? "Internal server error" : error.message,
    statusCode,
  };

  // Include validation details for 400 errors
  if (statusCode === 400 && "validation" in error) {
    response.details = error.validation;
  }

  // Include details from AppError (but not sensitive context)
  if (error instanceof AppError && error.details) {
    response.details = error.details;
  }

  reply.status(statusCode).send(response);
}

/**
 * Get error name from status code
 */
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

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  req.logger.debug("Route not found", { 
    url: req.url, 
    method: req.method 
  });

  reply.status(404).send({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  });
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppError,
  errorHandler,
  notFoundHandler,
} from "../../middleware/error-handler.middleware";
import { createMockReply, createMockRequest } from "../mocks/fastify.mock";

// Mock @config
vi.mock("@config", () => ({
  HTTP_STATUS: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },
  ERROR_CODES: {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",
    RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
}));

describe("AppError", () => {
  describe("constructor", () => {
    it("should create error with all properties", () => {
      const error = new AppError(
        400,
        "Bad Request",
        "Invalid input",
        { field: "email" },
        {
          errorCode: "INVALID_EMAIL",
          errorCategory: "validation",
        }
      );

      expect(error.statusCode).toBe(400);
      expect(error.error).toBe("Bad Request");
      expect(error.message).toBe("Invalid input");
      expect(error.details).toEqual({ field: "email" });
      expect(error.errorCode).toBe("INVALID_EMAIL");
      expect(error.errorCategory).toBe("validation");
      expect(error.name).toBe("AppError");
    });

    it("should extend Error class", () => {
      const error = new AppError(
        500,
        "Internal Server Error",
        "Something went wrong"
      );
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("static factory methods", () => {
    describe("badRequest", () => {
      it("should create 400 error", () => {
        const error = AppError.badRequest("Invalid email format");

        expect(error.statusCode).toBe(400);
        expect(error.error).toBe("Bad Request");
        expect(error.message).toBe("Invalid email format");
        expect(error.errorCategory).toBe("validation");
      });

      it("should include details when provided", () => {
        const error = AppError.badRequest("Validation failed", {
          fields: ["email", "name"],
        });

        expect(error.details).toEqual({ fields: ["email", "name"] });
      });

      it("should allow custom context", () => {
        const error = AppError.badRequest("Invalid", undefined, {
          operation: "createUser",
        });

        expect(error.context?.operation).toBe("createUser");
      });
    });

    describe("unauthorized", () => {
      it("should create 401 error with default message", () => {
        const error = AppError.unauthorized();

        expect(error.statusCode).toBe(401);
        expect(error.error).toBe("Unauthorized");
        expect(error.message).toBe("Unauthorized");
        expect(error.errorCategory).toBe("authentication");
      });

      it("should create 401 error with custom message", () => {
        const error = AppError.unauthorized("Token expired");

        expect(error.message).toBe("Token expired");
      });
    });

    describe("forbidden", () => {
      it("should create 403 error with default message", () => {
        const error = AppError.forbidden();

        expect(error.statusCode).toBe(403);
        expect(error.error).toBe("Forbidden");
        expect(error.message).toBe("Forbidden");
        expect(error.errorCategory).toBe("authorization");
      });

      it("should create 403 error with custom message", () => {
        const error = AppError.forbidden("Admin access required");

        expect(error.message).toBe("Admin access required");
      });
    });

    describe("notFound", () => {
      it("should create 404 error with default resource", () => {
        const error = AppError.notFound();

        expect(error.statusCode).toBe(404);
        expect(error.error).toBe("Not Found");
        expect(error.message).toBe("Resource not found");
        expect(error.errorCategory).toBe("not_found");
      });

      it("should create 404 error with specific resource", () => {
        const error = AppError.notFound("Chat");

        expect(error.message).toBe("Chat not found");
      });
    });

    describe("conflict", () => {
      it("should create 409 error", () => {
        const error = AppError.conflict("Email already exists");

        expect(error.statusCode).toBe(409);
        expect(error.error).toBe("Conflict");
        expect(error.message).toBe("Email already exists");
        expect(error.errorCategory).toBe("conflict");
      });
    });

    describe("tooManyRequests", () => {
      it("should create 429 error with default message", () => {
        const error = AppError.tooManyRequests();

        expect(error.statusCode).toBe(429);
        expect(error.error).toBe("Too Many Requests");
        expect(error.message).toBe("Too many requests");
        expect(error.errorCategory).toBe("rate_limit");
      });

      it("should create 429 error with custom message", () => {
        const error = AppError.tooManyRequests(
          "Rate limit exceeded for this endpoint"
        );

        expect(error.message).toBe("Rate limit exceeded for this endpoint");
      });
    });

    describe("internal", () => {
      it("should create 500 error with default message", () => {
        const error = AppError.internal();

        expect(error.statusCode).toBe(500);
        expect(error.error).toBe("Internal Server Error");
        expect(error.message).toBe("Internal server error");
        expect(error.errorCategory).toBe("internal");
      });

      it("should create 500 error with custom message", () => {
        const error = AppError.internal("Database connection failed");

        expect(error.message).toBe("Database connection failed");
      });
    });
  });
});

describe("errorHandler", () => {
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = createMockRequest();
    mockReply = createMockReply();
  });

  describe("AppError handling", () => {
    it("should handle AppError with correct status", () => {
      const error = AppError.badRequest("Invalid input");

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          message: "Invalid input",
          statusCode: 400,
        })
      );
    });

    it("should include details from AppError", () => {
      const error = AppError.badRequest("Validation failed", {
        field: "email",
      });

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { field: "email" },
        })
      );
    });

    it("should log warn for 4xx errors", () => {
      const error = AppError.badRequest("Bad request");

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.warn).toHaveBeenCalled();
    });

    it("should log error for 5xx errors", () => {
      const error = AppError.internal("Server error");

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalled();
    });

    it("should mask internal error messages in response", () => {
      const error = AppError.internal("Database connection string leaked");

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Internal server error",
        })
      );
    });

    it("should include operation in log message when present", () => {
      const error = AppError.internal("DB error", { operation: "createUser" });

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        "Error in createUser: DB error",
        error,
        expect.any(Object)
      );
    });
  });

  describe("Fastify validation error handling", () => {
    it("should handle validation errors as 400", () => {
      const error = {
        name: "ValidationError",
        message: "body.email is required",
        validation: [
          { keyword: "required", params: { missingProperty: "email" } },
        ],
      } as any;

      errorHandler(error, mockReq as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
    });

    it("should include validation details in response", () => {
      const validationDetails = [
        { keyword: "required", params: { missingProperty: "email" } },
      ];
      const error = {
        name: "ValidationError",
        message: "body.email is required",
        validation: validationDetails,
      } as any;

      errorHandler(error, mockReq as any, mockReply as any);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          details: validationDetails,
        })
      );
    });
  });

  describe("Fastify error with statusCode handling", () => {
    it("should use statusCode from Fastify error", () => {
      const error = {
        name: "FastifyError",
        message: "Not found",
        statusCode: 404,
      } as any;

      errorHandler(error, mockReq as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });
  });

  describe("generic error handling", () => {
    it("should default to 500 for unknown errors", () => {
      const error = new Error("Unknown error");

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal Server Error",
          message: "Internal server error",
          statusCode: 500,
        })
      );
    });
  });

  describe("logging context", () => {
    it("should include HTTP context in logs", () => {
      const error = AppError.badRequest("Bad request");
      mockReq.method = "POST";
      mockReq.url = "/api/chats";
      mockReq.ip = "192.168.1.1";

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          http: expect.objectContaining({
            method: "POST",
            url: "/api/chats",
            statusCode: 400,
            ip: "192.168.1.1",
          }),
        })
      );
    });

    it("should include user context when available", () => {
      const error = AppError.badRequest("Bad request");
      mockReq.user = { sub: "user-123", email: "test@test.com", role: "user" };

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          user: { id: "user-123", email: "test@test.com" },
        })
      );
    });

    it("should include stack trace for 5xx errors", () => {
      const error = AppError.internal("Server error");

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
    });

    it("should not include stack trace for 4xx errors", () => {
      const error = AppError.badRequest("Bad request");

      errorHandler(error as any, mockReq as any, mockReply as any);

      const logCall = mockReq.logger.warn.mock.calls[0];
      const logContext = logCall[1];
      expect(logContext.error.stack).toBeUndefined();
    });

    it("should include business context from AppError", () => {
      const error = AppError.internal("DB error", {
        userId: "user-123",
        chatId: "chat-456",
        operation: "createMessage",
      });

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          business: expect.objectContaining({
            userId: "user-123",
            chatId: "chat-456",
            operation: "createMessage",
          }),
        })
      );
    });

    it("should include integration context when present", () => {
      const error = AppError.internal("OpenAI API failed", {
        externalService: "openai",
        externalRequestId: "req-abc123",
      });

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          integration: expect.objectContaining({
            service: "openai",
            requestId: "req-abc123",
          }),
        })
      );
    });

    it("should include performance metrics when present", () => {
      const error = AppError.internal("Slow query", {
        duration: 5000,
      });

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          performance: { duration: 5000 },
        })
      );
    });

    it("should include metadata when present", () => {
      const error = AppError.internal("Custom error", {
        metadata: { custom: "data", count: 5 },
      });

      errorHandler(error as any, mockReq as any, mockReply as any);

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          metadata: { custom: "data", count: 5 },
        })
      );
    });
  });
});

describe("notFoundHandler", () => {
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockReply = createMockReply();
  });

  it("should return 404 status", () => {
    mockReq.method = "GET";
    mockReq.url = "/api/unknown";

    notFoundHandler(mockReq as any, mockReply as any);

    expect(mockReply.status).toHaveBeenCalledWith(404);
  });

  it("should include method and url in response", () => {
    mockReq.method = "POST";
    mockReq.url = "/api/nonexistent";

    notFoundHandler(mockReq as any, mockReply as any);

    expect(mockReply.send).toHaveBeenCalledWith({
      error: "Not Found",
      message: "Route POST /api/nonexistent not found",
      statusCode: 404,
    });
  });

  it("should log debug message", () => {
    mockReq.method = "DELETE";
    mockReq.url = "/api/test";

    notFoundHandler(mockReq as any, mockReply as any);

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      "[Middleware] NotFound: route not found",
      { url: "/api/test", method: "DELETE" }
    );
  });
});

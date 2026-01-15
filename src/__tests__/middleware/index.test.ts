import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppError,
  authMiddleware,
  type ClientType,
  clientDetectionMiddleware,
  type ErrorResponse,
  errorHandler,
  type JwtUserPayload,
  loggingMiddleware,
  notFoundHandler,
  rateLimitMiddleware,
  registerMiddlewareChain,
  requestContextMiddleware,
  withMiddleware,
} from "../../middleware/index.js";
import {
  bodySchemas,
  paramSchemas,
  querySchemas,
  responseSchemas,
  routeSchemas,
} from "../../schemas/validation.schemas.js";

describe("Middleware Index", () => {
  describe("Exports", () => {
    it("should export all middleware functions", () => {
      expect(authMiddleware).toBeDefined();
      expect(typeof authMiddleware).toBe("function");

      expect(clientDetectionMiddleware).toBeDefined();
      expect(typeof clientDetectionMiddleware).toBe("function");

      expect(rateLimitMiddleware).toBeDefined();
      expect(typeof rateLimitMiddleware).toBe("function");

      expect(loggingMiddleware).toBeDefined();
      expect(typeof loggingMiddleware).toBe("function");

      expect(requestContextMiddleware).toBeDefined();
      expect(typeof requestContextMiddleware).toBe("function");
    });

    it("should export error handler functions", () => {
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe("function");

      expect(notFoundHandler).toBeDefined();
      expect(typeof notFoundHandler).toBe("function");

      expect(AppError).toBeDefined();
      expect(typeof AppError).toBe("function");
    });

    it("should export validation schemas", () => {
      expect(paramSchemas).toBeDefined();
      expect(typeof paramSchemas).toBe("object");

      expect(bodySchemas).toBeDefined();
      expect(typeof bodySchemas).toBe("object");

      expect(querySchemas).toBeDefined();
      expect(typeof querySchemas).toBe("object");

      expect(responseSchemas).toBeDefined();
      expect(typeof responseSchemas).toBe("object");

      expect(routeSchemas).toBeDefined();
      expect(typeof routeSchemas).toBe("object");
    });

    it("should export utility functions", () => {
      expect(registerMiddlewareChain).toBeDefined();
      expect(typeof registerMiddlewareChain).toBe("function");

      expect(withMiddleware).toBeDefined();
      expect(typeof withMiddleware).toBe("function");
    });
  });

  describe("registerMiddlewareChain", () => {
    let mockInstance: FastifyInstance;
    let mockMiddleware1: preHandlerHookHandler;
    let mockMiddleware2: preHandlerHookHandler;
    let mockMiddleware3: preHandlerHookHandler;

    beforeEach(() => {
      mockMiddleware1 = vi.fn();
      mockMiddleware2 = vi.fn();
      mockMiddleware3 = vi.fn();

      mockInstance = {
        addHook: vi.fn(),
      } as unknown as FastifyInstance;
    });

    it("should register all middleware in the chain as preHandler hooks", () => {
      const chain = [mockMiddleware1, mockMiddleware2, mockMiddleware3];

      registerMiddlewareChain(mockInstance, chain);

      expect(mockInstance.addHook).toHaveBeenCalledTimes(3);
      expect(mockInstance.addHook).toHaveBeenNthCalledWith(
        1,
        "preHandler",
        mockMiddleware1
      );
      expect(mockInstance.addHook).toHaveBeenNthCalledWith(
        2,
        "preHandler",
        mockMiddleware2
      );
      expect(mockInstance.addHook).toHaveBeenNthCalledWith(
        3,
        "preHandler",
        mockMiddleware3
      );
    });

    it("should register middleware in the correct order", () => {
      const chain = [mockMiddleware1, mockMiddleware2, mockMiddleware3];
      const callOrder: number[] = [];

      mockInstance = {
        addHook: vi.fn((hookName: string, handler: preHandlerHookHandler) => {
          if (handler === mockMiddleware1) {
            callOrder.push(1);
          }
          if (handler === mockMiddleware2) {
            callOrder.push(2);
          }
          if (handler === mockMiddleware3) {
            callOrder.push(3);
          }
        }),
      } as unknown as FastifyInstance;

      registerMiddlewareChain(mockInstance, chain);

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should handle empty middleware chain", () => {
      registerMiddlewareChain(mockInstance, []);

      expect(mockInstance.addHook).not.toHaveBeenCalled();
    });

    it("should handle single middleware", () => {
      registerMiddlewareChain(mockInstance, [mockMiddleware1]);

      expect(mockInstance.addHook).toHaveBeenCalledTimes(1);
      expect(mockInstance.addHook).toHaveBeenCalledWith(
        "preHandler",
        mockMiddleware1
      );
    });
  });

  describe("withMiddleware", () => {
    let mockMiddleware1: preHandlerHookHandler;
    let mockMiddleware2: preHandlerHookHandler;
    let mockMiddleware3: preHandlerHookHandler;

    beforeEach(() => {
      mockMiddleware1 = vi.fn();
      mockMiddleware2 = vi.fn();
      mockMiddleware3 = vi.fn();
    });

    it("should return an object with preHandler property", () => {
      const chain = [mockMiddleware1, mockMiddleware2];

      const result = withMiddleware(chain);

      expect(result).toHaveProperty("preHandler");
      expect(Array.isArray(result.preHandler)).toBe(true);
    });

    it("should return the middleware chain in the preHandler property", () => {
      const chain = [mockMiddleware1, mockMiddleware2, mockMiddleware3];

      const result = withMiddleware(chain);

      expect(result.preHandler).toEqual(chain);
      expect(result.preHandler).toHaveLength(3);
      expect(result.preHandler[0]).toBe(mockMiddleware1);
      expect(result.preHandler[1]).toBe(mockMiddleware2);
      expect(result.preHandler[2]).toBe(mockMiddleware3);
    });

    it("should handle empty middleware chain", () => {
      const result = withMiddleware([]);

      expect(result.preHandler).toEqual([]);
      expect(result.preHandler).toHaveLength(0);
    });

    it("should handle single middleware", () => {
      const result = withMiddleware([mockMiddleware1]);

      expect(result.preHandler).toEqual([mockMiddleware1]);
      expect(result.preHandler).toHaveLength(1);
    });

    it("should be compatible with Fastify route config", () => {
      const chain = [mockMiddleware1, mockMiddleware2];
      const result = withMiddleware(chain);

      // Simulate Fastify route config
      const routeConfig = {
        method: "GET",
        url: "/test",
        ...result,
        handler: vi.fn(),
      };

      expect(routeConfig).toHaveProperty("preHandler");
      expect(routeConfig.preHandler).toEqual(chain);
    });
  });

  describe("Type Exports", () => {
    it("should have JwtUserPayload type available", () => {
      // Type assertion test - will fail at compile time if type doesn't exist
      const payload: JwtUserPayload = {
        sub: "user-123",
        email: "test@test.com",
        role: "user",
      };

      expect(payload).toBeDefined();
      expect(payload.sub).toBe("user-123");
      expect(payload.email).toBe("test@test.com");
      expect(payload.role).toBe("user");
    });

    it("should have ClientType type available", () => {
      // Type assertion test - will fail at compile time if type doesn't exist
      const webClient: ClientType = "web";
      const mobileClient: ClientType = "mobile";
      const desktopClient: ClientType = "desktop";
      const unknownClient: ClientType = "unknown";

      expect(webClient).toBe("web");
      expect(mobileClient).toBe("mobile");
      expect(desktopClient).toBe("desktop");
      expect(unknownClient).toBe("unknown");
    });

    it("should have ErrorResponse type available", () => {
      // Type assertion test - will fail at compile time if type doesn't exist
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message: "Invalid input",
        statusCode: 400,
      };

      expect(errorResponse).toBeDefined();
      expect(errorResponse.error).toBe("Bad Request");
      expect(errorResponse.message).toBe("Invalid input");
      expect(errorResponse.statusCode).toBe(400);
    });
  });
});

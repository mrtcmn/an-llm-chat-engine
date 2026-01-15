import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReply, createMockRequest } from "../mocks/fastify.mock";

// Mock @config/constants
vi.mock("@config/constants", () => ({
  REQUEST: {
    CORRELATION_ID_HEADER: "x-correlation-id",
    REQUEST_ID_HEADER: "x-request-id",
  },
}));

import { requestContextMiddleware } from "../../middleware/request-context.middleware";

describe("requestContextMiddleware", () => {
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = createMockRequest();
    mockReply = createMockReply();
    mockReq.id = "req-abc123";
    mockReq.headers = {};
  });

  describe("correlation ID handling", () => {
    it("should extract correlation ID from header", async () => {
      mockReq.headers["x-correlation-id"] = "corr-xyz789";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.correlationId).toBe("corr-xyz789");
    });

    it("should use request ID as fallback when no correlation header", async () => {
      mockReq.id = "req-fallback-123";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.correlationId).toBe("req-fallback-123");
    });

    it("should prefer correlation header over request ID", async () => {
      mockReq.id = "req-id-456";
      mockReq.headers["x-correlation-id"] = "corr-preferred";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.correlationId).toBe("corr-preferred");
    });
  });

  describe("response header binding", () => {
    it("should set x-request-id header on response", async () => {
      mockReq.id = "req-header-test";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReply.header).toHaveBeenCalledWith(
        "x-request-id",
        "req-header-test"
      );
    });

    it("should set x-correlation-id header on response", async () => {
      mockReq.headers["x-correlation-id"] = "corr-header-test";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReply.header).toHaveBeenCalledWith(
        "x-correlation-id",
        "corr-header-test"
      );
    });

    it("should set both headers when correlation ID from header", async () => {
      mockReq.id = "req-both";
      mockReq.headers["x-correlation-id"] = "corr-both";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReply.header).toHaveBeenCalledWith("x-request-id", "req-both");
      expect(mockReply.header).toHaveBeenCalledWith(
        "x-correlation-id",
        "corr-both"
      );
    });

    it("should use request ID for correlation header when no incoming correlation", async () => {
      mockReq.id = "req-as-corr";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReply.header).toHaveBeenCalledWith(
        "x-correlation-id",
        "req-as-corr"
      );
    });
  });

  describe("logging", () => {
    it("should log debug message with request and correlation IDs", async () => {
      mockReq.id = "req-log-test";
      mockReq.headers["x-correlation-id"] = "corr-log-test";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        "[Middleware] RequestContext: context initialized",
        { requestId: "req-log-test", correlationId: "corr-log-test" }
      );
    });

    it("should log same ID for both when no correlation header", async () => {
      mockReq.id = "same-id";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        "[Middleware] RequestContext: context initialized",
        { requestId: "same-id", correlationId: "same-id" }
      );
    });
  });

  describe("request decoration", () => {
    it("should attach correlationId to request object", async () => {
      mockReq.headers["x-correlation-id"] = "attached-corr";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.correlationId).toBeDefined();
      expect(mockReq.correlationId).toBe("attached-corr");
    });

    it("should make correlationId available for downstream handlers", async () => {
      mockReq.id = "downstream-test";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      // Simulate downstream access
      const correlationIdFromReq = mockReq.correlationId;
      expect(correlationIdFromReq).toBe("downstream-test");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string correlation header", async () => {
      mockReq.id = "fallback-empty";
      mockReq.headers["x-correlation-id"] = "";

      await requestContextMiddleware(mockReq as any, mockReply as any);

      // Empty string is falsy, so should fall back to request ID
      expect(mockReq.correlationId).toBe("fallback-empty");
    });

    it("should handle UUID format correlation IDs", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      mockReq.headers["x-correlation-id"] = uuid;

      await requestContextMiddleware(mockReq as any, mockReply as any);

      expect(mockReq.correlationId).toBe(uuid);
    });
  });
});

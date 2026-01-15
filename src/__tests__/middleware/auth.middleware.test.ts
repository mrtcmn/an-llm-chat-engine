import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware } from "../../middleware/auth.middleware";
import { createMockReply, createMockRequest } from "../mocks/fastify.mock";

describe("authMiddleware", () => {
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockReply = createMockReply();
  });

  it("should call jwtVerify on request", async () => {
    mockReq.jwtVerify = vi.fn().mockResolvedValue(undefined);
    mockReq.user = { sub: "user-123", email: "test@test.com", role: "user" };

    await authMiddleware(mockReq as any, mockReply as any);

    expect(mockReq.jwtVerify).toHaveBeenCalled();
  });

  it("should log success when user is authenticated", async () => {
    mockReq.jwtVerify = vi.fn().mockResolvedValue(undefined);
    mockReq.user = { sub: "user-123", email: "test@test.com", role: "user" };

    await authMiddleware(mockReq as any, mockReply as any);

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      "[Middleware] Auth: user authenticated",
      { userId: "user-123" }
    );
  });

  it("should return 401 when jwtVerify throws", async () => {
    mockReq.jwtVerify = vi.fn().mockRejectedValue(new Error("Invalid token"));

    await authMiddleware(mockReq as any, mockReply as any);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Invalid or expired token",
      statusCode: 401,
    });
  });

  it("should log warning when verification fails", async () => {
    mockReq.jwtVerify = vi.fn().mockRejectedValue(new Error("Token expired"));

    await authMiddleware(mockReq as any, mockReply as any);

    expect(mockReq.logger.warn).toHaveBeenCalledWith(
      "[Middleware] Auth: verification failed",
      { error: "Token expired" }
    );
  });

  it("should handle user with admin role", async () => {
    mockReq.jwtVerify = vi.fn().mockResolvedValue(undefined);
    mockReq.user = { sub: "admin-123", email: "admin@test.com", role: "admin" };

    await authMiddleware(mockReq as any, mockReply as any);

    expect(mockReq.logger.debug).toHaveBeenCalledWith(
      "[Middleware] Auth: user authenticated",
      { userId: "admin-123" }
    );
  });

  it("should not send response on successful auth", async () => {
    mockReq.jwtVerify = vi.fn().mockResolvedValue(undefined);
    mockReq.user = { sub: "user-123", email: "test@test.com", role: "user" };

    await authMiddleware(mockReq as any, mockReply as any);

    expect(mockReply.send).not.toHaveBeenCalled();
    expect(mockReply.status).not.toHaveBeenCalled();
  });
});

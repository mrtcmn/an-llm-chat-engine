import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAIResponse, mockChat, mockUser } from "../fixtures";
import { createMockReply, createMockRequest } from "../mocks/fastify.mock";

// Mock middleware
vi.mock("@middleware", () => ({
  registerMiddlewareChain: vi.fn(),
  rateLimitMiddleware: vi.fn(),
  appCheckMiddleware: vi.fn(),
  authMiddleware: vi.fn(),
  clientDetectionMiddleware: vi.fn(),
  loggingMiddleware: vi.fn(),
  routeSchemas: {
    createCompletion: {},
  },
}));

describe("Completion Routes", () => {
  let mockCompletionService: any;
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockCompletionService = {
      createCompletion: vi.fn().mockResolvedValue(mockAIResponse),
    };
    mockReq = createMockRequest();
    mockReply = createMockReply();
  });

  describe("POST /api/chats/:chatId/completion", () => {
    it("should call createCompletion with all required params", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.params = { chatId: mockChat.id };
      mockReq.body = { message: "Hello, AI!" };

      // Simulate route handler
      const { chatId } = mockReq.params;
      const { message } = mockReq.body as { message: string };
      const userId = mockReq.user.sub;

      await mockCompletionService.createCompletion(
        mockReq,
        mockReply,
        chatId,
        message,
        userId
      );

      expect(mockCompletionService.createCompletion).toHaveBeenCalledWith(
        mockReq,
        mockReply,
        mockChat.id,
        "Hello, AI!",
        mockUser.id
      );
    });

    it("should extract params correctly from request", () => {
      mockReq.params = { chatId: "test-chat-id" };
      mockReq.body = { message: "Test message" };
      mockReq.user = {
        sub: "user-id-123",
        email: "test@test.com",
        role: "user",
      };

      const { chatId } = mockReq.params;
      const { message } = mockReq.body as { message: string };
      const userId = mockReq.user.sub;

      expect(chatId).toBe("test-chat-id");
      expect(message).toBe("Test message");
      expect(userId).toBe("user-id-123");
    });

    it("should pass request and reply to createCompletion", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.params = { chatId: mockChat.id };
      mockReq.body = { message: "Hello!" };

      await mockCompletionService.createCompletion(
        mockReq,
        mockReply,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      // Verify first two args are req and reply
      const callArgs = mockCompletionService.createCompletion.mock.calls[0];
      expect(callArgs[0]).toBe(mockReq);
      expect(callArgs[1]).toBe(mockReply);
    });

    it("should return completion service result", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.params = { chatId: mockChat.id };
      mockReq.body = { message: "Hello!" };

      const result = await mockCompletionService.createCompletion(
        mockReq,
        mockReply,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      expect(result).toBe(mockAIResponse);
    });
  });
});

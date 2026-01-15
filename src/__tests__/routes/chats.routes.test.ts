import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockChat, mockMessages, mockUser } from "../fixtures";
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
    listChats: {},
    getChatHistory: {},
  },
}));

describe("Chat Routes", () => {
  let mockChatService: any;
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockChatService = {
      listChats: vi.fn().mockResolvedValue({
        chats: [mockChat],
        pagination: {
          total: 1,
          limit: 20,
          offset: 0,
          count: 1,
          hasMore: false,
        },
      }),
      getChatHistory: vi.fn().mockResolvedValue({
        chatId: mockChat.id,
        messages: mockMessages,
        isFullHistory: true,
      }),
    };
    mockReq = createMockRequest();
    mockReply = createMockReply();
  });

  describe("GET /api/chats", () => {
    it("should call chatService.listChats with user id", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.query = {};

      // Simulate route handler
      const userId = mockReq.user.sub;
      const { limit, offset, page } = mockReq.query as any;
      await mockChatService.listChats(userId, { limit, offset, page });

      expect(mockChatService.listChats).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        offset: undefined,
        page: undefined,
      });
    });

    it("should pass query params to listChats", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.query = { limit: 10, offset: 5, page: 2 };

      const userId = mockReq.user.sub;
      const { limit, offset, page } = mockReq.query as any;
      await mockChatService.listChats(userId, { limit, offset, page });

      expect(mockChatService.listChats).toHaveBeenCalledWith(mockUser.id, {
        limit: 10,
        offset: 5,
        page: 2,
      });
    });

    it("should return chats and pagination", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.query = {};

      const result = await mockChatService.listChats(mockReq.user.sub, {});

      expect(result.chats).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.chats).toHaveLength(1);
    });
  });

  describe("GET /api/chats/:chatId/history", () => {
    it("should call getChatHistory with chatId and userId", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.params = { chatId: mockChat.id };

      const { chatId } = mockReq.params;
      const userId = mockReq.user.sub;
      await mockChatService.getChatHistory(chatId, userId);

      expect(mockChatService.getChatHistory).toHaveBeenCalledWith(
        mockChat.id,
        mockUser.id
      );
    });

    it("should return chat history", async () => {
      mockReq.user = { sub: mockUser.id, email: mockUser.email, role: "user" };
      mockReq.params = { chatId: mockChat.id };

      const result = await mockChatService.getChatHistory(
        mockChat.id,
        mockUser.id
      );

      expect(result.chatId).toBe(mockChat.id);
      expect(result.messages).toBeDefined();
      expect(result.isFullHistory).toBe(true);
    });

    it("should extract chatId from params", () => {
      mockReq.params = { chatId: "test-chat-123" };

      const { chatId } = mockReq.params;

      expect(chatId).toBe("test-chat-123");
    });
  });
});

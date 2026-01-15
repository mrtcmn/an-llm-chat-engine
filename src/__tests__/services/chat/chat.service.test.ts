import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatService } from "../../../services/chat/chat.service";
import {
  mockChat,
  mockChat2,
  mockChatOwnedByUser2,
  mockMessages,
  mockUser,
} from "../../fixtures";
import {
  createMockConfigService,
  type MockConfigService,
} from "../../mocks/config.mock";

// Mock ChatRepository
function createMockChatRepo() {
  return {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  };
}

// Mock MessageRepository
function createMockMessageRepo() {
  return {
    findByChatId: vi.fn(),
    create: vi.fn(),
  };
}

describe("ChatService", () => {
  let chatService: ChatService;
  let mockChatRepo: ReturnType<typeof createMockChatRepo>;
  let mockMessageRepo: ReturnType<typeof createMockMessageRepo>;
  let mockConfig: MockConfigService;

  beforeEach(() => {
    mockChatRepo = createMockChatRepo();
    mockMessageRepo = createMockMessageRepo();
    mockConfig = createMockConfigService();

    chatService = new ChatService(
      mockChatRepo as any,
      mockMessageRepo as any,
      mockConfig as any
    );
  });

  describe("listChats", () => {
    it("should return paginated chats with metadata", async () => {
      mockChatRepo.findByUserId.mockResolvedValue({
        chats: [mockChat, mockChat2],
        total: 50,
      });
      mockConfig.getFeatureFlag.mockReturnValue(20);

      const result = await chatService.listChats(mockUser.id);

      expect(result.chats).toHaveLength(2);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.hasMore).toBe(true);
    });

    it("should clamp limit to feature flag max", async () => {
      mockChatRepo.findByUserId.mockResolvedValue({ chats: [], total: 0 });
      mockConfig.getFeatureFlag.mockReturnValue(20);

      await chatService.listChats(mockUser.id, { limit: 100 });

      expect(mockChatRepo.findByUserId).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ limit: 20 })
      );
    });

    it("should calculate offset from page number", async () => {
      mockChatRepo.findByUserId.mockResolvedValue({ chats: [], total: 100 });
      mockConfig.getFeatureFlag.mockReturnValue(20);

      await chatService.listChats(mockUser.id, { page: 3 });

      expect(mockChatRepo.findByUserId).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ offset: 40 }) // (3-1) * 20
      );
    });

    it("should return hasMore false when at end", async () => {
      mockChatRepo.findByUserId.mockResolvedValue({
        chats: [mockChat],
        total: 1,
      });
      mockConfig.getFeatureFlag.mockReturnValue(20);

      const result = await chatService.listChats(mockUser.id);

      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextOffset).toBeNull();
    });
  });

  describe("getChatHistory", () => {
    it("should return messages for valid chat", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockMessageRepo.findByChatId.mockResolvedValue(mockMessages);
      mockConfig.getFeatureFlag.mockReturnValue(true);

      const result = await chatService.getChatHistory(mockChat.id, mockUser.id);

      expect(result.chatId).toBe(mockChat.id);
      expect(result.messages).toEqual(
        mockMessages.map((msg) => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
        }))
      );
      expect(result.isFullHistory).toBe(true);
    });

    it("should throw 404 if chat not found", async () => {
      mockChatRepo.findById.mockResolvedValue(null);

      await expect(
        chatService.getChatHistory("non-existent", mockUser.id)
      ).rejects.toThrow("Chat not found");
    });

    it("should throw 403 if user does not own chat", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChatOwnedByUser2);

      await expect(
        chatService.getChatHistory(mockChatOwnedByUser2.id, mockUser.id)
      ).rejects.toThrow("Access denied");
    });

    it("should limit messages when feature flag is false", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockMessageRepo.findByChatId.mockResolvedValue(mockMessages.slice(0, 2));
      mockConfig.getFeatureFlag.mockReturnValue(false);

      await chatService.getChatHistory(mockChat.id, mockUser.id);

      expect(mockMessageRepo.findByChatId).toHaveBeenCalledWith(mockChat.id, {
        limit: 10,
      });
    });

    it("should return full history when flag is true", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChat);
      mockMessageRepo.findByChatId.mockResolvedValue(mockMessages);
      mockConfig.getFeatureFlag.mockReturnValue(true);

      const result = await chatService.getChatHistory(mockChat.id, mockUser.id);

      expect(mockMessageRepo.findByChatId).toHaveBeenCalledWith(mockChat.id);
      expect(result.isFullHistory).toBe(true);
    });
  });

  describe("verifyUserOwnsChat", () => {
    it("should return true when user owns chat", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChat);

      const result = await chatService.verifyUserOwnsChat(
        mockChat.id,
        mockUser.id
      );

      expect(result).toBe(true);
    });

    it("should return false when user does not own chat", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChatOwnedByUser2);

      const result = await chatService.verifyUserOwnsChat(
        mockChatOwnedByUser2.id,
        mockUser.id
      );

      expect(result).toBe(false);
    });

    it("should return false when chat does not exist", async () => {
      mockChatRepo.findById.mockResolvedValue(null);

      const result = await chatService.verifyUserOwnsChat(
        "non-existent",
        mockUser.id
      );

      expect(result).toBe(false);
    });
  });

  describe("getOrCreateChat", () => {
    it("should return existing chat", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChat);

      const result = await chatService.getOrCreateChat(
        mockChat.id,
        mockUser.id
      );

      expect(result).toBe(mockChat);
      expect(mockChatRepo.upsert).not.toHaveBeenCalled();
    });

    it("should create new chat if not exists", async () => {
      mockChatRepo.findById.mockResolvedValue(null);
      mockChatRepo.upsert.mockResolvedValue(mockChat);

      const result = await chatService.getOrCreateChat(
        mockChat.id,
        mockUser.id,
        "New Chat"
      );

      expect(mockChatRepo.upsert).toHaveBeenCalledWith({
        id: mockChat.id,
        userId: mockUser.id,
        title: "New Chat",
      });
      expect(result).toBe(mockChat);
    });

    it("should use default title when not provided", async () => {
      mockChatRepo.findById.mockResolvedValue(null);
      mockChatRepo.upsert.mockResolvedValue(mockChat);

      await chatService.getOrCreateChat(mockChat.id, mockUser.id);

      expect(mockChatRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Chat" })
      );
    });

    it("should throw 403 if existing chat belongs to another user", async () => {
      mockChatRepo.findById.mockResolvedValue(mockChatOwnedByUser2);

      await expect(
        chatService.getOrCreateChat(mockChatOwnedByUser2.id, mockUser.id)
      ).rejects.toThrow("Access denied");
    });
  });

  describe("createChat", () => {
    it("should create chat with provided data", async () => {
      const newChat = { ...mockChat, id: "new-chat-id" };
      mockChatRepo.create.mockResolvedValue(newChat);

      const result = await chatService.createChat(mockUser.id, "My New Chat");

      expect(mockChatRepo.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        title: "My New Chat",
      });
      expect(result).toBe(newChat);
    });
  });
});

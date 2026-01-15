import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompletionService } from "../../../services/chat/completion.service";
import { mockChat, mockMessages, mockUser } from "../../fixtures";
import {
  createMockConfigService,
  type MockConfigService,
} from "../../mocks/config.mock";
import { createMockReply, createMockRequest } from "../../mocks/fastify.mock";

// Mock ChatService
function createMockChatService() {
  return {
    getOrCreateChat: vi.fn().mockResolvedValue(mockChat),
    getChatHistory: vi.fn(),
    listChats: vi.fn(),
    verifyUserOwnsChat: vi.fn(),
    createChat: vi.fn(),
  };
}

// Mock MessageRepository
function createMockMessageRepo() {
  return {
    findByChatId: vi.fn().mockResolvedValue(mockMessages),
    create: vi
      .fn()
      .mockResolvedValue({
        id: "new-msg",
        chatId: mockChat.id,
        role: "user",
        content: "test",
      }),
  };
}

// Mock ResponseStrategyPlugin
function createMockResponseStrategy() {
  return {
    execute: vi
      .fn()
      .mockResolvedValue({ content: "AI response", role: "assistant" }),
  };
}

describe("CompletionService", () => {
  let completionService: CompletionService;
  let mockChatService: ReturnType<typeof createMockChatService>;
  let mockMessageRepo: ReturnType<typeof createMockMessageRepo>;
  let mockConfig: MockConfigService;
  let mockResponseStrategy: ReturnType<typeof createMockResponseStrategy>;
  let mockReq: ReturnType<typeof createMockRequest>;
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockChatService = createMockChatService();
    mockMessageRepo = createMockMessageRepo();
    mockConfig = createMockConfigService();
    mockResponseStrategy = createMockResponseStrategy();
    mockReq = createMockRequest();
    mockReply = createMockReply();

    completionService = new CompletionService(
      mockChatService as any,
      mockMessageRepo as any,
      mockConfig as any,
      mockResponseStrategy as any
    );
  });

  describe("createCompletion", () => {
    it("should throw error on empty message", async () => {
      await expect(
        completionService.createCompletion(
          mockReq as any,
          mockReply as any,
          mockChat.id,
          "",
          mockUser.id
        )
      ).rejects.toThrow("Message cannot be empty");
    });

    it("should throw error on whitespace-only message", async () => {
      await expect(
        completionService.createCompletion(
          mockReq as any,
          mockReply as any,
          mockChat.id,
          "   ",
          mockUser.id
        )
      ).rejects.toThrow("Message cannot be empty");
    });

    it("should call getOrCreateChat", async () => {
      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      expect(mockChatService.getOrCreateChat).toHaveBeenCalledWith(
        mockChat.id,
        mockUser.id
      );
    });

    it("should create user message in database", async () => {
      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "Hello world!",
        mockUser.id
      );

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        chatId: mockChat.id,
        role: "user",
        content: "Hello world!",
      });
    });

    it("should fetch chat history", async () => {
      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      expect(mockMessageRepo.findByChatId).toHaveBeenCalledWith(mockChat.id);
    });

    it("should build message array with system prompt", async () => {
      mockMessageRepo.findByChatId.mockResolvedValue([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]);

      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "How are you?",
        mockUser.id
      );

      expect(mockResponseStrategy.execute).toHaveBeenCalledWith(
        mockReq,
        mockReply,
        mockChat.id,
        expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user", content: "Hello" }),
          expect.objectContaining({ role: "assistant", content: "Hi there!" }),
        ]),
        expect.any(Object)
      );
    });

    it("should delegate to response strategy", async () => {
      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      expect(mockResponseStrategy.execute).toHaveBeenCalled();
    });

    it("should pass AI options with tools flag", async () => {
      mockConfig.getFeatureFlag
        .mockReturnValueOnce(true) // streamingEnabled
        .mockReturnValueOnce(true) // aiToolsEnabled
        .mockReturnValueOnce(true); // chatHistoryEnabled

      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      expect(mockResponseStrategy.execute).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ tools: true })
      );
    });

    it("should pass tools: false when aiToolsEnabled is false", async () => {
      mockConfig.getFeatureFlag
        .mockReturnValueOnce(true) // streamingEnabled
        .mockReturnValueOnce(false) // aiToolsEnabled
        .mockReturnValueOnce(true); // chatHistoryEnabled

      await completionService.createCompletion(
        mockReq as any,
        mockReply as any,
        mockChat.id,
        "Hello!",
        mockUser.id
      );

      expect(mockResponseStrategy.execute).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ tools: false })
      );
    });
  });
});

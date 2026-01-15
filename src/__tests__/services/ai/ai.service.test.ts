import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AIMessage,
  AIProvider,
  AIResponse,
  StreamChunk,
} from "../../../services/ai/ai.types";

// Mock logger
vi.mock("@utils/logger", () => ({
  LoggerService: {
    getInstance: vi.fn().mockReturnValue({
      forService: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
    }),
  },
}));

import { AIService } from "../../../services/ai/ai.service";

function createMockProvider(name = "openai"): AIProvider {
  return {
    name,
    complete: vi.fn().mockResolvedValue({
      content: "Mock response",
      role: "assistant",
      toolCalls: [],
    } as AIResponse),
    stream: vi.fn().mockImplementation(async function* () {
      yield { type: "start" } as StreamChunk;
      yield { type: "content", content: "Mock " } as StreamChunk;
      yield { type: "content", content: "response" } as StreamChunk;
      yield { type: "done" } as StreamChunk;
    }),
  };
}

describe("AIService", () => {
  let mockProvider: AIProvider;
  let mockProvider2: AIProvider;
  let originalInstance: AIService | undefined;

  beforeEach(() => {
    // Save and clear singleton
    originalInstance = (AIService as any).instance;
    (AIService as any).instance = undefined;

    mockProvider = createMockProvider("openai");
    mockProvider2 = createMockProvider("anthropic");
  });

  afterEach(() => {
    // Restore singleton
    (AIService as any).instance = originalInstance;
  });

  describe("constructor", () => {
    it("should require at least one provider", () => {
      expect(() => new AIService([])).toThrow(
        "AIService requires at least one provider"
      );
    });

    it("should initialize with providers", () => {
      const service = new AIService([mockProvider]);

      expect(service.getProviderNames()).toEqual(["openai"]);
    });

    it("should accept multiple providers", () => {
      const service = new AIService([mockProvider, mockProvider2]);

      expect(service.getProviderNames()).toEqual(["openai", "anthropic"]);
    });
  });

  describe("initialize", () => {
    it("should create singleton instance", () => {
      const instance = AIService.initialize([mockProvider]);

      expect(instance).toBeInstanceOf(AIService);
    });

    it("should return existing instance on subsequent calls", () => {
      const instance1 = AIService.initialize([mockProvider]);
      const instance2 = AIService.initialize([mockProvider2]);

      expect(instance1).toBe(instance2);
    });
  });

  describe("getInstance", () => {
    it("should return instance after initialization", () => {
      AIService.initialize([mockProvider]);

      const instance = AIService.getInstance();

      expect(instance).toBeInstanceOf(AIService);
    });

    it("should throw if not initialized", () => {
      expect(() => AIService.getInstance()).toThrow(
        "AIService not initialized. Register ai-plugin first."
      );
    });
  });

  describe("getProvider", () => {
    it("should find provider by name", () => {
      const service = new AIService([mockProvider, mockProvider2]);

      const provider = service.getProvider("anthropic");

      expect(provider).toBe(mockProvider2);
    });

    it("should return undefined for unknown provider", () => {
      const service = new AIService([mockProvider]);

      const provider = service.getProvider("unknown");

      expect(provider).toBeUndefined();
    });
  });

  describe("getProviderNames", () => {
    it("should return all provider names", () => {
      const service = new AIService([mockProvider, mockProvider2]);

      const names = service.getProviderNames();

      expect(names).toEqual(["openai", "anthropic"]);
    });
  });

  describe("complete", () => {
    it("should delegate to primary provider", async () => {
      const service = new AIService([mockProvider, mockProvider2]);
      const messages: AIMessage[] = [{ role: "user", content: "Hello" }];

      const result = await service.complete(messages);

      expect(mockProvider.complete).toHaveBeenCalledWith(messages, {});
      expect(mockProvider2.complete).not.toHaveBeenCalled();
      expect(result.content).toBe("Mock response");
    });

    it("should pass options to provider", async () => {
      const service = new AIService([mockProvider]);
      const messages: AIMessage[] = [{ role: "user", content: "Hello" }];
      const options = { model: "gpt-4", temperature: 0.7 };

      await service.complete(messages, options);

      expect(mockProvider.complete).toHaveBeenCalledWith(messages, options);
    });

    it("should log and rethrow errors", async () => {
      const service = new AIService([mockProvider]);
      const error = new Error("API Error");
      (mockProvider.complete as ReturnType<typeof vi.fn>).mockRejectedValue(
        error
      );

      await expect(
        service.complete([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("API Error");
    });
  });

  describe("stream", () => {
    it("should delegate to primary provider", async () => {
      const service = new AIService([mockProvider, mockProvider2]);
      const messages: AIMessage[] = [{ role: "user", content: "Hello" }];

      const chunks: StreamChunk[] = [];
      for await (const chunk of service.stream(messages)) {
        chunks.push(chunk);
      }

      expect(mockProvider.stream).toHaveBeenCalledWith(messages, {});
      expect(mockProvider2.stream).not.toHaveBeenCalled();
      expect(chunks).toHaveLength(4);
      expect(chunks[0].type).toBe("start");
      expect(chunks[chunks.length - 1].type).toBe("done");
    });

    it("should pass options to provider", async () => {
      const service = new AIService([mockProvider]);
      const messages: AIMessage[] = [{ role: "user", content: "Hello" }];
      const options = { model: "gpt-4", tools: true };

      // Consume the generator
      for await (const _ of service.stream(messages, options)) {
        // consume
      }

      expect(mockProvider.stream).toHaveBeenCalledWith(messages, options);
    });

    it("should log and rethrow errors", async () => {
      const service = new AIService([mockProvider]);
      const error = new Error("Stream Error");
      (mockProvider.stream as ReturnType<typeof vi.fn>).mockImplementation(
        async function* () {
          throw error;
        }
      );

      const generator = service.stream([{ role: "user", content: "Hello" }]);

      await expect(generator.next()).rejects.toThrow("Stream Error");
    });
  });
});

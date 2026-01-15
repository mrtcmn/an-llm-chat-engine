import { LoggerService } from "@utils/logger";
import type {
  AICompletionOptions,
  AIMessage,
  AIProvider,
  AIResponse,
  StreamChunk,
} from "./ai.types";

/**
 * AI Service
 * Manages AI completions with multi-provider support via DI
 * Currently uses first provider (primary), future: failover support
 */
export class AIService {
  private static instance: AIService;
  private providers: AIProvider[];
  private logger = LoggerService.getInstance().forService("AIService");

  constructor(providers: AIProvider[]) {
    if (providers.length === 0) {
      throw new Error("AIService requires at least one provider");
    }
    this.providers = providers;
    this.logger.info("AIService initialized", {
      providerCount: providers.length,
      providers: providers.map((p) => p.name),
    });
  }

  /**
   * Initialize singleton with providers (called by plugin)
   */
  static initialize(providers: AIProvider[]): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService(providers);
    }
    return AIService.instance;
  }

  /**
   * Get singleton instance (for use outside Fastify context if needed)
   */
  static getInstance(): AIService {
    if (!AIService.instance) {
      throw new Error("AIService not initialized. Register ai-plugin first.");
    }
    return AIService.instance;
  }

  /**
   * Get primary provider (first in array)
   */
  private getPrimaryProvider(): AIProvider {
    return this.providers[0];
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  /**
   * Get all provider names
   */
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }

  /**
   * Non-streaming completion using primary provider
   */
  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    const provider = this.getPrimaryProvider();

    try {
      return await provider.complete(messages, options);
    } catch (error) {
      this.logger.error(
        "AI completion failed at service level",
        error as Error,
        {
          provider: provider.name,
          model: options.model || "default",
          messageCount: messages.length,
        }
      );
      throw error;
    }
  }

  /**
   * Streaming completion using primary provider
   */
  async *stream(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const provider = this.getPrimaryProvider();

    try {
      yield* provider.stream(messages, options);
    } catch (error) {
      this.logger.error("AI stream failed at service level", error as Error, {
        provider: provider.name,
        model: options.model || "default",
        messageCount: messages.length,
      });
      throw error;
    }
  }
}

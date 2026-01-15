import { vi } from "vitest";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: boolean;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface AIResponse {
  content: string;
  role: "assistant";
  toolCalls?: ToolCall[];
}

export interface StreamChunk {
  type:
    | "start"
    | "content"
    | "tool_call"
    | "tool_result"
    | "done"
    | "error"
    | "step_start"
    | "step_finish"
    | "reasoning";
  content?: string;
  reasoning?: string;
  toolCall?: Partial<ToolCall>;
  error?: string;
  stepInfo?: {
    stepType?: "initial" | "continue" | "tool-result";
    finishReason?:
      | "stop"
      | "length"
      | "content-filter"
      | "tool-calls"
      | "error"
      | "other";
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

export interface MockGenerateTextResult {
  text: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
  toolResults: Array<{
    toolName: string;
    result: unknown;
  }>;
}

export interface MockStreamTextResult {
  fullStream: AsyncGenerator<MockStreamEvent>;
  text: Promise<string>;
}

export interface MockStreamEvent {
  type:
    | "text-delta"
    | "tool-call"
    | "tool-result"
    | "step-start"
    | "step-finish"
    | "reasoning";
  textDelta?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  delta?: string;
}

export function createMockGenerateText(
  result?: Partial<MockGenerateTextResult>
) {
  const defaultResult: MockGenerateTextResult = {
    text: "This is a mock AI response",
    toolCalls: [],
    toolResults: [],
    ...result,
  };

  return vi.fn().mockResolvedValue(defaultResult);
}

export function createMockStreamText(chunks?: MockStreamEvent[]) {
  const defaultChunks: MockStreamEvent[] = chunks || [
    { type: "text-delta", textDelta: "Hello" },
    { type: "text-delta", textDelta: " world" },
    { type: "text-delta", textDelta: "!" },
  ];

  async function* createAsyncGenerator(): AsyncGenerator<MockStreamEvent> {
    for (const chunk of defaultChunks) {
      yield chunk;
    }
  }

  return vi.fn().mockResolvedValue({
    fullStream: createAsyncGenerator(),
    text: Promise.resolve(
      defaultChunks
        .filter((c) => c.type === "text-delta")
        .map((c) => c.textDelta)
        .join("")
    ),
  });
}

export function createMockOpenAI() {
  return vi.fn().mockReturnValue({
    chat: vi.fn(),
  });
}

export interface MockAIProvider {
  name: string;
  complete: ReturnType<typeof vi.fn>;
  stream: ReturnType<typeof vi.fn>;
}

export function createMockAIProvider(name = "openai"): MockAIProvider {
  return {
    name,
    complete: vi.fn().mockResolvedValue({
      content: "Mock AI response",
      role: "assistant",
      toolCalls: [],
    } as AIResponse),
    stream: vi.fn().mockImplementation(async function* () {
      yield { type: "start" } as StreamChunk;
      yield { type: "content", content: "Mock " } as StreamChunk;
      yield { type: "content", content: "streaming " } as StreamChunk;
      yield { type: "content", content: "response" } as StreamChunk;
      yield { type: "done" } as StreamChunk;
    }),
  };
}

export interface MockAIService {
  complete: ReturnType<typeof vi.fn>;
  stream: ReturnType<typeof vi.fn>;
  getProvider: ReturnType<typeof vi.fn>;
  getProviderNames: ReturnType<typeof vi.fn>;
}

export function createMockAIService(): MockAIService {
  const mockProvider = createMockAIProvider();

  return {
    complete: vi.fn().mockResolvedValue({
      content: "Mock AI response",
      role: "assistant",
      toolCalls: [],
    } as AIResponse),
    stream: vi.fn().mockImplementation(async function* () {
      yield { type: "start" } as StreamChunk;
      yield {
        type: "content",
        content: "Mock streaming response",
      } as StreamChunk;
      yield { type: "done" } as StreamChunk;
    }),
    getProvider: vi.fn().mockReturnValue(mockProvider),
    getProviderNames: vi.fn().mockReturnValue(["openai"]),
  };
}

export function resetMockAIProvider(mock: MockAIProvider): void {
  mock.complete.mockReset();
  mock.stream.mockReset();
}

export function resetMockAIService(mock: MockAIService): void {
  mock.complete.mockReset();
  mock.stream.mockReset();
  mock.getProvider.mockReset();
  mock.getProviderNames.mockReset();
}

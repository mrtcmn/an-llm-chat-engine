/**
 * AI Service Types
 * Core types for AI completion and streaming
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: boolean // Enable tool calling
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

export interface AIResponse {
  content: string
  role: 'assistant'
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
  result: unknown
}

export interface StreamChunk {
  type: 'start' | 'content' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'step_start' | 'step_finish' | 'reasoning'
  content?: string
  reasoning?: string // For reasoning-delta from models like o1/o3
  toolCall?: Partial<ToolCall>
  error?: string
  stepInfo?: {
    stepType?: 'initial' | 'continue' | 'tool-result'
    finishReason?: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown'
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }
}

/**
 * AI Provider Interface
 * All AI providers (OpenAI, Anthropic, etc.) must implement this interface
 */
export interface AIProvider {
  /** Provider name for identification */
  readonly name: string

  /** Non-streaming completion */
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<AIResponse>

  /** Streaming completion */
  stream(messages: AIMessage[], options?: AICompletionOptions): AsyncGenerator<StreamChunk>
}

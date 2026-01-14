import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import type { CoreMessage } from 'ai'
import type { AIMessage, AIResponse, StreamChunk, AICompletionOptions, ToolCall, AIProvider } from '../ai.types'
import { ToolRegistry } from '../tool-library'

const DEFAULT_MODEL = 'gpt-5-mini-2025-08-07'
const DEFAULT_MAX_COMPLETION_TOKENS = 2048

interface ToolCallResult {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

interface ToolResult {
  toolCallId: string
  toolName: string
  result: unknown
}

/**
 * OpenAI Provider
 * Implements AIProvider interface using Vercel AI SDK
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private openai: ReturnType<typeof createOpenAI>
  private toolRegistry: ToolRegistry

  constructor(apiKey: string) {
    this.openai = createOpenAI({ apiKey })
    this.toolRegistry = new ToolRegistry()
  }

  /**
   * Non-streaming completion using AI SDK generateText
   */
  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    const coreMessages = this.formatMessages(messages)
    const tools = options.tools ? this.toolRegistry.getTools() : undefined

    const result = await generateText({
      model: this.openai(options.model || DEFAULT_MODEL),
      messages: coreMessages,
      maxTokens: options.maxTokens ?? DEFAULT_MAX_COMPLETION_TOKENS,
      tools
    })

    // Map tool calls to our format
    const rawToolCalls = result.toolCalls as ToolCallResult[] | undefined
    const rawToolResults = result.toolResults as ToolResult[] | undefined

    const toolCalls: ToolCall[] = rawToolCalls?.map(tc => ({
      name: tc.toolName,
      arguments: tc.args,
      result: rawToolResults?.find(tr => tr.toolCallId === tc.toolCallId)?.result
    })) ?? []

    return {
      content: result.text,
      role: 'assistant',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  }

  /**
   * Streaming completion using AI SDK streamText
   */
  async *stream(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const coreMessages = this.formatMessages(messages)
    const tools = options.tools ? this.toolRegistry.getTools() : undefined

    yield { type: 'start' }

    const result = streamText({
      model: this.openai(options.model || DEFAULT_MODEL),
      messages: coreMessages,
      maxTokens: options.maxTokens ?? DEFAULT_MAX_COMPLETION_TOKENS,
      tools
    })

    // Stream text chunks
    for await (const chunk of result.textStream) {
      yield {
        type: 'content',
        content: chunk
      }
    }

    // Get tool calls and results (they are promises)
    const rawToolCalls = (await result.toolCalls) as ToolCallResult[]
    const rawToolResults = (await result.toolResults) as ToolResult[]

    // Emit tool calls if any
    if (rawToolCalls && rawToolCalls.length > 0) {
      for (const tc of rawToolCalls) {
        const toolResult = rawToolResults?.find(tr => tr.toolCallId === tc.toolCallId)

        yield {
          type: 'tool_call',
          toolCall: { name: tc.toolName }
        }

        if (toolResult) {
          yield {
            type: 'tool_result',
            toolCall: {
              name: tc.toolName,
              arguments: tc.args,
              result: toolResult.result
            }
          }
        }
      }
    }

    yield { type: 'done' }
  }

  /**
   * Format messages for AI SDK CoreMessage format
   */
  private formatMessages(messages: AIMessage[]): CoreMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }
}

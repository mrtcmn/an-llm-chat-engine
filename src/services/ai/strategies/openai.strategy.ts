import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import type { CoreMessage } from 'ai'
import type { AIMessage, AIResponse, StreamChunk, AICompletionOptions, ToolCall, AIProvider } from '../ai.types'
import { ToolRegistry } from '../tool-library'

const DEFAULT_MODEL = 'gpt-4o-mini' // Supports tool calling and streaming
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
   * Properly handles tool calls during streaming
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
      
      tools,
      maxSteps: 5,
      providerOptions: {
        openai: {
          reasoningSummary: 'detailed',
        },
      },
    })

    // Track tool calls for results later
    const toolCallsMap = new Map<string, { name: string; args: any }>()

    // Stream all parts (text and tool calls)
    for await (const part of result.fullStream) {
      console.log(part)
      switch (part.type) {
        case 'step-start':
          // Multi-step process started
          yield {
            type: 'step_start',
            stepInfo: {
              stepType: 'messageId' in part ? 'initial' : undefined
            }
          }
          break

        case 'step-finish':
          // Multi-step process finished
          yield {
            type: 'step_finish',
            stepInfo: {
              finishReason: part.finishReason,
              usage: part.usage ? {
                promptTokens: part.usage.promptTokens,
                completionTokens: part.usage.completionTokens,
                totalTokens: part.usage.totalTokens
              } : undefined
            }
          }
          break

        case 'text-delta':
          // Stream text content as it arrives
          yield {
            type: 'content',
            content: part.textDelta
          }
          break

        case 'reasoning':
          // Stream reasoning content (for o1/o3 models)
          if ('reasoning' in part && typeof part.reasoning === 'string') {
            yield {
              type: 'reasoning',
              reasoning: part.reasoning
            }
          }
          break

        case 'tool-call':
          // Emit and track tool call when it happens
          toolCallsMap.set(part.toolCallId, {
            name: part.toolName,
            args: part.args
          })
          
          yield {
            type: 'tool_call',
            toolCall: {
              name: part.toolName,
              arguments: part.args
            }
          }
          break

        case 'tool-call-delta':
          // Incremental tool call data (for streaming tool arguments)
          if ('argsTextDelta' in part && part.argsTextDelta) {
            yield {
              type: 'tool_call',
              toolCall: {
                name: part.toolName,
                arguments: part.argsTextDelta as any
              }
            }
          }
          break

        case 'error':
          // Error during streaming
          if ('error' in part) {
            yield {
              type: 'error',
              error: typeof part.error === 'string' ? part.error : 
                     (part.error as any)?.message || 'Unknown streaming error'
            }
          }
          break

        case 'finish':
          // Stream finished - get final tool results if any
          break

        default:
          // Ignore other event types (tool-result handled below after stream)
          break
      }
    }

    // After stream completes, get tool results
    if (toolCallsMap.size > 0) {
      try {
        const finalToolResults = (await result.toolResults) as ToolResult[]

        // Emit tool results
        for (const toolResult of finalToolResults) {
          const toolCall = toolCallsMap.get(toolResult.toolCallId)
          if (toolCall) {
            yield {
              type: 'tool_result',
              toolCall: {
                name: toolCall.name,
                arguments: toolCall.args,
                result: toolResult.result
              }
            }
          }
        }
      } catch (e) {
        // Tool results might not be available in all cases
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

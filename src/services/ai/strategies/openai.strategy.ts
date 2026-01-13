import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import type { AIMessage, AIResponse, StreamChunk, AICompletionOptions, ToolCall, AIProvider } from '../ai.types'
import { ToolRegistry } from '../tool-library'

const DEFAULT_MODEL = 'gpt-4.1'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 2048

/**
 * OpenAI Provider
 * Implements AIProvider interface using OpenAI's API with support for
 * regular and streaming responses, plus function calling
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private client: OpenAI
  private toolRegistry: ToolRegistry

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
    this.toolRegistry = new ToolRegistry()
  }

  /**
   * Non-streaming completion
   */
  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    const openAIMessages = this.formatMessages(messages)
    const tools = options.tools ? this.toolRegistry.getOpenAIToolDefinitions() : undefined

    const completion = await this.client.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages: openAIMessages,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      tools: tools as ChatCompletionTool[] | undefined
    })

    const choice = completion.choices[0]
    if (!choice) {
      throw new Error('No completion choice returned')
    }

    // Handle tool calls if present
    const toolCalls: ToolCall[] = []
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        // Only handle function-type tool calls
        if (toolCall.type !== 'function') continue

        const args = JSON.parse(toolCall.function.arguments)
        const result = await this.toolRegistry.execute(toolCall.function.name, args)
        toolCalls.push({
          name: toolCall.function.name,
          arguments: args,
          result
        })
      }

      // If tools were called, make a follow-up call with tool results
      if (toolCalls.length > 0) {
        return this.completeWithToolResults(openAIMessages, choice.message, toolCalls, options)
      }
    }

    return {
      content: choice.message.content || '',
      role: 'assistant',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  }

  /**
   * Continue completion after tool execution
   */
  private async completeWithToolResults(
    originalMessages: ChatCompletionMessageParam[],
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage,
    toolCalls: ToolCall[],
    options: AICompletionOptions
  ): Promise<AIResponse> {
    // Build messages with tool results
    const messagesWithTools: ChatCompletionMessageParam[] = [
      ...originalMessages,
      assistantMessage,
      ...toolCalls.map((tc, index) => ({
        role: 'tool' as const,
        tool_call_id: assistantMessage.tool_calls![index].id,
        content: JSON.stringify(tc.result)
      }))
    ]

    const followUp = await this.client.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages: messagesWithTools,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS
    })

    const followUpChoice = followUp.choices[0]
    return {
      content: followUpChoice?.message.content || '',
      role: 'assistant',
      toolCalls
    }
  }

  /**
   * Streaming completion with SSE events
   */
  async *stream(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const openAIMessages = this.formatMessages(messages)
    const tools = options.tools ? this.toolRegistry.getOpenAIToolDefinitions() : undefined

    yield { type: 'start' }

    const stream = await this.client.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages: openAIMessages,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      tools: tools as ChatCompletionTool[] | undefined,
      stream: true
    })

    // Track tool calls being built across chunks
    const pendingToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()
    let fullContent = ''

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      // Handle content streaming
      if (delta?.content) {
        fullContent += delta.content
        yield {
          type: 'content',
          content: delta.content
        }
      }

      // Handle tool call streaming
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index

          if (!pendingToolCalls.has(index)) {
            pendingToolCalls.set(index, {
              id: toolCallDelta.id || '',
              name: toolCallDelta.function?.name || '',
              arguments: ''
            })
          }

          const pending = pendingToolCalls.get(index)!

          if (toolCallDelta.id) {
            pending.id = toolCallDelta.id
          }
          if (toolCallDelta.function?.name) {
            pending.name = toolCallDelta.function.name
            yield {
              type: 'tool_call',
              toolCall: { name: pending.name }
            }
          }
          if (toolCallDelta.function?.arguments) {
            pending.arguments += toolCallDelta.function.arguments
          }
        }
      }
    }

    // Execute any pending tool calls
    if (pendingToolCalls.size > 0) {
      const toolResults: ToolCall[] = []

      for (const [, pending] of pendingToolCalls) {
        try {
          const args = JSON.parse(pending.arguments)
          const result = await this.toolRegistry.execute(pending.name, args)

          const toolCall: ToolCall = {
            name: pending.name,
            arguments: args,
            result
          }
          toolResults.push(toolCall)

          yield {
            type: 'tool_result',
            toolCall
          }
        } catch (error) {
          yield {
            type: 'error',
            error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }

      // If tools were called, stream the follow-up response
      if (toolResults.length > 0) {
        yield* this.streamFollowUp(openAIMessages, pendingToolCalls, toolResults, options)
      }
    }

    yield { type: 'done' }
  }

  /**
   * Stream follow-up response after tool execution
   */
  private async *streamFollowUp(
    originalMessages: ChatCompletionMessageParam[],
    pendingToolCalls: Map<number, { id: string; name: string; arguments: string }>,
    toolResults: ToolCall[],
    options: AICompletionOptions
  ): AsyncGenerator<StreamChunk> {
    // Build assistant message with tool calls
    const assistantToolCalls = Array.from(pendingToolCalls.values()).map((tc, index) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.arguments
      }
    }))

    const messagesWithTools: ChatCompletionMessageParam[] = [
      ...originalMessages,
      {
        role: 'assistant' as const,
        content: null,
        tool_calls: assistantToolCalls
      },
      ...toolResults.map((tc, index) => ({
        role: 'tool' as const,
        tool_call_id: assistantToolCalls[index].id,
        content: JSON.stringify(tc.result)
      }))
    ]

    const followUpStream = await this.client.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages: messagesWithTools,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true
    })

    for await (const chunk of followUpStream) {
      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield {
          type: 'content',
          content: delta.content
        }
      }
    }
  }

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(messages: AIMessage[]): ChatCompletionMessageParam[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }
}

import type { FastifyRequest, FastifyReply } from 'fastify'
import { AIService } from '../../ai'
import type { AIMessage, AICompletionOptions, ToolCall } from '../../ai'

export interface RegularCompletionResponse {
  id: string
  chatId: string
  role: 'assistant'
  content: string
  toolCalls?: ToolCall[]
  createdAt: string
}

/**
 * Regular Strategy - JSON response for AI completions
 */
export async function regularStrategy(
  req: FastifyRequest,
  reply: FastifyReply,
  chatId: string,
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<RegularCompletionResponse> {
  const aiService = AIService.getInstance()
  const providerName = aiService.getProviderNames()[0]

  req.logger.info('Starting completion', {
    chatId,
    messageCount: messages.length,
    provider: providerName,
    model: options?.model || 'default',
    toolsEnabled: !!options?.tools,
  })

  const response = await aiService.complete(messages, options)

  if (response.toolCalls && response.toolCalls.length > 0) {
    req.logger.info('Tools executed', {
      chatId,
      provider: providerName,
      toolCount: response.toolCalls.length,
      tools: response.toolCalls.map(tc => tc.name)
    })
  }

  req.logger.info('Completion finished', {
    chatId,
    provider: providerName,
    model: options?.model || 'default',
    contentLength: response.content.length
  })

  return {
    id: crypto.randomUUID(),
    chatId,
    role: 'assistant',
    content: response.content,
    toolCalls: response.toolCalls,
    createdAt: new Date().toISOString()
  }
}

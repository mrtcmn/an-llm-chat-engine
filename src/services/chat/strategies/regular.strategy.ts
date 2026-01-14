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

  req.log.info({ messageCount: messages.length }, 'Starting completion')

  const response = await aiService.complete(messages, options)

  if (response.toolCalls && response.toolCalls.length > 0) {
    req.log.info(
      { toolCount: response.toolCalls.length, tools: response.toolCalls.map(tc => tc.name) },
      'Tools executed'
    )
  }

  req.log.info({ contentLength: response.content.length }, 'Completion finished')

  return {
    id: crypto.randomUUID(),
    chatId,
    role: 'assistant',
    content: response.content,
    toolCalls: response.toolCalls,
    createdAt: new Date().toISOString()
  }
}

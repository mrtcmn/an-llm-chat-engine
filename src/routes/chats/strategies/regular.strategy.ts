import type { FastifyRequest } from 'fastify'
import { AIService } from '../../../services/ai'
import type { AIMessage, ToolCall } from '../../../services/ai'

/**
 * Regular (non-streaming) completion response
 */
export interface RegularCompletionResponse {
  id: string
  chatId: string
  role: 'assistant'
  content: string
  toolCalls?: ToolCall[]
  createdAt: string
}

/**
 * Regular Strategy
 * Handles non-streaming JSON responses for AI completions
 * Returns a complete response after AI finishes generating
 */
export async function regularStrategy(
  req: FastifyRequest,
  chatId: string,
  messages: AIMessage[]
): Promise<RegularCompletionResponse> {
  const aiService = AIService.getInstance()

  req.log.info({ messageCount: messages.length }, 'Starting regular completion')

  const response = await aiService.complete(messages)

  // Log tool usage if any
  if (response.toolCalls && response.toolCalls.length > 0) {
    req.log.info(
      { toolCount: response.toolCalls.length, tools: response.toolCalls.map(tc => tc.name) },
      'Tools executed in completion'
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

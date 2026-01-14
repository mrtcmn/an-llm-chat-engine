import type { FastifyReply, FastifyRequest } from 'fastify'
import { AIService } from '../../ai'
import type { AIMessage, AICompletionOptions } from '../../ai'

function sendSSE(reply: FastifyReply, data: unknown): void {
  reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * Streaming Strategy - SSE response for AI completions
 */
export async function streamingStrategy(
  req: FastifyRequest,
  reply: FastifyReply,
  chatId: string,
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: unknown; result: unknown }> }> {
  const aiService = AIService.getInstance()
  const providerName = aiService.getProviderNames()[0]
  const startTime = Date.now()

  req.logger.info('Starting streaming completion', {
    chatId,
    messageCount: messages.length,
    provider: providerName,
    model: options?.model || 'default',
    toolsEnabled: !!options?.tools,
  })

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  let fullContent = ''
  const toolCalls: Array<{ name: string; arguments: unknown; result: unknown }> = []

  try {
    for await (const chunk of aiService.stream(messages, options)) {
      if (chunk.type === 'content' && chunk.content) {
        fullContent += chunk.content
      }

      if (chunk.type === 'tool_result' && chunk.toolCall) {
        toolCalls.push({
          name: chunk.toolCall.name!,
          arguments: chunk.toolCall.arguments!,
          result: chunk.toolCall.result!
        })
      }

      if (chunk.type === 'step_start') {
        req.logger.info('Step started', { stepType: chunk.stepInfo?.stepType })
      }

      if (chunk.type === 'step_finish') {
        req.logger.info('Step finished', {
          stepType: chunk.stepInfo?.stepType,
          finishReason: chunk.stepInfo?.finishReason,
          usage: chunk.stepInfo?.usage
        })
      }

      if (chunk.type === 'reasoning' && chunk.reasoning) {
        req.logger.info('Reasoning delta', { reasoning: chunk.reasoning })
      }

      if (chunk.type === 'tool_result') {
        req.logger.info('Tool executed', {
          chatId,
          provider: providerName,
          tool: chunk.toolCall?.name,
          result: chunk.toolCall?.result
        })
      }

      sendSSE(reply, chunk)
    }

    const duration = Date.now() - startTime

    req.logger.info('Stream completed', {
      chatId,
      provider: providerName,
      model: options?.model || 'default',
      contentLength: fullContent.length,
      toolCallCount: toolCalls.length,
      duration,
    })
    
    return {
      content: fullContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  } catch (error) {
    const duration = Date.now() - startTime

    req.logger.error('Stream error', error instanceof Error ? error : undefined, {
      chatId,
      provider: providerName,
      model: options?.model || 'default',
      duration,
      contentLengthBeforeError: fullContent.length,
    })

    sendSSE(reply, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown streaming error'
    })

    throw error
  } finally {
    reply.raw.end()
  }
}

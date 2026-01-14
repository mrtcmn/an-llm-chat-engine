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
        req.log.info({ stepType: chunk.stepInfo?.stepType }, 'Step started')
      }

      if (chunk.type === 'step_finish') {
        req.log.info(
          {
            stepType: chunk.stepInfo?.stepType,
            finishReason: chunk.stepInfo?.finishReason,
            usage: chunk.stepInfo?.usage
          },
          'Step finished'
        )
      }

      if (chunk.type === 'reasoning' && chunk.reasoning) {
        req.log.info({ reasoning: chunk.reasoning }, 'Reasoning delta')
      }

      if (chunk.type === 'tool_result') {
        req.log.info(
          { tool: chunk.toolCall?.name, result: chunk.toolCall?.result },
          'Tool executed'
        )
      }

      sendSSE(reply, chunk)
    }

    req.log.info({ contentLength: fullContent.length }, 'Stream completed')
    
    return {
      content: fullContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  } catch (error) {
    req.log.error({ error }, 'Stream error')

    sendSSE(reply, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown streaming error'
    })
    
    throw error
  } finally {
    reply.raw.end()
  }
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import { AIService } from '../../../services/ai'
import type { AIMessage } from '../../../services/ai'

/**
 * Streaming Strategy
 * Handles SSE (Server-Sent Events) streaming responses for AI completions
 *
 * Event types sent to client:
 * - start: Initial event when stream begins
 * - content: Text content chunk
 * - tool_call: Tool invocation started
 * - tool_result: Tool execution completed with result
 * - done: Stream completed
 * - error: Error occurred
 */
export async function streamingStrategy(
  req: FastifyRequest,
  reply: FastifyReply,
  messages: AIMessage[]
): Promise<void> {
  const aiService = AIService.getInstance()

  // Track accumulated content for logging/saving
  let fullContent = ''

  try {
    // Use @fastify/sse for SSE handling with async generator
    await reply.sse.send((async function* () {
      for await (const chunk of aiService.stream(messages)) {
        // Track content for later use
        if (chunk.type === 'content' && chunk.content) {
          fullContent += chunk.content
        }

        // Log tool executions
        if (chunk.type === 'tool_result') {
          req.log.info(
            { tool: chunk.toolCall?.name, result: chunk.toolCall?.result },
            'Tool executed'
          )
        }

        // Yield SSE event with data
        yield { data: JSON.stringify(chunk) }
      }

      req.log.info({ contentLength: fullContent.length }, 'Stream completed')
    })())
  } catch (error) {
    req.log.error({ error }, 'Stream error')

    // Send error event through SSE
    await reply.sse.send({
      data: JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown streaming error'
      })
    })
  }

  // Return the accumulated content for message saving
  return
}

/**
 * Helper to collect full content from stream for database saving
 */
export async function collectStreamContent(
  messages: AIMessage[]
): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: unknown; result: unknown }> }> {
  const aiService = AIService.getInstance()

  let fullContent = ''
  const toolCalls: Array<{ name: string; arguments: unknown; result: unknown }> = []

  for await (const chunk of aiService.stream(messages)) {
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
  }

  return {
    content: fullContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined
  }
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import { AIService } from '../../../services/ai'
import type { AIMessage } from '../../../services/ai'

/**
 * Send an SSE event to the client
 */
function sendSSE(reply: FastifyReply, data: unknown): void {
  reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

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

  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // Track accumulated content for logging/saving
  let fullContent = ''

  try {
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

      // Send SSE event
      sendSSE(reply, chunk)
    }

    req.log.info({ contentLength: fullContent.length }, 'Stream completed')
  } catch (error) {
    req.log.error({ error }, 'Stream error')

    // Send error event through SSE
    sendSSE(reply, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown streaming error'
    })
  } finally {
    reply.raw.end()
  }
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

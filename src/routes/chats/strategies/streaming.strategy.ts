import type { FastifyReply, FastifyRequest } from 'fastify'
import { AIService } from '../../../services/ai'
import type { AIMessage, AICompletionOptions } from '../../../services/ai'

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
 * - reasoning: Reasoning content (from models like o1/o3)
 * - step_start: Multi-step process started (with stepType)
 * - step_finish: Multi-step process finished (with stepType, finishReason, usage)
 * - tool_call: Tool invocation started
 * - tool_result: Tool execution completed with result
 * - done: Stream completed
 * - error: Error occurred
 *
 * Returns the full collected content and tool calls after streaming completes
 */
export async function streamingStrategy(
  req: FastifyRequest,
  reply: FastifyReply,
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: unknown; result: unknown }> }> {
  const aiService = AIService.getInstance()

  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // Track accumulated content and tool calls for database saving
  let fullContent = ''
  const toolCalls: Array<{ name: string; arguments: unknown; result: unknown }> = []

  try {
    for await (const chunk of aiService.stream(messages, options)) {
      // Track content for later use
      if (chunk.type === 'content' && chunk.content) {
        fullContent += chunk.content
      }

      // Track tool calls for database
      if (chunk.type === 'tool_result' && chunk.toolCall) {
        toolCalls.push({
          name: chunk.toolCall.name!,
          arguments: chunk.toolCall.arguments!,
          result: chunk.toolCall.result!
        })
      }

      // Log step progression
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

      // Log reasoning content
      if (chunk.type === 'reasoning' && chunk.reasoning) {
        req.log.info({ reasoning: chunk.reasoning }, 'Reasoning delta')
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
    
    return {
      content: fullContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  } catch (error) {
    req.log.error({ error }, 'Stream error')

    // Send error event through SSE
    sendSSE(reply, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown streaming error'
    })
    
    throw error
  } finally {
    reply.raw.end()
  }
}


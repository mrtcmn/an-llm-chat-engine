import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ConfigService } from '@config'
import type { IMessageRepository } from '../../repositories'
import type { AIMessage, AICompletionOptions } from '../ai'
import { streamingStrategy, regularStrategy } from './strategies'

/**
 * Response Strategy Plugin
 * Selects and executes the appropriate response strategy (streaming vs regular) based on feature flags
 */
export class ResponseStrategyPlugin {
  constructor(
    private config: ConfigService,
    private messageRepo: IMessageRepository
  ) {}

  async execute(
    req: FastifyRequest,
    reply: FastifyReply,
    chatId: string,
    messages: AIMessage[],
    aiOptions: AICompletionOptions
  ) {
    const streamingEnabled = this.config.getFeatureFlag('streamingEnabled')

    if (streamingEnabled) {
      const streamResult = await streamingStrategy(req, reply, chatId, messages, aiOptions)
      
      await this.messageRepo.create({
        chatId,
        role: 'assistant',
        content: streamResult.content,
        metadata: streamResult.toolCalls ? { toolCalls: streamResult.toolCalls } : undefined
      })
      
      return reply
    }

    const response = await regularStrategy(req, reply, chatId, messages, aiOptions)

    await this.messageRepo.create({
      chatId,
      role: 'assistant',
      content: response.content,
      metadata: response.toolCalls ? { toolCalls: response.toolCalls } : undefined
    })

    return response
  }
}

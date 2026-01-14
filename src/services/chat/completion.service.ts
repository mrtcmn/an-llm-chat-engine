import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ChatService } from './chat.service'
import type { MessageRepository } from '../../repositories/message.repository'
import type { ConfigService } from '@config'
import { AppError } from '@middleware'
import { streamingStrategy, regularStrategy } from '../../routes/chats/strategies'
import type { AIMessage, AICompletionOptions } from '../ai'

export class CompletionService {
  constructor(
    private chatService: ChatService,
    private messageRepo: MessageRepository,
    private config: ConfigService
  ) {}

  async createCompletion(
    req: FastifyRequest,
    reply: FastifyReply,
    chatId: string,
    userMessage: string,
    userId: string,
  ) {
    if (!userMessage.trim()) {
      throw AppError.badRequest('Message cannot be empty')
    }

    // Upsert: create chat if not exists, or verify ownership if exists
    await this.chatService.getOrCreateChat(chatId, userId)

    await this.messageRepo.create({
      chatId,
      role: 'user',
      content: userMessage
    })

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Be concise and helpful.'
      },
      { role: 'user', content: userMessage }
    ]

    // Build AI options based on feature flags
    const aiOptions: AICompletionOptions = {
      tools: this.config.getFeatureFlag('aiToolsEnabled')
    }

    const streamingEnabled = this.config.getFeatureFlag('streamingEnabled')
    const useStreaming = streamingEnabled

    if (useStreaming) {
      const streamResult = await streamingStrategy(req, reply, messages, aiOptions)
      
      // Save the complete assistant message after streaming
      await this.messageRepo.create({
        chatId,
        role: 'assistant',
        content: streamResult.content
      })
      
      return reply
    }

    const response = await regularStrategy(req, chatId, messages, aiOptions)

    // Save the assistant message for regular strategy
    await this.messageRepo.create({
      chatId,
      role: 'assistant',
      content: response.content
    })

    return response
  }
}

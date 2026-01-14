import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ChatService } from './chat.service'
import type { MessageRepository } from '../../repositories/message.repository'
import type { ConfigService } from '@config'
import { AppError } from '@middleware'
import type { ResponseStrategyPlugin } from './response-strategy.plugin'
import type { AIMessage, AICompletionOptions } from '../ai'

export class CompletionService {
  constructor(
    private chatService: ChatService,
    private messageRepo: MessageRepository,
    private config: ConfigService,
    private responseStrategy: ResponseStrategyPlugin
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

    await this.chatService.getOrCreateChat(chatId, userId)

    await this.messageRepo.create({
      chatId,
      role: 'user',
      content: userMessage
    })

    const history = await this.messageRepo.findByChatId(chatId)
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Be concise and helpful.'
      },
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]

    const aiOptions: AICompletionOptions = {
      tools: this.config.getFeatureFlag('aiToolsEnabled')
    }

    return this.responseStrategy.execute(req, reply, chatId, messages, aiOptions)
  }
}

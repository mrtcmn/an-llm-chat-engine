import type { ConfigService } from '@config'
import type { ChatRepository } from '../../repositories/chat.repository'
import type { MessageRepository } from '../../repositories/message.repository'
import { AppError } from '@middleware'

export class ChatService {
  constructor(
    private chatRepo: ChatRepository,
    private messageRepo: MessageRepository,
    private config: ConfigService
  ) {}

  async listChats(
    userId: string,
    options: { limit?: number; offset?: number; page?: number } = {}
  ) {
    // Get max limit from feature flag - this is the ceiling, not overridable
    const maxLimit = this.config.getFeatureFlag('paginationLimit')
    const { limit = maxLimit, page } = options

    // Validate and clamp limit between 1 and maxLimit (feature flag controls max)
    const validatedLimit = Math.max(1, Math.min(maxLimit, limit))
    
    // Calculate offset from page if provided, otherwise use offset directly
    let validatedOffset = Math.max(0, options.offset ?? 0)
    if (page !== undefined) {
      const validatedPage = Math.max(1, page)
      validatedOffset = (validatedPage - 1) * validatedLimit
    }

    const { chats, total } = await this.chatRepo.findByUserId(userId, {
      limit: validatedLimit,
      offset: validatedOffset
    })

    // Calculate pagination metadata
    const hasMore = validatedOffset + chats.length < total
    const nextOffset = hasMore ? validatedOffset + validatedLimit : null
    const currentPage = Math.floor(validatedOffset / validatedLimit) + 1
    const totalPages = Math.ceil(total / validatedLimit)

    return {
      chats,
      pagination: {
        total,
        limit: validatedLimit,
        offset: validatedOffset,
        count: chats.length,
        hasMore,
        nextOffset,
        page: currentPage,
        totalPages
      }
    }
  }

  async getChatHistory(chatId: string, userId: string) {
    const chat = await this.chatRepo.findById(chatId)
    if (!chat) {
      throw AppError.notFound('Chat', { chatId })
    }
    if (chat.userId !== userId) {
      throw AppError.forbidden('Access denied', { chatId, userId })
    }

    const fullHistory = this.config.getFeatureFlag('chatHistoryEnabled')

    const messages = fullHistory
      ? await this.messageRepo.findByChatId(chatId)
      : await this.messageRepo.findByChatId(chatId, { limit: 10 })

    return {
      chatId,
      messages,
      isFullHistory: fullHistory
    }
  }

  async verifyUserOwnsChat(chatId: string, userId: string): Promise<boolean> {
    const chat = await this.chatRepo.findById(chatId)
    return chat?.userId === userId
  }

  async getOrCreateChat(chatId: string, userId: string, title?: string) {
    const existingChat = await this.chatRepo.findById(chatId)

    if (existingChat) {
      if (existingChat.userId !== userId) {
        throw AppError.forbidden('Access denied', { chatId, userId })
      }
      return existingChat
    }

    return this.chatRepo.upsert({
      id: chatId,
      userId,
      title: title || 'New Chat'
    })
  }

  async createChat(userId: string, title: string) {
    return this.chatRepo.create({ userId, title })
  }
}

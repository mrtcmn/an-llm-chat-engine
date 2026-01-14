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

  async listChats(userId: string) {
    const limit = this.config.getFeatureFlag('paginationLimit')
    const validatedLimit = Math.max(10, Math.min(100, limit))

    const chats = await this.chatRepo.findByUserId(userId, {
      limit: validatedLimit
    })

    return {
      chats,
      total: chats.length,
      limit: validatedLimit
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

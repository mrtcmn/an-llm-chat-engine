import type { Message } from '@generated/prisma/client'

export interface FindByChatIdOptions {
  limit?: number
}

export interface IMessageRepository {
  findByChatId(chatId: string, options?: FindByChatIdOptions): Promise<Message[]>
  create(data: { chatId: string; role: string; content: string }): Promise<Message>
}

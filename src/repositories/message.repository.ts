import type { PrismaClient, Message } from '@prisma/client'

export interface FindByChatIdOptions {
  limit?: number
}

export class MessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByChatId(
    chatId: string,
    options: FindByChatIdOptions = {}
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      ...(options.limit && { take: options.limit })
    })
  }

  async create(data: {
    chatId: string
    role: string
    content: string
  }): Promise<Message> {
    return this.prisma.message.create({ data })
  }
}

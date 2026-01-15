import type { PrismaClient, Message } from '@generated/prisma/client'
import type { IMessageRepository, FindByChatIdOptions } from '../../interfaces'

export class MessagePrismaRepositoryImpl implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByChatId(
    chatId: string,
    options: FindByChatIdOptions = {}
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      ...(options.limit && { take: options.limit })
    })
  }

  async create(data: {
    chatId: string
    role: string
    content: string
    metadata?: any
  }): Promise<Message> {
    return this.prisma.message.create({ data })
  }
}

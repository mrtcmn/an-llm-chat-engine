import type { PrismaClient, Chat } from '@prisma/client'
import type { IChatRepository } from '../../interfaces'

export class ChatPrismaRepositoryImpl implements IChatRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(chatId: string): Promise<Chat | null> {
    return this.prisma.chat.findUnique({ 
      where: { id: chatId, deletedAt: null } 
    })
  }

  async findByUserId(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ chats: Chat[]; total: number }> {
    const { limit = 20, offset = 0 } = options
    
    const [chats, total] = await this.prisma.$transaction([
      this.prisma.chat.findMany({
        where: { userId, deletedAt: null },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.chat.count({
        where: { userId, deletedAt: null }
      })
    ])

    return { chats, total }
  }

  async create(data: { userId: string; title: string }): Promise<Chat> {
    return this.prisma.chat.create({ data })
  }

  async upsert(data: { id: string; userId: string; title: string }): Promise<Chat> {
    return this.prisma.chat.upsert({
      where: { id: data.id },
      create: { id: data.id, userId: data.userId, title: data.title },
      update: {}
    })
  }
}

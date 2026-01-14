import type { PrismaClient, Chat } from '@prisma/client'

export class ChatRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(chatId: string): Promise<Chat | null> {
    return this.prisma.chat.findUnique({ where: { id: chatId } })
  }

  async findByUserId(
    userId: string,
    options: { limit?: number } = {}
  ): Promise<Chat[]> {
    const { limit = 20 } = options
    return this.prisma.chat.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
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

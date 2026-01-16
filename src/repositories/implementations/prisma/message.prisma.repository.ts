import type { PrismaClient } from "@generated/prisma/client";
import type { Message } from "../../interfaces/models";
import type { FindByChatIdOptions, IMessageRepository } from "../../interfaces";

export class MessagePrismaRepositoryImpl implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByChatId(
    chatId: string,
    options: FindByChatIdOptions = {}
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      ...(options.limit && { take: options.limit }),
    });
  }

  async create(data: {
    chatId: string;
    role: string;
    content: string;
    metadata?: any;
  }): Promise<Message> {
    return this.prisma.message.create({ data });
  }
}

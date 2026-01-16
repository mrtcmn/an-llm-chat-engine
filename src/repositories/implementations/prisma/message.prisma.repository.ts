import type { PrismaClient } from "@generated/prisma/client";
import type { FindByChatIdOptions, IMessageRepository } from "../../interfaces";
import type { Message } from "../../interfaces/models";

export class MessagePrismaRepositoryImpl implements IMessageRepository {
  constructor(private prisma: PrismaClient) {}

  async findByChatId(
    chatId: string,
    options: FindByChatIdOptions = {}
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { createdAt: "desc" },
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

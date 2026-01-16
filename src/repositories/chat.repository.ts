import type { DatabaseService } from "../services/database/database.service";
import type { PrismaService } from "../services/database/prisma.service";
import { ChatPrismaRepositoryImpl } from "./implementations/prisma/chat.prisma.repository";
import type { IChatRepository } from "./interfaces";
import type { Chat } from "./interfaces/models";

export class ChatRepository implements IChatRepository {
  private impl: IChatRepository;

  constructor(db: DatabaseService) {
    const strategy = db.getStrategy();

    // Check which database strategy is active
    if (this.isPrismaService(strategy)) {
      this.impl = new ChatPrismaRepositoryImpl(strategy.client);
    } else {
      throw new Error(
        `Unsupported database strategy: ${strategy.constructor.name}. ` +
          "Supported strategies: PrismaService"
      );
    }
  }

  private isPrismaService(strategy: any): strategy is PrismaService {
    return "client" in strategy && strategy.client !== undefined;
  }

  // Delegate all interface methods
  async findById(chatId: string): Promise<Chat | null> {
    return this.impl.findById(chatId);
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ chats: Chat[]; total: number }> {
    return this.impl.findByUserId(userId, options);
  }

  async create(data: { userId: string; title: string }): Promise<Chat> {
    return this.impl.create(data);
  }

  async upsert(data: {
    id: string;
    userId: string;
    title: string;
  }): Promise<Chat> {
    return this.impl.upsert(data);
  }
}

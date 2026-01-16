import type { DatabaseService } from "../services/database/database.service";
import type { PrismaService } from "../services/database/prisma.service";
import { MessagePrismaRepositoryImpl } from "./implementations/prisma/message.prisma.repository";
import type { FindByChatIdOptions, IMessageRepository } from "./interfaces";
import type { Message } from "./interfaces/models";

export class MessageRepository implements IMessageRepository {
  private impl: IMessageRepository;

  constructor(db: DatabaseService) {
    const strategy = db.getStrategy();

    // Check which database strategy is active
    if (this.isPrismaService(strategy)) {
      this.impl = new MessagePrismaRepositoryImpl(strategy.client);
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
  async findByChatId(
    chatId: string,
    options?: FindByChatIdOptions
  ): Promise<Message[]> {
    return this.impl.findByChatId(chatId, options);
  }

  async create(data: {
    chatId: string;
    role: string;
    content: string;
    metadata?: any;
  }): Promise<Message> {
    return this.impl.create(data);
  }
}

import type { Message } from "./models";

export interface FindByChatIdOptions {
  limit?: number;
}

export interface IMessageRepository {
  findByChatId(
    chatId: string,
    options?: FindByChatIdOptions
  ): Promise<Message[]>;
  create(data: {
    chatId: string;
    role: string;
    content: string;
    metadata?: any;
  }): Promise<Message>;
}
